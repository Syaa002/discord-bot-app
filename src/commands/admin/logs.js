const { PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'logs',
  description: 'Menampilkan riwayat pemanggilan perintah terakhir',
  category: 'admin',
  usage: '!logs',
  aliases: [],
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Tampilkan riwayat eksekusi command terakhir'),

  async execute(message) {
    const logs = message.client.commandLogs || [];
    if (logs.length === 0) return message.reply('Belum ada log perintah yang tercatat.');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📜 Riwayat Perintah Terakhir')
      .setDescription(logs.slice(-10).reverse().map(l => `• \`${l.command}\` oleh **${l.user}** di <#${l.channel}> (<t:${Math.floor(l.timestamp / 1000)}:R>)`).join('\n'))
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  async executeSlash(interaction) {
    const logs = interaction.client.commandLogs || [];
    if (logs.length === 0) return interaction.reply({ content: 'Belum ada log perintah yang tercatat.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📜 Riwayat Perintah Terakhir')
      .setDescription(logs.slice(-10).reverse().map(l => `• \`${l.command}\` oleh **${l.user}** di <#${l.channel}> (<t:${Math.floor(l.timestamp / 1000)}:R>)`).join('\n'))
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
