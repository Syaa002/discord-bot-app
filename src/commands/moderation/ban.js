const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { checkHierarchy } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../modules/logger');

module.exports = {
  name: 'ban',
  description: 'Banned user dari server secara permanen',
  category: 'moderation',
  usage: '!ban <user> [alasan]',
  aliases: [],
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  slashData: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banned user dari server secara permanen')
    .addUserOption(opt => opt.setName('user').setDescription('Member yang akan di-ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Alasan pemblokiran').setRequired(false)),

  async execute(message, args) {
    if (!args[0]) {
      return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });
    }

    const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    if (!targetUser) {
      return message.reply({ embeds: [errorEmbed('User Tidak Ditemukan', 'Pastikan tag pengguna atau berikan ID yang valid.')] });
    }

    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember) {
      const hierarchy = checkHierarchy(message.member, targetMember, message.guild.members.me);
      if (!hierarchy.allowed) {
        return message.reply({ embeds: [errorEmbed('Gagal Melakukan Ban', hierarchy.reason)] });
      }
    }

    const reason = args.slice(1).join(' ') || 'Tidak ada alasan yang diberikan';

    try {
      await message.guild.members.ban(targetUser.id, { reason: `Oleh ${message.author.tag}: ${reason}` });
      await message.reply({ embeds: [successEmbed('Member Di-ban', `**${targetUser.tag}** (\`${targetUser.id}\`) berhasil di-ban.\n**Alasan**: ${reason}`)] });

      await sendLog(message.guild, {
        category: 'Moderasi',
        title: 'User Di-ban',
        description: `**Target**: ${targetUser.tag} (\`${targetUser.id}\`)\n**Moderator**: ${message.author}\n**Alasan**: ${reason}`,
        color: 0xED4245,
        author: message.author
      });
    } catch (err) {
      console.error(err);
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal melakukan ban pada pengguna tersebut.')] });
    }
  },

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Tidak ada alasan yang diberikan';

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember) {
      const hierarchy = checkHierarchy(interaction.member, targetMember, interaction.guild.members.me);
      if (!hierarchy.allowed) {
        return interaction.reply({ embeds: [errorEmbed('Gagal Melakukan Ban', hierarchy.reason)], ephemeral: true });
      }
    }

    try {
      await interaction.guild.members.ban(targetUser.id, { reason: `Oleh ${interaction.user.tag}: ${reason}` });
      await interaction.reply({ embeds: [successEmbed('Member Di-ban', `**${targetUser.tag}** (\`${targetUser.id}\`) berhasil di-ban.\n**Alasan**: ${reason}`)] });

      await sendLog(interaction.guild, {
        category: 'Moderasi',
        title: 'User Di-ban',
        description: `**Target**: ${targetUser.tag} (\`${targetUser.id}\`)\n**Moderator**: ${interaction.user}\n**Alasan**: ${reason}`,
        color: 0xED4245,
        author: interaction.user
      });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal melakukan ban pada pengguna tersebut.')], ephemeral: true });
    }
  }
};
