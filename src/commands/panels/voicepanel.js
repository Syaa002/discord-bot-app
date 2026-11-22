const { PermissionFlagsBits, ChannelType, SlashCommandBuilder } = require('discord.js');
const db = require('../../database/jsonDb');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'voicepanel',
  description: 'Menyiapkan saluran "Join to Create" untuk Temporary Voice Rooms (18 Tombol Kontrol)',
  category: 'panels',
  usage: '!voicepanel setup',
  aliases: ['setupvoice'],
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  slashData: new SlashCommandBuilder()
    .setName('voicepanel')
    .setDescription('Setup saluran Join to Create Voice')
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Buat kategori dan saluran Join to Create otomatis')
    ),

  async execute(message) {
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
            `Member yang bergabung ke saluran tersebut akan otomatis mendapatkan **Temporary Voice Room** pribadi dengan **18 Tombol Kontrol** (Limit, Chat, Name, Privacy, Bitrate, Kick, Trust, Block, Waiting Room, Claim, Transfer, Delete, dll).`
          )
        ]
      });
    } catch (err) {
      console.error(err);
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal menyiapkan voice system.')] });
    }
  },

  async executeSlash(interaction) {
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
            `Member yang join akan otomatis dibuatkan room dengan 18 tombol kontrol.`
          )
        ]
      });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal menyiapkan voice system.')], ephemeral: true });
    }
  }
};
