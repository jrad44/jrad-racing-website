const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

const defaultVideos = [
  {
    id: 'sUui-hHkOJ8',
    title: 'Nurburgring 24hr - Porsche GT3 2nd half',
    link: 'https://www.youtube.com/watch?v=sUui-hHkOJ8',
    date: 'May 2, 2026',
    thumb: 'https://i.ytimg.com/vi/sUui-hHkOJ8/hqdefault.jpg'
  },
  {
    id: 'bLE-Au1MkFc',
    title: 'Nurburgring 24hr - Porsche GT3 Stint 1',
    link: 'https://www.youtube.com/watch?v=bLE-Au1MkFc',
    date: 'May 2, 2026',
    thumb: 'https://i.ytimg.com/vi/bLE-Au1MkFc/hqdefault.jpg'
  },
  {
    id: 'WI00u9YPLrM',
    title: 'Lets Race! iRacing',
    link: 'https://www.youtube.com/watch?v=WI00u9YPLrM',
    date: 'Mar 6, 2026',
    thumb: 'https://i.ytimg.com/vi/WI00u9YPLrM/hqdefault.jpg'
  }
];

let cache = { data: defaultVideos, lastFetched: 0 };

async function fetchChannelVideos() {
  const now = Date.now();
  if (now - cache.lastFetched < 10 * 60 * 1000 && cache.data.length > 0) {
    return cache.data;
  }
  try {
    const res = await fetch('https://www.youtube.com/@Jradracing/streams', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!res.ok) return cache.data;
    const html = await res.text();
    const reg = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    const ids = [];
    let m;
    while ((m = reg.exec(html)) !== null) {
      if (!ids.includes(m[1])) ids.push(m[1]);
      if (ids.length >= 5) break;
    }
    if (!ids.length) return cache.data;

    const items = [];
    for (const id of ids.slice(0, 3)) {
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
        const oembed = oembedRes.ok ? await oembedRes.json() : null;
        items.push({
          id,
          title: oembed?.title || 'JRAD Racing Stream',
          link: `https://www.youtube.com/watch?v=${id}`,
          date: 'Recent stream',
          thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
        });
      } catch (err) {
        items.push({
          id,
          title: 'JRAD Racing Stream',
          link: `https://www.youtube.com/watch?v=${id}`,
          date: 'Recent stream',
          thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
        });
      }
    }
    cache = { data: items.length ? items : defaultVideos, lastFetched: now };
    return cache.data;
  } catch (e) {
    return cache.data;
  }
}

app.get('/api/youtube-recent', async (req, res) => {
  const videos = await fetchChannelVideos();
  res.json({
    latest: videos[0] || defaultVideos[0],
    items: videos.slice(0, 3)
  });
});

// Serve static assets and HTML files with cache control to prevent stale assets
app.use(express.static(__dirname, {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// Route fallback for client navigation
app.get('*', (req, res, next) => {
  if (path.extname(req.path)) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`JRAD Racing server listening at http://${HOST}:${PORT}`);
});
