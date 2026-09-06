/* =========================================================================
   JRAD RACING — DYNAMIC STREAM & RACE COUNTDOWN ENGINE
   =========================================================================
   Works for ANY combination of days and times!
   
   HOW TO UPDATE YOUR SCHEDULE:
   
   METHOD 1 (Recommended — Edit the HTML directly):
     Simply change or add day cards in index.html and schedule.html.
     - To change a time: update .slot-time (e.g. "9:30 AM", "7:00 PM", "2:00 PM").
     - To add a day: add a .day-card with an <h3> (e.g. <h3>Friday</h3>) and .slot.
     - To take a day off: add class="is-off" to .day-card or set .slot-time to "Off".
     The countdown timer automatically parses the day grid on the page!
     
   METHOD 2 (Config Array):
     Edit DEFAULT_SCHEDULE below, or set window.JRAD_SCHEDULE on your page.
     Supports any day name ('Monday'..'Sunday' or 0..6), any time format
     ('9:30 AM', '7:00 PM', '18:30'), and even specific one-off dates
     (e.g. { date: '2026-10-24', time: '11:00 AM', label: 'Endurance 6H' }).

   FEATURES:
   1. Live detection: Instant "LIVE NOW!" banner with pulsing indicator & watch button.
   2. Starting soon: Shows "Scheduled for [Time] PT — Starting soon" in the first hour.
   3. Delayed notice: If stream is late (1+ hour past scheduled time without stream),
      shows "Stream delayed or schedule changed" with Twitch and Discord buttons.
   4. Auto-rollover: After 3.5 hours past scheduled time (or after stream ends),
      automatically rolls over and counts down to the next upcoming scheduled stream.
   5. Dynamic timezone & DST: Exact Pacific Time calculations (PST / PDT).
   ========================================================================= */

(function () {
  // Default weekly schedule fallback
  var DEFAULT_SCHEDULE = [
    { day: 'Wednesday', time: '9:30 AM', label: 'Live stream' },
    { day: 'Thursday', time: '9:30 AM', label: 'Live stream' }
  ];

  var PACIFIC_TZ = 'America/Los_Angeles';
  var DELAYED_THRESHOLD_MS = 60 * 60 * 1000;    // 1 hour past scheduled time
  var RESET_AFTER_MS = 3.5 * 60 * 60 * 1000;     // 3.5 hours past scheduled time (rollover)

  var box = document.getElementById('raceCountdown');
  var labelEl = document.getElementById('raceCountdownLabel');
  var clockEl = document.getElementById('raceCountdownClock');
  if (!box || !labelEl || !clockEl) return;

  var subLabelEl = box.querySelector('.cd-label');

  var CLOCK_DIGITS_HTML =
    '<div class="cd-unit"><div class="cd-num" id="cdDays">–</div><div class="cd-unit-label">Days</div></div>' +
    '<div class="cd-unit"><div class="cd-num" id="cdHours">–</div><div class="cd-unit-label">Hrs</div></div>' +
    '<div class="cd-unit"><div class="cd-num" id="cdMins">–</div><div class="cd-unit-label">Min</div></div>' +
    '<div class="cd-unit"><div class="cd-num" id="cdSecs">–</div><div class="cd-unit-label">Sec</div></div>';

  var currentMode = null; // 'live' | 'delayed' | 'starting' | 'countdown' | 'empty'
  var activeSchedule = [];

  var DAY_MAP = {
    'sun': 0, 'sunday': 0,
    'mon': 1, 'monday': 1,
    'tue': 2, 'tues': 2, 'tuesday': 2,
    'wed': 3, 'wednesday': 3,
    'thu': 4, 'thur': 4, 'thurs': 4, 'thursday': 4,
    'fri': 5, 'friday': 5,
    'sat': 6, 'saturday': 6
  };
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Parse time strings like "9:30 AM", "9:30am", "8 PM", "14:00", etc.
  function parseTimeString(timeStr) {
    if (!timeStr) return null;
    var s = String(timeStr).trim().toLowerCase();
    if (s === 'off' || s.indexOf('tbd') !== -1 || s.indexOf('tba') !== -1 || s.indexOf('confirmed') !== -1) {
      return null;
    }
    var match = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!match) return null;
    var hour = parseInt(match[1], 10);
    var minute = match[2] ? parseInt(match[2], 10) : 0;
    var meridian = match[3] ? match[3].toLowerCase() : null;

    if (meridian === 'pm' && hour < 12) {
      hour += 12;
    } else if (meridian === 'am' && hour === 12) {
      hour = 0;
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour: hour, minute: minute };
  }

  function parseDay(dayVal) {
    if (typeof dayVal === 'number' && dayVal >= 0 && dayVal <= 6) {
      return { day: dayVal, dayName: DAY_NAMES[dayVal] };
    }
    if (!dayVal) return null;
    var s = String(dayVal).trim().toLowerCase();
    for (var key in DAY_MAP) {
      if (s.indexOf(key) === 0) {
        var num = DAY_MAP[key];
        return { day: num, dayName: DAY_NAMES[num] };
      }
    }
    return null;
  }

  function formatTime12h(hour, minute) {
    var m = hour >= 12 ? 'PM' : 'AM';
    var h = hour % 12;
    if (h === 0) h = 12;
    var minStr = minute < 10 ? '0' + minute : String(minute);
    return h + ':' + minStr + ' ' + m;
  }

  function normalizeRule(input) {
    if (!input) return null;
    var timeInfo = typeof input.hour === 'number'
      ? { hour: input.hour, minute: input.minute || 0 }
      : parseTimeString(input.time || input.timeString);
    if (!timeInfo) return null;

    var formattedTime = input.timeString || (input.time ? String(input.time).trim() : formatTime12h(timeInfo.hour, timeInfo.minute));

    // One-off specific calendar date (e.g. { date: '2026-10-24', time: '11:00 AM' })
    if (input.date) {
      var dateMatch = String(input.date).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (dateMatch) {
        return {
          isDate: true,
          year: parseInt(dateMatch[1], 10),
          month: parseInt(dateMatch[2], 10),
          dayOfMonth: parseInt(dateMatch[3], 10),
          hour: timeInfo.hour,
          minute: timeInfo.minute,
          timeFormatted: formattedTime,
          label: input.label || 'Special Stream'
        };
      }
    }

    // Weekly recurring day
    var dayInfo = parseDay(input.day !== undefined ? input.day : input.dayName);
    if (!dayInfo) return null;

    return {
      isDate: false,
      day: dayInfo.day,
      dayName: dayInfo.dayName,
      hour: timeInfo.hour,
      minute: timeInfo.minute,
      timeFormatted: formattedTime,
      label: input.label || 'Live stream'
    };
  }

  // Auto-extract schedule from .day-grid in the page DOM
  function getRulesFromDOM() {
    var cards = document.querySelectorAll('.day-grid .day-card');
    if (!cards || cards.length === 0) return null;

    var extracted = [];
    cards.forEach(function (card) {
      if (card.classList.contains('is-off')) return;

      var heading = card.querySelector('h3, h2, .day-title');
      if (!heading) return;
      var dayInfo = parseDay(heading.textContent);
      if (!dayInfo) return;

      var slots = card.querySelectorAll('.slot');
      if (slots && slots.length > 0) {
        slots.forEach(function (slot) {
          var labelEl = slot.querySelector('.slot-label');
          var timeEl = slot.querySelector('.slot-time');
          if (!timeEl) return;
          var parsedTime = parseTimeString(timeEl.textContent);
          if (!parsedTime) return;

          var label = labelEl ? labelEl.textContent.trim() : 'Live stream';
          extracted.push(normalizeRule({
            day: dayInfo.day,
            dayName: dayInfo.dayName,
            hour: parsedTime.hour,
            minute: parsedTime.minute,
            timeString: timeEl.textContent.trim(),
            label: label || 'Live stream'
          }));
        });
      }
    });

    return extracted.length > 0 ? extracted : null;
  }

  // Load and refresh schedule rules
  function resolveSchedule() {
    var rawList = null;
    if (window.JRAD_SCHEDULE && Array.isArray(window.JRAD_SCHEDULE) && window.JRAD_SCHEDULE.length > 0) {
      rawList = window.JRAD_SCHEDULE;
    } else {
      var domRules = getRulesFromDOM();
      if (domRules && domRules.length > 0) {
        activeSchedule = domRules;
        return activeSchedule;
      }
      rawList = DEFAULT_SCHEDULE;
    }

    var normalized = [];
    rawList.forEach(function (item) {
      var rule = normalizeRule(item);
      if (rule) normalized.push(rule);
    });
    activeSchedule = normalized;
    return activeSchedule;
  }

  // Precise Pacific Time to UTC epoch timestamp conversion (handles DST seamlessly)
  function pacificTimeToTimestamp(year, month, day, hour, minute) {
    var ptFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: PACIFIC_TZ,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false
    });
    var guess = Date.UTC(year, month - 1, day, hour, minute, 0);
    for (var i = 0; i < 3; i++) {
      var parts = {};
      ptFmt.formatToParts(new Date(guess)).forEach(function (p) { parts[p.type] = p.value; });
      var ptHour = parseInt(parts.hour, 10) === 24 ? 0 : parseInt(parts.hour, 10);
      var ptDate = Date.UTC(parseInt(parts.year, 10), parseInt(parts.month, 10) - 1, parseInt(parts.day, 10), ptHour, parseInt(parts.minute, 10));
      var target = Date.UTC(year, month - 1, day, hour, minute);
      var diff = target - ptDate;
      guess += diff;
      if (diff === 0) break;
    }
    return guess;
  }

  // Calculate the most recent past occurrence and next future occurrence for the schedule
  function getOccurrences(fromDate, rules) {
    if (!rules || rules.length === 0) return null;

    var ptDateFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: PACIFIC_TZ,
      year: 'numeric', month: 'numeric', day: 'numeric'
    });
    var parts = {};
    ptDateFmt.formatToParts(fromDate).forEach(function (p) { parts[p.type] = p.value; });
    var nowYear = parseInt(parts.year, 10);
    var nowMonth = parseInt(parts.month, 10);
    var nowDay = parseInt(parts.day, 10);

    var pastCandidates = [];
    var futureCandidates = [];
    var nowMs = fromDate.getTime();

    // Specific calendar dates
    rules.forEach(function (rule) {
      if (rule.isDate) {
        var timeMs = pacificTimeToTimestamp(rule.year, rule.month, rule.dayOfMonth, rule.hour, rule.minute);
        var item = { time: timeMs, rule: rule };
        if (timeMs <= nowMs) pastCandidates.push(item);
        else futureCandidates.push(item);
      }
    });

    // Weekly recurring days (-7 to +14 days window covers previous slot & next slots)
    for (var dOffset = -7; dOffset <= 14; dOffset++) {
      var refDate = new Date(Date.UTC(nowYear, nowMonth - 1, nowDay + dOffset, 12, 0, 0));
      var targetYear = refDate.getUTCFullYear();
      var targetMonth = refDate.getUTCMonth() + 1;
      var targetDay = refDate.getUTCDate();
      var targetDow = refDate.getUTCDay();

      rules.forEach(function (rule) {
        if (!rule.isDate && rule.day === targetDow) {
          var timeMs = pacificTimeToTimestamp(targetYear, targetMonth, targetDay, rule.hour, rule.minute);
          var item = { time: timeMs, rule: rule };
          if (timeMs <= nowMs) {
            pastCandidates.push(item);
          } else {
            futureCandidates.push(item);
          }
        }
      });
    }

    pastCandidates.sort(function (a, b) { return b.time - a.time; });
    futureCandidates.sort(function (a, b) { return a.time - b.time; });

    return {
      latestPast: pastCandidates[0] || null,
      nextUpcoming: futureCandidates[0] || null
    };
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  // Manual simulation mode for testing in browser console:
  // window.setSimulatedCountdownState('live' | 'delayed' | 'starting' | 'countdown' | 'auto')
  var simulationOverride = null;
  window.setSimulatedCountdownState = function (state) {
    if (state === 'auto' || state === 'reset' || !state) {
      simulationOverride = null;
    } else {
      simulationOverride = state;
    }
    tick();
  };

  // Helper methods on window to inspect or update schedule dynamically
  window.refreshSchedule = function () {
    resolveSchedule();
    tick();
  };

  window.setSchedule = function (newSchedule) {
    window.JRAD_SCHEDULE = newSchedule;
    resolveSchedule();
    tick();
  };

  window.getActiveSchedule = function () {
    return activeSchedule;
  };

  function renderClockDigits(diff) {
    if (currentMode !== 'countdown') {
      clockEl.innerHTML = CLOCK_DIGITS_HTML;
      currentMode = 'countdown';
    }

    var elDays = document.getElementById('cdDays');
    var elHours = document.getElementById('cdHours');
    var elMins = document.getElementById('cdMins');
    var elSecs = document.getElementById('cdSecs');

    if (!elDays || !elHours || !elMins || !elSecs) return;

    var totalSec = Math.max(0, Math.floor(diff / 1000));
    var days = Math.floor(totalSec / 86400);
    var hours = Math.floor((totalSec % 86400) / 3600);
    var mins = Math.floor((totalSec % 3600) / 60);
    var secs = totalSec % 60;

    elDays.textContent = pad(days);
    elHours.textContent = pad(hours);
    elMins.textContent = pad(mins);
    elSecs.textContent = pad(secs);
  }

  function tick() {
    var now = Date.now();
    var rules = activeSchedule.length > 0 ? activeSchedule : resolveSchedule();
    var occ = getOccurrences(new Date(now), rules);

    // Empty schedule (e.g. all days marked Off)
    if (!occ || !occ.nextUpcoming) {
      box.className = 'countdown-box';
      if (subLabelEl) subLabelEl.textContent = 'SCHEDULE';
      labelEl.textContent = 'No streams scheduled this week';
      if (currentMode !== 'empty') {
        clockEl.innerHTML =
          '<div class="cd-delayed-wrap" style="align-items:flex-end;">' +
            '<div class="cd-delayed-note">Check Twitch or Discord for upcoming schedule updates:</div>' +
            '<div class="cd-delayed-actions">' +
              '<a href="https://www.twitch.tv/jradracing" target="_blank" rel="noopener" class="btn btn-primary cd-delayed-btn">Check Twitch ↗</a>' +
              '<a href="https://discord.gg/WEgZrhRds3" target="_blank" rel="noopener" class="btn btn-outline cd-delayed-btn">Discord Announcements ↗</a>' +
            '</div>' +
          '</div>';
        currentMode = 'empty';
      }
      return;
    }

    var elapsedSinceSlot = occ.latestPast ? (now - occ.latestPast.time) : 999999999;
    var diffToNext = occ.nextUpcoming.time - now;

    var isTwitchLive = simulationOverride === 'live' ? true : (simulationOverride ? false : Boolean(window.isTwitchLive));

    // Determine target display state
    var targetMode = 'countdown';

    if (simulationOverride) {
      targetMode = simulationOverride;
    } else if (isTwitchLive) {
      targetMode = 'live';
    } else if (elapsedSinceSlot >= 0 && elapsedSinceSlot < RESET_AFTER_MS && !window.hasTwitchStreamedToday) {
      if (elapsedSinceSlot >= DELAYED_THRESHOLD_MS) {
        // Over 1 hour past scheduled time and stream has not gone live
        targetMode = 'delayed';
      } else {
        // Within the first hour after scheduled start time
        targetMode = 'starting';
      }
    } else {
      // Outside active stream window (or after stream ended) -> count down to next upcoming stream
      targetMode = 'countdown';
    }

    // Apply UI according to target mode
    if (targetMode === 'live') {
      box.className = 'countdown-box is-live';
      if (subLabelEl) subLabelEl.textContent = 'STREAM STATUS';
      labelEl.innerHTML = '<span class="cd-live-dot" style="display:inline-block;vertical-align:middle;margin-right:8px;"></span> LIVE NOW!';

      if (currentMode !== 'live') {
        clockEl.innerHTML =
          '<div class="cd-live-badge-wrap">' +
            '<div class="cd-live-indicator">' +
              '<span class="cd-live-dot"></span>' +
              '<span class="cd-live-badge-text">LIVE NOW</span>' +
            '</div>' +
            '<a href="https://www.twitch.tv/jradracing" target="_blank" rel="noopener" class="btn btn-primary cd-live-action-btn">' +
              'Watch on Twitch ↗' +
            '</a>' +
          '</div>';
        currentMode = 'live';
      }
    } else if (targetMode === 'delayed') {
      box.className = 'countdown-box is-delayed';
      if (subLabelEl) subLabelEl.textContent = 'SCHEDULE UPDATE';
      labelEl.textContent = 'Stream delayed or schedule changed';

      if (currentMode !== 'delayed') {
        clockEl.innerHTML =
          '<div class="cd-delayed-wrap">' +
            '<div class="cd-delayed-note">Stream hasn’t gone live yet — check Twitch or Discord for updates:</div>' +
            '<div class="cd-delayed-actions">' +
              '<a href="https://www.twitch.tv/jradracing" target="_blank" rel="noopener" class="btn btn-primary cd-delayed-btn">' +
                'Check Twitch ↗' +
              '</a>' +
              '<a href="https://discord.gg/WEgZrhRds3" target="_blank" rel="noopener" class="btn btn-outline cd-delayed-btn">' +
                'Discord Updates ↗' +
              '</a>' +
            '</div>' +
          '</div>';
        currentMode = 'delayed';
      }
    } else if (targetMode === 'starting') {
      box.className = 'countdown-box is-starting';
      if (subLabelEl) subLabelEl.textContent = 'LIVE STREAM';
      var scheduledTimeStr = occ.latestPast ? occ.latestPast.rule.timeFormatted : 'scheduled time';
      labelEl.textContent = 'Scheduled for ' + scheduledTimeStr + ' PT — Starting soon';
      renderClockDigits(0);
    } else {
      // Normal countdown mode to next upcoming stream
      box.className = 'countdown-box';
      if (subLabelEl) subLabelEl.textContent = 'NEXT LIVE STREAM IN';
      
      var nextRule = occ.nextUpcoming.rule;
      var dayText = nextRule.isDate
        ? (nextRule.month + '/' + nextRule.dayOfMonth)
        : nextRule.dayName;

      // If upcoming stream is today in Pacific time
      var ptDateFmt = new Intl.DateTimeFormat('en-US', { timeZone: PACIFIC_TZ, weekday: 'short' });
      var nowDowName = ptDateFmt.format(new Date(now));
      var targetDowName = ptDateFmt.format(new Date(occ.nextUpcoming.time));
      if (nowDowName === targetDowName && (occ.nextUpcoming.time - now) < 86400000) {
        dayText = 'Today';
      }

      labelEl.textContent = dayText + ' at ' + nextRule.timeFormatted + ' Pacific';
      renderClockDigits(diffToNext);
    }
  }

  // React immediately whenever Twitch live status changes
  window.addEventListener('twitch-status-change', function () {
    tick();
  });

  // Initial setup
  resolveSchedule();
  tick();
  setInterval(tick, 1000);
})();
