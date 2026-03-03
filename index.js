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

const { 
  joinVoiceChannel, 
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');

const fs = require('fs');

const WELCOME_CHANNEL_ID = '1478184848362311790';
const LOG_CHANNEL_ID = '1478185019955478538';
const AUTO_VOICE_CHANNEL_ID = '1478181757613510780';

const LEVELS_FILE = './levels.json';

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

let voiceConnection = null;

// ================= Voice Auto Join =================
async function connectToVoice(guild) {
  try {
    voiceConnection = joinVoiceChannel({
      channelId: AUTO_VOICE_CHANNEL_ID,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    await entersState(voiceConnection, VoiceConnectionStatus.Ready, 20_000);
    console.log('🔊 Connected to voice channel');
  } catch (error) {
    console.log('❌ Voice failed, retrying...');
    setTimeout(() => connectToVoice(guild), 5000);
  }
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  const guild = client.guilds.cache.first();
  if (guild) connectToVoice(guild);
});

// يرجع يدخل لو انقطع
client.on('voiceStateUpdate', () => {
  if (!voiceConnection || voiceConnection.state.status === 'disconnected') {
    const guild = client.guilds.cache.first();
    if (guild) connectToVoice(guild);
  }
});

// ================= Welcome =================
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

// ================= Ticket =================
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

// ================= Messages =================
client.on('messageCreate', async (message) => {

  if (!message.guild || message.author.bot) return;

  // Anti-Spam
  const now = Date.now();
  const timestamps = spamMap.get(message.author.id) || [];
  timestamps.push(now);
  spamMap.set(message.author.id, timestamps.filter(t => now - t < 5000));

  if (spamMap.get(message.author.id).length >= 5) {
    await message.member.timeout(5 * 60 * 1000);
    message.channel.send(`🚨 ${message.author} muted for spam`);

    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) logChannel.send(`📜 Spam detected: ${message.author.tag}`);

    spamMap.delete(message.author.id);
  }

  // Level System
  if (!levels[message.author.id]) {
    levels[message.author.id] = { xp: 0, level: 1 };
  }

  const userData = levels[message.author.id];
  userData.xp += Math.floor(Math.random() * 10) + 5;

  if (userData.xp >= userData.level * 100) {
    userData.level++;
    userData.xp = 0;
    message.channel.send(`🎉 ${message.author} leveled up to level ${userData.level}!`);
  }

  saveLevels();

  const content = message.content.toLowerCase().replace(/\s+/g, '');

  if (content.startsWith('فوفو') || content.startsWith('fofo')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    return message.reply(`
لبيه 👮‍♂️

!rank
!leaderboard
!leave
`);
  }

  if (message.content === '!leave') {
    if (!voiceConnection) return message.reply('Not in voice');
    voiceConnection.destroy();
    voiceConnection = null;
    message.reply('🚪 Left voice channel');
  }

  if (message.content === '!rank') {
    const data = levels[message.author.id];
    message.reply(`⭐ Level: ${data.level}\nXP: ${data.xp}/${data.level * 100}`);
  }

  if (message.content === '!leaderboard') {
    const sorted = Object.entries(levels)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    let board = '🏆 Top 10:\n\n';

    sorted.forEach((user, index) => {
      const member = message.guild.members.cache.get(user[0]);
      if (member) board += `${index + 1}. ${member.user.tag} - Level ${user[1].level}\n`;
    });

    message.channel.send(board);
  }

});

client.login(process.env.TOKEN);
