const { ActivityType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'status',
  description: 'Mengubah status presence dan aktivitas bot secara dinamis (Khusus Owner)',
  category: 'admin',
  usage: '!status set <playing|listening|watching|competing> <teks>',
  aliases: [],
  userPermissions: [],
  botPermissions: [],
  ownerOnly: true,

  async execute(message, args) {
    if (message.author.id !== process.env.OWNER_ID) {
      return message.reply({ embeds: [errorEmbed('Akses Ditolak', 'Hanya pemilik bot yang dapat menggunakan perintah ini.')] });
    }

    if (args[0] !== 'set' || !args[1] || !args[2]) {
      return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });
    }

    const typeStr = args[1].toLowerCase();
    const text = args.slice(2).join(' ');

    let actType = ActivityType.Playing;
    if (typeStr === 'listening') actType = ActivityType.Listening;
    if (typeStr === 'watching') actType = ActivityType.Watching;
    if (typeStr === 'competing') actType = ActivityType.Competing;

    message.client.user.setActivity(text, { type: actType });
    return message.reply({ embeds: [successEmbed('Status Diperbarui', `Status bot diatur menjadi: **${typeStr.toUpperCase()} ${text}**`)] });
  }
};
