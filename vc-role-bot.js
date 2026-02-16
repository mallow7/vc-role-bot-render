const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is missing!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

let botOnline = false;

// ===== READY =====
client.once('ready', () => {
  botOnline = true;
  console.log('✅ VC Role Bot is online!');
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📊 In ${client.guilds.cache.size} servers`);
});

// ===== WEBSITE =====
app.listen(port, () => {
  console.log(`🌐 Web server running on port ${port}`);
});

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
      </body>
    </html>
  `);
});

// ===== BOT STATE =====
const activeRequests = new Map();
const vcApproved = new Map();

// ===== COMMANDS =====
client.on('messageCreate', async (message) => {
  if (!message.guild) return;
  if (message.author.bot) return;

  // !requestvc
  if (message.content === '!requestvc') {
    if (activeRequests.has(message.guild.id)) {
      return message.reply('There is already an active VC request.');
    }

    const timeout = setTimeout(() => {
      message.channel.send('VC request expired (no staff response).');
      activeRequests.delete(message.guild.id);
    }, 10 * 60 * 1000);

    activeRequests.set(message.guild.id, timeout);
    return message.reply('VC request submitted.');
  }

  // !approvevc
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
    return message.channel.send('VC session approved. Users can now use !joinvc.');
  }

  // !joinvc
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

    try {
      await message.member.roles.add(role);
      return message.reply('VC access granted.');
    } catch (err) {
      console.error(err);
      return message.reply('I cannot add the role. Check role hierarchy.');
    }
  }

  // !lockvc
  if (message.content === '!lockvc') {
    const isStaff =
      message.member.roles.cache.has('769628526701314108') ||
      message.member.roles.cache.has('1437634924386451586');

    if (!isStaff) {
      return message.reply('You need Staff or Mod role.');
    }

    vcApproved.set(message.guild.id, false);

    const role = message.guild.roles.cache.get('1471376746027941960');
    if (!role) return message.reply('VC role not found.');

    const members = message.guild.members.cache.filter(m =>
      m.roles.cache.has(role.id)
    );

    for (const member of members.values()) {
      try {
        await member.roles.remove(role);
      } catch (err) {
        console.error(`Failed to remove role from ${member.user.tag}`);
      }
    }

    return message.channel.send('VC session locked.');
  }
});

// ===== LOGIN =====
client.login(process.env.BOT_TOKEN).catch(err => {
  console.error("❌ Failed to login:", err);
  process.exit(1);
});
