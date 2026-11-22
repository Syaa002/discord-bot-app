const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'cleanup',
  description: 'Hapus massal invite/channel usang lebih dari 30 hari',
  category: 'moderation',
  usage: '!cleanup <invite|role>',
  aliases: [],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('cleanup')
    .setDescription('Bersihkan invite/role usang')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Tipe objek yang dibersihkan')
        .setRequired(true)
        .addChoices(
          { name: 'Invites (Link kadaluwarsa)', value: 'invite' }
        )
    ),

  async execute(message, args) {
    const type = args[0]?.toLowerCase();
    if (type !== 'invite') return message.reply({ embeds: [errorEmbed('Format Salah', 'Gunakan: `!cleanup invite`')] });

    try {
      const invites = await message.guild.invites.fetch();
      let deletedCount = 0;

      for (const invite of invites.values()) {
        if (invite.expiresTimestamp && invite.expiresTimestamp < Date.now()) {
          await invite.delete('Pembersihan invite expired');
          deletedCount++;
        }
      }

      return message.reply({ embeds: [successEmbed('Cleanup Selesai', `Berhasil menghapus **${deletedCount}** link invite yang telah kedaluwarsa.`)] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal melakukan pembersihan.')] });
    }
  },

  async executeSlash(interaction) {
    try {
      const invites = await interaction.guild.invites.fetch();
      let deletedCount = 0;

      for (const invite of invites.values()) {
        if (invite.expiresTimestamp && invite.expiresTimestamp < Date.now()) {
          await invite.delete('Pembersihan invite expired');
          deletedCount++;
        }
      }

      return interaction.reply({ embeds: [successEmbed('Cleanup Selesai', `Berhasil menghapus **${deletedCount}** link invite yang telah kedaluwarsa.`)] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal melakukan pembersihan.')], ephemeral: true });
    }
  }
};
