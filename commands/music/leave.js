const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

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

    connection.destroy();

    await interaction.reply('Я вышел из голосового канала.');
  },
};