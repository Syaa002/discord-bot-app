const { PermissionFlagsBits, ChannelType, SlashCommandBuilder } = require('discord.js');
const db = require('../../database/jsonDb');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendInterfacePanel } = require('../../modules/voiceRooms');

module.exports = {
  name: 'voicepanel',
  description: 'Menyiapkan Temporary Voice Rooms dan mengirim Panel Interaktif 18 Tombol ke saluran teks',
  category: 'panels',
  usage: '!voicepanel setup | !voicepanel interface [#channel]',
  aliases: ['setupvoice', 'voiceinterface'],
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages],
  slashData: new SlashCommandBuilder()
    .setName('voicepanel')
    .setDescription('Kelola sistem Temporary Voice & Interface 18 Tombol')
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Buat kategori dan saluran Join to Create otomatis')
    )
    .addSubcommand(sub =>
      sub.setName('interface')
        .setDescription('Kirim panel kontrol 18 tombol permanen ke saluran teks (seperti #interface)')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Saluran teks tujuan (kosongkan untuk saluran saat ini)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    ),

  async execute(message, args) {
    const sub = (args[0] || '').toLowerCase();

    // 1. Subcommand: Interface (Kirim panel ke channel)
    if (sub === 'interface') {
      const targetChannel = message.mentions.channels.first() ||
        message.guild.channels.cache.get(args[1]) ||
        message.channel;

      if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        return message.reply({ embeds: [errorEmbed('Saluran Tidak Valid', 'Harap pilih saluran teks yang valid.')] });
      }

      try {
        await sendInterfacePanel(targetChannel);
        return message.reply({
          embeds: [
            successEmbed(
              'Panel Voice Interface Terkirim!',
              `Panel pengendali 18 tombol berhasil disematkan ke saluran ${targetChannel}.\n` +
              'Member yang sedang berada di temporary voice room mereka dapat langsung menekan tombol-tombol tersebut untuk mengontrol ruangan!'
            )
          ]
        });
      } catch (err) {
        console.error('[VoicePanel] Error sending interface:', err);
        return message.reply({ embeds: [errorEmbed('Gagal Mengirim Panel', err.message)] });
      }
    }

    // 2. Subcommand: Setup (Join to Create)
    try {
      const category = await message.guild.channels.create({
        name: '🔊 TEMPORARY VOICE',
        type: ChannelType.GuildCategory
      });

      const joinChannel = await message.guild.channels.create({
        name: '➕ Join to Create',
        type: ChannelType.GuildVoice,
        parent: category.id
      });

      db.updateGuild(message.guild.id, data => {
        data.joinToCreateChannel = joinChannel.id;
      });

      return message.reply({
        embeds: [
          successEmbed(
            'Voice System Siap!',
            `Kategori dan saluran ${joinChannel} berhasil dibuat!\n\n` +
            '• Member yang join otomatis dibuatkan temporary room.\n' +
            '• Untuk menyematkan panel kontrol 18 tombol permanen ke saluran teks (seperti `#interface`), jalankan: `!voicepanel interface [#channel]`'
          )
        ]
      });
    } catch (err) {
      console.error(err);
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal menyiapkan voice system.')] });
    }
  },

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'interface') {
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      try {
        await sendInterfacePanel(targetChannel);
        return interaction.reply({
          embeds: [
            successEmbed(
              'Panel Voice Interface Terkirim!',
              `Panel pengendali 18 tombol berhasil disematkan ke ${targetChannel}.\n` +
              'Member dapat mengontrol ruangan suaranya langsung dari tombol tersebut.'
            )
          ],
          ephemeral: true
        });
      } catch (err) {
        return interaction.reply({
          embeds: [errorEmbed('Gagal Mengirim', err.message)],
          ephemeral: true
        });
      }
    }

    // Setup
    try {
      const category = await interaction.guild.channels.create({
        name: '🔊 TEMPORARY VOICE',
        type: ChannelType.GuildCategory
      });

      const joinChannel = await interaction.guild.channels.create({
        name: '➕ Join to Create',
        type: ChannelType.GuildVoice,
        parent: category.id
      });

      db.updateGuild(interaction.guild.id, data => {
        data.joinToCreateChannel = joinChannel.id;
      });

      return interaction.reply({
        embeds: [
          successEmbed(
            'Voice System Siap!',
            `Kategori dan saluran ${joinChannel} berhasil dibuat!\n` +
            'Gunakan `/voicepanel interface` untuk mengirim panel tombol ke saluran teks seperti `#interface`.'
          )
        ]
      });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal menyiapkan voice system.')], ephemeral: true });
    }
  }
};
