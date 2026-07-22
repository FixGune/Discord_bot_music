const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { getPlayer } = require('../../player/player');
const { getCurrentTrack, hasQueueItems, hasHistoryItems, stopAndClear } = require('../../player/queue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Останавливает музыку и очищает очередь'),

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

    const player = getPlayer(interaction.guild.id);
    const currentTrack = getCurrentTrack(interaction.guild.id);
    const hasQueue = hasQueueItems(interaction.guild.id);
    const hasHistory = hasHistoryItems(interaction.guild.id);

    if (!player && !currentTrack && !hasQueue && !hasHistory) {
      return await interaction.reply({
        content: 'Сейчас нечего останавливать.',
        flags: MessageFlags.Ephemeral,
      });
    }

    stopAndClear(interaction.guild.id);

    await interaction.reply('Воспроизведение остановлено, очередь очищена.');
  },
};