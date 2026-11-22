const { EmbedBuilder } = require('discord.js');
const db = require('../database/jsonDb');

// ===================================================================
// PALET WARNA VESPERA (SERVER SYSTEM • CORE OS)
// ===================================================================
const COLORS = {
  PRIMARY: 0xFF758F,     // Signature Rose / Orchid
  SECONDARY: 0xFFB3C1,   // Soft Pastel Accent
  CRIMSON: 0xEF233C,     // Vivid Crimson Red
  SUCCESS: 0xFF4D6D,     // Vibrant Rose Pink
  WARNING: 0xFFB703,     // Golden Amber
  ERROR: 0xD90429,       // Deep Crimson Red
  CYAN: 0x00F5D4,        // Cyan Core Glow
  INFO: 0xFF758F         // Signature Rose
};

// ===================================================================
// GLOBAL & PER-FITUR CHAT BANNER HELPER
// ===================================================================
function getBannerUrl(guildId, featureKey = null) {
  if (!guildId) return null;
  const guildData = db.getGuild(guildId);
  const banners = guildData?.banners || {};

  // 1. Cek Banner Khusus Fitur
  if (featureKey && banners[featureKey]) {
    const customBanner = String(banners[featureKey]).trim();
    if (customBanner) return customBanner;
  }

  // 2. Fallback ke Banner Default Global Server
  if (banners.default) {
    const defaultBanner = String(banners.default).trim();
    if (defaultBanner) return defaultBanner;
  }

  return null;
}

function applyBanner(embed, guildId, featureKey = null) {
  if (!embed) return embed;
  const bannerUrl = getBannerUrl(guildId, featureKey);
  if (bannerUrl) {
    try {
      embed.setImage(bannerUrl);
    } catch (e) {
      // Abaikan jika format URL tidak didukung
    }
  }
  return embed;
}

function successEmbed(title, description, guildId = null, featureKey = null) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle(`✨ ${title}`)
    .setDescription(description || null)
    .setFooter({ text: 'Vespera • Server System' })
    .setTimestamp();
  return applyBanner(embed, guildId, featureKey);
}

function errorEmbed(title, description, guildId = null, featureKey = null) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle(`❌ ${title}`)
    .setDescription(description || null)
    .setFooter({ text: 'Vespera • Server System' })
    .setTimestamp();
  return applyBanner(embed, guildId, featureKey);
}

function infoEmbed(title, description, guildId = null, featureKey = null) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle(title)
    .setDescription(description || null)
    .setFooter({ text: 'Vespera • Server System' })
    .setTimestamp();
  return applyBanner(embed, guildId, featureKey);
}

function warnEmbed(title, description, guildId = null, featureKey = null) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description || null)
    .setFooter({ text: 'Vespera • Server System' })
    .setTimestamp();
  return applyBanner(embed, guildId, featureKey);
}

module.exports = {
  COLORS,
  getBannerUrl,
  applyBanner,
  successEmbed,
  errorEmbed,
  infoEmbed,
  warnEmbed
};
