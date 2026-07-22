const {
  createAudioPlayer,
  NoSubscriberBehavior,
  AudioPlayerStatus,
} = require('@discordjs/voice');

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause,
  },
});

player.on(AudioPlayerStatus.Playing, () => {
  console.log('Плеер начал воспроизведение.');
});

player.on(AudioPlayerStatus.Idle, () => {
  console.log('Плеер сейчас ничего не воспроизводит.');
});

player.on('error', error => {
  console.error('Ошибка аудиоплеера:', error.message);
});

module.exports = player;