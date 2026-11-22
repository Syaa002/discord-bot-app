const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'nick',
  description: 'Mengubah nickname member di server',
  category: 'moderation',
  usage: '!nick <user> <new-nickname>',
  aliases: ['setnick'],
  userPermissions: [PermissionFlagsBits.ManageNicknames],
  botPermissions: [PermissionFlagsBits.ManageNicknames],
  slashData: new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Ubah nickname member')
    .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
    .addStringOption(opt => opt.setName('name').setDescription('Nickname baru').setMaxLength(32).setRequired(true)),

  async execute(message, args) {
    if (!args[0] || !args[1]) return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });

    const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!targetMember) return message.reply({ embeds: [errorEmbed('User Tidak Ditemukan', 'Pengguna tidak valid.')] });

    const newNick = args.slice(1).join(' ');
    if (newNick.length > 32) return message.reply({ embeds: [errorEmbed('Terlalu Panjang', 'Maksimal 32 karakter.')] });

    try {
      await targetMember.setNickname(newNick);
      return message.reply({ embeds: [successEmbed('Nickname Diubah', `Nickname ${targetMember} berhasil diubah menjadi **${newNick}**.`)] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal mengubah nickname (pastikan role bot lebih tinggi dari target).')] });
    }
  },

  async executeSlash(interaction) {
    const targetMember = interaction.options.getMember('user');
    const newNick = interaction.options.getString('name');

    if (!targetMember) return interaction.reply({ embeds: [errorEmbed('User Tidak Ditemukan', 'Pengguna tidak valid.')], ephemeral: true });

    try {
      await targetMember.setNickname(newNick);
      return interaction.reply({ embeds: [successEmbed('Nickname Diubah', `Nickname ${targetMember} berhasil diubah menjadi **${newNick}**.`)] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal mengubah nickname.')], ephemeral: true });
    }
  }
};
