const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../modules/logger');

module.exports = {
  name: 'lockdown',
  description: 'Kunci atau buka kembali channel untuk @everyone',
  category: 'moderation',
  usage: '!lockdown [channel] [unlock]',
  aliases: ['lock'],
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  slashData: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Kunci atau buka channel')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel yang ingin dikunci').setRequired(false))
    .addBooleanOption(opt => opt.setName('unlock').setDescription('Buka kunci channel jika bernilai true').setRequired(false)),

  async execute(message, args) {
    const targetChannel = message.mentions.channels.first() || message.channel;
    const isUnlock = args.includes('unlock') || args.includes('off');

    try {
      await targetChannel.permissionOverwrites.edit(message.guild.id, {
        SendMessages: isUnlock ? null : false
      });

      const text = isUnlock ? '🔓 Channel telah **dibuka kembali**.' : '🔒 Channel telah **dikunci** (Lockdown).';
      await targetChannel.send({ embeds: [successEmbed('Status Lockdown', text)] });

      await sendLog(message.guild, {
        category: 'Moderasi',
        title: isUnlock ? 'Channel Di-unlock' : 'Channel Di-lockdown',
        description: `Channel ${targetChannel} telah ${isUnlock ? 'dibuka' : 'dikunci'} oleh ${message.author}.`,
        color: isUnlock ? 0x57F287 : 0xED4245,
        author: message.author
      });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal mengatur izin lockdown pada channel ini.')] });
    }
  },

  async executeSlash(interaction) {
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const isUnlock = interaction.options.getBoolean('unlock') || false;

    try {
      await targetChannel.permissionOverwrites.edit(interaction.guild.id, {
        SendMessages: isUnlock ? null : false
      });

      const text = isUnlock ? '🔓 Channel telah **dibuka kembali**.' : '🔒 Channel telah **dikunci** (Lockdown).';
      await interaction.reply({ embeds: [successEmbed('Status Lockdown', text)] });

      await sendLog(interaction.guild, {
        category: 'Moderasi',
        title: isUnlock ? 'Channel Di-unlock' : 'Channel Di-lockdown',
        description: `Channel ${targetChannel} telah ${isUnlock ? 'dibuka' : 'dikunci'} oleh ${interaction.user}.`,
        color: isUnlock ? 0x57F287 : 0xED4245,
        author: interaction.user
      });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal mengatur izin lockdown.')], ephemeral: true });
    }
  }
};
