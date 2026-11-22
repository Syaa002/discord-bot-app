const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'quote',
  description: 'Mengutip dan menampilkan pesan tertentu menggunakan Message ID',
  category: 'community',
  usage: '!quote <message-id> [channel]',
  aliases: [],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Kutip pesan tertentu')
    .addStringOption(opt => opt.setName('message_id').setDescription('ID pesan yang ingin dikutip').setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel lokasi pesan').setRequired(false)),

  async execute(message, args) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });

    const targetChannel = message.mentions.channels.first() || message.channel;
    const msgId = args[0];

    try {
      const targetMsg = await targetChannel.messages.fetch(msgId);
      const embed = new EmbedBuilder()
        .setColor(0xFF758F)
        .setAuthor({ name: targetMsg.author.tag, iconURL: targetMsg.author.displayAvatarURL() })
        .setDescription(targetMsg.content || '*[Pesan berupa media/embed]*')
        .addFields({ name: 'Sumber', value: `[Buka Pesan Asli](${targetMsg.url}) in ${targetChannel}` })
        .setTimestamp(targetMsg.createdTimestamp);

      if (targetMsg.attachments.size > 0) {
        embed.setImage(targetMsg.attachments.first().url);
      }

      return message.reply({ embeds: [embed] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Pesan Tidak Ditemukan', 'Pastikan Message ID dan channel tepat.')] });
    }
  },

  async executeSlash(interaction) {
    const msgId = interaction.options.getString('message_id');
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    try {
      const targetMsg = await targetChannel.messages.fetch(msgId);
      const embed = new EmbedBuilder()
        .setColor(0xFF758F)
        .setAuthor({ name: targetMsg.author.tag, iconURL: targetMsg.author.displayAvatarURL() })
        .setDescription(targetMsg.content || '*[Pesan berupa media/embed]*')
        .addFields({ name: 'Sumber', value: `[Buka Pesan Asli](${targetMsg.url}) in ${targetChannel}` })
        .setTimestamp(targetMsg.createdTimestamp);

      if (targetMsg.attachments.size > 0) {
        embed.setImage(targetMsg.attachments.first().url);
      }

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Pesan Tidak Ditemukan', 'Pastikan Message ID tepat.')], ephemeral: true });
    }
  }
};
