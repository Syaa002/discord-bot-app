const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../modules/logger');

module.exports = {
  name: 'delete',
  description: 'Hapus pesan massal di channel (Maksimal 100)',
  category: 'moderation',
  usage: '!delete <jumlah: 1-100> [--bot] [--user @user] [--contains <kata>]',
  aliases: ['del', 'purge'],
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  slashData: new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Hapus pesan massal di channel')
    .addIntegerOption(opt => opt.setName('count').setDescription('Jumlah pesan yang dihapus (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
    .addUserOption(opt => opt.setName('user').setDescription('Hanya hapus pesan dari user ini').setRequired(false))
    .addBooleanOption(opt => opt.setName('bots_only').setDescription('Hanya hapus pesan dari bot').setRequired(false)),

  async execute(message, args) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });

    const count = parseInt(args[0], 10);
    if (isNaN(count) || count < 1 || count > 100) {
      return message.reply({ embeds: [errorEmbed('Jumlah Tidak Valid', 'Masukkan angka antara 1 sampai 100.')] });
    }

    const isBotOnly = args.includes('--bot');
    const userMention = message.mentions.users.first();
    const containsIndex = args.indexOf('--contains');
    const containsText = containsIndex !== -1 && args[containsIndex + 1] ? args[containsIndex + 1].toLowerCase() : null;

    try {
      // Fetch pesan
      const fetched = await message.channel.messages.fetch({ limit: Math.min(100, count + 1) });
      let toDelete = fetched.filter(m => m.id !== message.id);

      if (isBotOnly) {
        toDelete = toDelete.filter(m => m.author.bot);
      }
      if (userMention) {
        toDelete = toDelete.filter(m => m.author.id === userMention.id);
      }
      if (containsText) {
        toDelete = toDelete.filter(m => m.content.toLowerCase().includes(containsText));
      }

      await message.delete().catch(() => {});
      const deleted = await message.channel.bulkDelete(toDelete, true);

      const reply = await message.channel.send({
        embeds: [successEmbed('Pesan Dihapus', `Berhasil menghapus **${deleted.size}** pesan.`)]
      });
      setTimeout(() => reply.delete().catch(() => {}), 4000);

      await sendLog(message.guild, {
        category: 'Moderasi',
        title: 'Bulk Delete Pesan',
        description: `Sebanyak **${deleted.size}** pesan telah dihapus di ${message.channel} oleh ${message.author}.`,
        color: 0xFEE75C,
        author: message.author
      });
    } catch (err) {
      console.error(err);
      return message.channel.send({ embeds: [errorEmbed('Error', 'Gagal menghapus pesan (pesan lebih dari 14 hari tidak bisa dihapus massal).')] });
    }
  },

  async executeSlash(interaction) {
    const count = interaction.options.getInteger('count');
    const user = interaction.options.getUser('user');
    const botsOnly = interaction.options.getBoolean('bots_only');

    try {
      const fetched = await interaction.channel.messages.fetch({ limit: count });
      let toDelete = fetched;

      if (botsOnly) {
        toDelete = toDelete.filter(m => m.author.bot);
      }
      if (user) {
        toDelete = toDelete.filter(m => m.author.id === user.id);
      }

      const deleted = await interaction.channel.bulkDelete(toDelete, true);
      await interaction.reply({
        embeds: [successEmbed('Pesan Dihapus', `Berhasil menghapus **${deleted.size}** pesan.`)],
        ephemeral: true
      });

      await sendLog(interaction.guild, {
        category: 'Moderasi',
        title: 'Bulk Delete Pesan',
        description: `Sebanyak **${deleted.size}** pesan telah dihapus di ${interaction.channel} oleh ${interaction.user}.`,
        color: 0xFEE75C,
        author: interaction.user
      });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal menghapus pesan (pesan lebih dari 14 hari tidak bisa dihapus massal).')], ephemeral: true });
    }
  }
};
