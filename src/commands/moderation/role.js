const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'role',
  description: 'Memberikan atau mencabut role pada member secara aman',
  category: 'moderation',
  usage: '!role <add/remove> <user> <role>',
  aliases: [],
  userPermissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  slashData: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Kelola role member')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Tambah role ke member')
        .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role yang diberikan').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Cabut role dari member')
        .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role yang dicabut').setRequired(true))
    ),

  async execute(message, args) {
    const action = args[0]?.toLowerCase();
    if (!['add', 'remove'].includes(action) || !args[1] || !args[2]) {
      return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });
    }

    const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[1]).catch(() => null);
    if (!targetMember) return message.reply({ embeds: [errorEmbed('User Tidak Ditemukan', 'Pengguna tidak valid.')] });

    const targetRole = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
    if (!targetRole) return message.reply({ embeds: [errorEmbed('Role Tidak Ditemukan', 'Role tidak valid.')] });

    // Cek hierarki bot
    if (message.guild.members.me.roles.highest.position <= targetRole.position) {
      return message.reply({ embeds: [errorEmbed('Gagal', 'Role tersebut memiliki posisi lebih tinggi atau sama dengan role tertinggi bot.')] });
    }

    try {
      if (action === 'add') {
        await targetMember.roles.add(targetRole);
        return message.reply({ embeds: [successEmbed('Role Ditambahkan', `Role **${targetRole.name}** berhasil diberikan kepada ${targetMember}.`)] });
      } else {
        await targetMember.roles.remove(targetRole);
        return message.reply({ embeds: [successEmbed('Role Dicabut', `Role **${targetRole.name}** berhasil dicabut dari ${targetMember}.`)] });
      }
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal memperbarui role member.')] });
    }
  },

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    const targetMember = interaction.options.getMember('user');
    const targetRole = interaction.options.getRole('role');

    if (!targetMember) return interaction.reply({ embeds: [errorEmbed('User Tidak Ditemukan', 'Pengguna tidak valid.')], ephemeral: true });

    if (interaction.guild.members.me.roles.highest.position <= targetRole.position) {
      return interaction.reply({ embeds: [errorEmbed('Gagal', 'Role tersebut memiliki posisi lebih tinggi atau sama dengan role tertinggi bot.')], ephemeral: true });
    }

    try {
      if (sub === 'add') {
        await targetMember.roles.add(targetRole);
        return interaction.reply({ embeds: [successEmbed('Role Ditambahkan', `Role **${targetRole.name}** berhasil diberikan kepada ${targetMember}.`)] });
      } else {
        await targetMember.roles.remove(targetRole);
        return interaction.reply({ embeds: [successEmbed('Role Dicabut', `Role **${targetRole.name}** berhasil dicabut dari ${targetMember}.`)] });
      }
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal memperbarui role.')], ephemeral: true });
    }
  }
};
