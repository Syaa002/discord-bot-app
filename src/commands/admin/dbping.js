const db = require('../../database/jsonDb');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'dbping',
  description: 'Mengukur waktu respon pembacaan dan penulisan database lokal',
  category: 'admin',
  usage: '!dbping',
  aliases: ['dbp'],
  userPermissions: [],
  botPermissions: [],

  async execute(message) {
    const startRead = process.hrtime();
    db.getGuild(message.guild.id);
    const endRead = process.hrtime(startRead);
    const readMs = (endRead[0] * 1000 + endRead[1] / 1e6).toFixed(2);

    const startWrite = process.hrtime();
    db.updateGuild(message.guild.id, data => {
      data._lastPingTest = Date.now();
    });
    const endWrite = process.hrtime(startWrite);
    const writeMs = (endWrite[0] * 1000 + endWrite[1] / 1e6).toFixed(2);

    return message.reply({
      embeds: [
        successEmbed(
          'Performa Database JSON',
          `📁 **Tipe**: Local JSON File Database\n` +
          `📖 **Kecepatan Baca**: \`${readMs} ms\`\n` +
          `✍️ **Kecepatan Tulis**: \`${writeMs} ms\``
        )
      ]
    });
  }
};
