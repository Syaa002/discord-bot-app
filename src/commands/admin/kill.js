const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'kill',
  description: 'Mematikan proses bot secara aman (Graceful Shutdown) - Khusus Owner',
  category: 'admin',
  usage: '!kill',
  aliases: ['shutdown'],
  userPermissions: [],
  botPermissions: [],
  ownerOnly: true,

  async execute(message) {
    if (message.author.id !== process.env.OWNER_ID) {
      return message.reply({ embeds: [errorEmbed('Akses Ditolak', 'Hanya pemilik bot yang dapat menggunakan perintah ini.')] });
    }

    await message.reply('🛑 **Mematikan bot secara aman...** Sampai jumpa!');
    console.log(`[Bot] Shutdown diinisiasi oleh ${message.author.tag}`);
    process.exit(0);
  }
};
