// ===================================================================
// ZERO TWO DASHBOARD FRONTEND LOGIC
// ===================================================================

let currentGuildId = null;
let currentGuildData = null;

// Tampilkan Toast Notifikasi
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.style.borderColor = isError ? 'var(--zt-red-bright)' : 'var(--zt-pink)';
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

// Format Detik ke Waktu
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}h ${h}j ${m}m`;
}

// 1. Inisialisasi Navigasi Tab
document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetTabId = link.getAttribute('data-tab');

    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

    link.classList.add('active');
    const targetPane = document.getElementById(targetTabId);
    if (targetPane) targetPane.style.display = 'block';
  });
});

// 2. Fetch Statistik Bot Real-Time
async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }
    const data = await res.json();

    document.getElementById('botTagText').innerText = data.botTag;
    document.getElementById('valPing').innerText = `${data.ping} ms`;
    document.getElementById('valGuilds').innerText = data.guildsCount;
    document.getElementById('valUsers').innerText = data.usersCount;
    document.getElementById('valUptime').innerText = formatUptime(data.uptime);
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

// 3. Fetch Daftar Server (Guilds)
async function fetchGuilds() {
  try {
    const res = await fetch('/api/guilds');
    const data = await res.json();
    const select = document.getElementById('serverSelect');
    select.innerHTML = '';

    if (!data.guilds || data.guilds.length === 0) {
      select.innerHTML = '<option value="">Belum ada server yang terhubung</option>';
      return;
    }

    data.guilds.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.innerText = `${g.name} (${g.memberCount} member)`;
      select.appendChild(opt);
    });

    currentGuildId = data.guilds[0].id;
    loadGuildDetails(currentGuildId);
  } catch (err) {
    console.error('Error fetching guilds:', err);
  }
}

// 4. Muat Rincian Server Tertentu
async function loadGuildDetails(guildId) {
  try {
    const res = await fetch(`/api/guild/${guildId}`);
    const data = await res.json();
    currentGuildData = data;

    const channels = data.channels || [];
    const roles = data.roles || [];
    const config = data.config || {};

    // Isi Dropdown Saluran Teks
    const textChannels = channels.filter(c => c.type === 0);
    const voiceChannels = channels.filter(c => c.type === 2);
    const categories = channels.filter(c => c.type === 4);

    populateSelect('modLogChannelSelect', textChannels, config.modLogChannel, 'Pilih saluran log...');
    populateSelect('ytAlertChannelSelect', textChannels, null, 'Pilih saluran Discord...');
    populateSelect('voiceJoinChannelSelect', voiceChannels, config.joinToCreateChannel, 'Pilih saluran suara...');
    populateSelect('ticketCategorySelect', categories, config.ticketCategory, 'Pilih kategori tiket...');
    populateSelect('autoRoleSelect', roles, config.autoRole, 'Non-aktif (Tanpa Auto-Role)');

    // Isi Pengaturan Dasar
    document.getElementById('guildPrefixInput').value = config.prefix || '!';

    // Isi Auto-Mod
    const autoMod = config.autoMod || {};
    document.getElementById('togglePhishing').checked = autoMod.antiPhishing !== false;
    document.getElementById('toggleMassMention').checked = autoMod.antiMassMention !== false;
    document.getElementById('toggleInvite').checked = autoMod.antiInvite !== false;

    // Render Tabel YouTube Feeds
    renderYtFeeds(config.trackedFeeds?.youtube || [], channels);

    // Render Giveaway
    const gwContainer = document.getElementById('giveawayListContainer');
    const activeGw = config.activeGiveaways ? Object.entries(config.activeGiveaways) : [];
    if (activeGw.length > 0) {
      gwContainer.innerHTML = activeGw.map(([msgId, gw]) => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--zt-border); padding: 16px; border-radius: 8px; margin-bottom: 12px;">
          <h4 style="color: var(--zt-pink);">🎉 ${gw.prize}</h4>
          <p style="font-size: 13px; color: var(--zt-text-muted);">
            Peserta: <strong>${gw.participants?.length || 0} orang</strong> | 
            Pemenang: <strong>${gw.winnersCount}</strong> | 
            Selesai: <span style="color: var(--zt-cyan);">${new Date(gw.endsAt).toLocaleTimeString()}</span>
          </p>
        </div>
      `).join('');
    } else {
      gwContainer.innerHTML = 'Tidak ada giveaway yang sedang berlangsung di server ini.';
    }

  } catch (err) {
    console.error('Error loading guild details:', err);
  }
}

function populateSelect(elemId, items, selectedVal, defaultLabel) {
  const elem = document.getElementById(elemId);
  if (!elem) return;
  elem.innerHTML = `<option value="">${defaultLabel}</option>`;
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.innerText = item.name;
    if (item.id === selectedVal) opt.selected = true;
    elem.appendChild(opt);
  });
}

function renderYtFeeds(feeds, channels) {
  const tbody = document.getElementById('ytFeedTableBody');
  if (feeds.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--zt-text-muted);">Belum ada feed YouTube yang dipantau.</td></tr>';
    return;
  }

  tbody.innerHTML = feeds.map(feed => {
    const channelName = channels.find(c => c.id === feed.alertChannelId)?.name || feed.alertChannelId;
    return `
      <tr>
        <td><code>${feed.channelId}</code></td>
        <td>#${channelName}</td>
        <td><span style="color: var(--zt-cyan); font-weight: 700;">● Aktif</span></td>
        <td>
          <button class="btn-logout" onclick="deleteYtFeed('${feed.channelId}')" style="padding: 4px 10px; font-size: 11px;">HAPUS</button>
        </td>
      </tr>
    `;
  }).join('');
}

// 5. Simpan Konfigurasi Umum Server (Prefix & Mod-Log)
document.getElementById('btnSaveGeneralSettings')?.addEventListener('click', async () => {
  if (!currentGuildId) return;
  const prefix = document.getElementById('guildPrefixInput').value;
  const modLogChannel = document.getElementById('modLogChannelSelect').value;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, modLogChannel })
    });
    const json = await res.json();
    showToast(json.message || 'Pengaturan berhasil disimpan!');
  } catch {
    showToast('Gagal menyimpan pengaturan.', true);
  }
});

// 6. Simpan Auto-Mod
document.getElementById('btnSaveAutoMod')?.addEventListener('click', async () => {
  if (!currentGuildId) return;
  const antiPhishing = document.getElementById('togglePhishing').checked;
  const antiMassMention = document.getElementById('toggleMassMention').checked;
  const antiInvite = document.getElementById('toggleInvite').checked;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/automod`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ antiPhishing, antiMassMention, antiInvite })
    });
    const json = await res.json();
    showToast(json.message || 'Proteksi Auto-Mod disimpan!');
  } catch {
    showToast('Gagal menyimpan konfigurasi Auto-Mod.', true);
  }
});

// 7. Simpan Voice Join-to-Create
document.getElementById('btnSaveVoiceChannel')?.addEventListener('click', async () => {
  if (!currentGuildId) return;
  const joinToCreateChannel = document.getElementById('voiceJoinChannelSelect').value;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joinToCreateChannel })
    });
    const json = await res.json();
    showToast(json.message || 'Saluran Voice disimpan!');
  } catch {
    showToast('Gagal menyimpan saluran voice.', true);
  }
});

// 8. Simpan Tiket Kategori
document.getElementById('btnSaveTicketConfig')?.addEventListener('click', async () => {
  if (!currentGuildId) return;
  const ticketCategory = document.getElementById('ticketCategorySelect').value;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketCategory })
    });
    const json = await res.json();
    showToast(json.message || 'Kategori tiket disimpan!');
  } catch {
    showToast('Gagal menyimpan konfigurasi tiket.', true);
  }
});

// 9. Simpan Auto-Role
document.getElementById('btnSaveAutoRole')?.addEventListener('click', async () => {
  if (!currentGuildId) return;
  const autoRole = document.getElementById('autoRoleSelect').value;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoRole })
    });
    const json = await res.json();
    showToast(json.message || 'Auto-Role disimpan!');
  } catch {
    showToast('Gagal menyimpan auto-role.', true);
  }
});

// 10. Tambah Feed YouTube
document.getElementById('formAddYtFeed')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentGuildId) return;

  const channelId = document.getElementById('ytChannelIdInput').value.trim();
  const alertChannelId = document.getElementById('ytAlertChannelSelect').value;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/feed/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, alertChannelId })
    });
    const json = await res.json();
    showToast(json.message || 'Feed YouTube ditambahkan!');
    document.getElementById('ytChannelIdInput').value = '';
    loadGuildDetails(currentGuildId);
  } catch {
    showToast('Gagal menambahkan feed.', true);
  }
});

// Hapus Feed YouTube
async function deleteYtFeed(channelId) {
  if (!confirm(`Hapus pemantauan untuk channel YouTube ${channelId}?`)) return;
  try {
    const res = await fetch(`/api/guild/${currentGuildId}/feed/youtube`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId })
    });
    const json = await res.json();
    showToast(json.message || 'Feed dihapus!');
    loadGuildDetails(currentGuildId);
  } catch {
    showToast('Gagal menghapus feed.', true);
  }
}

// 11. Ubah Status Presence Bot
document.getElementById('presenceForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const activityType = document.getElementById('presenceType').value;
  const statusText = document.getElementById('presenceText').value.trim();

  try {
    const res = await fetch('/api/bot/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityType, statusText })
    });
    const json = await res.json();
    showToast(json.message || 'Status bot diperbarui!');
  } catch {
    showToast('Gagal memperbarui status.', true);
  }
});

// 12. Ganti Pilihan Server di Dropdown Topbar
document.getElementById('serverSelect')?.addEventListener('change', (e) => {
  currentGuildId = e.target.value;
  if (currentGuildId) loadGuildDetails(currentGuildId);
});

// 13. Logout
document.getElementById('btnLogout')?.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login';
});

// Inisialisasi awal
fetchStats();
fetchGuilds();
setInterval(fetchStats, 3000); // Polling status bot tiap 3 detik
