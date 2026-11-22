const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const GUILDS_DIR = path.join(DATA_DIR, 'guilds');

// Pastikan folder data dan guilds tersedia
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(GUILDS_DIR)) fs.mkdirSync(GUILDS_DIR, { recursive: true });

// Struktur data default untuk tiap guild
const defaultGuildData = () => ({
  prefix: process.env.PREFIX || '!',
  modLogChannel: null,
  joinToCreateChannel: null, // ID Voice Channel Join to Create
  ticketCategory: null,
  ticketSupportRole: null,
  warnings: {}, // { userId: [ { id, reason, moderatorId, timestamp } ] }
  blacklistedUsers: {}, // { userId: { reason, moderatorId, timestamp, expiresAt } }
  reactionRoles: {}, // { messageId: [ { emoji, roleId } ] }
  autoRole: null, // Role otomatis saat member baru join
  temporaryVoiceRooms: {}, // { channelId: { ownerId, trusted: [], blocked: [], waitingRoom: false } }
  activeGiveaways: {}, // { messageId: { prize, endsAt, winnersCount, hostId, participants: [] } }
  endedGiveaways: {}, // { messageId: { prize, endedAt, winners: [], participants: [] } }
  closedTickets: [], // [ { id, channelName, creatorTag, category, closedBy, closedAt, filename } ]
  trackedFeeds: {
    youtube: [], // [ { channelId, lastVideoId, alertChannelId } ]
    tiktok: []   // [ { username, lastVideoId, alertChannelId } ]
  },
  autoMod: {
    antiPhishing: true,
    antiMassMention: true,
    maxMentions: 5,
    antiInvite: true
  }
});

class JsonDatabase {
  constructor() {
    this.cache = new Map();
  }

  getGuildFilePath(guildId) {
    return path.join(GUILDS_DIR, `${guildId}.json`);
  }

  getGuild(guildId) {
    if (this.cache.has(guildId)) {
      return this.cache.get(guildId);
    }

    const filePath = this.getGuildFilePath(guildId);
    if (!fs.existsSync(filePath)) {
      const initial = defaultGuildData();
      this.saveGuild(guildId, initial);
      return initial;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      // Merge dengan default agar field baru selalu ada
      const merged = { ...defaultGuildData(), ...parsed };
      this.cache.set(guildId, merged);
      return merged;
    } catch (err) {
      console.error(`[DB] Gagal membaca data guild ${guildId}:`, err);
      const fallback = defaultGuildData();
      return fallback;
    }
  }

  saveGuild(guildId, data) {
    this.cache.set(guildId, data);
    const filePath = this.getGuildFilePath(guildId);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[DB] Gagal menyimpan data guild ${guildId}:`, err);
    }
  }

  updateGuild(guildId, updater) {
    const data = this.getGuild(guildId);
    updater(data);
    this.saveGuild(guildId, data);
    return data;
  }
}

module.exports = new JsonDatabase();
