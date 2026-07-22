const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice');
const player = require('../../player/player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Ставит воспроизведение на паузу'),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return await interaction.reply({
        content: 'Сначала зайди в голосовой канал.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const connection = getVoiceConnection(interaction.guild.id);

    if (!connection) {
      return await interaction.reply({
        content: 'Бот сейчас не подключен к голосовому каналу.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (connection.joinConfig.channelId !== voiceChannel.id) {
      return await interaction.reply({
        content: 'Ты должен находиться в том же голосовом канале, что и бот.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (player.state.status === AudioPlayerStatus.Idle) {
      return await interaction.reply({
        content: 'Сейчас ничего не воспроизводится.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (player.state.status === AudioPlayerStatus.Paused) {
      return await interaction.reply({
        content: 'Музыка уже стоит на паузе.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const paused = player.pause();

    if (!paused) {
      return await interaction.reply({
        content: 'Не удалось поставить воспроизведение на паузу.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply('Воспроизведение поставлено на паузу.');
  },
};