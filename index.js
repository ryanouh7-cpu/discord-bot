const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!dmall')) return;

  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ الأمر للأدمن فقط');
  }

  const text = message.content.replace('!dmall ', '');
  if (!text) return message.reply('❌ اكتب الرسالة بعد الأمر');

  const members = await message.guild.members.fetch();
  let count = 0;

  for (const member of members.values()) {
    if (!member.user.bot) {
      try {
        await member.send(text);
        count++;
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch {}
    }
  }

  message.reply(`✅ تم الإرسال لـ ${count} عضو`);
});

client.login(process.env.TOKEN);
