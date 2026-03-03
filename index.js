const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');

const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');

const WELCOME_CHANNEL_ID = '1478184848362311790';
const LOG_CHANNEL_ID = '1478185019955478538';

const LEVELS_FILE = './levels.json';

// تحميل بيانات اللفلات
let levels = {};
if (fs.existsSync(LEVELS_FILE)) {
  levels = JSON.parse(fs.readFileSync(LEVELS_FILE));
}
function saveLevels() {
  fs.writeFileSync(LEVELS_FILE, JSON.stringify(levels, null, 2));
}

const warnings = new Map();
const spamMap = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// =========================
// 🎉 Welcome System
// =========================
client.on('guildMemberAdd', member => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x00AEFF)
    .setTitle('🎉 New Member Joined!')
    .setDescription(`Welcome ${member} to the server!`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields({ name: 'Member Count', value: `${member.guild.memberCount}`, inline: true })
    .setFooter({ text: 'Fofu Security Bot 👮‍♂️' })
    .setTimestamp();

  channel.send({ embeds: [embed] });
});

// =========================
// 🎟️ Ticket Button
// =========================
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'create_ticket') {
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
      ],
    });

    await interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
    channel.send(`🎟️ Hello ${interaction.user}, describe your issue here.`);
  }
});

// =========================
// 💬 Message Events
// =========================
client.on('messageCreate', async (message) => {

  if (!message.guild || message.author.bot) return;

  // =========================
  // 🚨 Anti-Spam
  // =========================
  const now = Date.now();
  const timestamps = spamMap.get(message.author.id) || [];
  timestamps.push(now);
  spamMap.set(message.author.id, timestamps.filter(t => now - t < 5000));

  if (spamMap.get(message.author.id).length >= 5) {
    await message.member.timeout(5 * 60 * 1000);
    message.channel.send(`🚨 ${message.author} muted for spam`);

    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(`📜 Spam detected: ${message.author.tag}`);
    }

    spamMap.delete(message.author.id);
  }

  // =========================
  // ⭐ Level System
  // =========================
  if (!levels[message.author.id]) {
    levels[message.author.id] = { xp: 0, level: 1 };
  }

  const userData = levels[message.author.id];
  const randomXP = Math.floor(Math.random() * 10) + 5;
  userData.xp += randomXP;

  if (userData.xp >= userData.level * 100) {
    userData.level++;
    userData.xp = 0;
    message.channel.send(`🎉 ${message.author} leveled up to level ${userData.level}!`);
  }

  saveLevels();

  const content = message.content.toLowerCase().replace(/\s+/g, '');

  // =========================
  // 👮‍♂️ FOFU Command
  // =========================
  if (content.startsWith('فوفو') || content.startsWith('fofo')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    return message.reply(`
لبيه 👮‍♂️

!send @user msg
!dmall msg
!clear number
!warn @user reason
!lock / !unlock
!join / !leave
!rank / !leaderboard
!ticketpanel
`);
  }

  // =========================
  // 🧹 Clear
  // =========================
  if (message.content.startsWith('!clear')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const amount = parseInt(message.content.split(' ')[1]);
    if (!amount || amount > 100) return message.reply('Max 100');

    await message.channel.bulkDelete(amount, true);
  }

  // =========================
  // 🚨 Warn
  // =========================
  if (message.content.startsWith('!warn')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const user = message.mentions.users.first();
    if (!user) return message.reply('Mention user');

    const reason = message.content.split(' ').slice(2).join(' ') || 'No reason';
    const userWarnings = warnings.get(user.id) || 0;
    warnings.set(user.id, userWarnings + 1);

    message.channel.send(`⚠️ ${user} warned | ${reason}`);

    if (warnings.get(user.id) >= 3) {
      const member = message.guild.members.cache.get(user.id);
      if (member) await member.timeout(10 * 60 * 1000);
      message.channel.send(`🚨 ${user} muted (3 warnings)`);
    }
  }

  // =========================
  // 🔒 Lock / Unlock
  // =========================
  if (message.content === '!lock') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: false }
    );
    message.channel.send('🔒 Channel locked');
  }

  if (message.content === '!unlock') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: true }
    );
    message.channel.send('🔓 Channel unlocked');
  }

  // =========================
  // 🔊 Voice Join/Leave
  // =========================
  if (message.content === '!join') {
    if (!message.member.voice.channel) return message.reply('Join voice first');

    joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    message.reply('🔊 Joined voice');
  }

  if (message.content === '!leave') {
    const connection = getVoiceConnection(message.guild.id);
    if (!connection) return message.reply('Not in voice');

    connection.destroy();
    message.reply('🚪 Left voice');
  }

  // =========================
  // 📊 Rank
  // =========================
  if (message.content === '!rank') {
    const data = levels[message.author.id];
    message.reply(`⭐ Level: ${data.level}\nXP: ${data.xp}/${data.level * 100}`);
  }

  // =========================
  // 👑 Leaderboard
  // =========================
  if (message.content === '!leaderboard') {
    const sorted = Object.entries(levels)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    let board = '🏆 Top 10:\n\n';

    sorted.forEach((user, index) => {
      const member = message.guild.members.cache.get(user[0]);
      if (member) {
        board += `${index + 1}. ${member.user.tag} - Level ${user[1].level}\n`;
      }
    });

    message.channel.send(board);
  }

  // =========================
  // 🎟️ Ticket Panel
  // =========================
  if (message.content === '!ticketpanel') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel('🎟️ Open Ticket')
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({
      content: 'Press to open a ticket.',
      components: [row],
    });
  }

});

client.login(process.env.TOKEN);


