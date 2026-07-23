require('./database/db');
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const leaveTimers = new Map();

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] В команде ${filePath} нет data или execute`);
    }
  }
}

client.once(Events.ClientReady, readyClient => {
  console.log(`Бот запущен как ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`Команда ${interaction.commandName} не найдена.`);
    return;
  }

  if (interaction.isAutocomplete()) {
    if (!command.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error('Ошибка autocomplete:', error);
    }

    return;
  }

  if (!interaction.isChatInputCommand()) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'Произошла ошибка при выполнении команды.',
        flags: 64,
      });
    } else {
      await interaction.reply({
        content: 'Произошла ошибка при выполнении команды.',
        flags: 64,
      });
    }
  }
});

const { getVoiceConnection } = require('@discordjs/voice');

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const connection = getVoiceConnection(newState.guild.id);

  if (!connection) return;

  const botVoiceChannelId = newState.guild.members.me?.voice?.channelId;

  if (!botVoiceChannelId) return;

  if (oldState.channelId !== botVoiceChannelId && newState.channelId !== botVoiceChannelId) {
    return;
  }

  const botVoiceChannel = newState.guild.channels.cache.get(botVoiceChannelId);

  if (!botVoiceChannel) return;

  const humanMembers = botVoiceChannel.members.filter(member => !member.user.bot);
  const existingTimer = leaveTimers.get(newState.guild.id);

  if (humanMembers.size === 0) {
    if (existingTimer) return;

    const timer = setTimeout(() => {
      const currentConnection = getVoiceConnection(newState.guild.id);
      const currentBotChannelId = newState.guild.members.me?.voice?.channelId;

      if (!currentConnection || !currentBotChannelId) {
        leaveTimers.delete(newState.guild.id);
        return;
      }

      const currentBotChannel = newState.guild.channels.cache.get(currentBotChannelId);

      if (!currentBotChannel) {
        leaveTimers.delete(newState.guild.id);
        return;
      }

      const currentHumanMembers = currentBotChannel.members.filter(member => !member.user.bot);

      if (currentHumanMembers.size === 0) {
        currentConnection.destroy();
        console.log(`Бот вышел из канала ${currentBotChannel.name}, потому что 1 минуту там никого не было.`);
      }

      leaveTimers.delete(newState.guild.id);
    }, 60_000);

    leaveTimers.set(newState.guild.id, timer);
    console.log(`Канал ${botVoiceChannel.name} пуст. Запущен таймер выхода на 1 минуту.`);
    return;
  }

  if (existingTimer) {
    clearTimeout(existingTimer);
    leaveTimers.delete(newState.guild.id);
    console.log(`В канал ${botVoiceChannel.name} кто-то вернулся. Таймер выхода отменен.`);
  }
});

client.login(process.env.TOKEN);

const { getGuildPlaylists } = require('./services/playlists');
console.log('Playlists test:', getGuildPlaylists('test-guild'));