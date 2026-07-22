const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection, joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Подключает бота к вашему голосовому каналу'),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return await interaction.reply({
        content: 'Сначала зайди в голосовой канал.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const existingConnection = getVoiceConnection(interaction.guild.id);

    if (existingConnection) {
      existingConnection.destroy();
    }

    try {
      joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      await interaction.reply(`Я подключился к каналу: ${voiceChannel.name}`);
    } catch (error) {
      console.error(error);

      await interaction.reply({
        content: 'Не удалось подключиться к голосовому каналу.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};