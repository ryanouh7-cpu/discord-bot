const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (!message.content.startsWith('!send')) return;

  // ✅ تحقق انه ادمن
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ هذا الأمر للإدمن فقط');
  }

  const user = message.mentions.users.first();
  if (!user) {
    return message.reply('منشن الشخص أولاً.');
  }

  const args = message.content.split(' ');
  const msg = args.slice(2).join(' ');
  if (!msg) {
    return message.reply('اكتب الرسالة بعد المنشن.');
  }

  try {
    await user.send(msg);
    message.reply('✅ تم الإرسال بالخاص');
  } catch (err) {
    message.reply('❌ ما أقدر أرسل له خاص (يمكن مقفل الخاص)');
  }
});

client.login(process.env.TOKEN);
