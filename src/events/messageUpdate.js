const { sendLog } = require('../modules/logger');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage) {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // Abaikan jika bukan perubahan teks

    await sendLog(oldMessage.guild, {
      category: 'Pesan',
      title: 'Pesan Diedit',
      description: `Pesan oleh ${oldMessage.author} diedit di ${oldMessage.channel}. [Lihat Pesan](${newMessage.url})`,
      fields: [
        { name: 'Sebelum', value: oldMessage.content ? (oldMessage.content.length > 512 ? `${oldMessage.content.substring(0, 508)}...` : oldMessage.content) : '*[Kosong]*' },
        { name: 'Sesudah', value: newMessage.content ? (newMessage.content.length > 512 ? `${newMessage.content.substring(0, 508)}...` : newMessage.content) : '*[Kosong]*' }
      ],
      color: 0xFEE75C,
      author: oldMessage.author
    });
  }
};
