const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'slowmode',
  description: 'Atur jeda waktu pengiriman pesan di channel (0 = mati, maks 21600 detik)',
  category: 'moderation',
  usage: '!slowmode <detik: 0-21600> [channel]',
  aliases: ['slow'],
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  slashData: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Atur jeda slowmode channel')
    .addIntegerOption(opt => opt.setName('seconds').setDescription('Jeda dalam detik (0 = off, maks 21600)').setMinValue(0).setMaxValue(21600).setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel target').setRequired(false)),

  async execute(message, args) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });

    const seconds = parseInt(args[0], 10);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.reply({ embeds: [errorEmbed('Angka Tidak Valid', 'Masukkan detik antara 0 sampai 21600.')] });
    }

    const channel = message.mentions.channels.first() || message.channel;

    try {
      await channel.setRateLimitPerUser(seconds);
      const text = seconds === 0 ? 'Slowmode telah **dinonaktifkan**.' : `Slowmode diatur menjadi **${seconds} detik**.`;
      return message.reply({ embeds: [successEmbed('Slowmode Berhasil', text)] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal mengatur slowmode.')] });
    }
  },

  async executeSlash(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
      await channel.setRateLimitPerUser(seconds);
      const text = seconds === 0 ? 'Slowmode telah **dinonaktifkan**.' : `Slowmode diatur menjadi **${seconds} detik**.`;
      return interaction.reply({ embeds: [successEmbed('Slowmode Berhasil', text)] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal mengatur slowmode.')], ephemeral: true });
    }
  }
};
