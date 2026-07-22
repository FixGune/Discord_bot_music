const { createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { getOrCreatePlayer, getPlayer } = require('./player');
const { getYoutubeStream } = require('../services/youtube');

const queues = new Map();

function getOrCreateGuildState(guildId) {
  if (queues.has(guildId)) {
    return queues.get(guildId);
  }

  const state = {
    currentTrack: null,
    queue: [],
    history: [],
    isTransitioning: false,
  };

  queues.set(guildId, state);

  const player = getOrCreatePlayer(guildId);

  player.on(AudioPlayerStatus.Idle, () => {
    handleTrackEnd(guildId);
  });

  return state;
}

function getGuildState(guildId) {
  return queues.get(guildId);
}

function clearGuildState(guildId) {
  queues.delete(guildId);
}

function addTrack(guildId, track) {
  const state = getOrCreateGuildState(guildId);

  if (!track || typeof track !== 'object') {
    throw new Error('В addTrack передан некорректный track');
  }

  if (!track.title || !track.url) {
    throw new Error(`В addTrack передан track без title/url: ${JSON.stringify(track)}`);
  }

  const normalizedTrack = {
    title: track.title,
    url: track.url,
    duration: track.duration || '00:00',
    thumbnail: track.thumbnail || null,
    author: track.author || 'Unknown',
    requestedBy: track.requestedBy || null,
  };

  state.queue.push(normalizedTrack);

  console.log(`[${guildId}] Трек добавлен в очередь ->`, normalizedTrack);
  console.log(`[${guildId}] Размер очереди после добавления: ${state.queue.length}`);
}

async function createTrackResource(track) {
  if (!track || typeof track !== 'object') {
    throw new Error('Трек не передан в createTrackResource');
  }

  if (!track.url || typeof track.url !== 'string') {
    throw new Error(`У трека отсутствует корректный url: ${JSON.stringify(track)}`);
  }

  if (track.url.includes('youtube.com') || track.url.includes('youtu.be')) {
    const stream = getYoutubeStream(track.url);
    return createAudioResource(stream);
  }

  return createAudioResource(track.url);
}

async function playTrack(guildId, track, options = {}) {
  const state = getOrCreateGuildState(guildId);
  const player = getOrCreatePlayer(guildId);
  const { addToHistory = true } = options;

  if (state.currentTrack && addToHistory) {
    state.history.push(state.currentTrack);
  }

  state.currentTrack = track;

  console.log(`[${guildId}] playTrack ->`, {
  title: track?.title,
  url: track?.url,
  duration: track?.duration,
});

  const resource = await createTrackResource(track);
  player.play(resource);
}

async function playNext(guildId) {
  const state = getOrCreateGuildState(guildId);

  if (state.queue.length === 0) {
    state.currentTrack = null;
    return false;
  }

  const nextTrack = state.queue.shift();
  await playTrack(guildId, nextTrack, { addToHistory: true });
  return true;
}

async function playPrevious(guildId) {
  const state = getOrCreateGuildState(guildId);

  if (state.history.length === 0) {
    return false;
  }

  if (state.currentTrack) {
    state.queue.unshift(state.currentTrack);
  }

  const previousTrack = state.history.pop();
  await playTrack(guildId, previousTrack, { addToHistory: false });
  return true;
}

function stopAndClear(guildId) {
  const state = getOrCreateGuildState(guildId);
  const player = getPlayer(guildId);

  state.currentTrack = null;
  state.queue = [];
  state.history = [];
  state.isTransitioning = true;

  if (player) {
    player.stop(true);
  }
}

async function skipTrack(guildId) {
  const state = getOrCreateGuildState(guildId);
  const player = getPlayer(guildId);

  console.log(`[${guildId}] skipTrack вызван`);
  console.log(`[${guildId}] currentTrack:`, state.currentTrack);
  console.log(`[${guildId}] queue before skip:`, state.queue);

  if (!state.currentTrack) {
    return { success: false, reason: 'NO_CURRENT_TRACK' };
  }

  if (state.queue.length === 0) {
    state.currentTrack = null;

    if (player) {
      state.isTransitioning = true;
      player.stop(true);
    }

    return { success: false, reason: 'NO_NEXT_TRACK' };
  }

  const nextTrack = state.queue.shift();

  if (!nextTrack || !nextTrack.url) {
    console.error(`[${guildId}] Некорректный nextTrack в skipTrack:`, nextTrack);
    return { success: false, reason: 'INVALID_NEXT_TRACK' };
  }

  state.history.push(state.currentTrack);
  state.currentTrack = nextTrack;

  console.log(`[${guildId}] nextTrack после shift:`, nextTrack);

  const resource = await createTrackResource(nextTrack);
  player.play(resource);

  return { success: true, track: nextTrack };
}

async function handleTrackEnd(guildId) {
  const state = getGuildState(guildId);

  if (!state) return;

  console.log(`[${guildId}] handleTrackEnd вызван`);
  console.log(`[${guildId}] currentTrack до обработки:`, state.currentTrack?.title ?? null);
  console.log(`[${guildId}] queue length до обработки: ${state.queue.length}`);
  console.log(`[${guildId}] queue snapshot:`, state.queue);

  if (state.isTransitioning) {
    state.isTransitioning = false;
    return;
  }

  if (state.queue.length === 0) {
    state.currentTrack = null;
    console.log(`[${guildId}] Очередь пуста, currentTrack сброшен.`);
    return;
  }

  const nextTrack = state.queue.shift();

  if (!nextTrack || !nextTrack.url) {
    console.error(`[${guildId}] Некорректный nextTrack в handleTrackEnd:`, nextTrack);
    state.currentTrack = null;
    return;
  }

  await playTrack(guildId, nextTrack, { addToHistory: true });
}

function getCurrentTrack(guildId) {
  const state = getOrCreateGuildState(guildId);
  return state.currentTrack;
}

function hasQueueItems(guildId) {
  const state = getOrCreateGuildState(guildId);
  return state.queue.length > 0;
}

function hasHistoryItems(guildId) {
  const state = getOrCreateGuildState(guildId);
  return state.history.length > 0;
}

module.exports = {
  getOrCreateGuildState,
  getGuildState,
  clearGuildState,
  addTrack,
  playTrack,
  playNext,
  playPrevious,
  stopAndClear,
  skipTrack,
  getCurrentTrack,
  hasQueueItems,
  hasHistoryItems,
};