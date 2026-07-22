const {
  createAudioPlayer,
  NoSubscriberBehavior,
  AudioPlayerStatus,
} = require('@discordjs/voice');

const players = new Map();

function getOrCreatePlayer(guildId) {
  if (players.has(guildId)) {
    return players.get(guildId);
  }

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });

  player.on(AudioPlayerStatus.Playing, () => {
    console.log(`[${guildId}] Плеер начал воспроизведение.`);
  });

  player.on(AudioPlayerStatus.Idle, () => {
    console.log(`[${guildId}] Плеер перешел в Idle.`);
  });

  player.on('error', error => {
    console.error(`[${guildId}] Ошибка аудиоплеера:`, error.message);
  });

  players.set(guildId, player);
  return player;
}

function getPlayer(guildId) {
  return players.get(guildId);
}

function deletePlayer(guildId) {
  players.delete(guildId);
}

module.exports = {
  getOrCreatePlayer,
  getPlayer,
  deletePlayer,
};