const cron = require('node-cron');
const https = require('https');
const { EmbedBuilder } = require('discord.js');
const db = require('../database/jsonDb');

// Helper untuk fetch data XML RSS YouTube tanpa perlu library tambahan
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', err => reject(err));
  });
}

// Ekstrak tag sederhana dari XML feed YouTube
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
          // Update DB lastVideoId
          db.updateGuild(guild.id, data => {
            const target = data.trackedFeeds.youtube.find(f => f.channelId === feed.channelId);
            if (target) target.lastVideoId = latest.videoId;
          });

          // Kirim pesan notifikasi ke channel tujuan
          const alertChannel = guild.channels.cache.get(feed.alertChannelId);
          if (alertChannel && alertChannel.isTextBased()) {
            const embed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle(`🔴 Video Baru: ${latest.title}`)
              .setURL(latest.url)
              .setAuthor({ name: latest.author, iconURL: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' })
              .setDescription(`**${latest.author}** baru saja meng-upload video baru ke YouTube!\n\n👉 [Tonton Sekarang](${latest.url})`)
              .setImage(`https://img.youtube.com/vi/${latest.videoId}/maxresdefault.jpg`)
              .setTimestamp();

            await alertChannel.send({
              content: `🔔 **Pemberitahuan Konten Baru!**\n${latest.url}`,
              embeds: [embed]
            });
          }
        }
      } catch (err) {
        // Abaikan error jaringan sementara
      }
    }
  }
}

function startNotificationService(client) {
  // Cek setiap 5 menit
  cron.schedule('*/5 * * * *', () => {
    checkYouTubeFeeds(client).catch(err => console.error('[Feeds] Error checking feeds:', err));
  });
  console.log('📡 Layanan Notifikasi Upload YouTube & TikTok telah aktif.');
}

module.exports = {
  startNotificationService,
  checkYouTubeFeeds
};
