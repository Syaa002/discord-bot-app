const { SlashCommandBuilder } = require('discord.js');
const https = require('https');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'gif',
  description: 'Mencari animasi GIF aman menggunakan GIPHY',
  category: 'community',
  usage: '!gif <kata-kunci>',
  aliases: [],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('gif')
    .setDescription('Cari animasi GIF')
    .addStringOption(opt => opt.setName('query').setDescription('Kata kunci pencarian').setRequired(true)),

  async execute(message, args) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });

    const query = encodeURIComponent(args.join(' '));
    // Menggunakan endpoint publik GIPHY gratis yang aman
    const url = `https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=${query}&rating=g`;

    https.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const gifUrl = json.data?.images?.original?.url || json.data?.image_original_url;
          if (gifUrl) {
            return message.reply({ content: gifUrl });
          }
          return message.reply({ embeds: [errorEmbed('Tidak Ditemukan', 'Tidak menemukan GIF untuk kata kunci tersebut.')] });
        } catch (e) {
          return message.reply({ embeds: [errorEmbed('Error', 'Gagal memuat GIF.')] });
        }
      });
    }).on('error', () => {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal menghubungi server GIF.')] });
    });
  },

  async executeSlash(interaction) {
    const query = encodeURIComponent(interaction.options.getString('query'));
    const url = `https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=${query}&rating=g`;

    https.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const gifUrl = json.data?.images?.original?.url || json.data?.image_original_url;
          if (gifUrl) {
            return interaction.reply({ content: gifUrl });
          }
          return interaction.reply({ embeds: [errorEmbed('Tidak Ditemukan', 'Tidak menemukan GIF untuk kata kunci tersebut.')], ephemeral: true });
        } catch (e) {
          return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal memuat GIF.')], ephemeral: true });
        }
      });
    }).on('error', () => {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Gagal menghubungi server GIF.')], ephemeral: true });
    });
  }
};
