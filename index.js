const fs = require('fs');
const path = require('path');

// Fallback node_modules jika belum menjalankan npm install di folder ini
const fallbackModules = path.join('D:', 'discordbot', 'node_modules');
if (!fs.existsSync(path.join(__dirname, 'node_modules')) && fs.existsSync(fallbackModules)) {
  process.env.NODE_PATH = fallbackModules;
  require('module').Module._initPaths();
}

require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection
} = require('discord.js');

// Inisialisasi Discord Client dengan Intents Lengkap
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

// Koleksi Command, Snipes, dan Logs
client.commands = new Collection();
client.snipes = new Map();
client.commandLogs = [];

// ===================================================================
// LOAD COMMANDS DARI SUB-DIREKTORI
// ===================================================================
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    try {
      const command = require(filePath);
      if (command.name) {
        client.commands.set(command.name, command);
      }
    } catch (err) {
      console.error(`[Loader] Gagal memuat command ${file}:`, err);
    }
  }
}
console.log(`📦 Berhasil memuat ${client.commands.size} perintah bot.`);

// ===================================================================
// LOAD EVENT HANDLERS
// ===================================================================
const eventsPath = path.join(__dirname, 'src', 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  try {
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  } catch (err) {
    console.error(`[Loader] Gagal memuat event ${file}:`, err);
  }
}

// ===================================================================
// ERROR HANDLING UNTUK STABILITAS RUNTIME
// ===================================================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Anti-Crash] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error('[Anti-Crash] Uncaught Exception:', err);
});

// ===================================================================
// START VESPERA WEB DASHBOARD (KHUSUS LOKAL / PRIVAT)
// ===================================================================
// Web dashboard bersifat privat untuk pemilik bot.
// Di platform bot hosting (seperti Bot-Hosting.net, Pterodactyl, container cloud),
// web server otomatis dinonaktifkan agar tidak terekspos ke publik dan menghemat kuota hosting.
const isCloudHosting = Boolean(
  process.env.P_SERVER_UUID ||
  process.env.P_SERVER_LOCATION ||
  process.env.BOT_HOSTING ||
  process.env.SERVER_MEMORY ||
  process.env.DISABLE_DASHBOARD === 'true'
);

// Di bot hosting (seperti Bot-Hosting.net / Pterodactyl / cloud), dashboard dinonaktifkan
// secara default karena web dashboard bersifat privat hanya untuk komputer pemilik bot.
const isDashboardEnabled = !isCloudHosting && process.env.ENABLE_DASHBOARD !== 'false';

if (isDashboardEnabled) {
  try {
    const { startWebServer } = require('./src/web/server');
    startWebServer(client);
  } catch (err) {
    console.error('[WebDashboard] Gagal memulai server web:', err);
  }
}

// ===================================================================
// LOGIN BOT
// ===================================================================
const token = process.env.DISCORD_TOKEN;
if (!token || token === 'MASUKKAN_TOKEN_DISCORD_ANDA_DISINI') {
  console.warn('⚠️ Token Discord belum dimasukkan ke file .env! Harap isi DISCORD_TOKEN di .env.');
} else {
  client.login(token).catch(err => {
    console.error('❌ Gagal login ke Discord:', err.message);
  });
}
