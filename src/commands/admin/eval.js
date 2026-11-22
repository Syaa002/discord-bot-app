const { errorEmbed } = require('../../utils/embeds');
const util = require('util');

module.exports = {
  name: 'eval',
  description: 'Eksekusi kode JavaScript secara langsung (Khusus Developer)',
  category: 'admin',
  usage: '!eval <kode>',
  aliases: ['e'],
  userPermissions: [],
  botPermissions: [],
  ownerOnly: true,

  async execute(message, args) {
    if (message.author.id !== process.env.OWNER_ID) {
      return message.reply({ embeds: [errorEmbed('Akses Ditolak', 'Perintah ini hanya untuk pemilik bot.')] });
    }

    if (!args[0]) return message.reply('Masukkan kode JavaScript.');

    const code = args.join(' ');
    try {
      let evaled = eval(code);
      if (evaled instanceof Promise) evaled = await evaled;
      const clean = util.inspect(evaled, { depth: 0 });

      const text = clean.length > 1900 ? `${clean.substring(0, 1900)}...` : clean;
      return message.reply(`\`\`\`js\n${text}\n\`\`\``);
    } catch (err) {
      return message.reply(`\`\`\`js\nError: ${err.message}\n\`\`\``);
    }
  }
};
