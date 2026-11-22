const { PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const db = require('../../database/jsonDb');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'backup',
  description: 'Ekspor backup konfigurasi, data peran, dan pengaturan server dalam file JSON',
  category: 'admin',
  usage: '!backup export',
  aliases: [],
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  async execute(message, args) {
    if (args[0] !== 'export') {
      return message.reply({ embeds: [errorEmbed('Format Salah', 'Gunakan: `!backup export`')] });
    }

    try {
      const guildData = db.getGuild(message.guild.id);
      const backupData = {
        guildId: message.guild.id,
        guildName: message.guild.name,
        exportedAt: new Date().toISOString(),
        config: guildData,
        roles: message.guild.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.color, permissions: r.permissions.bitfield.toString() })),
        channels: message.guild.channels.cache.map(c => ({ id: c.id, name: c.name, type: c.type, parentId: c.parentId }))
      };

      const buffer = Buffer.from(JSON.stringify(backupData, null, 2), 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: `backup-${message.guild.id}-${Date.now()}.json` });

      return message.reply({
        content: '📦 **Backup Server Berhasil Dibuat!** Simpan file ini dengan aman.',
        files: [attachment]
      });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal mengekspor data backup.')] });
    }
  }
};
