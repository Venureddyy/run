// js/range.js
import { save } from './storage.js';

let rangeFull = 0;
let rangeCurrent = 0;
let isSet = false;

export function initRange(data) {
  rangeFull = data.rangeFull || 0;
  rangeCurrent = data.rangeCurrent || 0;
  isSet = rangeFull > 0;
  renderRange();

  // Register GPS callback
  window._updateRange = deductRange;
}

export function setRange() {
  const val = parseFloat(document.getElementById('range-input').value);
  if (!val || val <= 0) return;
  rangeFull = val;
  rangeCurrent = val;
  isSet = true;
  document.getElementById('range-input').value = '';
  document.getElementById('range-input').blur();
  renderRange();
  save('rangeFull', rangeFull);
  save('rangeCurrent', rangeCurrent);
}

export function refuel() {
  if (!isSet) { alert('Set your range first'); return; }
  rangeCurrent = rangeFull;
  renderRange();
  save('rangeCurrent', rangeCurrent);
}

export function deductRange(distMi) {
  if (!isSet) return;
  rangeCurrent = Math.max(0, rangeCurrent - distMi);
  renderRange();
  // Save every 0.1 mi to avoid too many writes
  if (Math.round(distMi * 10) > 0) save('rangeCurrent', rangeCurrent);
}

function renderRange() {
  const display = document.getElementById('range-display');
  const bar = document.getElementById('range-bar');
  const alertVal = document.getElementById('a-range');

  if (!isSet) {
    display.textContent = '— mi left';
    display.className = 'range-val';
    bar.style.width = '100%';
    bar.style.background = 'var(--border)';
    alertVal && (alertVal.textContent = '— mi');
    return;
  }

  const pct = rangeFull > 0 ? (rangeCurrent / rangeFull) * 100 : 0;
  display.textContent = rangeCurrent.toFixed(1) + ' mi left';
  alertVal && (alertVal.textContent = rangeCurrent.toFixed(1) + ' mi');

  if (rangeCurrent < 30) {
    display.className = 'range-val low';
    bar.style.background = 'var(--red)';
  } else if (rangeCurrent < 80) {
    display.className = 'range-val amber';
    bar.style.background = 'var(--amber)';
  } else {
    display.className = 'range-val';
    bar.style.background = 'var(--green-l)';
  }
  bar.style.width = Math.max(2, pct) + '%';
}

// Expose globally
window.setRange = setRange;
window.refuel = refuel;
