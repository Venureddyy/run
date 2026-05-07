// js/gps.js
import { save } from './storage.js';

let odo = 0;
let lastCoords = null;
let lastSpeed = 0;
let sessionDist = 0;
let topSpeed = 0;
let overSpeedBeeping = false;
let audioCtx = null;

export function initGPS(initialOdo) {
  odo = initialOdo || 0;
  updateOdoDisplay();

  if (!navigator.geolocation) {
    document.getElementById('gps-acc').textContent = 'No GPS';
    return;
  }

  navigator.geolocation.watchPosition(onPosition, onError, {
    enableHighAccuracy: true,
    maximumAge: 500,
    timeout: 10000
  });
}

function onPosition(pos) {
  const { latitude: lat, longitude: lon, speed, accuracy } = pos.coords;
  const mph = speed > 0 ? speed * 2.23694 : 0;
  const rounded = Math.round(mph);

  // Update speed display
  document.getElementById('spd').textContent = rounded;
  document.getElementById('gps-dot').classList.add('ok');
  document.getElementById('gps-acc').textContent = `acc:${Math.round(accuracy)}m`;
  document.getElementById('a-gps').textContent = `${Math.round(accuracy)}m`;

  // Top speed
  if (rounded > topSpeed) {
    topSpeed = rounded;
    document.getElementById('a-top').textContent = topSpeed;
  }

  // Overspeed
  const flash = document.getElementById('spd-flash');
  const badge = document.getElementById('overspeed-badge');
  const spdEl = document.getElementById('spd');

  if (rounded >= 70) {
    spdEl.classList.add('over');
    flash.className = 'over';
    badge.style.display = 'block';
    triggerOverspeedAlert();
  } else {
    spdEl.classList.remove('over');
    badge.style.display = 'none';
    stopOverspeedAlert();

    // Acceleration flash
    const delta = rounded - lastSpeed;
    if (delta >= 8) {
      flash.className = 'accel';
      setTimeout(() => { if (flash.className === 'accel') flash.className = ''; }, 500);
    } else if (flash.className !== 'over') {
      flash.className = '';
    }
  }
  lastSpeed = rounded;

  // Distance
  if (lastCoords) {
    const dist = haversine(lastCoords.lat, lastCoords.lon, lat, lon);
    const distMi = dist * 0.000621371;
    odo += distMi;
    sessionDist += distMi;
    updateOdoDisplay();
    save('odo', odo);
    document.getElementById('a-session').textContent = sessionDist.toFixed(2);

    // Update range
    window._updateRange && window._updateRange(distMi);
  }
  lastCoords = { lat, lon };
}

function onError(err) {
  document.getElementById('gps-dot').classList.remove('ok');
  document.getElementById('gps-acc').textContent = err.code === 1 ? 'denied' : 'error';
}

export function setOdo(val) {
  odo = val;
  updateOdoDisplay();
  save('odo', odo);
}

export function getOdo() { return odo; }
export function getSessionDist() { return sessionDist; }

function updateOdoDisplay() {
  const [i, d] = odo.toFixed(1).split('.');
  const fmt = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + d + ' mi';
  document.getElementById('odo-display').textContent = fmt;
}

function haversine(a, b, c, d) {
  const R = 6371000, r = Math.PI / 180;
  const dL = (c - a) * r, dN = (d - b) * r;
  const x = Math.sin(dL/2)**2 + Math.cos(a*r)*Math.cos(c*r)*Math.sin(dN/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function triggerOverspeedAlert() {
  if (overSpeedBeeping) return;
  overSpeedBeeping = true;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function beep() {
    if (!overSpeedBeeping) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value = 880; o.type = 'square';
    g.gain.setValueAtTime(0.25, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    o.start(); o.stop(audioCtx.currentTime + 0.25);
    setTimeout(beep, 600);
  }
  beep();
}

function stopOverspeedAlert() { overSpeedBeeping = false; }
