const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const {
  getVoiceConnection,
  joinVoiceChannel,
  createAudioResource,
  StreamType,
} = require('@discordjs/voice');
const player = require('../../player/player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Воспроизводит тестовый аудиотрек'),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return await interaction.reply({
        content: 'Сначала зайди в голосовой канал.',
        flags: MessageFlags.Ephemeral,
      });
    }

    let connection = getVoiceConnection(interaction.guild.id);

    if (!connection) {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });
    }

    connection.subscribe(player);

    const resource = createAudioResource(
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      {
        inputType: StreamType.Arbitrary,
      }
    );

    player.play(resource);

    await interaction.reply('Начинаю воспроизведение тестового трека.');
  },
};