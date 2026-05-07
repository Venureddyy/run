// js/spotify.js
import { save, load } from './storage.js';

const CLIENT_ID = '9ccf3c3270234334b3c74317f5ebd466';
const REDIRECT   = 'https://venureddyy.github.io/run/';
const SCOPES     = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state user-read-currently-playing';

let spToken = null, spPlayer = null, spDeviceId = null, spState = null;
let progTimer = null;
let spVol = 0.7;

// ── AUTH ──
export function spotifyLogin() {
  const verifier = generateVerifier(128);
  localStorage.setItem('sp_verifier', verifier);
  localStorage.removeItem('sp_token');
  localStorage.removeItem('sp_refresh');
  generateChallenge(verifier).then(challenge => {
    const url = new URL('https://accounts.spotify.com/authorize');
    url.searchParams.set('client_id', CLIENT_ID);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', REDIRECT);
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', challenge);
    window.location = url.toString();
  });
}

function generateVerifier(len) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'').slice(0,len);
}
async function generateChallenge(v) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}

async function exchangeCode(code) {
  const verifier = localStorage.getItem('sp_verifier');
  if (!verifier) return;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type:'authorization_code', code, redirect_uri:REDIRECT, client_id:CLIENT_ID, code_verifier:verifier })
  });
  const data = await res.json();
  if (data.access_token) {
    spToken = data.access_token;
    localStorage.setItem('sp_token', spToken);
    if (data.refresh_token) localStorage.setItem('sp_refresh', data.refresh_token);
    localStorage.removeItem('sp_verifier');
    window.history.replaceState({}, '', window.location.pathname);
    initSDK();
  }
}

async function refreshToken() {
  const rt = localStorage.getItem('sp_refresh');
  if (!rt) return;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type:'refresh_token', refresh_token:rt, client_id:CLIENT_ID })
  });
  const data = await res.json();
  if (data.access_token) { spToken = data.access_token; localStorage.setItem('sp_token', spToken); }
}

// ── SDK ──
function initSDK() {
  showPlayerUI();

  // SDK is already loaded via <script> in HTML
  window.onSpotifyWebPlaybackSDKReady = createPlayer;
  // If SDK already loaded
  if (window.Spotify) createPlayer();
}

function createPlayer() {
  spPlayer = new Spotify.Player({
    name: 'Car Dashboard',
    getOAuthToken: cb => cb(spToken),
    volume: spVol
  });
  spPlayer.addListener('ready', ({ device_id }) => {
    spDeviceId = device_id;
    setStatus('● Ready');
    transferPlayback(device_id);
  });
  spPlayer.addListener('not_ready', () => setStatus('Offline'));
  spPlayer.addListener('player_state_changed', state => {
    if (!state) return;
    spState = state;
    updateUI(state);
  });
  spPlayer.addListener('authentication_error', async () => {
    await refreshToken();
    spPlayer.connect();
  });
  spPlayer.connect();
}

async function transferPlayback(deviceId) {
  await spFetch('PUT', 'https://api.spotify.com/v1/me/player', { device_ids: [deviceId], play: false });
}

// ── UI UPDATE ──
function fmt(ms) {
  if (!ms) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

function updateUI(state) {
  const track = state.track_window.current_track;
  const art   = track.album.images[0]?.url || '';
  const title  = track.name;
  const artist = track.artists.map(a => a.name).join(', ');
  const album  = track.album.name;
  const dur    = track.duration_ms;
  const pos    = state.position;
  const pct    = dur ? (pos / dur * 100) : 0;
  const paused = state.paused;
  const playPath = paused ? '<path d="M8 5v14l11-7z"/>' : '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';

  // Mini player (left panel)
  setEl('mini-title', title);
  setEl('mini-artist', artist);
  setImg('mini-art', art);
  setEl('mini-dur', fmt(dur));
  setEl('mini-cur', fmt(pos));
  setWidth('mini-pfill', pct);
  setSvg('mini-pico', playPath);
  setStatus(paused ? 'Paused' : '● Playing');

  // Big player (music panel)
  setImg('big-art', art);
  setEl('big-title', title);
  setEl('big-artist', artist);
  setEl('big-album', album);
  setEl('big-dur', fmt(dur));
  setEl('big-cur', fmt(pos));
  setWidth('big-pfill', pct);
  setSvg('big-pico', playPath);

  // Live progress
  clearInterval(progTimer);
  if (!paused) {
    let p = pos;
    progTimer = setInterval(() => {
      p += 1000;
      if (p >= dur) { clearInterval(progTimer); return; }
      const pc = (p / dur * 100);
      setEl('mini-cur', fmt(p));
      setWidth('mini-pfill', pc);
      setEl('big-cur', fmt(p));
      setWidth('big-pfill', pc);
    }, 1000);
  }

  fetchQueue();
}

export async function fetchQueue() {
  if (!spToken) return;
  try {
    const res = await spFetch('GET', 'https://api.spotify.com/v1/me/player/queue');
    if (!res || !res.ok) return;
    const data = await res.json();
    const items = data.queue?.slice(0, 15) || [];
    const list = document.getElementById('queue-list');
    if (!list) return;
    if (items.length === 0) {
      list.innerHTML = '<div class="queue-empty">Queue is empty</div>';
      return;
    }
    list.innerHTML = items.map((t, i) => `
      <div class="queue-item" onclick="spPlayUri('${t.uri}')">
        <div class="q-num">${i+1}</div>
        <img class="q-art" src="${t.album?.images?.[2]?.url || ''}" alt="">
        <div class="q-meta">
          <div class="q-title">${t.name}</div>
          <div class="q-artist">${t.artists?.map(a=>a.name).join(', ') || ''}</div>
        </div>
        <div class="q-dur">${fmt(t.duration_ms)}</div>
      </div>`).join('');
  } catch(e) { console.warn('Queue fetch failed:', e); }
}

// ── CONTROLS ──
export async function spToggle()  { spPlayer?.togglePlay(); }
export async function spNext()    { spPlayer?.nextTrack(); }
export async function spPrev()    { spPlayer?.previousTrack(); }

export async function spPlayUri(uri) {
  if (!spDeviceId) return;
  await spFetch('PUT', `https://api.spotify.com/v1/me/player/play?device_id=${spDeviceId}`, { uris: [uri] });
}

export function seekSp(e) {
  if (!spState) return;
  const dur = spState.track_window.current_track.duration_ms;
  const pct = e.offsetX / document.getElementById('mini-pbar').offsetWidth;
  spFetch('PUT', `https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(pct*dur)}`);
}

export function seekSpBig(e) {
  if (!spState) return;
  const dur = spState.track_window.current_track.duration_ms;
  const pct = e.offsetX / document.getElementById('big-pbar').offsetWidth;
  spFetch('PUT', `https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(pct*dur)}`);
}

export function setSpVol(e) {
  spVol = Math.max(0, Math.min(1, e.offsetX / document.getElementById('vol-track').offsetWidth));
  setWidth2('vol-fill', spVol * 100);
  setWidth2('vol-fill-big', spVol * 100);
  spPlayer?.setVolume(spVol);
}

export function setSpVolBig(e) {
  spVol = Math.max(0, Math.min(1, e.offsetX / document.getElementById('vol-track-big').offsetWidth));
  setWidth2('vol-fill', spVol * 100);
  setWidth2('vol-fill-big', spVol * 100);
  spPlayer?.setVolume(spVol);
}

// ── API HELPER ──
async function spFetch(method, url, body) {
  if (!spToken) return null;
  const opts = { method, headers: { Authorization: `Bearer ${spToken}`, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (res.status === 401) { await refreshToken(); }
  return res;
}

// ── HELPERS ──
function setEl(id, txt) { const e = document.getElementById(id); if(e) e.textContent = txt; }
function setImg(id, src) { const e = document.getElementById(id); if(e && src) e.src = src; }
function setSvg(id, path) { const e = document.getElementById(id); if(e) e.innerHTML = path; }
function setWidth(id, pct) { const e = document.getElementById(id); if(e) e.style.width = pct + '%'; }
function setWidth2(id, pct) { const e = document.getElementById(id); if(e) e.style.width = pct + '%'; }
function setStatus(txt) { const e = document.getElementById('mini-status'); if(e) e.textContent = txt; }

function showPlayerUI() {
  document.getElementById('sp-login-mini')?.style && (document.getElementById('sp-login-mini').style.display = 'none');
  document.getElementById('sp-player-mini')  && (document.getElementById('sp-player-mini').style.display = 'block');
  document.getElementById('music-not-connected') && (document.getElementById('music-not-connected').style.display = 'none');
  document.getElementById('music-connected')     && (document.getElementById('music-connected').style.display = 'flex');
}

// ── BOOT ──
export function initSpotify() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const token = localStorage.getItem('sp_token');
  const refresh = localStorage.getItem('sp_refresh');

  if (code) {
    exchangeCode(code);
  } else if (token && refresh) {
    // Validate token before using
    spToken = token;
    validateToken().then(valid => {
      if (valid) {
        initSDK();
      } else {
        // Try refresh
        refreshToken().then(() => {
          if (spToken) initSDK();
          else clearSpotifyTokens();
        });
      }
    });
  }
  // else: show login button
}

async function validateToken() {
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${spToken}` }
    });
    return res.ok;
  } catch { return false; }
}

function clearSpotifyTokens() {
  localStorage.removeItem('sp_token');
  localStorage.removeItem('sp_refresh');
  localStorage.removeItem('sp_verifier');
}

// Expose globally
window.spotifyLogin = spotifyLogin;
window.spToggle = spToggle;
window.spNext = spNext;
window.spPrev = spPrev;
window.spPlayUri = spPlayUri;
window.seekSp = seekSp;
window.seekSpBig = seekSpBig;
window.setSpVol = setSpVol;
window.setSpVolBig = setSpVolBig;
window.fetchQueue = fetchQueue;
