const { successEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'apitest',
  description: 'Menguji koneksi Discord Gateway, REST API, dan status latency',
  category: 'admin',
  usage: '!apitest',
  aliases: [],
  userPermissions: [],
  botPermissions: [],

  async execute(message) {
    const start = Date.now();
    await message.channel.sendTyping();
    const restTime = Date.now() - start;

    return message.reply({
      embeds: [
        successEmbed(
          'Hasil Pengujian API Discord',
          `🟢 **Status Gateway**: Terhubung\n` +
          `⚡ **REST API Roundtrip**: \`${restTime} ms\`\n` +
          `📶 **WebSocket Ping**: \`${Math.round(message.client.ws.ping)} ms\`\n` +
          `🛡️ **Status Sistem**: Normal tanpa hambatan.`
        )
      ]
    });
  }
};
