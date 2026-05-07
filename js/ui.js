// js/ui.js
import { save } from './storage.js';
import { applyDarkMap, applyLightMap } from './map.js';

let dark = false;
let currentPanel = 'car';

export function initUI(savedDark) {
  dark = savedDark === true || savedDark === 'true';
  applyTheme();
  startClock();
}

export function toggleDark() {
  dark = !dark;
  applyTheme();
  save('darkMode', dark);
}

function applyTheme() {
  document.body.classList.toggle('dark', dark);
  const ico = document.getElementById('dark-ico');
  if (ico) {
    ico.innerHTML = dark
      ? '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'
      : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
  if (dark) applyDarkMap(); else applyLightMap();
}

export function showPanel(name) {
  currentPanel = name;
  const panels = ['map', 'music', 'alerts'];
  panels.forEach(p => {
    const el = document.getElementById('panel-' + p);
    if (el) { el.classList.toggle('active', p === name); }
  });

  // Nav button active states
  const btns = ['car', 'map', 'music', 'alerts'];
  btns.forEach(b => {
    const el = document.getElementById('nb-' + b);
    if (el) el.classList.toggle('on', b === name || (b === 'car' && name === 'map'));
  });

  // Panel-specific actions
  if (name === 'map') window.locateMe?.();
  if (name === 'music') window.fetchQueue?.();
  if (name === 'alerts') refreshAlerts();
}

function refreshAlerts() {
  const gtxt = document.getElementById('gps-acc');
  document.getElementById('a-gps').textContent = gtxt?.textContent || '—';
}

export function toggleFS() {
  const ico = document.getElementById('fs-ico');
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
    ico && (ico.innerHTML = '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>');
  } else {
    document.exitFullscreen();
    ico && (ico.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>');
  }
}

export function showUserMenu() {
  const menu = document.getElementById('user-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Click outside to close user menu
document.addEventListener('click', e => {
  const menu = document.getElementById('user-menu');
  const avatar = document.getElementById('user-avatar');
  if (menu && !menu.contains(e.target) && e.target !== avatar) {
    menu.style.display = 'none';
  }
});

function startClock() {
  function tick() {
    const n = new Date();
    let h = n.getHours(), m = n.getMinutes();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const el = document.getElementById('clock');
    if (el) el.textContent = `${h}:${String(m).padStart(2,'0')} ${ap}`;
  }
  tick();
  setInterval(tick, 1000);
}

// Expose globally
window.toggleDark = toggleDark;
window.toggleFS = toggleFS;
window.showPanel = showPanel;
window.showUserMenu = showUserMenu;
