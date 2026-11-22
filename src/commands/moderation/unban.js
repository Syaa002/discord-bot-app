const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../modules/logger');

module.exports = {
  name: 'unban',
  description: 'Membuka pemblokiran user dari server menggunakan ID',
  category: 'moderation',
  usage: '!unban <user-id> [alasan]',
  aliases: [],
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  slashData: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Membuka pemblokiran user dari server')
    .addStringOption(opt => opt.setName('userid').setDescription('ID akun Discord pengguna yang ingin di-unban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Alasan unban').setRequired(false)),

  async execute(message, args) {
    if (!args[0]) {
      return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });
    }

    const userId = args[0].replace(/[^0-9]/g, '');
    const reason = args.slice(1).join(' ') || 'Tidak ada alasan yang diberikan';

    try {
      const banInfo = await message.guild.bans.fetch(userId).catch(() => null);
      if (!banInfo) {
        return message.reply({ embeds: [errorEmbed('Tidak Ditemukan', 'Pengguna dengan ID tersebut tidak berada dalam daftar ban server ini.')] });
      }

      await message.guild.members.unban(userId, `Oleh ${message.author.tag}: ${reason}`);
      await message.reply({ embeds: [successEmbed('User Di-unban', `Pengguna **${banInfo.user.tag}** (\`${userId}\`) berhasil di-unban.\n**Alasan**: ${reason}`)] });

      await sendLog(message.guild, {
        category: 'Moderasi',
        title: 'User Di-unban',
        description: `**Target**: ${banInfo.user.tag} (\`${userId}\`)\n**Moderator**: ${message.author}\n**Alasan**: ${reason}`,
        color: 0xFF4D6D,
        author: message.author
      });
    } catch (err) {
      console.error(err);
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal membuka ban pada pengguna tersebut.')] });
    }
  },

  async executeSlash(interaction) {
    const userId = interaction.options.getString('userid').replace(/[^0-9]/g, '');
    const reason = interaction.options.getString('reason') || 'Tidak ada alasan yang diberikan';

    try {
      const banInfo = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!banInfo) {
        return interaction.reply({ embeds: [errorEmbed('Tidak Ditemukan', 'Pengguna dengan ID tersebut tidak berada dalam daftar ban server ini.')], ephemeral: true });
      }

      await interaction.guild.members.unban(userId, `Oleh ${interaction.user.tag}: ${reason}`);
      await interaction.reply({ embeds: [successEmbed('User Di-unban', `Pengguna **${banInfo.user.tag}** (\`${userId}\`) berhasil di-unban.\n**Alasan**: ${reason}`)] });

      await sendLog(interaction.guild, {
        category: 'Moderasi',
        title: 'User Di-unban',
        description: `**Target**: ${banInfo.user.tag} (\`${userId}\`)\n**Moderator**: ${interaction.user}\n**Alasan**: ${reason}`,
        color: 0xFF4D6D,
        author: interaction.user
      });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal membuka ban pada pengguna tersebut.')], ephemeral: true });
    }
  }
};
