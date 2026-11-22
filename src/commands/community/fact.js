const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const https = require('https');

const FALLBACK_FACTS = [
  'Madu murni tidak pernah basi dan dapat bertahan selama ribuan tahun.',
  'Jantung paus biru berukuran sebesar mobil Volkswagen Beetle.',
  'Gurita memiliki tiga jantung dan sembilan otak.',
  'Cahaya dari Matahari membutuhkan waktu sekitar 8 menit 20 detik untuk mencapai Bumi.',
  'Venus adalah satu-satunya planet di tata surya yang berputar searah jarum jam.',
  'Kode sumber Apollo 11 memiliki komentar lucu yang ditulis oleh para pemrogram NASA.'
];

module.exports = {
  name: 'fact',
  description: 'Menampilkan fakta acak menarik seputar sains, teknologi, dan sejarah',
  category: 'community',
  usage: '!fact',
  aliases: ['fakta'],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('fact')
    .setDescription('Tampilkan fakta acak menarik'),

  async execute(message) {
    const url = 'https://uselessfacts.jsph.pl/random.json?language=en';
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let factText = '';
        try {
          const json = JSON.parse(data);
          factText = json.text;
        } catch {
          factText = FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
        }

        const embed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle('💡 Tahukah Kamu? (Fakta Menarik)')
          .setDescription(factText)
          .setTimestamp();

        return message.reply({ embeds: [embed] });
      });
    }).on('error', () => {
      const fallback = FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('💡 Tahukah Kamu? (Fakta Menarik)')
        .setDescription(fallback)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    });
  },

  async executeSlash(interaction) {
    const fallback = FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('💡 Tahukah Kamu? (Fakta Menarik)')
      .setDescription(fallback)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }
};
