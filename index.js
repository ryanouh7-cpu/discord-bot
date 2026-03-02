const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

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

client.on('messageCreate', async (message) => {

  if (!message.guild) return;

  const content = message.content.toLowerCase().replace(/\s+/g, '');

  // =========================
  // 👮‍♂️ فوفو (للأدمن فقط)
  // =========================
  if (content.startsWith('فوفو') || content.startsWith('fofo')) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return;
    }

    return message.reply(
`لبيه 👮‍♂️

الأوامر المتاحة:

!send @شخص الرسالة
↳ يرسل رسالة خاصة لشخص معين

!dmall الرسالة
↳ يرسل رسالة خاصة للجميع

!join
↳ يدخل الروم الصوتي

!leave
↳ يخرج من الروم الصوتي`
    );
  }

  // 🔒 باقي الأوامر للأدمن فقط
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return;
  }

  // =========================
  // 📩 إرسال لشخص معين
  // =========================
  if (message.content.startsWith('!send')) {

    const user = message.mentions.users.first();
    if (!user) return message.reply('منشن الشخص أولاً.');

    const msg = message.content.split(' ').slice(2).join(' ');
    if (!msg) return message.reply('اكتب الرسالة بعد المنشن.');

    try {
      await user.send(msg);
      message.reply('✅ تم الإرسال بالخاص');
    } catch {
      message.reply('❌ ما أقدر أرسل له خاص');
    }
  }

  // =========================
  // 📢 إرسال للجميع
  // =========================
  if (message.content.startsWith('!dmall')) {

    const text = message.content.replace('!dmall ', '');
    if (!text) return message.reply('اكتب الرسالة بعد الأمر.');

    const members = await message.guild.members.fetch();
    let count = 0;

    for (const member of members.values()) {
      if (!member.user.bot) {
        try {
          await member.send(text);
          count++;
          await new Promise(r => setTimeout(r, 1500));
        } catch {}
      }
    }

    message.reply(`✅ تم الإرسال لـ ${count} عضو`);
  }

  // =========================
  // 🔊 دخول روم صوتي
  // =========================
  if (message.content === '!join') {

    if (!message.member.voice.channel) {
      return message.reply('❌ لازم تدخل روم صوتي أولاً');
    }

    joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    message.reply('🔊 دخلت الروم الصوتي');
  }

  // =========================
  // 🚪 خروج من روم صوتي
  // =========================
  if (message.content === '!leave') {

    const connection = getVoiceConnection(message.guild.id);
    if (!connection) return message.reply('❌ أنا مو داخل روم');

    connection.destroy();
    message.reply('🚪 طلعت من الروم الصوتي');
  }

});

client.login(process.env.TOKEN);


