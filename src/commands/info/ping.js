const { SlashCommandBuilder } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'ping',
  description: 'Mengukur latensi API Discord dan detak WebSocket',
  category: 'info',
  usage: '!ping',
  aliases: ['p'],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Cek latensi koneksi bot'),

  async execute(message) {
    const sent = await message.reply('🏓 Mengukur latensi...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const wsLatency = Math.round(message.client.ws.ping);

    await sent.edit({
      content: null,
      embeds: [
        successEmbed(
          'Pong! Latensi Bot',
          `⏱️ **Latensi Pesan**: \`${latency}ms\`\n` +
          `🌐 **WebSocket API**: \`${wsLatency}ms\``
        )
      ]
    });
  },

  async executeSlash(interaction) {
    const sent = await interaction.reply({ content: '🏓 Mengukur latensi...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply({
      content: null,
      embeds: [
        successEmbed(
          'Pong! Latensi Bot',
          `⏱️ **Latensi Pesan**: \`${latency}ms\`\n` +
          `🌐 **WebSocket API**: \`${wsLatency}ms\``
        )
      ]
    });
  }
};
