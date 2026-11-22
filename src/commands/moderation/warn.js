const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../../database/jsonDb');
const { checkHierarchy } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../modules/logger');

module.exports = {
  name: 'warn',
  description: 'Memberikan peringatan pelanggaran kepada member',
  category: 'moderation',
  usage: '!warn <user> <alasan>',
  aliases: [],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Beri peringatan kepada member')
    .addUserOption(opt => opt.setName('user').setDescription('Member target').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Alasan peringatan').setRequired(true)),

  async execute(message, args) {
    if (!args[0] || !args[1]) {
      return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });
    }

    const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    if (!targetUser) return message.reply({ embeds: [errorEmbed('User Tidak Ditemukan', 'Pengguna tidak valid.')] });

    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember) {
      const hierarchy = checkHierarchy(message.member, targetMember, message.guild.members.me);
      if (!hierarchy.allowed) return message.reply({ embeds: [errorEmbed('Gagal', hierarchy.reason)] });
    }

    const reason = args.slice(1).join(' ');
    const warnId = Math.random().toString(36).substring(2, 8).toUpperCase();

    db.updateGuild(message.guild.id, data => {
      if (!data.warnings[targetUser.id]) data.warnings[targetUser.id] = [];
      data.warnings[targetUser.id].push({
        id: warnId,
        reason,
        moderatorId: message.author.id,
        timestamp: Date.now()
      });
    });

    // Kirim DM ke user
    await targetUser.send({
      embeds: [errorEmbed('Peringatan Diterima', `Anda menerima peringatan di **${message.guild.name}**.\n**Alasan**: ${reason}\n**ID Peringatan**: \`${warnId}\``)]
    }).catch(() => {});

    await message.reply({
      embeds: [successEmbed('Peringatan Dicatat', `Berhasil memberikan peringatan kepada **${targetUser.tag}**.\n**Alasan**: ${reason}\n**ID**: \`${warnId}\``)]
    });

    await sendLog(message.guild, {
      category: 'Moderasi',
      title: 'Peringatan Diberikan',
      description: `**Target**: ${targetUser.tag} (\`${targetUser.id}\`)\n**Moderator**: ${message.author}\n**Alasan**: ${reason}\n**ID**: \`${warnId}\``,
      color: 0xFFB703,
      author: message.author
    });
  },

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember) {
      const hierarchy = checkHierarchy(interaction.member, targetMember, interaction.guild.members.me);
      if (!hierarchy.allowed) return interaction.reply({ embeds: [errorEmbed('Gagal', hierarchy.reason)], ephemeral: true });
    }

    const warnId = Math.random().toString(36).substring(2, 8).toUpperCase();

    db.updateGuild(interaction.guild.id, data => {
      if (!data.warnings[targetUser.id]) data.warnings[targetUser.id] = [];
      data.warnings[targetUser.id].push({
        id: warnId,
        reason,
        moderatorId: interaction.user.id,
        timestamp: Date.now()
      });
    });

    await targetUser.send({
      embeds: [errorEmbed('Peringatan Diterima', `Anda menerima peringatan di **${interaction.guild.name}**.\n**Alasan**: ${reason}\n**ID Peringatan**: \`${warnId}\``)]
    }).catch(() => {});

    await interaction.reply({
      embeds: [successEmbed('Peringatan Dicatat', `Berhasil memberikan peringatan kepada **${targetUser.tag}**.\n**Alasan**: ${reason}\n**ID**: \`${warnId}\``)]
    });

    await sendLog(interaction.guild, {
      category: 'Moderasi',
      title: 'Peringatan Diberikan',
      description: `**Target**: ${targetUser.tag} (\`${targetUser.id}\`)\n**Moderator**: ${interaction.user}\n**Alasan**: ${reason}\n**ID**: \`${warnId}\``,
      color: 0xFFB703,
      author: interaction.user
    });
  }
};
