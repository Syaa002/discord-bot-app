const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { checkHierarchy } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../modules/logger');

module.exports = {
  name: 'unmute',
  description: 'Menghapus timeout pada member',
  category: 'moderation',
  usage: '!unmute <user>',
  aliases: ['untimeout'],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  slashData: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Menghapus status timeout pada member')
    .addUserOption(opt => opt.setName('user').setDescription('Member target').setRequired(true)),

  async execute(message, args) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });

    const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    if (!targetUser) return message.reply({ embeds: [errorEmbed('User Tidak Ditemukan', 'Pengguna tidak valid.')] });

    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) return message.reply({ embeds: [errorEmbed('Bukan Member', 'Pengguna tidak ada di server ini.')] });

    const hierarchy = checkHierarchy(message.member, targetMember, message.guild.members.me);
    if (!hierarchy.allowed) return message.reply({ embeds: [errorEmbed('Gagal', hierarchy.reason)] });

    try {
      await targetMember.timeout(null, `Dibatalkan oleh ${message.author.tag}`);
      await message.reply({ embeds: [successEmbed('Timeout Dihapus', `Status timeout **${targetUser.tag}** berhasil dicabut.`)] });

      await sendLog(message.guild, {
        category: 'Moderasi',
        title: 'Timeout Dicabut',
        description: `**Target**: ${targetUser.tag} (\`${targetUser.id}\`)\n**Moderator**: ${message.author}`,
        color: 0xFF4D6D,
        author: message.author
      });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal membatalkan timeout.')] });
    }
  },

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) return interaction.reply({ embeds: [errorEmbed('Bukan Member', 'Pengguna tidak ada di server ini.')], ephemeral: true });

    const hierarchy = checkHierarchy(interaction.member, targetMember, interaction.guild.members.me);
    if (!hierarchy.allowed) return interaction.reply({ embeds: [errorEmbed('Gagal', hierarchy.reason)], ephemeral: true });

    try {
      await targetMember.timeout(null, `Dibatalkan oleh ${interaction.user.tag}`);
      await interaction.reply({ embeds: [successEmbed('Timeout Dihapus', `Status timeout **${targetUser.tag}** berhasil dicabut.`)] });

      await sendLog(interaction.guild, {
        category: 'Moderasi',
        title: 'Timeout Dicabut',
        description: `**Target**: ${targetUser.tag} (\`${targetUser.id}\`)\n**Moderator**: ${interaction.user}`,
        color: 0xFF4D6D,
        author: interaction.user
      });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal membatalkan timeout.')], ephemeral: true });
    }
  }
};
