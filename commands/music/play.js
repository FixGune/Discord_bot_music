const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection, joinVoiceChannel } = require('@discordjs/voice');
const { getOrCreatePlayer } = require('../../player/player');
const { getCurrentTrack, playTrack, getOrCreateGuildState, addTrack } = require('../../player/queue');
const { searchYoutube } = require('../../services/youtube');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Ищет трек и добавляет его в очередь')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Название песни или ссылка')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();

    if (!focusedValue || focusedValue.trim().length < 2) {
      return await interaction.respond([]);
    }

    try {
      const results = await searchYoutube(focusedValue);

      await interaction.respond(
        results.slice(0, 10).map(track => ({
          name: track.title.slice(0, 100),
          value: track.url,
        }))
      );
    } catch (error) {
      console.error('Ошибка autocomplete /play:', error.message);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return await interaction.reply({
        content: 'Сначала зайди в голосовой канал.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const query = interaction.options.getString('query', true);

    await interaction.deferReply();

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

    let selectedTrack = null;

    if (query.startsWith('http://') || query.startsWith('https://')) {
      const results = await searchYoutube(query);
      selectedTrack = results[0] || null;
    } else {
      const results = await searchYoutube(query);
      selectedTrack = results[0] || null;
    }

    if (!selectedTrack) {
      return await interaction.editReply('По твоему запросу ничего не найдено.');
    }

    const track = {
      title: selectedTrack.title,
      url: selectedTrack.url,
      duration: selectedTrack.duration,
      thumbnail: selectedTrack.thumbnail,
      author: selectedTrack.author,
      requestedBy: interaction.user.id,
    };

    console.log('track из /play:', track);

    const currentTrack = getCurrentTrack(interaction.guild.id);
    const guildState = getOrCreateGuildState(interaction.guild.id);

    if (!currentTrack) {
      await playTrack(interaction.guild.id, track, { addToHistory: false });

      return await interaction.editReply(
        `Сейчас играет: ${track.title}\nДлительность: ${track.duration}`
      );
    }

    const queuePosition = guildState.queue.length + 1;
    addTrack(interaction.guild.id, track);

    await interaction.editReply(
      `Добавлено в очередь: ${track.title}\nДлительность: ${track.duration}\nПозиция в очереди: ${queuePosition}`
    );
  },
};