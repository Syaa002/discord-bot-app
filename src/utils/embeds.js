const { EmbedBuilder } = require('discord.js');

// ===================================================================
// PALET WARNA ZERO TWO (DARLING IN THE FRANXX • CODE: 002)
// ===================================================================
const COLORS = {
  PRIMARY: 0xFF758F,     // Sakura Pink (Rambut Ikonik Zero Two)
  SECONDARY: 0xFFB3C1,   // Soft Pastel Pink
  CRIMSON: 0xEF233C,     // Crimson Red (Tanduk & Seragam Merah Zero Two)
  SUCCESS: 0xFF4D6D,     // Vibrant Rose Pink (Aksen Seragam Franxx)
  WARNING: 0xFFB703,     // Golden Horn Accent (Aksen Emas / Manisan Zero Two)
  ERROR: 0xD90429,       // Deep Crimson Red (Mode Klaxosaur / Peringatan Bahaya)
  CYAN: 0x00F5D4,        // Franxx Cyan (Warna Mata Toska Hijau-Biru Zero Two)
  INFO: 0xFF758F         // Signature Pink
};

function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle(`🌸 ${title}`)
    .setDescription(description || null)
    .setFooter({ text: 'CODE: 002 • Zero Two System' })
    .setTimestamp();
}

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle(`❌ ${title}`)
    .setDescription(description || null)
    .setFooter({ text: 'CODE: 002 • Zero Two System' })
    .setTimestamp();
}

function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle(title)
    .setDescription(description || null)
    .setFooter({ text: 'CODE: 002 • Zero Two System' })
    .setTimestamp();
}

function warnEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description || null)
    .setFooter({ text: 'CODE: 002 • Zero Two System' })
    .setTimestamp();
}

module.exports = {
  COLORS,
  successEmbed,
  errorEmbed,
  infoEmbed,
  warnEmbed
};
