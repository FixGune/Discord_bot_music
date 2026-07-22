const ytSearch = require('yt-search');
const { spawn } = require('node:child_process');

const YT_DLP_PATH = 'D:\\BotTools\\yt-dlp\\yt-dlp.exe';

function normalizeYoutubeUrl(video) {
  if (video.url && typeof video.url === 'string') {
    return video.url;
  }

  if (video.videoId && typeof video.videoId === 'string') {
    return `https://www.youtube.com/watch?v=${video.videoId}`;
  }

  return null;
}

async function searchYoutube(query) {
  const result = await ytSearch(query);

  return result.videos
    .map(video => {
      const url = normalizeYoutubeUrl(video);

      return {
        title: video.title,
        url,
        duration: video.timestamp || '00:00',
        thumbnail: video.thumbnail || null,
        author: video.author?.name || 'Unknown',
      };
    })
    .filter(video => video.url)
    .slice(0, 10);
}

function getYoutubeStream(url) {
  if (!url || typeof url !== 'string') {
    throw new Error(`Некорректный URL для getYoutubeStream: ${url}`);
  }

  const process = spawn(YT_DLP_PATH, [
    '-f', 'bestaudio',
    '-o', '-',
    url,
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  process.stderr.on('data', data => {
    console.error('[yt-dlp stderr]', data.toString());
  });

  process.on('error', error => {
    console.error('[yt-dlp process error]', error.message);
  });

  return process.stdout;
}

module.exports = {
  searchYoutube,
  getYoutubeStream,
};