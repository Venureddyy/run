// js/app.js — Main orchestrator
import { initAuth } from './auth.js';
import { initGPS, setOdo } from './gps.js';
import { initRange } from './range.js';
import { initSpotify } from './spotify.js';
import { initUI } from './ui.js';
import './map.js'; // registers window.initMap

// Called after login (Google or guest) with loaded data
export function onDataLoaded(data) {
  const odo      = parseFloat(data.odo) || 0;
  const darkMode = data.darkMode || false;
  const rangeFull    = parseFloat(data.rangeFull) || 0;
  const rangeCurrent = parseFloat(data.rangeCurrent) || 0;

  // Init all modules
  initUI(darkMode);
  initGPS(odo);
  initRange({ rangeFull, rangeCurrent });
  initSpotify();

  // Wire up odo edit
  window.editOdo = function() {
    const cur = parseFloat(document.getElementById('odo-display').textContent) || 0;
    const val = prompt(`Edit odometer (miles):\nCurrent: ${cur.toFixed(1)} mi\n\nEnter new value:`, cur.toFixed(1));
    if (val === null) return;
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) { alert('Invalid value'); return; }
    setOdo(n);
  };
  window.editOdo = window.editOdo; // expose
}

// Boot
initAuth();
