const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { checkHierarchy } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../modules/logger');

module.exports = {
  name: 'kick',
  description: 'Mengeluarkan member dari server secara instan',
  category: 'moderation',
  usage: '!kick <user> [alasan]',
  aliases: [],
  userPermissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  slashData: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Mengeluarkan member dari server')
    .addUserOption(opt => opt.setName('user').setDescription('Member yang akan di-kick').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Alasan').setRequired(false)),

  async execute(message, args) {
    if (!args[0]) {
      return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });
    }

    const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    if (!targetUser) {
      return message.reply({ embeds: [errorEmbed('User Tidak Ditemukan', 'Pastikan tag pengguna atau berikan ID yang valid.')] });
    }

    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return message.reply({ embeds: [errorEmbed('Bukan Member', 'Pengguna tidak berada di dalam server ini.')] });
    }

    const hierarchy = checkHierarchy(message.member, targetMember, message.guild.members.me);
    if (!hierarchy.allowed) {
      return message.reply({ embeds: [errorEmbed('Gagal Melakukan Kick', hierarchy.reason)] });
    }

    const reason = args.slice(1).join(' ') || 'Tidak ada alasan yang diberikan';

    try {
      await targetMember.kick(`Oleh ${message.author.tag}: ${reason}`);
      await message.reply({ embeds: [successEmbed('Member Di-kick', `**${targetUser.tag}** berhasil dikeluarkan dari server.\n**Alasan**: ${reason}`)] });

      await sendLog(message.guild, {
        category: 'Moderasi',
        title: 'Member Di-kick',
        description: `**Target**: ${targetUser.tag} (\`${targetUser.id}\`)\n**Moderator**: ${message.author}\n**Alasan**: ${reason}`,
        color: 0xFFB703,
        author: message.author
      });
    } catch (err) {
      console.error(err);
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal melakukan kick.')] });
    }
  },

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Tidak ada alasan yang diberikan';

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ embeds: [errorEmbed('Bukan Member', 'Pengguna tidak berada di dalam server ini.')], ephemeral: true });
    }

    const hierarchy = checkHierarchy(interaction.member, targetMember, interaction.guild.members.me);
    if (!hierarchy.allowed) {
      return interaction.reply({ embeds: [errorEmbed('Gagal Melakukan Kick', hierarchy.reason)], ephemeral: true });
    }

    try {
      await targetMember.kick(`Oleh ${interaction.user.tag}: ${reason}`);
      await interaction.reply({ embeds: [successEmbed('Member Di-kick', `**${targetUser.tag}** berhasil dikeluarkan.\n**Alasan**: ${reason}`)] });

      await sendLog(interaction.guild, {
        category: 'Moderasi',
        title: 'Member Di-kick',
        description: `**Target**: ${targetUser.tag} (\`${targetUser.id}\`)\n**Moderator**: ${interaction.user}\n**Alasan**: ${reason}`,
        color: 0xFFB703,
        author: interaction.user
      });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal melakukan kick.')], ephemeral: true });
    }
  }
};
