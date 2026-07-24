const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getCurrentTrack } = require('../../player/queue');
const {
  ensureFavoritePlaylist,
  addTrackToPlaylist,
  getPlaylistTracks,
  FAVORITE_PLAYLIST_NAME,
} = require('../../services/playlists');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('like')
    .setDescription('Добавить текущий трек в плейлист Favorite'),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const currentTrack = getCurrentTrack(guildId);

    if (!currentTrack) {
      return await interaction.reply({
        content: 'Сейчас ничего не играет.',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const favoritePlaylist = ensureFavoritePlaylist(guildId, userId);

      const existingTracks = getPlaylistTracks(favoritePlaylist.id);
      const alreadyLiked = existingTracks.some(
        track => track.url === currentTrack.url
      );

      if (alreadyLiked) {
        return await interaction.reply({
          content: `Трек "${currentTrack.title}" уже есть в плейлисте ${FAVORITE_PLAYLIST_NAME}.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const track = {
        title: currentTrack.title,
        url: currentTrack.url,
        duration: currentTrack.duration,
        thumbnail: currentTrack.thumbnail,
        author: currentTrack.author,
      };

      const result = addTrackToPlaylist(guildId, FAVORITE_PLAYLIST_NAME, track, userId);

      if (!result.success) {
        return await interaction.reply({
          content: 'Не удалось добавить трек в Favorite.',
          flags: MessageFlags.Ephemeral,
        });
      }

      return await interaction.reply(
        `Трек "${track.title}" добавлен в плейлист ${FAVORITE_PLAYLIST_NAME}.`
      );
    } catch (error) {
      console.error('Ошибка /like:', error);

      return await interaction.reply({
        content: 'Произошла ошибка при добавлении трека в Favorite.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};