const db = require('../database/db');

function normalizePlaylistName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Имя плейлиста должно быть строкой.');
  }

  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error('Имя плейлиста не может быть пустым.');
  }

  return trimmed;
}

function createPlaylist(guildId, name, createdBy) {
  const normalizedName = normalizePlaylistName(name);

  const stmt = db.prepare(`
    INSERT INTO playlists (guild_id, name, created_by)
    VALUES (?, ?, ?)
  `);

  try {
    const result = stmt.run(guildId, normalizedName, createdBy);

    return {
      id: result.lastInsertRowid,
      guildId,
      name: normalizedName,
      createdBy,
    };
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return null;
    }

    throw error;
  }
}

function getGuildPlaylists(guildId) {
  const stmt = db.prepare(`
    SELECT id, guild_id, name, created_by, created_at
    FROM playlists
    WHERE guild_id = ?
    ORDER BY name COLLATE NOCASE ASC
  `);

  return stmt.all(guildId);
}

function getPlaylistByName(guildId, name) {
  const normalizedName = normalizePlaylistName(name);

  const stmt = db.prepare(`
    SELECT id, guild_id, name, created_by, created_at
    FROM playlists
    WHERE guild_id = ? AND name = ?
  `);

  return stmt.get(guildId, normalizedName) || null;
}

function deletePlaylist(guildId, name) {
  const normalizedName = normalizePlaylistName(name);

  const stmt = db.prepare(`
    DELETE FROM playlists
    WHERE guild_id = ? AND name = ?
  `);

  const result = stmt.run(guildId, normalizedName);
  return result.changes > 0;
}

function getPlaylistTracks(playlistId) {
  const stmt = db.prepare(`
    SELECT id, playlist_id, position, title, url, duration, thumbnail, author, added_by, added_at
    FROM playlist_tracks
    WHERE playlist_id = ?
    ORDER BY position ASC, id ASC
  `);

  return stmt.all(playlistId);
}

function addTrackToPlaylist(guildId, playlistName, track, addedBy) {
  const playlist = getPlaylistByName(guildId, playlistName);

  if (!playlist) {
    return { success: false, reason: 'PLAYLIST_NOT_FOUND' };
  }

  if (!track || typeof track !== 'object') {
    throw new Error('Трек не передан в addTrackToPlaylist.');
  }

  if (!track.title || !track.url) {
    throw new Error('У трека должны быть title и url.');
  }

  const positionStmt = db.prepare(`
    SELECT COALESCE(MAX(position), 0) AS maxPosition
    FROM playlist_tracks
    WHERE playlist_id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO playlist_tracks (
      playlist_id,
      position,
      title,
      url,
      duration,
      thumbnail,
      author,
      added_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const { maxPosition } = positionStmt.get(playlist.id);
  const nextPosition = maxPosition + 1;

  const result = insertStmt.run(
    playlist.id,
    nextPosition,
    track.title,
    track.url,
    track.duration || '00:00',
    track.thumbnail || null,
    track.author || 'Unknown',
    addedBy
  );

  return {
    success: true,
    playlist,
    track: {
      id: result.lastInsertRowid,
      playlistId: playlist.id,
      position: nextPosition,
      title: track.title,
      url: track.url,
      duration: track.duration || '00:00',
      thumbnail: track.thumbnail || null,
      author: track.author || 'Unknown',
      addedBy,
    },
  };
}

function removeTrackFromPlaylist(guildId, playlistName, trackId) {
  const playlist = getPlaylistByName(guildId, playlistName);

  if (!playlist) {
    return { success: false, reason: 'PLAYLIST_NOT_FOUND' };
  }

  const getTrackStmt = db.prepare(`
    SELECT id, playlist_id, position, title, url
    FROM playlist_tracks
    WHERE id = ? AND playlist_id = ?
  `);

  const deleteStmt = db.prepare(`
    DELETE FROM playlist_tracks
    WHERE id = ? AND playlist_id = ?
  `);

  const reorderStmt = db.prepare(`
    UPDATE playlist_tracks
    SET position = position - 1
    WHERE playlist_id = ? AND position > ?
  `);

  const transaction = db.transaction(() => {
    const track = getTrackStmt.get(trackId, playlist.id);

    if (!track) {
      return { success: false, reason: 'TRACK_NOT_FOUND' };
    }

    deleteStmt.run(trackId, playlist.id);
    reorderStmt.run(playlist.id, track.position);

    return { success: true, playlist, track };
  });

  return transaction();
}

module.exports = {
  createPlaylist,
  getGuildPlaylists,
  getPlaylistByName,
  deletePlaylist,
  getPlaylistTracks,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
};