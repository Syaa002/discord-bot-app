const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  name: 'poll',
  description: 'Membuat pemungutan suara (polling) berbasis reaksi',
  category: 'community',
  usage: '!poll "Pertanyaan" "Opsi 1" "Opsi 2" ["Opsi 3"...]',
  aliases: ['vote'],
  userPermissions: [],
  botPermissions: ['AddReactions'],
  slashData: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Buat polling interaktif')
    .addStringOption(opt => opt.setName('question').setDescription('Pertanyaan polling').setRequired(true))
    .addStringOption(opt => opt.setName('options').setDescription('Opsi dipisah tanda koma (cth: Opsi 1, Opsi 2, Opsi 3)').setRequired(true)),

  async execute(message, args) {
    const rawMatches = message.content.match(/"([^"]+)"|'([^']+)'/g);
    if (!rawMatches || rawMatches.length < 3) {
      return message.reply({ embeds: [errorEmbed('Format Salah', 'Gunakan tanda kutip:\n`!poll "Pertanyaan" "Opsi 1" "Opsi 2"`')] });
    }

    const items = rawMatches.map(str => str.replace(/["']/g, ''));
    const question = items[0];
    const options = items.slice(1, 11); // Maks 10 opsi

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📊 Polling: ${question}`)
      .setDescription(options.map((opt, i) => `${NUMBER_EMOJIS[i]} ${opt}`).join('\n\n'))
      .setFooter({ text: `Dibuat oleh ${message.author.tag}` })
      .setTimestamp();

    const pollMsg = await message.channel.send({ embeds: [embed] });
    for (let i = 0; i < options.length; i++) {
      await pollMsg.react(NUMBER_EMOJIS[i]);
    }
  },

  async executeSlash(interaction) {
    const question = interaction.options.getString('question');
    const optionsRaw = interaction.options.getString('options');
    const options = optionsRaw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10);

    if (options.length < 2) {
      return interaction.reply({ embeds: [errorEmbed('Format Salah', 'Minimal berikan 2 opsi dipisah koma.')], ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📊 Polling: ${question}`)
      .setDescription(options.map((opt, i) => `${NUMBER_EMOJIS[i]} ${opt}`).join('\n\n'))
      .setFooter({ text: `Dibuat oleh ${interaction.user.tag}` })
      .setTimestamp();

    const pollMsg = await interaction.reply({ embeds: [embed], fetchReply: true });
    for (let i = 0; i < options.length; i++) {
      await pollMsg.react(NUMBER_EMOJIS[i]);
    }
  }
};
