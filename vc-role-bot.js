const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;


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


const activeRequests = new Map();
const vcApproved = new Map();
const activeCommands = new Set();
const processedMessages = new Set();
const lastMessageTime = new Map();


setInterval(() => {
  processedMessages.clear();
}, 60 * 60 * 1000);


client.once('ready', () => {
  console.log('✅ VC Role Bot is online!');
  console.log(`🤖 Logged in as ${client.user.tag}`);
});


client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});


app.listen(port, () => {
  console.log(`🌐 Web server is running on port ${port}`);
});

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>VC Role Bot</title></head>
      <body>
        <h1>VC Role Bot is Running!</h1>
        <p>Status: ${client.user ? 'Online' : 'Offline'}</p>
        <p>Last updated: ${new Date().toLocaleString()}</p>
      </body>
    </html>
  `);
});


client.on('messageCreate', async (message) => {
  try {
    if (!message.guild) return;
    if (message.author.bot) return;

    if (processedMessages.has(message.id)) return;
    processedMessages.add(message.id);

    const allowedChannels = ['769855036876128257', '1471682252537860213'];
    if (!allowedChannels.includes(message.channel.id)) return;


    if (message.content === '!requestvc') {
      if (activeRequests.has(message.guild.id)) {
        return message.reply('You already have an active VC request.');
      }

      const timeout = setTimeout(() => {
        message.channel.send(`${message.author}, your VC request was denied (no staff response).`);
        activeRequests.delete(message.guild.id);
      }, 10 * 60 * 1000);

      activeRequests.set(message.guild.id, timeout);
      return message.reply('VC request submitted.');
    }


    if (message.content === '!approvevc') {
      const isStaff =
        message.member.roles.cache.has('769628526701314108') ||
        message.member.roles.cache.has('1437634924386451586');

      if (!isStaff) {
        return message.reply('You need Staff or Mod role.');
      }

      if (activeRequests.has(message.guild.id)) {
        clearTimeout(activeRequests.get(message.guild.id));
        activeRequests.delete(message.guild.id);
      }

      vcApproved.set(message.guild.id, true);
      return message.channel.send('VC session approved — users can now use !joinvc.');
    }


    if (message.content === '!joinvc') {
      const approved = vcApproved.get(message.guild.id);
      const isStaff =
        message.member.roles.cache.has('769628526701314108') ||
        message.member.roles.cache.has('1437634924386451586');

      if (!approved && !isStaff) {
        return message.reply('VC not approved yet.');
      }

      const role = message.guild.roles.cache.get('1471376746027941960');
      if (!role) return message.reply('VC role not found.');

      if (message.member.roles.cache.has(role.id)) {
        return message.reply('You already have access.');
      }

      await message.member.roles.add(role);
      return message.reply('VC access granted.');
    }


    if (message.content === '!lockvc') {
      const isStaff =
        message.member.roles.cache.has('769628526701314108') ||
        message.member.roles.cache.has('1437634924386451586');

      if (!isStaff) {
        return message.reply('You need Staff or Mod role.');
      }

      vcApproved.set(message.guild.id, false);

      const role = message.guild.roles.cache.get('1471376746027941960');
      const vcChannel = message.guild.channels.cache.get('769855238562643968');

      if (!role) return message.reply('VC role not found.');

      const members = message.guild.members.cache.filter(member =>
        member.roles.cache.has(role.id)
      );

      for (const member of members.values()) {
        try {
          await member.roles.remove(role);
          if (vcChannel && member.voice.channelId === vcChannel.id) {
            await member.voice.disconnect();
          }
        } catch (err) {
          console.error(`Failed to update ${member.user.tag}`, err);
        }
      }

      return message.channel.send('VC session locked.');
    }

  } catch (error) {
    console.error('Error in messageCreate:', error);
  }
});


client.login(process.env.BOT_TOKEN)
  .catch(err => {
    console.error("❌ Failed to login:", err);
    process.exit(1);
  });
