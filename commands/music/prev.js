const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { playPrevious, hasHistoryItems, getCurrentTrack } = require('../../player/queue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prev')
    .setDescription('Запускает предыдущую песню'),

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

    const currentTrack = getCurrentTrack(interaction.guild.id);
    const hasHistory = hasHistoryItems(interaction.guild.id);

    if (!currentTrack) {
      return await interaction.reply({
        content: 'Сейчас ничего не воспроизводится.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!hasHistory) {
      return await interaction.reply({
        content: 'Предыдущей песни нет.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const success = await playPrevious(interaction.guild.id);

    if (!success) {
      return await interaction.reply({
        content: 'Не удалось запустить предыдущую песню.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply('Включаю предыдущую песню.');
  },
};