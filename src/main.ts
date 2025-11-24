// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./_leafletWorkaround.ts";

// Import our luck function
import luck from "./_luck.ts";

import { GeoMovement } from "./GeoMovement.ts";
import { ButtonMovement } from "./Movement.ts";

// Constants
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);
const ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const INTERACT_RADIUS = 4;
const TOKEN_PROBABILITY = 0.3;
const WORLD_RADIUS = 20;
const FINAL_TOKEN_VALUE = 32;

// Color Constants
const COLOR_TOKEN = "#4CAF50";
const COLOR_EMPTY = "#999";
const COLOR_MERGED_TOKEN = "#c4dd38ff";
const MOVE_STEP = TILE_DEGREES;

//Persistence keys
const STORAGE_KEY_PLAYER_POS = "playerPosition";
const STORAGE_KEY_HELD_TOKEN = "heldToken";
const STORAGE_KEY_MODIFIED_CELLS = "modifiedCells";

// Load saved state
function loadGameState() {
  const savedPos = localStorage.getItem(STORAGE_KEY_PLAYER_POS);
  if (savedPos) {
    const { lat, lng } = JSON.parse(savedPos);
    playerLatLng = leaflet.latLng(lat, lng);
  }

  const savedToken = localStorage.getItem(STORAGE_KEY_HELD_TOKEN);
  if (savedToken) {
    heldToken = JSON.parse(savedToken);
  }

  const savedCells = localStorage.getItem(STORAGE_KEY_MODIFIED_CELLS);
  if (savedCells) {
    const cellsArray = JSON.parse(savedCells);
    cellsArray.forEach(([key, value]: [string, number]) => {
      modifiedCells.set(key, value);
    });
  }
}

// Save game state
function saveGameState() {
  localStorage.setItem(
    STORAGE_KEY_PLAYER_POS,
    JSON.stringify({ lat: playerLatLng.lat, lng: playerLatLng.lng }),
  );

  localStorage.setItem(STORAGE_KEY_HELD_TOKEN, JSON.stringify(heldToken));

  const cellsArray = Array.from(modifiedCells.entries());
  localStorage.setItem(STORAGE_KEY_MODIFIED_CELLS, JSON.stringify(cellsArray));
}

let heldToken: number | null = null;
let playerLatLng = CLASSROOM_LATLNG;

// Persistent memory for modified cells (Memento storage)
const modifiedCells = new Map<string, number>();

loadGameState();

//Setup Map Element
const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.appendChild(mapDiv);

// Create the map
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: ZOOM_LEVEL,
  minZoom: ZOOM_LEVEL,
  maxZoom: ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Status Panel
const statusPanel = document.createElement("div");
statusPanel.id = "statusPanel";
document.body.appendChild(statusPanel);

function updateStatus() {
  statusPanel.innerHTML = heldToken
    ? `🎒 Holding token: ${heldToken}${
      heldToken >= FINAL_TOKEN_VALUE
        ? " 🏆 You reached a sufficient token!"
        : ""
    }`
    : "👐 Hand: empty";
}

function updateCellLabel(label: leaflet.Marker, value: number) {
  label.setIcon(
    leaflet.divIcon({ className: "token-label", html: `<b>${value}</b>` }),
  );
}

const playerMarker = leaflet.marker(CLASSROOM_LATLNG).bindTooltip(
  "You are here",
).addTo(map);
map.setView(playerLatLng);

const useGPS = new URLSearchParams(location.search).get("gps") === "1";
console.log("GPS Mode:", useGPS);

let movementController = useGPS ? new GeoMovement() : new ButtonMovement();

function movePlayer(direction: string) {
  const delta = {
    north: [MOVE_STEP, 0],
    south: [-MOVE_STEP, 0],
    east: [0, MOVE_STEP],
    west: [0, -MOVE_STEP],
  } as Record<string, [number, number]>;

  const [dLat, dLng] = delta[direction] || [0, 0];
  playerLatLng = leaflet.latLng(
    playerLatLng.lat + dLat,
    playerLatLng.lng + dLng,
  );
}

function setupMovementCallbacks() {
  movementController.onMove?.((update: leaflet.LatLng | string) => {
    if (typeof update === "string") {
      movePlayer(update);
    } else if (update instanceof leaflet.LatLng) {
      playerLatLng = update;
    }

    playerMarker.setLatLng(playerLatLng);
    map.panTo(playerLatLng);
    refreshVisibleCells();
    saveGameState();
  });
}

setupMovementCallbacks();

// Handle GPS errors - fallback to button mode
movementController.onError?.((error) => {
  console.error("GPS Error Details:", {
    code: error.code,
    message: error.message,
    PERMISSION_DENIED: error.code === 1,
    POSITION_UNAVAILABLE: error.code === 2,
    TIMEOUT: error.code === 3,
  });

  // Stop GPS controller
  movementController.stop?.();

  // Switch to button movement
  movementController = new ButtonMovement();
  setupMovementCallbacks();
  movementController.start?.();

  // Update UI
  const toggleBtn = document.getElementById("toggleBtn") as HTMLButtonElement;
  if (toggleBtn) {
    toggleBtn.textContent = "🎮 Button Mode, click to switch to GPS";
  }

  // Show direction buttons
  const dirButtons = document.querySelectorAll(".dir-btn");
  dirButtons.forEach((btn) => {
    if (btn.id !== "toggleBtn" && btn.id !== "resetBtn") {
      (btn as HTMLElement).style.display = "block";
    }
  });

  // Hide Enable GPS button
  const startGPSButton = document.getElementById("start") as HTMLButtonElement;
  if (startGPSButton) {
    startGPSButton.style.display = "none";
  }

  // Alert user with specific error
  const errorMessages = {
    1: "Location permission denied. Please enable location access in your device settings.",
    2: "Location unavailable. Please check your device's location settings.",
    3: "Location request timed out. Please try again.",
  };
  alert(
    errorMessages[error.code as 1 | 2 | 3] || `GPS Error: ${error.message}`,
  );
});

// DON'T auto-start GPS mode
if (!useGPS) {
  console.log("Starting button movement mode");
  movementController.start?.();
} else {
  console.log("GPS mode - waiting for user to click Enable GPS button");
}

// Handle the "Enable GPS" button from index.html
const startGPSButton = document.getElementById("start") as HTMLButtonElement;

if (startGPSButton) {
  if (useGPS) {
    console.log("Enable GPS button found, setting up click handler");
    startGPSButton.style.display = "block";

    startGPSButton.addEventListener("click", () => {
      console.log("Enable GPS button clicked!");

      // Check if geolocation is supported
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
      }

      console.log("Starting GPS tracking from user gesture...");

      // Start GPS tracking (this is now inside a user gesture)
      movementController.start?.();

      // Hide the button after clicking
      startGPSButton.style.display = "none";
    });
  } else {
    // If not in GPS mode, hide the button immediately
    startGPSButton.style.display = "none";
  }
}

map.on("moveend", () => {
  refreshVisibleCells();
});

//Direction Buttons (N/S/E/W)
const controlPanel = document.createElement("div");
controlPanel.id = "controlPanel";
document.body.appendChild(controlPanel);

//TOGGLE BUTTON
const toggleBtn = document.createElement("button");
toggleBtn.id = "toggleBtn";
toggleBtn.textContent = movementController.isGPSBased?.()
  ? "📍 GPS Mode, click to switch to Button"
  : "🎮 Button Mode, click to switch to GPS";
toggleBtn.className = "dir-btn";
toggleBtn.style.width = "100%";
toggleBtn.style.marginBottom = "10px";
controlPanel.appendChild(toggleBtn);

toggleBtn.addEventListener("click", () => {
  console.log("Toggle button clicked");
  movementController.stop?.();

  if (movementController instanceof GeoMovement) {
    // Switching FROM GPS TO Button
    console.log("Switching to Button mode");
    movementController = new ButtonMovement();
    toggleBtn.textContent = "🎮 Button Mode, click to switch to GPS";

    const dirButtons = document.querySelectorAll(".dir-btn");
    dirButtons.forEach((btn) => {
      if (btn.id !== "toggleBtn" && btn.id !== "resetBtn") {
        (btn as HTMLElement).style.display = "block";
      }
    });

    if (startGPSButton) {
      startGPSButton.style.display = "none";
    }

    setupMovementCallbacks();
    movementController.start?.();
  } else {
    // Switching FROM Button TO GPS
    console.log("Switching to GPS mode");
    movementController = new GeoMovement();
    toggleBtn.textContent = "📍 GPS Mode, click to switch to Button";

    const dirButtons = document.querySelectorAll(".dir-btn");
    dirButtons.forEach((btn) => {
      if (btn.id !== "toggleBtn" && btn.id !== "resetBtn") {
        (btn as HTMLElement).style.display = "none";
      }
    });

    // Show the Enable GPS button so user can grant permission
    if (startGPSButton) {
      console.log("Showing Enable GPS button");
      startGPSButton.style.display = "block";
    }

    setupMovementCallbacks();
    // DON'T auto-start - wait for user to click "Enable GPS" button
  }
});

// Direction buttons
const directions = [
  ["N", "north"],
  ["S", "south"],
  ["E", "east"],
  ["W", "west"],
];

for (const [label, dir] of directions) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.className = "dir-btn";
  controlPanel.appendChild(btn);
  btn.addEventListener(
    "click",
    () => movementController.move?.(dir as "north" | "south" | "east" | "west"),
  );
}

// Reset button
const resetBtn = document.createElement("button");
resetBtn.id = "resetBtn";
resetBtn.textContent = "🔄 Reset Game";
resetBtn.className = "dir-btn";
resetBtn.style.marginTop = "10px";
controlPanel.appendChild(resetBtn);
resetBtn.addEventListener("click", () => {
  if (
    confirm(
      "Are you sure you want to reset the game? This will clear all progress.",
    )
  ) {
    localStorage.removeItem(STORAGE_KEY_PLAYER_POS);
    localStorage.removeItem(STORAGE_KEY_HELD_TOKEN);
    localStorage.removeItem(STORAGE_KEY_MODIFIED_CELLS);
    location.reload();
  }
});

// Initially hide direction buttons if in GPS mode
if (movementController instanceof GeoMovement) {
  const dirButtons = controlPanel.querySelectorAll(".dir-btn");
  dirButtons.forEach((btn) => {
    if (btn.id !== "toggleBtn" && btn.id !== "resetBtn") {
      (btn as HTMLElement).style.display = "none";
    }
  });
}

function cellKey(i: number, j: number): string {
  return `${i},${j}`;
}

// Dynamic cells
const visibleCells = new Map<
  string,
  { rect: leaflet.Rectangle; label: leaflet.Marker; value: number }
>();

//Helper: convert a latitude/longitude to a grid cell coordinate
function latLngToCell(lat: number, lng: number) {
  return {
    i: Math.floor(lat / TILE_DEGREES),
    j: Math.floor(lng / TILE_DEGREES),
  };
}

//Helper: convert a cell coordinate back to a bounding box in lat/lng
function cellToBounds(i: number, j: number) {
  return leaflet.latLngBounds([
    [i * TILE_DEGREES, j * TILE_DEGREES],
    [(i + 1) * TILE_DEGREES, (j + 1) * TILE_DEGREES],
  ]);
}

function cellToCenter(i: number, j: number): leaflet.LatLng {
  const bounds = cellToBounds(i, j);
  return bounds.getCenter();
}

//helper function for rect
function cellStyle(value: number) {
  if (value <= 0) return { color: COLOR_EMPTY, fillOpacity: 0.2 };
  if (value === 1) return { color: COLOR_TOKEN, fillOpacity: 0.6 };
  return { color: COLOR_MERGED_TOKEN, fillOpacity: 0.6 };
}

function spawnCell(i: number, j: number) {
  const key = cellKey(i, j);
  if (visibleCells.has(key)) return;

  const bounds = cellToBounds(i, j);

  let tokenValue: number;

  if (modifiedCells.has(key)) {
    tokenValue = modifiedCells.get(key)!;
  } else {
    const hasToken = luck(key) < TOKEN_PROBABILITY;
    tokenValue = hasToken ? 1 : 0;
  }

  const rect = leaflet.rectangle(bounds, {
    ...cellStyle(tokenValue),
    weight: 1,
  }).addTo(map);

  const label = leaflet.marker(cellToCenter(i, j), {
    icon: leaflet.divIcon({
      className: "token-label",
      html: `<b>${tokenValue}</b>`,
    }),
    interactive: false,
  }).addTo(map);

  // Interaction: pick up / combine token
  rect.on("click", () => {
    const { i: ci, j: cj } = latLngToCell(playerLatLng.lat, playerLatLng.lng);

    if (
      Math.abs(i - ci) > INTERACT_RADIUS || Math.abs(j - cj) > INTERACT_RADIUS
    ) return;

    let newValue = tokenValue;

    if (heldToken === null && tokenValue > 0) {
      heldToken = tokenValue;
      newValue = 0;
      updateCellLabel(label, 0);
      rect.setStyle({ color: COLOR_EMPTY, fillOpacity: 0.2 });
      modifiedCells.set(cellKey(i, j), newValue);
    } else if (heldToken !== null && tokenValue === heldToken) {
      newValue = tokenValue * 2;
      modifiedCells.set(cellKey(i, j), newValue);
      heldToken = null;
      updateCellLabel(label, newValue);
      rect.setStyle({ color: COLOR_MERGED_TOKEN, fillOpacity: 0.6 });
    }
    tokenValue = newValue;
    const old = visibleCells.get(key)!;
    visibleCells.set(key, { ...old, value: newValue });
    updateStatus();

    saveGameState();
  });

  visibleCells.set(key, { rect, label, value: tokenValue });
}

function refreshVisibleCells() {
  const mapCenter = map.getCenter();
  const { i: ci, j: cj } = latLngToCell(mapCenter.lat, mapCenter.lng);
  const RADIUS = WORLD_RADIUS;
  const newKeys = new Set<string>();

  for (let di = -RADIUS; di <= RADIUS; di++) {
    for (let dj = -RADIUS; dj <= RADIUS; dj++) {
      const i = ci + di;
      const j = cj + dj;
      const key = cellKey(i, j);
      newKeys.add(key);
      if (!visibleCells.has(key)) spawnCell(i, j);
    }
  }

  for (const key of visibleCells.keys()) {
    if (!newKeys.has(key)) {
      const { rect, label } = visibleCells.get(key)!;
      map.removeLayer(rect);
      map.removeLayer(label);
      visibleCells.delete(key);
    }
  }
}

//Inital Spawn
refreshVisibleCells();
updateStatus();
