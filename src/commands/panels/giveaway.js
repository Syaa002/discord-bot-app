const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { startGiveaway } = require('../../modules/giveaways');
const { errorEmbed } = require('../../utils/embeds');

function parseTime(str) {
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  switch (match[2].toLowerCase()) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 3600 * 1000;
    case 'd': return val * 86400 * 1000;
    default: return null;
  }
}

module.exports = {
  name: 'giveaway',
  description: 'Memulai giveaway interaktif dengan tombol Enter/Leave',
  category: 'panels',
  usage: '!giveaway <durasi: 10m/1h/1d> <jumlah-pemenang> <hadiah>',
  aliases: ['gstart'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Mulai giveaway baru')
    .addStringOption(opt => opt.setName('duration').setDescription('Durasi (contoh: 10m, 1h, 1d)').setRequired(true))
    .addIntegerOption(opt => opt.setName('winners').setDescription('Jumlah pemenang').setMinValue(1).setMaxValue(20).setRequired(true))
    .addStringOption(opt => opt.setName('prize').setDescription('Hadiah yang diperebutkan').setRequired(true)),

  async execute(message, args) {
    if (!args[0] || !args[1] || !args[2]) {
      return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });
    }

    const durationMs = parseTime(args[0]);
    if (!durationMs) return message.reply({ embeds: [errorEmbed('Format Waktu Salah', 'Gunakan `10m`, `1h`, atau `1d`.')] });

    const winnersCount = parseInt(args[1], 10);
    if (isNaN(winnersCount) || winnersCount < 1) return message.reply({ embeds: [errorEmbed('Pemenang Tidak Valid', 'Minimal 1 pemenang.')] });

    const prize = args.slice(2).join(' ');

    await message.delete().catch(() => {});
    await startGiveaway(message.channel, {
      prize,
      durationMs,
      winnersCount,
      hostUser: message.author
    });
  },

  async executeSlash(interaction) {
    const durStr = interaction.options.getString('duration');
    const durationMs = parseTime(durStr);
    if (!durationMs) return interaction.reply({ embeds: [errorEmbed('Format Waktu Salah', 'Gunakan `10m`, `1h`, atau `1d`.')], ephemeral: true });

    const winnersCount = interaction.options.getInteger('winners');
    const prize = interaction.options.getString('prize');

    await interaction.reply({ content: '🎉 Memulai giveaway...', ephemeral: true });
    await startGiveaway(interaction.channel, {
      prize,
      durationMs,
      winnersCount,
      hostUser: interaction.user
    });
  }
};
