const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/jsonDb');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'report',
  description: 'Laporkan pelanggaran member ke tim moderator',
  category: 'moderation',
  usage: '!report <user> <link-bukti> <detail>',
  aliases: [],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Kirim laporan member ke moderator')
    .addUserOption(opt => opt.setName('user').setDescription('Member yang dilaporkan').setRequired(true))
    .addStringOption(opt => opt.setName('evidence').setDescription('Link bukti (URL gambar/screenshot/pesan)').setRequired(true))
    .addStringOption(opt => opt.setName('details').setDescription('Detail laporan').setRequired(true)),

  async execute(message, args) {
    if (!args[0] || !args[1] || !args[2]) return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });

    const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    if (!targetUser) return message.reply({ embeds: [errorEmbed('User Tidak Ditemukan', 'Pengguna tidak valid.')] });

    const evidenceUrl = args[1];
    const details = args.slice(2).join(' ');

    const guildData = db.getGuild(message.guild.id);
    const modChannel = guildData.modLogChannel ? message.guild.channels.cache.get(guildData.modLogChannel) : null;

    if (!modChannel) {
      return message.reply({ embeds: [errorEmbed('Gagal', 'Channel laporan moderator belum diatur oleh admin.')] });
    }

    try {
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🚨 Laporan Pengguna Baru')
        .setDescription(`Laporan diajukan oleh ${message.author} (\`${message.author.id}\`)`)
        .addFields(
          { name: 'Target Pelanggar', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
          { name: 'Link Bukti', value: evidenceUrl, inline: false },
          { name: 'Detail Kejadian', value: details, inline: false }
        )
        .setTimestamp();

      const reportMsg = await modChannel.send({ embeds: [embed] });
      await reportMsg.startThread({
        name: `Investigasi: ${targetUser.username}`,
        autoArchiveDuration: 1440
      });

      return message.reply({ embeds: [successEmbed('Laporan Terkirim', 'Laporan Anda telah diteruskan kepada tim moderator.')] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal mengirimkan laporan.')] });
    }
  },

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user');
    const evidenceUrl = interaction.options.getString('evidence');
    const details = interaction.options.getString('details');

    const guildData = db.getGuild(interaction.guild.id);
    const modChannel = guildData.modLogChannel ? interaction.guild.channels.cache.get(guildData.modLogChannel) : null;

    if (!modChannel) {
      return interaction.reply({ embeds: [errorEmbed('Gagal', 'Channel laporan moderator belum diatur oleh admin.')], ephemeral: true });
    }

    try {
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🚨 Laporan Pengguna Baru')
        .setDescription(`Laporan diajukan oleh ${interaction.user} (\`${interaction.user.id}\`)`)
        .addFields(
          { name: 'Target Pelanggar', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
          { name: 'Link Bukti', value: evidenceUrl, inline: false },
          { name: 'Detail Kejadian', value: details, inline: false }
        )
        .setTimestamp();

      const reportMsg = await modChannel.send({ embeds: [embed] });
      await reportMsg.startThread({
        name: `Investigasi: ${targetUser.username}`,
        autoArchiveDuration: 1440
      });

      return interaction.reply({ embeds: [successEmbed('Laporan Terkirim', 'Laporan Anda telah diteruskan kepada tim moderator.')], ephemeral: true });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal mengirimkan laporan.')], ephemeral: true });
    }
  }
};
