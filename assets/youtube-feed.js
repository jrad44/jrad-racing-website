/* JRAD Racing — homepage "latest video" + "recent uploads" auto-updater.
   Pulls the channel's public RSS feed (no API key needed for the feed
   itself) so the homepage always shows real, current uploads without
   anyone having to edit HTML.

   ============================================================
   EDIT ME — ONE THING REQUIRED: your YouTube channel ID
   ============================================================
   The RSS feed needs your channel's ID (looks like "UCxxxxxxxxxxxxxxxx"),
   not your @handle. Quickest ways to find it:
     1. Go to your channel, open any video, view page source (Ctrl/Cmd+U),
        and search for "channelId". Or:
     2. Use a free "YouTube channel ID lookup" tool and paste in
        https://www.youtube.com/@Jradracing
   Paste it below in place of the empty string.
*/
var YOUTUBE_CHANNEL_ID = '';

(function () {
  if (!YOUTUBE_CHANNEL_ID) {
    // No channel ID set yet — leave the static fallback cards/links in
    // place rather than trying (and failing) to fetch anything.
    return;
  }

  var FEED_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + encodeURIComponent(YOUTUBE_CHANNEL_ID);

  // rss2json proxies the feed with CORS enabled and turns it into JSON,
  // since YouTube's raw RSS feed can't be fetched directly from browser JS.
  // Free/keyless use is rate-limited; if you outgrow that, get a free API
  // key at https://rss2json.com and append "&api_key=YOURKEY" below.
  var PROXY_URL = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(FEED_URL);

  function videoIdFromLink(link) {
    try {
      var url = new URL(link);
      return url.searchParams.get('v');
    } catch (e) {
      return null;
    }
  }

  function formatDate(pubDate) {
    try {
      var d = new Date(pubDate);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  function renderFeatured(item) {
    var frame = document.getElementById('latestVideoFrame');
    var meta = document.getElementById('latestVideoMeta');
    if (!frame || !item) return;
    var id = videoIdFromLink(item.link);
    if (!id) return;
    frame.src = 'https://www.youtube.com/embed/' + id;
    if (meta) meta.textContent = '"' + item.title + '" — auto-pulled from YouTube';
  }

  function renderGrid(items) {
    var grid = document.getElementById('recentVideosGrid');
    if (!grid || !items || !items.length) return;
    grid.innerHTML = '';
    items.slice(0, 3).forEach(function (item) {
      var id = videoIdFromLink(item.link);
      if (!id) return;
      var thumb = (item.thumbnail) || ('https://i.ytimg.com/vi/' + id + '/hqdefault.jpg');
      var a = document.createElement('a');
      a.className = 'video-card';
      a.href = item.link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML =
        '<div class="video-thumb-wrap"><img src="' + thumb + '" alt="" loading="lazy"></div>' +
        '<div class="video-card-body"><h4>' + item.title.replace(/</g, '&lt;') + '</h4>' +
        '<span class="video-date">' + formatDate(item.pubDate) + '</span></div>';
      grid.appendChild(a);
    });
  }

  fetch(PROXY_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('feed proxy error');
      return res.json();
    })
    .then(function (data) {
      if (!data || !data.items || !data.items.length) throw new Error('empty feed');
      renderFeatured(data.items[0]);
      renderGrid(data.items);
    })
    .catch(function () {
      // Fetch failed (offline, feed unreachable, rate-limited) — leave the
      // static fallback cards/links already in the HTML untouched.
    });
})();
