const cron = require('node-cron');
const https = require('https');
const { EmbedBuilder } = require('discord.js');
const db = require('../database/jsonDb');
const { COLORS } = require('../utils/embeds');

// Helper fetch HTTP/HTTPS
function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...headers
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location, headers));
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', err => reject(err));
  });
}

// Ekstrak tag XML feed YouTube
function parseYouTubeRss(xml) {
  try {
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) return null;
    const entry = entryMatch[1];

    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const authorMatch = entry.match(/<author>\s*<name>([^<]+)<\/name>/);

    if (!videoIdMatch || !titleMatch) return null;

    return {
      videoId: videoIdMatch[1],
      title: titleMatch[1],
      author: authorMatch ? authorMatch[1] : 'YouTube Channel',
      url: `https://www.youtube.com/watch?v=${videoIdMatch[1]}`
    };
  } catch (err) {
    return null;
  }
}

// Cek YouTube Feeds
async function checkYouTubeFeeds(client) {
  for (const guild of client.guilds.cache.values()) {
    const guildData = db.getGuild(guild.id);
    const ytFeeds = guildData.trackedFeeds?.youtube || [];

    for (const feed of ytFeeds) {
      try {
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${feed.channelId}`;
        const xmlData = await fetchUrl(feedUrl);
        const latest = parseYouTubeRss(xmlData);

        if (latest && latest.videoId !== feed.lastVideoId) {
          db.updateGuild(guild.id, data => {
            const target = data.trackedFeeds.youtube.find(f => f.channelId === feed.channelId);
            if (target) target.lastVideoId = latest.videoId;
          });

          const alertChannel = guild.channels.cache.get(feed.alertChannelId);
          if (alertChannel && alertChannel.isTextBased()) {
            const embed = new EmbedBuilder()
              .setColor(COLORS.ERROR || 0xFF0055)
              .setTitle(`🔴 Video YouTube Baru: ${latest.title}`)
              .setURL(latest.url)
              .setAuthor({ name: latest.author, iconURL: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' })
              .setDescription(`**${latest.author}** baru saja meng-upload video baru ke YouTube!\n\n👉 [Tonton Sekarang](${latest.url})`)
              .setImage(`https://img.youtube.com/vi/${latest.videoId}/maxresdefault.jpg`)
              .setFooter({ text: 'YouTube Tracker • CODE: 002' })
              .setTimestamp();

            await alertChannel.send({
              content: `🔔 **Pemberitahuan YouTube Baru!**\n${latest.url}`,
              embeds: [embed]
            });
          }
        }
      } catch (err) {
        // Abaikan error sementara
      }
    }
  }
}

// Cek TikTok Feeds
async function checkTikTokFeeds(client) {
  for (const guild of client.guilds.cache.values()) {
    const guildData = db.getGuild(guild.id);
    const tiktokFeeds = guildData.trackedFeeds?.tiktok || [];

    for (const feed of tiktokFeeds) {
      const cleanUser = (feed.username || '').replace(/^@/, '').trim();
      if (!cleanUser) continue;

      try {
        const profileUrl = `https://www.tiktok.com/@${cleanUser}`;
        const html = await fetchUrl(profileUrl);

        const uMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
        if (!uMatch) continue;

        const json = JSON.parse(uMatch[1]);
        const defaultScope = json['__DEFAULT_SCOPE__'] || {};
        const userDetail = defaultScope['webapp.user-detail'] || {};
        const userInfo = userDetail.userInfo || {};
        const userObj = userInfo.user || {};
        const stats = userInfo.stats || {};
        const currentCount = parseInt(stats.videoCount, 10);

        if (isNaN(currentCount)) continue;

        // Inisialisasi awal agar tidak spam notifikasi saat pertama kali ditambahkan
        if (feed.lastCount === null || feed.lastCount === undefined) {
          db.updateGuild(guild.id, data => {
            const target = data.trackedFeeds?.tiktok?.find(f => (f.username || '').replace(/^@/, '').trim() === cleanUser);
            if (target) target.lastCount = currentCount;
          });
          continue;
        }

        // Jika jumlah video bertambah
        if (currentCount > feed.lastCount) {
          db.updateGuild(guild.id, data => {
            const target = data.trackedFeeds?.tiktok?.find(f => (f.username || '').replace(/^@/, '').trim() === cleanUser);
            if (target) target.lastCount = currentCount;
          });

          const alertChannel = guild.channels.cache.get(feed.alertChannelId);
          if (alertChannel && alertChannel.isTextBased()) {
            const nickname = userObj.nickname || cleanUser;
            const avatar = userObj.avatarLarger || userObj.avatarThumb || 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png';

            const embed = new EmbedBuilder()
              .setColor(COLORS.PRIMARY || 0xFF758F)
              .setTitle(`🎵 Video TikTok Baru: @${cleanUser}`)
              .setURL(profileUrl)
              .setAuthor({ name: `${nickname} (@${cleanUser})`, iconURL: avatar })
              .setDescription(`**${nickname}** baru saja memposting video baru di TikTok!\n\n👉 [Buka Profil & Tonton Video Baru](${profileUrl})`)
              .setThumbnail(avatar)
              .addFields(
                { name: 'Total Video', value: `${currentCount} Video`, inline: true },
                { name: 'Followers', value: stats.followerCount ? stats.followerCount.toLocaleString() : '-', inline: true }
              )
              .setFooter({ text: 'TikTok Tracker • CODE: 002' })
              .setTimestamp();

            await alertChannel.send({
              content: `🔔 **Pemberitahuan TikTok Baru!**\n${profileUrl}`,
              embeds: [embed]
            });
          }
        }
      } catch (err) {
        // Abaikan error sementara
      }
    }
  }
}

function startNotificationService(client) {
  // Cek setiap 5 menit
  cron.schedule('*/5 * * * *', () => {
    checkYouTubeFeeds(client).catch(err => console.error('[Feeds] Error checking YouTube feeds:', err));
    checkTikTokFeeds(client).catch(err => console.error('[Feeds] Error checking TikTok feeds:', err));
  });
  console.log('📡 Layanan Notifikasi Upload YouTube & TikTok telah aktif.');
}

module.exports = {
  startNotificationService,
  checkYouTubeFeeds,
  checkTikTokFeeds
};
