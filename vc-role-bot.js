const { Client, Intents } = require('discord.js');
const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS] });

const activeRequests = new Map();
const vcApproved = new Map();
const activeCommands = new Set();
const processedMessages = new Set();
const lastMessageTime = new Map();

client.on('ready', () => {
  console.log('VC Role Bot is online!');
});

app.listen(port, () => {
  console.log(`Web server is running on port ${port}`);
});

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>VC Role Bot</title></head>
      <body>
        <h1>VC Role Bot is Running!</h1>
        <p>Status: ${client.user ? 'Online' : 'Offline'}</p>
        <p>Use !requestvc to request, !approvevc to approve, !joinvc to join, !lockvc to lock.</p>
        <p>Last updated: ${new Date().toLocaleString()}</p>
      </body>
    </html>
  `);
});

client.on('messageCreate', message => {
  if (message.author.id === client.user.id) return;

  // Check if message has already been processed
  if (processedMessages.has(message.id)) return;
  processedMessages.add(message.id);

  // Bot listener for YAGPDB's request message
  if (message.author.bot && message.author.id === '204255221017214977' && message.channel.id === '769855036876128257' && message.content.includes('has requested a moderated voice channel session')) {
    if (activeRequests.has(message.guild.id)) {
      return;
    }
    const timeout = setTimeout(() => {
      message.channel.send(`${message.author}, your VC request has been automatically denied due to no staff response in 10 minutes.`);
      activeRequests.delete(message.guild.id);
    }, 10 * 60 * 1000);
    activeRequests.set(message.guild.id, timeout);
    message.reply('VC request submitted. Auto-deny in 10 minutes if not approved.');
  }

  // User command for !requestvc
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
  }

  if (message.content === '!approvevc') {
    if (message.member.roles.cache.has('769628526701314108') || message.member.roles.cache.has('1437634924386451586')) {
      const commandKey = `approve-${message.guild.id}`;
      if (activeCommands.has(commandKey)) {
        message.reply('Command already in progress. Please wait.');
        return;
      }
      activeCommands.add(commandKey);
      const isApproved = vcApproved.get(message.guild.id);
      if (isApproved === true) {
        activeCommands.delete(commandKey);
        message.reply('VC is already approved.');
        return;
      }
      const lastTimeKey = `approve-${message.guild.id}`;
      const now = Date.now();
      const lastTime = lastMessageTime.get(lastTimeKey) || 0;
      if (now - lastTime < 5000) {
        activeCommands.delete(commandKey);
        message.reply('Approval message sent recently. Please wait.');
        return;
      }
      if (activeRequests.has(message.guild.id)) {
        clearTimeout(activeRequests.get(message.guild.id));
        activeRequests.delete(message.guild.id);
      }
      vcApproved.set(message.guild.id, true);
      lastMessageTime.set(lastTimeKey, now);
      message.channel.send('VC session approved—users can now use !joinvc to join #VC 1.');
      setTimeout(() => activeCommands.delete(commandKey), 1000);
    } else {
      message.reply('You need Staff or Mod role.');
    }
  }

  if (message.content === '!joinvc') {
    const isApproved = vcApproved.get(message.guild.id) || false;
    const isStaffOrMod = message.member.roles.cache.has('769628526701314108') || message.member.roles.cache.has('1437634924386451586');
    
    if (!isApproved && !isStaffOrMod) {
      message.reply('VC is not approved yet. Wait for staff to run !approvevc.');
      return;
    }
    
    const role = message.guild.roles.cache.get('1471376746027941960');
    if (role) {
      if (message.member.roles.cache.has('1471376746027941960')) {
        message.reply('You already have the VC perms role.');
        return;
      }
      message.member.roles.add(role).catch(console.error);
      message.reply('VC perms role added—you can now join #VC 1.');
    } else {
      message.reply('VC Perms role not found.');
    }
  }

  if (message.content === '!lockvc') {
    if (message.member.roles.cache.has('769628526701314108') || message.member.roles.cache.has('1437634924386451586')) {
      const commandKey = `lock-${message.guild.id}`;
      if (activeCommands.has(commandKey)) {
        message.reply('Command already in progress. Please wait.');
        return;
      }
      activeCommands.add(commandKey);
      console.log(`Locking VC for guild ${message.guild.id}. Total members: ${message.guild.members.cache.size}`);
      const lastTimeKey = `lock-${message.guild.id}`;
      const now = Date.now();
      const lastTime = lastMessageTime.get(lastTimeKey) || 0;
      if (now - lastTime < 5000) {
        activeCommands.delete(commandKey);
        message.reply('Lock message sent recently. Please wait.');
        return;
      }
      if (activeRequests.has(message.guild.id)) {
        clearTimeout(activeRequests.get(message.guild.id));
        activeRequests.delete(message.guild.id);
      }
      vcApproved.set(message.guild.id, false);
      const role = message.guild.roles.cache.get('1471376746027941960');
      const vcChannel = message.guild.channels.cache.get('769855238562643968');  // Replace with your VC channel ID
      if (role) {
        message.guild.members.cache.forEach(member => {
          console.log(`Checking member ${member.user.tag} (ID: ${member.id})`);
          if (!member.roles.cache.has('769628526701314108') && !member.roles.cache.has('1437634924386451586')) {
            console.log(`Removing role from ${member.user.tag}`);
            member.roles.remove(role).catch(err => console.error(`Failed to remove role from ${member.user.tag}: ${err}`));
            // Disconnect from VC if in the channel
            if (vcChannel && member.voice.channelId === vcChannel.id) {
              console.log(`Disconnecting ${member.user.tag} from VC`);
              member.voice.disconnect().catch(err => console.error(`Failed to disconnect ${member.user.tag}: ${err}`));
            }
          } else {
            console.log(`${member.user.tag} is staff/mod, skipping.`);
          }
        });
        lastMessageTime.set(lastTimeKey, now);
        message.channel.send('VC session locked—#VC 1 is now closed. Only staff and mods can join.');
        setTimeout(() => activeCommands.delete(commandKey), 1000);
      } else {
        console.log('VC Perms role not found.');
        message.reply('VC Perms role not found.');
      }
    } else {
      message.reply('You need Staff or Mod role.');
    }
  }
});

client.login(process.env.BOT_TOKEN);
