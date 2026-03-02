const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {

  if (!message.guild) return;

  const content = message.content.toLowerCase().replace(/\s+/g, '');

  // =========================
  // 👮‍♂️ رد ذكي لكلمة فوفو (للأدمن فقط)
  // =========================
  if (
    content.startsWith('فوفو') ||
    content.startsWith('fofo')
  ) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return;
    }

    return message.reply(
`لبيه 👮‍♂️

الأوامر المتاحة:

!send @شخص الرسالة
↳ يرسل رسالة خاصة لشخص معين

!dmall الرسالة
↳ يرسل رسالة خاصة لجميع أعضاء السيرفر`
    );
  }

  // 🔒 باقي الأوامر للإدمن فقط
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

});

client.login(process.env.TOKEN);
