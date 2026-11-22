const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'thread',
  description: 'Membuat thread diskusi baru dengan opsi auto-archive',
  category: 'community',
  usage: '!thread create <nama-thread> [durasi: 60/1440]',
  aliases: [],
  userPermissions: [],
  botPermissions: ['CreatePublicThreads'],
  slashData: new SlashCommandBuilder()
    .setName('thread')
    .setDescription('Kelola thread diskusi')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Buat thread diskusi baru')
        .addStringOption(opt => opt.setName('name').setDescription('Nama thread').setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('archive')
            .setDescription('Durasi auto-archive (menit)')
            .setRequired(false)
            .addChoices(
              { name: '1 Jam', value: 60 },
              { name: '24 Jam', value: 1440 }
            )
        )
    ),

  async execute(message, args) {
    if (args[0] !== 'create' || !args[1]) {
      return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });
    }

    const threadName = args.slice(1).join(' ');
    try {
      const thread = await message.startThread({
        name: threadName,
        autoArchiveDuration: 60
      });
      return message.reply({ embeds: [successEmbed('Thread Dibuat', `Thread ${thread} berhasil diluncurkan.`)] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal membuat thread di channel ini.')] });
    }
  },

  async executeSlash(interaction) {
    const threadName = interaction.options.getString('name');
    const archiveDuration = interaction.options.getInteger('archive') || 60;

    try {
      const thread = await interaction.channel.threads.create({
        name: threadName,
        autoArchiveDuration: archiveDuration
      });
      return interaction.reply({ embeds: [successEmbed('Thread Dibuat', `Thread ${thread} berhasil dibuat.`)], ephemeral: true });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal membuat thread.')], ephemeral: true });
    }
  }
};
