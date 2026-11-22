const { PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/jsonDb');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'warnings',
  description: 'Melihat riwayat peringatan member',
  category: 'moderation',
  usage: '!warnings <user>',
  aliases: ['warns'],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Lihat riwayat peringatan member')
    .addUserOption(opt => opt.setName('user').setDescription('Member target').setRequired(true)),

  async execute(message, args) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });

    const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    if (!targetUser) return message.reply({ embeds: [errorEmbed('User Tidak Ditemukan', 'Pengguna tidak valid.')] });

    const guildData = db.getGuild(message.guild.id);
    const userWarns = guildData.warnings[targetUser.id] || [];

    if (userWarns.length === 0) {
      return message.reply({ content: `✅ Pengguna **${targetUser.tag}** tidak memiliki riwayat peringatan.` });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`⚠️ Riwayat Peringatan: ${targetUser.tag}`)
      .setDescription(`Total Peringatan: **${userWarns.length}**`)
      .setThumbnail(targetUser.displayAvatarURL());

    userWarns.slice(0, 10).forEach((w, i) => {
      embed.addFields({
        name: `#${i + 1} | ID: ${w.id}`,
        value: `**Alasan**: ${w.reason}\n**Moderator**: <@${w.moderatorId}>\n**Waktu**: <t:${Math.floor(w.timestamp / 1000)}:R>`
      });
    });

    return message.reply({ embeds: [embed] });
  },

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user');
    const guildData = db.getGuild(interaction.guild.id);
    const userWarns = guildData.warnings[targetUser.id] || [];

    if (userWarns.length === 0) {
      return interaction.reply({ content: `✅ Pengguna **${targetUser.tag}** tidak memiliki riwayat peringatan.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`⚠️ Riwayat Peringatan: ${targetUser.tag}`)
      .setDescription(`Total Peringatan: **${userWarns.length}**`)
      .setThumbnail(targetUser.displayAvatarURL());

    userWarns.slice(0, 10).forEach((w, i) => {
      embed.addFields({
        name: `#${i + 1} | ID: ${w.id}`,
        value: `**Alasan**: ${w.reason}\n**Moderator**: <@${w.moderatorId}>\n**Waktu**: <t:${Math.floor(w.timestamp / 1000)}:R>`
      });
    });

    return interaction.reply({ embeds: [embed] });
  }
};
