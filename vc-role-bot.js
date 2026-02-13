const { Client, Intents } = require('discord.js');
const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS] });

const activeRequests = new Map();

client.on('ready', () => {
  console.log('VC Role Bot is online!');
});

app.listen(port, () => {
  console.log(`Web server is running on port ${port}`);
});

// Basic website routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>VC Role Bot</title></head>
      <body>
        <h1>VC Role Bot is Running!</h1>
        <p>Status: ${client.user ? 'Online' : 'Offline'}</p>
        <p>Use !requestvc in Discord to request VC access.</p>
        <p>Last updated: ${new Date().toLocaleString()}</p>
      </body>
    </html>
  `);
});

app.get('/status', (req, res) => {
  res.json({
    botOnline: client.user ? true : false,
    activeRequests: activeRequests.size,
    uptime: process.uptime()
  });
});

// Your existing Discord bot logic here
client.on('messageCreate', message => {
  if (message.author.id === client.user.id) return;

  if (message.author.bot && message.content.includes('!requestvc')) {
    if (message.author.id === '204255221017214977' && message.channel.name === 'vc-requests') {
      if (activeRequests.has(message.guild.id)) {
        message.reply('There is already an active VC request. Wait for approval or denial.');
        return;
      }
      const timeout = setTimeout(() => {
        message.channel.send(`${message.author}, your VC request has been automatically denied due to no staff response in 10 minutes.`);
        activeRequests.delete(message.guild.id);
      }, 10 * 60 * 1000);
      activeRequests.set(message.guild.id, timeout);
      message.reply('VC request submitted. Auto-deny in 10 minutes if not approved.');
    }
  }

  if (message.content === '!requestvc') {
    if (activeRequests.has(message.guild.id)) {
      message.reply('You already have an active VC request. Wait for approval or denial.');
      return;
    }
    const timeout = setTimeout(() => {
      message.channel.send(`${message.author}, your VC request has been automatically denied due to no staff response in 10 minutes.`);
      activeRequests.delete(message.guild.id);
    }, 10 * 60 * 1000);
    activeRequests.set(message.guild.id, timeout);
    message.reply('VC request submitted. Staff have been notified. Auto-deny in 10 minutes if not approved.');
  }

  if (message.content === '!approvevc') {
    if (message.member.roles.cache.has('1468453734555193344') || message.member.roles.cache.has('MOD_ROLE_ID')) {
      if (activeRequests.has(message.guild.id)) {
        clearTimeout(activeRequests.get(message.guild.id));
        activeRequests.delete(message.guild.id);
      }
      const role = message.guild.roles.cache.get('1471004264703856671');
      if (role) {
        message.guild.members.cache.forEach(member => {
          member.roles.add(role).catch(console.error);
        });
        message.channel.send('VC Perms role added to everyone—users can join #VC 1.');
      } else {
        message.reply('VC Perms role not found.');
      }
    } else {
      message.reply('You need Staff or Mod role.');
    }
  }

  if (message.content === '!lockvc') {
    if (message.member.roles.cache.has('1468453734555193344') || message.member.roles.cache.has('MOD_ROLE_ID')) {
      if (activeRequests.has(message.guild.id)) {
        clearTimeout(activeRequests.get(message.guild.id));
        activeRequests.delete(message.guild.id);
      }
      const role = message.guild.roles.cache.get('1471004264703856671');
      if (role) {
        message.guild.members.cache.forEach(member => {
          member.roles.remove(role).catch(console.error);
        });
        message.channel.send('VC Perms role removed from everyone—#VC 1 is locked.');
      } else {
        message.reply('VC Perms role not found.');
      }
    } else {
      message.reply('You need Staff or Mod role.');
    }
  }
});

client.login(process.env.BOT_TOKEN);
