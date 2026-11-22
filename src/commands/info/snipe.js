const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'snipe',
  description: 'Melihat pesan teks terakhir yang baru saja dihapus di channel ini',
  category: 'info',
  usage: '!snipe',
  aliases: [],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Tampilkan pesan yang terakhir dihapus di channel ini'),

  async execute(message) {
    const snipes = message.client.snipes || new Map();
    const snipedMsg = snipes.get(message.channel.id);

    if (!snipedMsg) {
      return message.reply({ embeds: [errorEmbed('Tidak Ada Pesan', 'Tidak ada pesan yang baru saja dihapus di channel ini.')] });
    }

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setAuthor({ name: snipedMsg.author.tag, iconURL: snipedMsg.author.displayAvatarURL() })
      .setDescription(snipedMsg.content || '*Pesan tidak memiliki teks (mungkin berupa gambar/embed)*')
      .setFooter({ text: `Dihapus • <t:${Math.floor(snipedMsg.timestamp / 1000)}:R>` })
      .setTimestamp(snipedMsg.timestamp);

    if (snipedMsg.image) {
      embed.setImage(snipedMsg.image);
    }

    return message.reply({ embeds: [embed] });
  },

  async executeSlash(interaction) {
    const snipes = interaction.client.snipes || new Map();
    const snipedMsg = snipes.get(interaction.channel.id);

    if (!snipedMsg) {
      return interaction.reply({ embeds: [errorEmbed('Tidak Ada Pesan', 'Tidak ada pesan yang baru saja dihapus di channel ini.')], ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setAuthor({ name: snipedMsg.author.tag, iconURL: snipedMsg.author.displayAvatarURL() })
      .setDescription(snipedMsg.content || '*Pesan tidak memiliki teks (mungkin berupa gambar/embed)*')
      .setFooter({ text: `Dihapus • <t:${Math.floor(snipedMsg.timestamp / 1000)}:R>` })
      .setTimestamp(snipedMsg.timestamp);

    if (snipedMsg.image) {
      embed.setImage(snipedMsg.image);
    }

    return interaction.reply({ embeds: [embed] });
  }
};
