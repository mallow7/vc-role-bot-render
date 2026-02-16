// vc-role-bot.js
require('dotenv').config(); // Load .env variables if using

const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is missing! Add it in Render Environment Variables.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Bot state
const activeRequests = new Map();
const vcApproved = new Map();
const processedMessages = new Set();
const lastMessageTime = new Map();
let botOnline = false;

// Clear processed messages every hour
setInterval(() => processedMessages.clear(), 60 * 60 * 1000);

// Bot ready
client.once('ready', () => {
  botOnline = true;
  console.log('✅ VC Role Bot is online!');
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📊 In ${client.guilds.cache.size} servers`);
});

// Error handlers
client.on('error', console.error);
process.on('unhandledRejection', console.error);
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Express server
app.listen(port, () => console.log(`🌐 Web server running on port ${port}`));

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>VC Role Bot</title>
        <meta http-equiv="refresh" content="5">
      </head>
      <body>
        <h1>VC Role Bot is Running!</h1>
        <p>Status: ${botOnline ? 'Online' : 'Offline'}</p>
        <p>Last updated: ${new Date().toLocaleString()}</p>
        <p>Page auto-refreshes every 5 seconds.</p>
      </body>
    </html>
  `);
});

// Discord commands
client.on('messageCreate', async (message) => {
  try {
    if (!message.guild || message.author.bot) return;
    if (processedMessages.has(message.id)) return;
    processedMessages.add(message.id);

    const allowedChannels = ['769855036876128257', '1471682252537860213'];
    if (!allowedChannels.includes(message.channel.id)) return;

    // !requestvc
    if (message.content === '!requestvc') {
      if (activeRequests.has(message.guild.id)) {
        return message.reply('You already have an active VC request.');
      }

      activeRequests.set(message.guild.id, setTimeout(() => {
        message.channel.send(`${message.author}, your VC request was denied (no staff response).`);
        activeRequests.delete(message.guild.id);
      }, 10 * 60 * 1000));

      return message.channel.send(
        `${message.author} has requested a moderated voice channel session.\n` +
        `Please ping @Staff and @Moderator to respond with !approvevc.`
      );
    }

    // !approvevc
    if (message.content === '!approvevc') {
      const isStaff =
        message.member.roles.cache.has('769628526701314108') ||
        message.member.roles.cache.has('1437634924386451586');

      if (!isStaff) return message.reply('You need Staff or Mod role.');

      if (!activeRequests.has(message.guild.id)) {
        vcApproved.set(message.guild.id, true);
        return message.channel.send('No pending request found, but VC has been manually approved.');
      }

      clearTimeout(activeRequests.get(message.guild.id));
      activeRequests.delete(message.guild.id);

      vcApproved.set(message.guild.id, true);
      return message.channel.send('VC session approved — users can now use !joinvc.');
    }

    // !joinvc
    if (message.content === '!joinvc') {
      const approved = vcApproved.get(message.guild.id);
      const isStaff =
        message.member.roles.cache.has('769628526701314108') ||
        message.member.roles.cache.has('1437634924386451586');

      if (!approved && !isStaff) return message.reply('VC not approved yet.');

      const role = message.guild.roles.cache.get('1471376746027941960');
      if (!role) return message.reply('VC role not found.');

      if (message.member.roles.cache.has(role.id)) return message.reply('You already have access.');

      await message.member.roles.add(role);
      return message.reply('VC access granted.');
    }

    // !lockvc
    if (message.content === '!lockvc') {
      const isStaff =
        message.member.roles.cache.has('769628526701314108') ||
        message.member.roles.cache.has('1437634924386451586');

      if (!isStaff) return message.reply('You need Staff or Mod role.');

      vcApproved.set(message.guild.id, false);

      const role = message.guild.roles.cache.get('1471376746027941960');
      const vcChannel = message.guild.channels.cache.get('769855238562643968');

      if (!role) return message.reply('VC role not found.');

      const membersToProcess = message.guild.members.cache.filter(member => {
        const isStaffOrMod = member.roles.cache.has('769628526701314108') || member.roles.cache.has('1437634924386451586');
        return member.roles.cache.has(role.id) && !isStaffOrMod && member.id !== client.user.id;
      });

      for (const member of membersToProcess.values()) {
        try {
          await member.roles.remove(role);
          if (vcChannel && member.voice.channelId === vcChannel.id) await member.voice.disconnect();
        } catch (err) {
          console.error(`Failed to update ${member.user.tag}`, err);
        }
      }

      return message.channel.send('VC session locked.');
    }

  } catch (err) {
    console.error('Error in messageCreate:', err);
  }
});

// Login
client.login(process.env.BOT_TOKEN)
  .catch(err => {
    console.error("❌ Failed to login:", err);
    process.exit(1);
  });
v
