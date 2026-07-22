const {
  createAudioResource,
  StreamType,
  AudioPlayerStatus,
} = require('@discordjs/voice');
const { getOrCreatePlayer, getPlayer } = require('./player');

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

function addTrack(guildId, track) {
  const state = getOrCreateGuildState(guildId);
  state.queue.push(track);
}

function createTrackResource(track) {
  return createAudioResource(track.url, {
    inputType: StreamType.Arbitrary,
  });
}

function playTrack(guildId, track, options = {}) {
  const state = getOrCreateGuildState(guildId);
  const player = getOrCreatePlayer(guildId);
  const { addToHistory = true } = options;

  if (state.currentTrack && addToHistory) {
    state.history.push(state.currentTrack);
  }

  state.currentTrack = track;

  const resource = createTrackResource(track);
  player.play(resource);
}

function playNext(guildId) {
  const state = getOrCreateGuildState(guildId);

  if (state.queue.length === 0) {
    state.currentTrack = null;
    return false;
  }

  const nextTrack = state.queue.shift();
  playTrack(guildId, nextTrack, { addToHistory: true });
  return true;
}

function playPrevious(guildId) {
  const state = getOrCreateGuildState(guildId);

  if (state.history.length === 0) {
    return false;
  }

  if (state.currentTrack) {
    state.queue.unshift(state.currentTrack);
  }

  const previousTrack = state.history.pop();
  playTrack(guildId, previousTrack, { addToHistory: false });
  return true;
}

function skipTrack(guildId) {
  const state = getOrCreateGuildState(guildId);
  const player = getPlayer(guildId);

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

  state.history.push(state.currentTrack);

  const nextTrack = state.queue.shift();
  state.currentTrack = nextTrack;

  const resource = createTrackResource(nextTrack);
  player.play(resource);

  return { success: true, track: nextTrack };
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

function handleTrackEnd(guildId) {
  const state = getGuildState(guildId);

  if (!state) return;

  if (state.isTransitioning) {
    state.isTransitioning = false;
    return;
  }

  if (state.queue.length === 0) {
    state.currentTrack = null;
    return;
  }

  const nextTrack = state.queue.shift();
  playTrack(guildId, nextTrack, { addToHistory: true });
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

function clearGuildState(guildId) {
  queues.delete(guildId);
}

module.exports = {
  getOrCreateGuildState,
  getGuildState,
  addTrack,
  playTrack,
  playNext,
  playPrevious,
  stopAndClear,
  clearGuildState,
  getCurrentTrack,
  hasQueueItems,
  hasHistoryItems,
  skipTrack,
};