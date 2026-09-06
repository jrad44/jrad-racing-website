/* JRAD Racing — live countdown to the next race (schedule page).
   No hardcoded calendar dates: instead it uses the recurring weekly rule
   from the schedule itself (next Tuesday 8:00 PM Pacific = MX-5 Cup race,
   next Thursday 8:30 PM Pacific = GT3 practice/race) and always counts
   down to whichever of those comes first.

   EDIT ME: if race days/times ever change, just update RACE_RULES below —
   everything else recalculates automatically. Day numbers are JS's
   standard 0=Sunday..6=Saturday. Hour/minute are 24-hour, Pacific time. */
(function () {
  var RACE_RULES = [
    { label: 'Live stream', day: 3, hour: 9, minute: 30 },  // Wednesday 9:30 AM
    { label: 'Live stream', day: 4, hour: 9, minute: 30 }  // Thursday 9:30 AM
  ];

  var PACIFIC_TZ = 'America/Los_Angeles';

  var labelEl = document.getElementById('raceCountdownLabel');
  var box = document.getElementById('raceCountdown');
  var els = {
    d: document.getElementById('cdDays'),
    h: document.getElementById('cdHours'),
    m: document.getElementById('cdMins'),
    s: document.getElementById('cdSecs')
  };
  if (!labelEl || !box) return;

  // Get the current wall-clock date/time as it reads in Pacific time,
  // regardless of the visitor's own timezone.
  function pacificPartsNow() {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: PACIFIC_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, weekday: 'short'
    });
    var parts = {};
    fmt.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return parts;
  }

  // Pacific UTC offset changes with daylight saving, so instead of hardcoding
  // an offset we ask the browser what the offset currently is by comparing a
  // known instant formatted in Pacific vs UTC.
  function pacificOffsetMinutes(date) {
    var utcFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var ptFmt = new Intl.DateTimeFormat('en-US', { timeZone: PACIFIC_TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    function partsToDate(fmt) {
      var p = {}; fmt.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
      return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour === 24 ? 0 : +p.hour, +p.minute, +p.second);
    }
    return (partsToDate(utcFmt) - partsToDate(ptFmt)) / 60000;
  }

  // Build the next occurrence (as a real UTC-based Date) of a given
  // weekday/hour/minute in Pacific time.
  function nextOccurrence(rule, fromDate) {
    var offsetMin = pacificOffsetMinutes(fromDate);
    var ptFmt = new Intl.DateTimeFormat('en-US', { timeZone: PACIFIC_TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' });
    var p = {}; ptFmt.formatToParts(fromDate).forEach(function (x) { p[x.type] = x.value; });
    // Midnight today, Pacific, expressed as a UTC instant.
    var todayPacificMidnightUTC = Date.UTC(+p.year, +p.month - 1, +p.day, 0, 0, 0) + offsetMin * 60000;
    var todayDow = new Date(todayPacificMidnightUTC).getUTCDay();

    var daysAhead = (rule.day - todayDow + 7) % 7;
    var candidate = todayPacificMidnightUTC + daysAhead * 86400000 + rule.hour * 3600000 + rule.minute * 60000;

    if (candidate <= fromDate.getTime()) {
      candidate += 7 * 86400000;
    }
    return candidate;
  }

  function getNextRace() {
    var now = new Date();
    var best = null;
    RACE_RULES.forEach(function (rule) {
      var t = nextOccurrence(rule, now);
      if (!best || t < best.time) best = { time: t, label: rule.label };
    });
    return best;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  var next = getNextRace();

  function tick() {
    var now = Date.now();
    var diff = next.time - now;

    if (diff <= 0) {
      // Race time has arrived — recompute the following one and keep going.
      box.classList.add('is-now');
      labelEl.textContent = next.label + ' — live now';
      els.d.textContent = '00'; els.h.textContent = '00'; els.m.textContent = '00'; els.s.textContent = '00';
      setTimeout(function () {
        box.classList.remove('is-now');
        next = getNextRace();
      }, 60000);
      return;
    }

    var totalSec = Math.floor(diff / 1000);
    var days = Math.floor(totalSec / 86400);
    var hours = Math.floor((totalSec % 86400) / 3600);
    var mins = Math.floor((totalSec % 3600) / 60);
    var secs = totalSec % 60;

    labelEl.textContent = next.label;
    els.d.textContent = pad(days);
    els.h.textContent = pad(hours);
    els.m.textContent = pad(mins);
    els.s.textContent = pad(secs);
  }

  tick();
  setInterval(tick, 1000);
})();
