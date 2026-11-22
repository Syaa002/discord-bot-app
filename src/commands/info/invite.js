const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'invite',
  description: 'Membuat link invite sementara sekali pakai (berlaku 7 hari)',
  category: 'info',
  usage: '!invite',
  aliases: [],
  userPermissions: [],
  botPermissions: ['CreateInstantInvite'],
  slashData: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Buat link invite server sementara'),

  async execute(message) {
    try {
      const invite = await message.channel.createInvite({
        maxAge: 7 * 24 * 3600,
        maxUses: 10,
        unique: true
      });
      return message.reply({ embeds: [successEmbed('Link Undangan Dibuat', `Link invite server ini:\n🔗 ${invite.url}\n*(Berlaku 7 hari, maksimal 10 pemakaian)*`)] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal membuat link invite.')] });
    }
  },

  async executeSlash(interaction) {
    try {
      const invite = await interaction.channel.createInvite({
        maxAge: 7 * 24 * 3600,
        maxUses: 10,
        unique: true
      });
      return interaction.reply({ embeds: [successEmbed('Link Undangan Dibuat', `Link invite server ini:\n🔗 ${invite.url}\n*(Berlaku 7 hari, maksimal 10 pemakaian)*`)], ephemeral: true });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal membuat link invite.')], ephemeral: true });
    }
  }
};
