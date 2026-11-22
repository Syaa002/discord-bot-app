const { EmbedBuilder } = require('discord.js');
const db = require('../database/jsonDb');

const { COLORS } = require('../utils/embeds');

async function sendLog(guild, { category, title, description, fields = [], color = COLORS.PRIMARY, author = null }) {
  try {
    const guildData = db.getGuild(guild.id);
    if (!guildData.modLogChannel) return;

    const channel = guild.channels.cache.get(guildData.modLogChannel);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`[${category.toUpperCase()}] ${title}`)
      .setDescription(description || null)
      .setTimestamp();

    if (author) {
      embed.setAuthor({ name: author.tag || author.username, iconURL: author.displayAvatarURL() });
    }

    if (fields.length > 0) {
      embed.addFields(fields);
    }

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[Logger] Gagal mengirim log:', err);
  }
}

module.exports = {
  sendLog
};
