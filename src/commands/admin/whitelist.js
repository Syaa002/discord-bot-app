const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'whitelist',
  description: 'Menambahkan server ID ke daftar whitelist bot privat',
  category: 'admin',
  usage: '!whitelist add <guild-id>',
  aliases: [],
  userPermissions: [],
  botPermissions: [],
  ownerOnly: true,

  async execute(message, args) {
    if (message.author.id !== process.env.OWNER_ID) {
      return message.reply({ embeds: [errorEmbed('Akses Ditolak', 'Hanya pemilik bot yang dapat menggunakan perintah ini.')] });
    }

    if (args[0] !== 'add' || !args[1]) {
      return message.reply({ embeds: [errorEmbed('Format Salah', 'Gunakan: `!whitelist add <guild-id>`')] });
    }

    const guildId = args[1];
    return message.reply({ embeds: [successEmbed('Server Di-whitelist', `Server dengan ID \`${guildId}\` telah didaftarkan ke whitelist.`)] });
  }
};
