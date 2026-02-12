const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS] });

// Store active requests (guild ID as key, timeout as value)
const activeRequests = new Map();

client.on('ready', () => {
  console.log('VC Role Bot is online!');
});

client.on('messageCreate', message => {
  if (message.content === '!requestvc') {
    // Check if user already has an active request
    if (activeRequests.has(message.guild.id)) {
      message.reply('You already have an active VC request. Wait for approval or denial.');
      return;
    }

    // Start 10-minute timer for auto-deny
    const timeout = setTimeout(() => {
      message.channel.send(`${message.author}, your VC request has been automatically denied due to no staff response in 10 minutes.`);
      activeRequests.delete(message.guild.id);
    }, 10 * 60 * 1000);  // 10 minutes in milliseconds

    activeRequests.set(message.guild.id, timeout);
    message.reply('VC request submitted. Staff have been notified. Auto-deny in 10 minutes if not approved.');
  }

  if (message.content === '!approvevc') {
    if (message.member.roles.cache.has('1468453734555193344') || message.member.roles.cache.has('MOD_ROLE_ID')) {
      // Clear the timer if approving
      if (activeRequests.has(message.guild.id)) {
        clearTimeout(activeRequests.get(message.guild.id));
        activeRequests.delete(message.guild.id);
      }

      const role = message.guild.roles.cache.get('1471004264703856671');
      if (role) {
        message.guild.members.cache.forEach(member => {
          member.roles.add(role).catch(console.error);
        });
        message.channel.send('VC Perms role added to everyone—users can join #Moderated-VC.');
      } else {
        message.reply('VC Perms role not found.');
      }
    } else {
      message.reply('You need Staff or Mod role.');
    }
  }

  if (message.content === '!lockvc') {
    if (message.member.roles.cache.has('1468453734555193344') || message.member.roles.cache.has('MOD_ROLE_ID')) {
      // Clear any active timer
      if (activeRequests.has(message.guild.id)) {
        clearTimeout(activeRequests.get(message.guild.id));
        activeRequests.delete(message.guild.id);
      }

      const role = message.guild.roles.cache.get('1471004264703856671');
      if (role) {
        message.guild.members.cache.forEach(member => {
          member.roles.remove(role).catch(console.error);
        });
        message.channel.send('VC Perms role removed from everyone—#Moderated-VC is locked.');
      } else {
        message.reply('VC Perms role not found.');
      }
    } else {
      message.reply('You need Staff or Mod role.');
    }
  }
});

client.login(process.env.BOT_TOKEN);
