// js/map.js — Google Maps + Directions + Places Autocomplete

let map, directionsService, directionsRenderer, placesService;
let autocomplete;
let userMarker = null;
let currentRoute = null;
let stepIndex = 0;
let userLat = null, userLon = null;
let navInterval = null;

// Called by Google Maps API callback
window.initMap = function () {
  const center = { lat: 51.7612, lng: -0.2353 }; // Hertfordshire default

  map = new google.maps.Map(document.getElementById('map'), {
    center,
    zoom: 14,
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false,
    zoomControl: true,
    zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
    styles: getMapStyle()
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map,
    suppressMarkers: false,
    polylineOptions: { strokeColor: '#2979ff', strokeWeight: 5, strokeOpacity: 0.85 }
  });

  // Places autocomplete
  const input = document.getElementById('search-input');
  autocomplete = new google.maps.places.Autocomplete(input, {
    componentRestrictions: { country: 'gb' },
    fields: ['geometry', 'name', 'formatted_address']
  });
  autocomplete.addListener('place_changed', onPlaceSelected);

  // Get user location immediately
  locateMe();

  // Apply dark mode to map if needed
  if (document.body.classList.contains('dark')) applyDarkMap();
};

function onPlaceSelected() {
  const place = autocomplete.getPlace();
  if (!place.geometry) return;
  const dest = place.geometry.location;
  document.getElementById('nav-btn').style.display = 'flex';
  map.panTo(dest);
  map.setZoom(14);
  window._selectedDest = dest;
}

export function searchAndRoute() {
  const input = document.getElementById('search-input').value.trim();
  if (!input) return;
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: input, region: 'gb' }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const dest = results[0].geometry.location;
      window._selectedDest = dest;
      map.panTo(dest);
      map.setZoom(14);
      document.getElementById('nav-btn').style.display = 'flex';
    }
  });
}

export function startNavigation() {
  if (!window._selectedDest || userLat === null) return;
  const origin = new google.maps.LatLng(userLat, userLon);

  directionsService.route({
    origin,
    destination: window._selectedDest,
    travelMode: google.maps.TravelMode.DRIVING,
    unitSystem: google.maps.UnitSystem.IMPERIAL
  }, (result, status) => {
    if (status === 'OK') {
      currentRoute = result;
      stepIndex = 0;
      directionsRenderer.setDirections(result);
      document.getElementById('turn-card').style.display = 'flex';
      document.getElementById('clear-nav-btn').style.display = 'flex';
      document.getElementById('nav-btn').style.display = 'none';
      updateTurnCard();
      startNavTracking();
    } else {
      alert('Could not get directions: ' + status);
    }
  });
}

function updateTurnCard() {
  if (!currentRoute) return;
  const steps = currentRoute.routes[0].legs[0].steps;
  const leg = currentRoute.routes[0].legs[0];

  if (stepIndex < steps.length) {
    const step = steps[stepIndex];
    document.getElementById('turn-dist').textContent = step.distance.text;
    document.getElementById('turn-street').textContent = stripHtml(step.instructions);
    document.getElementById('turn-icon').textContent = getTurnIcon(step.instructions);
  }

  // ETA
  const eta = new Date(Date.now() + leg.duration.value * 1000);
  const h = eta.getHours(), m = eta.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  document.getElementById('eta-time').textContent = `${h%12||12}:${String(m).padStart(2,'0')} ${ap}`;
}

function startNavTracking() {
  if (navInterval) clearInterval(navInterval);
  navInterval = setInterval(() => {
    if (!currentRoute || userLat === null) return;
    // Check if we've passed current step
    const steps = currentRoute.routes[0].legs[0].steps;
    if (stepIndex < steps.length) {
      const step = steps[stepIndex];
      const endLat = step.end_location.lat();
      const endLon = step.end_location.lng();
      const dist = haversine(userLat, userLon, endLat, endLon);
      if (dist < 30) { // within 30m of step end
        stepIndex++;
        updateTurnCard();
      }
    }
  }, 2000);
}

export function clearRoute() {
  directionsRenderer.setDirections({ routes: [] });
  currentRoute = null;
  stepIndex = 0;
  if (navInterval) clearInterval(navInterval);
  document.getElementById('turn-card').style.display = 'none';
  document.getElementById('clear-nav-btn').style.display = 'none';
  document.getElementById('nav-btn').style.display = 'none';
  document.getElementById('search-input').value = '';
}

export function locateMe() {
  navigator.geolocation?.getCurrentPosition(pos => {
    userLat = pos.coords.latitude;
    userLon = pos.coords.longitude;
    const loc = { lat: userLat, lng: userLon };

    map.panTo(loc);
    map.setZoom(15);

    if (userMarker) userMarker.setMap(null);
    userMarker = new google.maps.Marker({
      position: loc,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#2979ff',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3
      },
      title: 'You are here'
    });
  }, null, { enableHighAccuracy: true });

  // Keep updating user position for nav
  navigator.geolocation?.watchPosition(pos => {
    userLat = pos.coords.latitude;
    userLon = pos.coords.longitude;
    if (userMarker) userMarker.setPosition({ lat: userLat, lng: userLon });
  }, null, { enableHighAccuracy: true, maximumAge: 1000 });
}

export function applyDarkMap() {
  if (!map) return;
  map.setOptions({ styles: getDarkMapStyle() });
}

export function applyLightMap() {
  if (!map) return;
  map.setOptions({ styles: [] });
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function getTurnIcon(instruction) {
  const lower = instruction.toLowerCase();
  if (lower.includes('left')) return '↰';
  if (lower.includes('right')) return '↱';
  if (lower.includes('roundabout')) return '↻';
  if (lower.includes('u-turn')) return '↩';
  if (lower.includes('destination')) return '⚑';
  return '↑';
}

function haversine(a, b, c, d) {
  const R = 6371000, r = Math.PI/180;
  const x = Math.sin((c-a)*r/2)**2 + Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

function getMapStyle() { return []; }

function getDarkMapStyle() {
  return [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] }
  ];
}

// Expose globally
window.locateMe = locateMe;
window.searchAndRoute = searchAndRoute;
window.startNavigation = startNavigation;
window.clearRoute = clearRoute;
