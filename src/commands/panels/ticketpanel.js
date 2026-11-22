const { PermissionFlagsBits, ChannelType, SlashCommandBuilder } = require('discord.js');
const db = require('../../database/jsonDb');
const { createTicketPanelMessage } = require('../../modules/tickets');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'ticketpanel',
  description: 'Mengirimkan embed panel tiket bantuan dengan 5 jenis tipe dan transkrip',
  category: 'panels',
  usage: '!ticketpanel setup [channel]',
  aliases: ['setuptickets'],
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  slashData: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Kirim panel tiket ke channel')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel lokasi panel').setRequired(false)),

  async execute(message) {
    const channel = message.mentions.channels.first() || message.channel;

    try {
      // Pastikan ada kategori tiket
      let guildData = db.getGuild(message.guild.id);
      let cat = guildData.ticketCategory ? message.guild.channels.cache.get(guildData.ticketCategory) : null;

      if (!cat) {
        cat = await message.guild.channels.create({
          name: '🎫 TIKET BANTUAN',
          type: ChannelType.GuildCategory
        });
        db.updateGuild(message.guild.id, data => {
          data.ticketCategory = cat.id;
        });
      }

      const panelData = createTicketPanelMessage();
      await channel.send(panelData);

      if (channel.id !== message.channel.id) {
        await message.reply({ embeds: [successEmbed('Panel Terkirim', `Panel tiket berhasil dikirim ke ${channel}.`)] });
      }
    } catch (err) {
      console.error(err);
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal mengirim panel tiket.')] });
    }
  },

  async executeSlash(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
      let guildData = db.getGuild(interaction.guild.id);
      let cat = guildData.ticketCategory ? interaction.guild.channels.cache.get(guildData.ticketCategory) : null;

      if (!cat) {
        cat = await interaction.guild.channels.create({
          name: '🎫 TIKET BANTUAN',
          type: ChannelType.GuildCategory
        });
        db.updateGuild(interaction.guild.id, data => {
          data.ticketCategory = cat.id;
        });
      }

      const panelData = createTicketPanelMessage();
      await channel.send(panelData);

      return interaction.reply({ embeds: [successEmbed('Panel Terkirim', `Panel tiket berhasil dikirim ke ${channel}.`)], ephemeral: true });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal mengirim panel tiket.')], ephemeral: true });
    }
  }
};
