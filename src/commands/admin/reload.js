const path = require('path');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'reload',
  description: 'Muat ulang file perintah tertentu tanpa perlu mematikan bot (Hot Reload)',
  category: 'admin',
  usage: '!reload <nama-command>',
  aliases: [],
  userPermissions: [],
  botPermissions: [],
  ownerOnly: true,

  async execute(message, args) {
    if (message.author.id !== process.env.OWNER_ID) {
      return message.reply({ embeds: [errorEmbed('Akses Ditolak', 'Hanya pemilik bot yang dapat menggunakan perintah ini.')] });
    }

    if (!args[0]) return message.reply('Masukkan nama perintah yang ingin di-reload.');

    const commandName = args[0].toLowerCase();
    const command = message.client.commands.get(commandName) || message.client.commands.find(c => c.aliases && c.aliases.includes(commandName));

    if (!command) {
      return message.reply({ embeds: [errorEmbed('Tidak Ditemukan', `Perintah \`${commandName}\` tidak ditemukan.`)] });
    }

    // Cari path file
    const cat = command.category;
    const filePath = path.join(__dirname, '..', cat, `${command.name}.js`);

    try {
      delete require.cache[require.resolve(filePath)];
      const newCommand = require(filePath);
      message.client.commands.set(newCommand.name, newCommand);

      return message.reply({ embeds: [successEmbed('Hot Reload Sukses', `Perintah \`${newCommand.name}\` berhasil dimuat ulang!`)] });
    } catch (err) {
      console.error(err);
      return message.reply({ embeds: [errorEmbed('Reload Gagal', `Error: ${err.message}`)] });
    }
  }
};
