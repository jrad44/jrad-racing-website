/* JRAD Racing — homepage "latest video" + "recent uploads" auto-updater.
   Pulls the channel's latest live streams and videos so the homepage
   always shows real, current uploads.
*/
var YOUTUBE_CHANNEL_ID = 'UCmD1eyYuMiWdinLPVCJh7qA';

(function () {
  function renderFeatured(item) {
    var frame = document.getElementById('latestVideoFrame');
    var meta = document.getElementById('latestVideoMeta');
    if (!frame || !item) return;
    var id = item.id;
    if (!id && item.link) {
      try {
        var url = new URL(item.link);
        id = url.searchParams.get('v');
      } catch (e) {}
    }
    if (!id) return;
    frame.src = 'https://www.youtube.com/embed/' + id;
    if (meta) meta.textContent = '"' + item.title + '" — Latest live stream';
  }

  function renderGrid(items) {
    var grid = document.getElementById('recentVideosGrid');
    if (!grid || !items || !items.length) return;
    grid.innerHTML = '';
    items.slice(0, 3).forEach(function (item) {
      var id = item.id;
      if (!id && item.link) {
        try {
          var url = new URL(item.link);
          id = url.searchParams.get('v');
        } catch (e) {}
      }
      if (!id) return;
      var link = item.link || ('https://www.youtube.com/watch?v=' + id);
      var thumb = item.thumb || item.thumbnail || ('https://i.ytimg.com/vi/' + id + '/hqdefault.jpg');
      var dateText = item.date || (item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

      var a = document.createElement('a');
      a.className = 'video-card';
      a.href = link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML =
        '<div class="video-thumb-wrap"><img src="' + thumb + '" alt="' + item.title.replace(/"/g, '&quot;') + '" loading="lazy"></div>' +
        '<div class="video-card-body"><h4>' + item.title.replace(/</g, '&lt;') + '</h4>' +
        (dateText ? '<span class="video-date">' + dateText + '</span>' : '') + '</div>';
      grid.appendChild(a);
    });
  }

  // First try the local API route which fetches directly from YouTube
  fetch('/api/youtube-recent')
    .then(function (res) {
      if (!res.ok) throw new Error('API route failed');
      return res.json();
    })
    .then(function (data) {
      if (data && data.latest) renderFeatured(data.latest);
      if (data && data.items && data.items.length) renderGrid(data.items);
    })
    .catch(function () {
      // If API fails or runs client-only, fallback to pre-rendered HTML cards
    });
})();
