const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection, joinVoiceChannel } = require('@discordjs/voice');
const { getOrCreatePlayer } = require('../../player/player');
const {
  getCurrentTrack,
  playTrack,
  getOrCreateGuildState,
  addTrack,
} = require('../../player/queue');
const {
  createPlaylist,
  deletePlaylist,
  getPlaylistByName,
  getGuildPlaylists,
  getPlaylistTracks,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
} = require('../../services/playlists');
const { searchYoutube } = require('../../services/youtube');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Управление серверными плейлистами')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Создать новый плейлист')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Название плейлиста')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Удалить плейлист')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Название плейлиста')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Добавить трек в плейлист')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Название плейлиста')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('song')
            .setDescription('Название песни или ссылка')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('Воспроизвести плейлист')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Название плейлиста')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Удалить трек из плейлиста')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Название плейлиста')
            .setRequired(true)
            .setAutocomplete(true)
        )
    .addStringOption(option =>
          option
            .setName('track')
            .setDescription('Трек для удаления')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async autocomplete(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'name') {
        const guildId = interaction.guild.id;
        const typedValue = String(focusedOption.value || '').toLowerCase();

        const playlists = getGuildPlaylists(guildId);

        const filtered = playlists
          .filter(playlist => playlist.name.toLowerCase().includes(typedValue))
          .slice(0, 25)
          .map(playlist => ({
            name: playlist.name,
            value: playlist.name,
          }));

        return await interaction.respond(filtered);
      }

      if (subcommand === 'add' && focusedOption.name === 'song') {
        const query = String(focusedOption.value || '').trim();

        if (query.length < 2) {
          return await interaction.respond([]);
        }

        const results = await searchYoutube(query);

        return await interaction.respond(
          results.slice(0, 10).map(track => ({
            name: track.title.slice(0, 100),
            value: track.url,
          }))
        );
      }
      if (subcommand === 'remove' && focusedOption.name === 'track') {
        const guildId = interaction.guild.id;
        const playlistName = String(interaction.options.getString('name') || '').trim();

        if (!playlistName) {
            return await interaction.respond([]);
        }

        const playlist = getPlaylistByName(guildId, playlistName);

        if (!playlist) {
            return await interaction.respond([]);
        }

        const typedValue = String(focusedOption.value || '').toLowerCase();
        const tracks = getPlaylistTracks(playlist.id);

        const filtered = tracks
            .filter(track => track.title.toLowerCase().includes(typedValue))
            .slice(0, 25)
            .map(track => ({
            name: track.title.slice(0, 100),
            value: String(track.id),
            }));

         return await interaction.respond(filtered);
        }

      return await interaction.respond([]);
    } catch (error) {
      console.error('Ошибка autocomplete /playlist:', error);
      try {
        await interaction.respond([]);
      } catch {}
    }
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const rawName = interaction.options.getString('name', true);
    const name = rawName.trim();

    if (!name) {
      return await interaction.reply({
        content: 'Название плейлиста не может быть пустым.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === 'create') {
      const existingPlaylist = getPlaylistByName(guildId, name);

      if (existingPlaylist) {
        return await interaction.reply({
          content: `Плейлист "${existingPlaylist.name}" уже существует на этом сервере.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        const playlist = createPlaylist(guildId, name, userId);

        if (!playlist) {
          return await interaction.reply({
            content: `Не удалось создать плейлист "${name}". Возможно, он уже существует.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        return await interaction.reply(`Плейлист "${playlist.name}" создан.`);
      } catch (error) {
        console.error('Ошибка create /playlist:', error);

        return await interaction.reply({
          content: 'Произошла ошибка при создании плейлиста.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }

            if (subcommand === 'delete') {
        const existingPlaylist = getPlaylistByName(guildId, name);

        if (!existingPlaylist) {
            return await interaction.reply({
            content: `Плейлист "${name}" не найден на этом сервере.`,
            flags: MessageFlags.Ephemeral,
            });
        }

        if (isFavoritePlaylistName(name)) {
            return await interaction.reply({
            content: `Плейлист "${FAVORITE_PLAYLIST_NAME}" защищён от удаления.`,
            flags: MessageFlags.Ephemeral,
            });
        }

            if (!existingPlaylist) {
                return await interaction.reply({
                content: `Плейлист "${name}" не найден на этом сервере.`,
                flags: MessageFlags.Ephemeral,
                });
            }

      try {
        const deleted = deletePlaylist(guildId, name);

        if (!deleted) {
          return await interaction.reply({
            content: `Не удалось удалить плейлист "${name}".`,
            flags: MessageFlags.Ephemeral,
          });
        }

        return await interaction.reply(`Плейлист "${name}" удалён.`);
      } catch (error) {
        console.error('Ошибка delete /playlist:', error);

        return await interaction.reply({
          content: 'Произошла ошибка при удалении плейлиста.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (subcommand === 'add') {
      const existingPlaylist = getPlaylistByName(guildId, name);

      if (!existingPlaylist) {
        return await interaction.reply({
          content: `Плейлист "${name}" не найден на этом сервере. Сначала создай его через /playlist create.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const song = interaction.options.getString('song', true).trim();

      if (!song) {
        return await interaction.reply({
          content: 'Название или ссылка на песню не может быть пустой.',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply();

      try {
        const results = await searchYoutube(song);
        const selectedTrack = results[0] || null;

        if (!selectedTrack) {
          return await interaction.editReply('По твоему запросу ничего не найдено на YouTube.');
        }

        const track = {
          title: selectedTrack.title,
          url: selectedTrack.url,
          duration: selectedTrack.duration,
          thumbnail: selectedTrack.thumbnail,
          author: selectedTrack.author,
        };

        const result = addTrackToPlaylist(guildId, name, track, userId);

        if (!result.success) {
          if (result.reason === 'PLAYLIST_NOT_FOUND') {
            return await interaction.editReply(`Плейлист "${name}" не найден.`);
          }

          return await interaction.editReply('Не удалось добавить трек в плейлист.');
        }

        return await interaction.editReply(
          `Добавлено в плейлист "${name}": ${track.title}\nДлительность: ${track.duration}`
        );
      } catch (error) {
        console.error('Ошибка add /playlist:', error);

        return await interaction.editReply('Произошла ошибка при добавлении трека в плейлист.');
      }
    }

    if (subcommand === 'play') {
      const playlist = getPlaylistByName(guildId, name);

      if (!playlist) {
        return await interaction.reply({
          content: `Плейлист "${name}" не найден на этом сервере.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const tracks = getPlaylistTracks(playlist.id);

      if (tracks.length === 0) {
        return await interaction.reply({
          content: `Плейлист "${name}" пуст. Сначала добавь треки через /playlist add.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return await interaction.reply({
          content: 'Сначала зайди в голосовой канал.',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply();

      try {
        let connection = getVoiceConnection(guildId);

        if (!connection) {
          connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
          });
        }

        const player = getOrCreatePlayer(guildId);
        connection.subscribe(player);

        const queueTracks = tracks.map(track => ({
          title: track.title,
          url: track.url,
          duration: track.duration,
          thumbnail: track.thumbnail,
          author: track.author,
          requestedBy: userId,
        }));

        const currentTrack = getCurrentTrack(guildId);
        const guildState = getOrCreateGuildState(guildId);

        let firstTrackStarted = false;
        let queuedCount = 0;

        for (const track of queueTracks) {
          if (!currentTrack && !firstTrackStarted) {
            await playTrack(guildId, track, { addToHistory: false });
            firstTrackStarted = true;
            continue;
          }

          addTrack(guildId, track);
          queuedCount += 1;
        }

        const startedMessage = firstTrackStarted
          ? `Сейчас играет: ${queueTracks[0].title}\n`
          : '';

        return await interaction.editReply(
          `${startedMessage}Плейлист "${name}" запущен.\nДобавлено в очередь: ${queuedCount} трек(ов).\nВсего в плейлисте: ${queueTracks.length}.`
        );
      } catch (error) {
        console.error('Ошибка play /playlist:', error);

        return await interaction.editReply('Произошла ошибка при запуске плейлиста.');
      }
    }

        if (subcommand === 'remove') {
        const existingPlaylist = getPlaylistByName(guildId, name);

        if (!existingPlaylist) {
            return await interaction.reply({
            content: `Плейлист "${name}" не найден на этом сервере.`,
            flags: MessageFlags.Ephemeral,
            });
        }

        const trackIdRaw = interaction.options.getString('track', true).trim();
        const trackId = Number(trackIdRaw);

        if (!trackIdRaw || Number.isNaN(trackId)) {
            return await interaction.reply({
            content: 'Некорректный трек. Выбери трек из подсказок автокомплита.',
            flags: MessageFlags.Ephemeral,
            });
        }

        try {
            const result = removeTrackFromPlaylist(guildId, name, trackId);

            if (!result.success) {
            if (result.reason === 'PLAYLIST_NOT_FOUND') {
                return await interaction.reply({
                content: `Плейлист "${name}" не найден.`,
                flags: MessageFlags.Ephemeral,
                });
            }

            if (result.reason === 'TRACK_NOT_FOUND') {
                return await interaction.reply({
                content: 'Этот трек уже удалён или не найден в плейлисте.',
                flags: MessageFlags.Ephemeral,
                });
            }

            return await interaction.reply({
                content: 'Не удалось удалить трек из плейлиста.',
                flags: MessageFlags.Ephemeral,
            });
            }

            return await interaction.reply(
            `Из плейлиста "${name}" удалён трек: ${result.track.title}`
            );
        } catch (error) {
            console.error('Ошибка remove /playlist:', error);

            return await interaction.reply({
            content: 'Произошла ошибка при удалении трека из плейлиста.',
            flags: MessageFlags.Ephemeral,
            });
        }
    }

    return await interaction.reply({
      content: 'Неизвестная подкоманда.',
      flags: MessageFlags.Ephemeral,
    });
  },
};