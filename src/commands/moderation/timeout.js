const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { checkHierarchy } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../modules/logger');

// Helper parse string duration (contoh: 10m, 1h, 3d, 7d)
function parseDuration(str) {
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

module.exports = {
  name: 'timeout',
  description: 'Mute/Timeout sementara pada member',
  category: 'moderation',
  usage: '!timeout <user> <durasi: 10m/1h/3d/7d> [alasan]',
  aliases: ['mute'],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  slashData: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Mute sementara pada member')
    .addUserOption(opt => opt.setName('user').setDescription('Member target').setRequired(true))
    .addStringOption(opt => opt.setName('duration').setDescription('Durasi timeout (contoh: 10m, 1h, 3d, 7d)').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Alasan timeout').setRequired(false)),

  async execute(message, args) {
    if (!args[0] || !args[1]) {
      return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });
    }

    const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    if (!targetUser) return message.reply({ embeds: [errorEmbed('User Tidak Ditemukan', 'Pengguna tidak valid.')] });

    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) return message.reply({ embeds: [errorEmbed('Bukan Member', 'Pengguna tidak ada di server ini.')] });

    const hierarchy = checkHierarchy(message.member, targetMember, message.guild.members.me);
    if (!hierarchy.allowed) return message.reply({ embeds: [errorEmbed('Gagal Melakukan Timeout', hierarchy.reason)] });

    const durationMs = parseDuration(args[1]);
    if (!durationMs || durationMs > 28 * 24 * 60 * 60 * 1000) {
      return message.reply({ embeds: [errorEmbed('Durasi Tidak Valid', 'Format yang didukung: `10m`, `1h`, `3d`, `7d` (maksimal 28 hari).')] });
    }

    const reason = args.slice(2).join(' ') || 'Tidak ada alasan yang diberikan';

    try {
      await targetMember.timeout(durationMs, `Oleh ${message.author.tag}: ${reason}`);
      await message.reply({ embeds: [successEmbed('Member Di-timeout', `**${targetUser.tag}** berhasil di-timeout selama **${args[1]}**.\n**Alasan**: ${reason}`)] });

      await sendLog(message.guild, {
        category: 'Moderasi',
        title: 'Member Di-timeout',
        description: `**Target**: ${targetUser.tag} (\`${targetUser.id}\`)\n**Durasi**: ${args[1]}\n**Moderator**: ${message.author}\n**Alasan**: ${reason}`,
        color: 0xFEE75C,
        author: message.author
      });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal memberikan timeout.')] });
    }
  },

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user');
    const durStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'Tidak ada alasan yang diberikan';

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) return interaction.reply({ embeds: [errorEmbed('Bukan Member', 'Pengguna tidak ada di server ini.')], ephemeral: true });

    const hierarchy = checkHierarchy(interaction.member, targetMember, interaction.guild.members.me);
    if (!hierarchy.allowed) return interaction.reply({ embeds: [errorEmbed('Gagal Melakukan Timeout', hierarchy.reason)], ephemeral: true });

    const durationMs = parseDuration(durStr);
    if (!durationMs || durationMs > 28 * 24 * 60 * 60 * 1000) {
      return interaction.reply({ embeds: [errorEmbed('Durasi Tidak Valid', 'Format yang didukung: `10m`, `1h`, `3d`, `7d` (maksimal 28 hari).')], ephemeral: true });
    }

    try {
      await targetMember.timeout(durationMs, `Oleh ${interaction.user.tag}: ${reason}`);
      await interaction.reply({ embeds: [successEmbed('Member Di-timeout', `**${targetUser.tag}** berhasil di-timeout selama **${durStr}**.\n**Alasan**: ${reason}`)] });

      await sendLog(interaction.guild, {
        category: 'Moderasi',
        title: 'Member Di-timeout',
        description: `**Target**: ${targetUser.tag} (\`${targetUser.id}\`)\n**Durasi**: ${durStr}\n**Moderator**: ${interaction.user}\n**Alasan**: ${reason}`,
        color: 0xFEE75C,
        author: interaction.user
      });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal memberikan timeout.')], ephemeral: true });
    }
  }
};
