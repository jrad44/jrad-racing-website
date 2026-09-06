/* JRAD Racing — live Twitch status badge for the nav "Watch Live" button.
   Loaded on every page. Uses Twitch's public embed JS API (no API key /
   client ID needed) to check whether the channel is currently streaming,
   and swaps the button label + style between "🔴 LIVE NOW" and "Offline".

   How it works: we create a real (but visually hidden) Twitch.Player
   instance for the channel. Twitch's embed SDK fires ONLINE / OFFLINE
   events on that player reflecting the channel's actual live status,
   and keeps firing them in real time if status changes while the page
   is open — so this also self-updates without a page refresh.

   EDIT ME: change TWITCH_CHANNEL below if the channel name ever changes. */
(function () {
  var TWITCH_CHANNEL = 'jradracing';

  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-watch-live]'));
  if (!buttons.length) return;

  var LABEL_DEFAULT = buttons.map(function (b) { return b.innerHTML; });

  function setState(state) {
    buttons.forEach(function (btn, i) {
      btn.classList.remove('is-live', 'is-offline');
      if (state === 'live') {
        btn.classList.add('is-live');
        btn.innerHTML = '<span class="live-dot"></span> LIVE NOW';
      } else if (state === 'offline') {
        btn.classList.add('is-offline');
        btn.textContent = 'Offline';
      } else {
        // unknown / not yet determined — leave the original "Watch Live" label
        btn.innerHTML = LABEL_DEFAULT[i];
      }
    });
  }

  // Hidden host element for the status-checking player. It still has to be
  // a real element in the document (Twitch's SDK renders into it), just
  // sized to nothing and out of the tab order / screen readers.
  var host = document.createElement('div');
  host.id = 'twitch-status-check';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;top:-9999px;';
  document.body.appendChild(host);

  function boot() {
    if (typeof Twitch === 'undefined' || !Twitch.Player) return;

    var player = new Twitch.Player('twitch-status-check', {
      channel: TWITCH_CHANNEL,
      width: 2,
      height: 2,
      muted: true,
      autoplay: true,
      controls: false
    });

    player.addEventListener(Twitch.Player.ONLINE, function () { setState('live'); });
    player.addEventListener(Twitch.Player.OFFLINE, function () { setState('offline'); });

    // Fallback: if neither event has fired after a few seconds (slow
    // network, ad blocker, etc.) just leave the default "Watch Live" label
    // rather than showing something stale/wrong.
    setTimeout(function () {
      // no-op placeholder for future retry logic if ever needed
    }, 8000);
  }

  var script = document.createElement('script');
  script.src = 'https://embed.twitch.tv/embed/v1.js';
  script.async = true;
  script.onload = boot;
  script.onerror = function () { /* Twitch script blocked/unreachable — keep default label */ };
  document.head.appendChild(script);
})();
