const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Проверяет, отвечает ли бот'),
  
  async execute(interaction) {
    await interaction.reply('Pong!');
  },
};