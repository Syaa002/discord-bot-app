const { sendLog } = require('../modules/logger');
const { COLORS } = require('../utils/embeds');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;

    // 1. Simpan pesan ke koleksi snipes untuk perintah !snipe
    if (!client.snipes) client.snipes = new Map();
    client.snipes.set(message.channel.id, {
      content: message.content,
      author: message.author,
      image: message.attachments.first() ? message.attachments.first().proxyURL : null,
      timestamp: Date.now()
    });

    // 2. Logging Pesan Dihapus
    await sendLog(message.guild, {
      category: 'Pesan',
      title: 'Pesan Dihapus',
      description: `Pesan oleh ${message.author} di ${message.channel} telah dihapus.`,
      fields: [
        { name: 'Isi Pesan', value: message.content ? (message.content.length > 1024 ? `${message.content.substring(0, 1020)}...` : message.content) : '*[Media/Embed]*' }
      ],
      color: COLORS.ERROR,
      author: message.author
    });
  }
};
