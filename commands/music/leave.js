const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { getPlayer, deletePlayer } = require('../../player/player');
const { stopAndClear, clearGuildState } = require('../../player/queue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Отключает бота от голосового канала'),

  async execute(interaction) {
    const connection = getVoiceConnection(interaction.guild.id);

    if (!connection) {
      return await interaction.reply({
        content: 'Я сейчас не подключен ни к одному голосовому каналу.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const player = getPlayer(interaction.guild.id);

    if (player) {
      stopAndClear(interaction.guild.id);
      deletePlayer(interaction.guild.id);
    } else {
      clearGuildState(interaction.guild.id);
    }

    connection.destroy();

    await interaction.reply('Я вышел из голосового канала и очистил очередь.');
  },
};