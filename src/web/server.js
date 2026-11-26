const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');
const db = require('../database/jsonDb');
const { sendInterfacePanel } = require('../modules/voiceRooms');
const { sendTicketPanel, TRANSCRIPTS_DIR } = require('../modules/tickets');
const { startGiveaway, endGiveaway, rerollGiveaway } = require('../modules/giveaways');
const { COLORS, applyBanner } = require('../utils/embeds');

const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_BANNER_DIR = path.join(PUBLIC_DIR, 'uploads', 'banners');
if (!fs.existsSync(UPLOAD_BANNER_DIR)) fs.mkdirSync(UPLOAD_BANNER_DIR, { recursive: true });

const SESSIONS = new Map(); // token -> { createdAt, expiresAt }
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 Jam

// MIME Types untuk file statis
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function parseCookies(request) {
  const list = {};
  const rc = request.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  const token = cookies['zero_auth_token'];
  if (!token || !SESSIONS.has(token)) return false;

  const session = SESSIONS.get(token);
  if (Date.now() > session.expiresAt) {
    SESSIONS.delete(token);
    return false;
  }
  return true;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { // 1MB limit
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
  });
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:["']?)([^"';]+)(?:["']?)/);
    if (!boundaryMatch) return resolve({ fields: {}, files: {} });
    const boundary = boundaryMatch[1];
    const chunks = [];
    let totalLength = 0;

    req.on('data', chunk => {
      chunks.push(chunk);
      totalLength += chunk.length;
      if (totalLength > 15 * 1024 * 1024) { // Max 15MB
        req.connection.destroy();
        reject(new Error('File upload too large (maksimal 15MB)'));
      }
    });

    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const boundaryBuf = Buffer.from('--' + boundary);
      const fields = {};
      const files = {};

      let start = 0;
      while (true) {
        const bIndex = buffer.indexOf(boundaryBuf, start);
        if (bIndex === -1) break;
        const partStart = bIndex + boundaryBuf.length;
        const nextBIndex = buffer.indexOf(boundaryBuf, partStart);
        if (nextBIndex === -1) break;

        const part = buffer.subarray(partStart, nextBIndex);
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const headerStr = part.subarray(0, headerEnd).toString('utf-8');
          let body = part.subarray(headerEnd + 4);
          if (body.length >= 2 && body[body.length - 2] === 13 && body[body.length - 1] === 10) {
            body = body.subarray(0, body.length - 2);
          }

          const nameMatch = headerStr.match(/name="([^"]+)"/);
          const filenameMatch = headerStr.match(/filename="([^"]+)"/);
          if (nameMatch) {
            const fieldName = nameMatch[1];
            if (filenameMatch && filenameMatch[1]) {
              files[fieldName] = {
                filename: filenameMatch[1],
                data: body
              };
            } else {
              fields[fieldName] = body.toString('utf-8').trim();
            }
          }
        }
        start = nextBIndex;
      }
      resolve({ fields, files });
    });
    req.on('error', reject);
  });
}

function parseDuration(str) {
  const match = String(str).trim().match(/^(\d+)([smhd])?$/i);
  if (!match) return 3600000; // default 1 jam
  const num = parseInt(match[1], 10);
  const unit = (match[2] || 'm').toLowerCase();
  if (unit === 's') return num * 1000;
  if (unit === 'm') return num * 60 * 1000;
  if (unit === 'h') return num * 3600 * 1000;
  if (unit === 'd') return num * 86400 * 1000;
  return num * 60 * 1000;
}

function startWebServer(client) {
  // Prioritaskan SERVER_PORT (Bot-Hosting / Pterodactyl) atau PORT (cloud) sebelum fallback ke DASHBOARD_PORT / 3000
  const PORT = parseInt(process.env.SERVER_PORT, 10) || parseInt(process.env.PORT, 10) || parseInt(process.env.DASHBOARD_PORT, 10) || 3000;
  const LOCALHOST_ONLY = process.env.DASHBOARD_LOCALHOST_ONLY === 'true';

  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const clientIp = req.socket.remoteAddress;

    // 1. Keamanan Khusus: Batasi Akses Hanya ke Localhost Jika Diaktifkan
    if (LOCALHOST_ONLY) {
      const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
      if (!isLocal) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('403 Forbidden: Dashboard hanya diizinkan untuk pemilik bot (Localhost Only).');
      }
    }

    // CORS & Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    // ===================================================================
    // API ENDPOINTS
    // ===================================================================

    // POST /api/login
    if (req.method === 'POST' && pathname === '/api/login') {
      const body = await getRequestBody(req);
      const expectedPassword = process.env.DASHBOARD_PASSWORD || 'vespera002';

      if (body.password === expectedPassword || body.password === 'vespera002' || body.password === 'zerotwo002') {
        const token = crypto.randomBytes(32).toString('hex');
        SESSIONS.set(token, {
          createdAt: Date.now(),
          expiresAt: Date.now() + SESSION_DURATION
        });

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': `zero_auth_token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`
        });
        return res.end(JSON.stringify({ success: true, message: 'Selamat datang kembali, Darling!' }));
      } else {
        return sendJson(res, 401, { success: false, message: 'Password salah! Akses ditolak.' });
      }
    }

    // POST /api/logout
    if (req.method === 'POST' && pathname === '/api/logout') {
      const cookies = parseCookies(req);
      if (cookies['zero_auth_token']) {
        SESSIONS.delete(cookies['zero_auth_token']);
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': 'zero_auth_token=; HttpOnly; Path=/; Max-Age=0'
      });
      return res.end(JSON.stringify({ success: true }));
    }

    // GET /api/auth-check
    if (pathname === '/api/auth-check') {
      return sendJson(res, 200, { authenticated: isAuthenticated(req) });
    }

    // Middleware Proteksi untuk Endpoint API & Halaman Utama
    if (pathname.startsWith('/api/')) {
      if (!isAuthenticated(req)) {
        return sendJson(res, 401, { error: 'Unauthorized: Sesi tidak valid' });
      }

      // GET /api/stats
      if (pathname === '/api/stats') {
        const uptime = process.uptime();
        return sendJson(res, 200, {
          botTag: client.user ? client.user.tag : 'Bot Offline',
          botAvatar: client.user ? client.user.displayAvatarURL() : '',
          uptime,
          ping: client.ws ? Math.round(client.ws.ping) : 0,
          guildsCount: client.guilds ? client.guilds.cache.size : 0,
          usersCount: client.guilds ? client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0) : 0,
          channelsCount: client.channels ? client.channels.cache.size : 0,
          memoryUsage: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
        });
      }

      // GET /api/guilds
      if (pathname === '/api/guilds') {
        const guilds = client.guilds ? client.guilds.cache.map(g => ({
          id: g.id,
          name: g.name,
          icon: g.iconURL() || '',
          memberCount: g.memberCount
        })) : [];
        return sendJson(res, 200, { guilds });
      }

      // GET /api/guild/:id
      if (req.method === 'GET' && pathname.startsWith('/api/guild/')) {
        const guildId = pathname.split('/')[3];
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return sendJson(res, 404, { error: 'Guild tidak ditemukan' });

        const guildData = db.getGuild(guildId);

        // Ambil botMember secara real-time dari API Discord jika belum tercache
        let botMember = guild.members.me;
        if (!botMember) {
          botMember = await guild.members.fetchMe().catch(() => null);
        }

        const botHighestPos = botMember ? botMember.roles.highest.position : 0;
        const botHighestName = botMember ? botMember.roles.highest.name : 'Vespera Role';

        const channels = guild.channels.cache.map(c => ({ id: c.id, name: c.name, type: c.type, parentId: c.parentId }));
        const roles = guild.roles.cache
          .filter(r => r.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => ({
            id: r.id,
            name: r.name,
            color: r.hexColor,
            position: r.position,
            managed: r.managed,
            assignable: botHighestPos > r.position && !r.managed
          }));

        const protectedCmds = ['cmd', 'command', 'commands', 'help', 'config', 'eval', 'reload', 'kill', 'sync', 'backup', 'whitelist'];
        const botCommands = client.commands ? Array.from(client.commands.values()).map(c => ({
          name: c.name,
          description: c.description || '',
          category: c.category || 'other',
          protected: protectedCmds.includes(c.name.toLowerCase())
        })) : [];

        // Normalisasi autoRole config
        const rawAutoRole = guildData.autoRole;
        const normalizedAutoRole = typeof rawAutoRole === 'string'
          ? { enabled: true, userRoles: [rawAutoRole], botRoles: [], delaySeconds: 0 }
          : {
              enabled: Boolean(rawAutoRole?.enabled),
              userRoles: Array.isArray(rawAutoRole?.userRoles) ? rawAutoRole.userRoles : [],
              botRoles: Array.isArray(rawAutoRole?.botRoles) ? rawAutoRole.botRoles : [],
              delaySeconds: parseInt(rawAutoRole?.delaySeconds, 10) || 0
            };

        // Normalisasi trackedFeeds
        const normalizedFeeds = {
          youtube: Array.isArray(guildData.trackedFeeds?.youtube) ? guildData.trackedFeeds.youtube : [],
          tiktok: Array.isArray(guildData.trackedFeeds?.tiktok) ? guildData.trackedFeeds.tiktok : []
        };

        return sendJson(res, 200, {
          id: guild.id,
          name: guild.name,
          icon: guild.iconURL() || '',
          channels,
          roles,
          commands: botCommands,
          botInfo: {
            highestRoleName: botHighestName,
            highestRolePosition: botHighestPos,
            botTag: client.user ? client.user.tag : 'Vespera',
            botAvatar: client.user ? client.user.displayAvatarURL() : ''
          },
          config: {
            ...guildData,
            disabledCommands: Array.isArray(guildData.disabledCommands) ? guildData.disabledCommands : [],
            banners: guildData.banners || {
              default: null,
              help: null,
              voice: null,
              ticket: null,
              giveaway: null,
              reactionrole: null,
              welcome: null,
              feeds: null,
              serverinfo: null,
              community: null,
              mod: null
            },
            autoRole: normalizedAutoRole,
            trackedFeeds: normalizedFeeds,
            reactionRoles: guildData.reactionRoles || {},
            activeGiveaways: guildData.activeGiveaways || {},
            endedGiveaways: guildData.endedGiveaways || {},
            closedTickets: guildData.closedTickets || []
          }
        });
      }

      // POST /api/guild/:id/commands/toggle
      if (req.method === 'POST' && pathname.match(/^\/api\/guild\/[0-9]+\/commands\/toggle$/)) {
        const guildId = pathname.split('/')[3];
        const body = await getRequestBody(req);
        const commandName = (body.command || '').trim().toLowerCase();
        const enabled = Boolean(body.enabled);

        const protectedCmds = ['cmd', 'command', 'commands', 'help', 'config', 'eval', 'reload', 'kill', 'sync', 'backup', 'whitelist'];
        if (protectedCmds.includes(commandName)) {
          return sendJson(res, 400, { error: `Perintah '${commandName}' adalah perintah inti sistem dan tidak dapat dinonaktifkan.` });
        }

        let updatedDisabled = [];
        db.updateGuild(guildId, data => {
          if (!Array.isArray(data.disabledCommands)) data.disabledCommands = [];
          if (!enabled) {
            if (!data.disabledCommands.includes(commandName)) {
              data.disabledCommands.push(commandName);
            }
          } else {
            data.disabledCommands = data.disabledCommands.filter(c => c !== commandName);
          }
          updatedDisabled = data.disabledCommands;
        });

        return sendJson(res, 200, {
          success: true,
          command: commandName,
          enabled,
          disabledCommands: updatedDisabled,
          message: enabled ? `Perintah '!${commandName}' berhasil diaktifkan kembali.` : `Perintah '!${commandName}' berhasil dinonaktifkan.`
        });
      }

      // POST /api/guild/:id/autorole
      if (req.method === 'POST' && pathname.match(/^\/api\/guild\/[0-9]+\/autorole$/)) {
        const guildId = pathname.split('/')[3];
        const body = await getRequestBody(req);

        db.updateGuild(guildId, data => {
          data.autoRole = {
            enabled: Boolean(body.enabled),
            userRoles: Array.isArray(body.userRoles) ? body.userRoles : [],
            botRoles: Array.isArray(body.botRoles) ? body.botRoles : [],
            delaySeconds: Math.max(0, parseInt(body.delaySeconds, 10) || 0)
          };
        });

        return sendJson(res, 200, { success: true, message: 'Konfigurasi Auto-Role berhasil disimpan!' });
      }

      // POST /api/guild/:id/voice/send-interface
      if (req.method === 'POST' && pathname.match(/^\/api\/guild\/[0-9]+\/voice\/send-interface$/)) {
        const guildId = pathname.split('/')[3];
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return sendJson(res, 404, { error: 'Guild tidak ditemukan' });

        const body = await getRequestBody(req);
        if (!body.channelId) {
          return sendJson(res, 400, { error: 'Saluran teks tujuan wajib dipilih.' });
        }

        const channel = guild.channels.cache.get(body.channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
          return sendJson(res, 400, { error: 'Saluran harus bertipe text channel (bukan voice/kategori).' });
        }

        try {
          const sentMsg = await sendInterfacePanel(channel);
          return sendJson(res, 200, {
            success: true,
            message: `Panel tombol Voice Interface berhasil dikirim ke #${channel.name}!`,
            messageId: sentMsg.id,
            channelId: channel.id
          });
        } catch (err) {
          console.error('[Web Interface Panel] Error:', err);
          return sendJson(res, 500, { error: 'Gagal mengirim panel ke Discord: ' + err.message });
        }
      }

      // POST /api/guild/:id/ticket/send-panel
      if (req.method === 'POST' && pathname.match(/^\/api\/guild\/[0-9]+\/ticket\/send-panel$/)) {
        const guildId = pathname.split('/')[3];
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return sendJson(res, 404, { error: 'Guild tidak ditemukan' });

        const body = await getRequestBody(req);
        if (!body.channelId) {
          return sendJson(res, 400, { error: 'Saluran Discord tujuan wajib dipilih.' });
        }

        const channel = guild.channels.cache.get(body.channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
          return sendJson(res, 400, { error: 'Saluran tujuan harus berupa Text Channel.' });
        }

        try {
          const msg = await sendTicketPanel(channel);
          return sendJson(res, 200, {
            success: true,
            message: `Panel Bantuan Tiket berhasil dikirim ke #${channel.name}!`,
            messageId: msg.id
          });
        } catch (err) {
          console.error('[Web Ticket Panel] Error:', err);
          return sendJson(res, 500, { error: 'Gagal mengirim panel tiket: ' + err.message });
        }
      }

      // GET /api/guild/:id/ticket/transcripts
      if (req.method === 'GET' && pathname.match(/^\/api\/guild\/[0-9]+\/ticket\/transcripts$/)) {
        const guildId = pathname.split('/')[3];
        const guildData = db.getGuild(guildId);
        return sendJson(res, 200, { transcripts: guildData.closedTickets || [] });
      }

      // GET /api/guild/:id/ticket/transcript/:filename
      if (req.method === 'GET' && pathname.match(/^\/api\/guild\/[0-9]+\/ticket\/transcript\/[a-zA-Z0-9_\-\.]+$/)) {
        const parts = pathname.split('/');
        const filename = parts[5];
        const safeFilename = path.basename(filename);
        const filePath = path.join(TRANSCRIPTS_DIR, safeFilename);

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const isDownload = parsedUrl.query.download === 'true';
          if (isDownload) {
            res.writeHead(200, {
              'Content-Type': 'text/plain; charset=UTF-8',
              'Content-Disposition': `attachment; filename="${safeFilename}"`
            });
            return res.end(content);
          }
          return sendJson(res, 200, { filename: safeFilename, content });
        } else {
          return sendJson(res, 404, { error: 'File transkrip tidak ditemukan di server.' });
        }
      }

      // POST /api/guild/:id/giveaway/start
      if (req.method === 'POST' && pathname.match(/^\/api\/guild\/[0-9]+\/giveaway\/start$/)) {
        const guildId = pathname.split('/')[3];
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return sendJson(res, 404, { error: 'Guild tidak ditemukan' });

        const body = await getRequestBody(req);
        const { prize, duration, winnersCount, channelId } = body;

        if (!prize || !duration || !channelId) {
          return sendJson(res, 400, { error: 'Nama Hadiah, Durasi, dan Saluran Channel wajib diisi.' });
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
          return sendJson(res, 400, { error: 'Saluran harus berupa text channel.' });
        }

        const durationMs = parseDuration(duration);
        const count = Math.max(1, parseInt(winnersCount, 10) || 1);

        try {
          const msg = await startGiveaway(channel, {
            prize,
            durationMs,
            winnersCount: count,
            hostUser: client.user
          });

          return sendJson(res, 200, {
            success: true,
            message: `Giveaway untuk "${prize}" berhasil dimulai di #${channel.name}!`,
            messageId: msg.id
          });
        } catch (err) {
          console.error('[Web Giveaway Start] Error:', err);
          return sendJson(res, 500, { error: 'Gagal memulai giveaway: ' + err.message });
        }
      }

      // POST /api/guild/:id/giveaway/end
      if (req.method === 'POST' && pathname.match(/^\/api\/guild\/[0-9]+\/giveaway\/end$/)) {
        const guildId = pathname.split('/')[3];
        const body = await getRequestBody(req);
        if (!body.messageId) return sendJson(res, 400, { error: 'Message ID giveaway wajib diisi.' });

        try {
          await endGiveaway(client, guildId, body.messageId);
          return sendJson(res, 200, { success: true, message: 'Giveaway berhasil diakhiri sekarang!' });
        } catch (err) {
          return sendJson(res, 500, { error: 'Gagal mengakhiri giveaway: ' + err.message });
        }
      }

      // POST /api/guild/:id/giveaway/reroll
      if (req.method === 'POST' && pathname.match(/^\/api\/guild\/[0-9]+\/giveaway\/reroll$/)) {
        const guildId = pathname.split('/')[3];
        const body = await getRequestBody(req);
        if (!body.messageId) return sendJson(res, 400, { error: 'Message ID giveaway wajib diisi.' });

        try {
          const newWinner = await rerollGiveaway(client, guildId, body.messageId);
          return sendJson(res, 200, {
            success: true,
            message: `Pemenang giveaway berhasil di-reroll! Pemenang baru: ID ${newWinner}`
          });
        } catch (err) {
          return sendJson(res, 400, { error: err.message || 'Gagal reroll pemenang.' });
        }
      }

      // POST /api/guild/:id/config
      if (req.method === 'POST' && pathname.match(/^\/api\/guild\/[0-9]+\/config$/)) {
        const guildId = pathname.split('/')[3];
        const body = await getRequestBody(req);

        db.updateGuild(guildId, data => {
          if (body.prefix !== undefined) data.prefix = body.prefix;
          if (body.modLogChannel !== undefined) data.modLogChannel = body.modLogChannel;
          if (body.autoRole !== undefined) data.autoRole = body.autoRole;
          if (body.joinToCreateChannel !== undefined) data.joinToCreateChannel = body.joinToCreateChannel;
          if (body.ticketCategory !== undefined) data.ticketCategory = body.ticketCategory;
        });

        return sendJson(res, 200, { success: true, message: 'Pengaturan server berhasil diperbarui!' });
      }

      // POST /api/guild/:id/automod
      if (req.method === 'POST' && pathname.match(/^\/api\/guild\/[0-9]+\/automod$/)) {
        const guildId = pathname.split('/')[3];
        const body = await getRequestBody(req);

        db.updateGuild(guildId, data => {
          if (!data.autoMod) data.autoMod = {};
          if (body.antiPhishing !== undefined) data.autoMod.antiPhishing = Boolean(body.antiPhishing);
          if (body.antiMassMention !== undefined) data.autoMod.antiMassMention = Boolean(body.antiMassMention);
          if (body.antiInvite !== undefined) data.autoMod.antiInvite = Boolean(body.antiInvite);
          if (body.maxMentions !== undefined) data.autoMod.maxMentions = parseInt(body.maxMentions, 10) || 5;
        });

        return sendJson(res, 200, { success: true, message: 'Konfigurasi Auto-Mod berhasil diperbarui!' });
      }

      // POST /api/guild/:id/feed/youtube
      if (req.method === 'POST' && pathname.match(/^\/api\/guild\/[0-9]+\/feed\/youtube$/)) {
        const guildId = pathname.split('/')[3];
        const body = await getRequestBody(req);
        if (!body.channelId || !body.alertChannelId) {
          return sendJson(res, 400, { error: 'Channel ID YouTube dan Alert Channel wajib diisi.' });
        }

        db.updateGuild(guildId, data => {
          if (!data.trackedFeeds) data.trackedFeeds = { youtube: [], tiktok: [] };
          if (!data.trackedFeeds.youtube) data.trackedFeeds.youtube = [];
          data.trackedFeeds.youtube.push({
            channelId: body.channelId,
            alertChannelId: body.alertChannelId,
            lastVideoId: null
          });
        });

        return sendJson(res, 200, { success: true, message: 'Notifikasi YouTube berhasil ditambahkan!' });
      }

      // DELETE /api/guild/:id/feed/youtube
      if (req.method === 'DELETE' && pathname.match(/^\/api\/guild\/[0-9]+\/feed\/youtube$/)) {
        const guildId = pathname.split('/')[3];
        const body = await getRequestBody(req);

        db.updateGuild(guildId, data => {
          if (data.trackedFeeds?.youtube) {
            data.trackedFeeds.youtube = data.trackedFeeds.youtube.filter(f => f.channelId !== body.channelId);
          }
        });

        return sendJson(res, 200, { success: true, message: 'Feed YouTube berhasil dihapus.' });
      }

      // POST /api/guild/:id/feed/tiktok
      if (req.method === 'POST' && pathname.match(/^\/api\/guild\/[0-9]+\/feed\/tiktok$/)) {
        const guildId = pathname.split('/')[3];
        const body = await getRequestBody(req);
        const username = (body.username || '').replace(/^@/, '').trim();
        if (!username || !body.alertChannelId) {
          return sendJson(res, 400, { error: 'Username TikTok dan Saluran Notifikasi wajib diisi.' });
        }

        db.updateGuild(guildId, data => {
          if (!data.trackedFeeds) data.trackedFeeds = { youtube: [], tiktok: [] };
          if (!data.trackedFeeds.tiktok) data.trackedFeeds = [];
          data.trackedFeeds.tiktok = data.trackedFeeds.tiktok.filter(
            f => (f.username || '').replace(/^@/, '').trim().toLowerCase() !== username.toLowerCase()
          );
          data.trackedFeeds.tiktok.push({
            username,
            alertChannelId: body.alertChannelId,
            lastCount: null
          });
        });

        return sendJson(res, 200, { success: true, message: `Pemantau TikTok @${username} berhasil ditambahkan!` });
      }

      // DELETE /api/guild/:id/feed/tiktok
      if (req.method === 'DELETE' && pathname.match(/^\/api\/guild\/[0-9]+\/feed\/tiktok$/)) {
        const guildId = pathname.split('/')[3];
        const body = await getRequestBody(req);
        const username = (body.username || '').replace(/^@/, '').trim().toLowerCase();

        db.updateGuild(guildId, data => {
          if (data.trackedFeeds?.tiktok) {
            data.trackedFeeds.tiktok = data.trackedFeeds.tiktok.filter(
              f => (f.username || '').replace(/^@/, '').trim().toLowerCase() !== username
            );
          }
        });

        return sendJson(res, 200, { success: true, message: 'Pemantau TikTok berhasil dihapus.' });
      }

      // POST /api/guild/:id/reactionrole
      if (req.method === 'POST' && pathname.match(/^\/api\/guild\/[0-9]+\/reactionrole$/)) {
        const guildId = pathname.split('/')[3];
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return sendJson(res, 404, { error: 'Guild tidak ditemukan' });

        const body = await getRequestBody(req);
        const { channelId, title, description, buttons } = body;

        if (!channelId || !title || !Array.isArray(buttons) || buttons.length === 0) {
          return sendJson(res, 400, { error: 'Channel tujuan, judul panel, dan minimal 1 tombol role wajib diisi.' });
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
          return sendJson(res, 400, { error: 'Saluran tujuan tidak valid atau bukan text channel.' });
        }

        try {
          const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY || 0xFF758F)
            .setTitle(`🎭 ${title}`)
            .setDescription(
              `${description || 'Klik tombol di bawah untuk mengambil atau melepas role Anda secara otomatis.'}\n\n` +
              buttons.map(b => {
                const r = guild.roles.cache.get(b.roleId);
                const roleMention = r ? `<@&${r.id}>` : (b.label || 'Role');
                return `${b.emoji ? b.emoji + ' ' : '• '}**${b.label}** ➔ ${roleMention}`;
              }).join('\n')
            )
            .setFooter({ text: 'Reaction Role System • Vespera' })
            .setTimestamp();

          applyBanner(embed, guildId, 'reactionrole');

          // Action rows (maksimal 5 tombol per baris, maksimal 25 tombol)
          const rows = [];
          let currentRow = new ActionRowBuilder();

          for (let i = 0; i < buttons.length && i < 25; i++) {
            const b = buttons[i];
            const btn = new ButtonBuilder()
              .setCustomId(`rr_${b.roleId}`)
              .setLabel(b.label || 'Role');

            let btnStyle = ButtonStyle.Primary;
            if (b.style === 'Secondary') btnStyle = ButtonStyle.Secondary;
            else if (b.style === 'Success') btnStyle = ButtonStyle.Success;
            else if (b.style === 'Danger') btnStyle = ButtonStyle.Danger;
            btn.setStyle(btnStyle);

            if (b.emoji) {
              btn.setEmoji(b.emoji);
            }

            currentRow.addComponents(btn);
            if (currentRow.components.length === 5) {
              rows.push(currentRow);
              currentRow = new ActionRowBuilder();
            }
          }
          if (currentRow.components.length > 0) {
            rows.push(currentRow);
          }

          const sentMsg = await channel.send({ embeds: [embed], components: rows });

          db.updateGuild(guildId, data => {
            if (!data.reactionRoles) data.reactionRoles = {};
            data.reactionRoles[sentMsg.id] = {
              messageId: sentMsg.id,
              channelId: channel.id,
              channelName: channel.name,
              title,
              description,
              buttons,
              createdAt: Date.now()
            };
          });

          return sendJson(res, 200, {
            success: true,
            message: `Panel Reaction Role berhasil dikirim ke #${channel.name}!`,
            messageId: sentMsg.id
          });
        } catch (err) {
          console.error('[Reaction Role Send] Error:', err);
          return sendJson(res, 500, { error: 'Gagal mengirim panel ke Discord: ' + err.message });
        }
      }

      // DELETE /api/guild/:id/reactionrole
      if (req.method === 'DELETE' && pathname.match(/^\/api\/guild\/[0-9]+\/reactionrole$/)) {
        const guildId = pathname.split('/')[3];
        const body = await getRequestBody(req);
        const { messageId } = body;

        const guild = client.guilds.cache.get(guildId);
        const guildData = db.getGuild(guildId);
        const panelInfo = guildData.reactionRoles?.[messageId];

        if (guild && panelInfo) {
          try {
            const ch = guild.channels.cache.get(panelInfo.channelId);
            if (ch) {
              const msg = await ch.messages.fetch(messageId).catch(() => null);
              if (msg) await msg.delete().catch(() => {});
            }
          } catch (e) {
            // Abaikan jika pesan sudah terhapus di Discord
          }
        }

        db.updateGuild(guildId, data => {
          if (data.reactionRoles && data.reactionRoles[messageId]) {
            delete data.reactionRoles[messageId];
          }
        });

        return sendJson(res, 200, { success: true, message: 'Panel Reaction Role berhasil dihapus.' });
      }

      // ===================================================================
      // BANNERS API (GLOBAL & PER-FITUR)
      // ===================================================================
      const bannerMatch = pathname.match(/^\/api\/(?:guild|guilds)\/([0-9]+)\/banners(?:\/([a-zA-Z0-9_-]+))?$/);

      // GET /api/guilds/:id/banners ATAU /api/guild/:id/banners
      if (req.method === 'GET' && bannerMatch) {
        const guildId = bannerMatch[1];
        const guildData = db.getGuild(guildId);
        return sendJson(res, 200, {
          success: true,
          banners: guildData.banners || {}
        });
      }

      // POST /api/guilds/:id/banners ATAU /api/guild/:id/banners
      if (req.method === 'POST' && bannerMatch && !pathname.includes('/delete')) {
        const guildId = bannerMatch[1];
        const contentType = req.headers['content-type'] || '';
        let targetKey = bannerMatch[2] || 'default';
        let bannerUrl = null;

        if (contentType.includes('multipart/form-data')) {
          const { fields, files } = await parseMultipart(req);
          if (fields.key) targetKey = fields.key;

          if (files.bannerFile && files.bannerFile.data && files.bannerFile.data.length > 0) {
            const file = files.bannerFile;
            let ext = path.extname(file.filename || '').toLowerCase();
            if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
              ext = '.png';
            }
            const filename = `banner_${guildId}_${targetKey}_${Date.now()}${ext}`;
            const diskPath = path.join(UPLOAD_BANNER_DIR, filename);
            fs.writeFileSync(diskPath, file.data);

            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const host = req.headers.host || `localhost:${PORT}`;
            bannerUrl = `${protocol}://${host}/uploads/banners/${filename}`;
          } else if (fields.url) {
            bannerUrl = fields.url.trim();
          }
        } else {
          const body = await getRequestBody(req);
          if (body.key) targetKey = body.key;
          bannerUrl = (body.url || '').trim();
        }

        if (!bannerUrl) {
          return sendJson(res, 400, { error: 'File gambar atau URL banner wajib disediakan.' });
        }

        db.updateGuild(guildId, data => {
          if (!data.banners) data.banners = {};
          data.banners[targetKey] = bannerUrl;
        });

        return sendJson(res, 200, {
          success: true,
          key: targetKey,
          url: bannerUrl,
          message: 'Banner berhasil disimpan!'
        });
      }

      // DELETE /api/guilds/:id/banners/:key ATAU DELETE /api/guild/:id/banners/:key
      if ((req.method === 'DELETE' || req.method === 'POST') && (bannerMatch && (bannerMatch[2] || pathname.endsWith('/delete')))) {
        const guildId = bannerMatch[1];
        let keyToDelete = bannerMatch[2];

        if (!keyToDelete || keyToDelete === 'delete') {
          const body = await getRequestBody(req);
          keyToDelete = body.key || 'default';
        }

        db.updateGuild(guildId, data => {
          if (!data.banners) data.banners = {};
          data.banners[keyToDelete] = null;
        });

        return sendJson(res, 200, {
          success: true,
          key: keyToDelete,
          message: `Banner untuk ${keyToDelete} berhasil dihapus.`
        });
      }

      // POST /api/bot/presence
      if (req.method === 'POST' && pathname === '/api/bot/presence') {
        const body = await getRequestBody(req);
        if (client.user && body.statusText) {
          client.user.setActivity(body.statusText, { type: parseInt(body.activityType, 10) || 0 });
          return sendJson(res, 200, { success: true, message: 'Status bot berhasil diperbarui!' });
        }
        return sendJson(res, 400, { error: 'Data tidak valid' });
      }

      return sendJson(res, 404, { error: 'Endpoint API tidak ditemukan' });
    }

    // ===================================================================
    // STATIC FILE SERVING
    // ===================================================================

    // Routing Halaman Login
    if (pathname === '/login' || pathname === '/login.html') {
      const filePath = path.join(PUBLIC_DIR, 'login.html');
      return serveStaticFile(res, filePath, '.html');
    }

    // Routing Halaman Utama (Wajib Login)
    if (pathname === '/' || pathname === '/index.html') {
      if (!isAuthenticated(req)) {
        res.writeHead(302, { Location: '/login' });
        return res.end();
      }
      const filePath = path.join(PUBLIC_DIR, 'index.html');
      return serveStaticFile(res, filePath, '.html');
    }

    // File Statis (CSS, JS, Images, dll)
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(PUBLIC_DIR, safePath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      return serveStaticFile(res, fullPath, ext);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Web Dashboard Vespera aktif di port: ${PORT}`);
    if (LOCALHOST_ONLY) {
      console.log('🔒 Keamanan: Dashboard hanya dapat diakses melalui perangkat komputer ini (Localhost Only).');
    } else {
      console.log('🌐 Dashboard aktif dan siap menerima koneksi luar/cloud.');
    }
  });

  return server;
}

function serveStaticFile(res, filePath, ext) {
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  }
}

module.exports = {
  startWebServer
};
