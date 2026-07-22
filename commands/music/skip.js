const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { skipTrack, getCurrentTrack, hasQueueItems } = require('../../player/queue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Пропускает текущую музыку и включает следующую'),

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
    const hasQueue = hasQueueItems(interaction.guild.id);

    if (!currentTrack) {
      return await interaction.reply({
        content: 'Сейчас ничего не воспроизводится.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!hasQueue) {
      return await interaction.reply({
        content: 'Следующей песни в очереди нет.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const result = await skipTrack(interaction.guild.id);

    if (!result.success) {
      return await interaction.reply({
        content: 'Не удалось пропустить текущую песню.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply(`Пропускаю. Сейчас играет: ${result.track.title}`);
  },
};