const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection, joinVoiceChannel } = require('@discordjs/voice');
const { getOrCreatePlayer } = require('../../player/player');
const { playTrack, getCurrentTrack } = require('../../player/queue');

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

    const player = getOrCreatePlayer(interaction.guild.id);
    connection.subscribe(player);

    const currentTrack = getCurrentTrack(interaction.guild.id);

    const track = {
      title: 'SoundHelix Song 1',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    };

    playTrack(interaction.guild.id, track, {
      addToHistory: currentTrack !== null,
    });

    await interaction.reply(`Начинаю воспроизведение: ${track.title}`);
  },
};