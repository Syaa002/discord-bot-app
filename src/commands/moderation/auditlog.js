const { PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed, applyBanner } = require('../../utils/embeds');

module.exports = {
  name: 'auditlog',
  description: 'Menampilkan 10 aksi audit log moderasi server terakhir',
  category: 'moderation',
  usage: '!auditlog',
  aliases: ['logs-audit'],
  userPermissions: [PermissionFlagsBits.ViewAuditLog],
  botPermissions: [PermissionFlagsBits.ViewAuditLog],
  slashData: new SlashCommandBuilder()
    .setName('auditlog')
    .setDescription('Tampilkan 10 aksi audit log terakhir'),

  async execute(message) {
    try {
      const audit = await message.guild.fetchAuditLogs({ limit: 10 });
      const embed = new EmbedBuilder()
        .setColor(0xFF758F)
        .setTitle(`📜 10 Aksi Audit Log Terakhir: ${message.guild.name}`)
        .setTimestamp();

      audit.entries.forEach(entry => {
        const executor = entry.executor ? entry.executor.tag : 'Sistem';
        const target = entry.target ? (entry.target.tag || entry.target.name || entry.target.id) : '-';
        embed.addFields({
          name: `Aksi: ${entry.action}`,
          value: `**Pelaku**: ${executor}\n**Target**: ${target}\n**Waktu**: <t:${Math.floor(entry.createdTimestamp / 1000)}:R>`
        });
      });

      applyBanner(embed, message.guild.id, 'mod');

      return message.reply({ embeds: [embed] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal mengambil data audit log.')] });
    }
  },

  async executeSlash(interaction) {
    try {
      const audit = await interaction.guild.fetchAuditLogs({ limit: 10 });
      const embed = new EmbedBuilder()
        .setColor(0xFF758F)
        .setTitle(`📜 10 Aksi Audit Log Terakhir: ${interaction.guild.name}`)
        .setTimestamp();

      audit.entries.forEach(entry => {
        const executor = entry.executor ? entry.executor.tag : 'Sistem';
        const target = entry.target ? (entry.target.tag || entry.target.name || entry.target.id) : '-';
        embed.addFields({
          name: `Aksi: ${entry.action}`,
          value: `**Pelaku**: ${executor}\n**Target**: ${target}\n**Waktu**: <t:${Math.floor(entry.createdTimestamp / 1000)}:R>`
        });
      });

      applyBanner(embed, interaction.guild.id, 'mod');

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal mengambil audit log.')], ephemeral: true });
    }
  }
};
