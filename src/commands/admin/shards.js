const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'shards',
  description: 'Menampilkan status shard, latensi, dan server per shard',
  category: 'admin',
  usage: '!shards',
  aliases: [],
  userPermissions: [],
  botPermissions: [],

  async execute(message) {
    const shard = message.client.shard;

    if (!shard) {
      const embed = new EmbedBuilder()
        .setColor(0xFF758F)
        .setTitle('💎 Status Sharding Bot')
        .setDescription('Bot saat ini berjalan dalam mode **Single Instance (No Sharding)**.')
        .addFields(
          { name: '🌐 Total Server', value: `${message.client.guilds.cache.size}`, inline: true },
          { name: '⏱️ Latensi Ping', value: `${Math.round(message.client.ws.ping)}ms`, inline: true }
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    try {
      const ping = await shard.fetchClientValues('ws.ping');
      const guilds = await shard.fetchClientValues('guilds.cache.size');

      const embed = new EmbedBuilder()
        .setColor(0xFF758F)
        .setTitle(`💎 Info Sharding (${shard.count} Shard Total)`)
        .setDescription(ping.map((p, i) => `• **Shard #${i}**: Latensi \`${Math.round(p)}ms\` | **${guilds[i]}** Server`).join('\n'))
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      return message.reply('Gagal mengambil data shard.');
    }
  }
};
