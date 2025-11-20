// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function
import luck from "./_luck.ts";

// FIXED: Import GeoMovement from the correct file
import { GeoMovement } from "./GeoMovement.ts";
import { ButtonMovement } from "./Movement.ts";

// === Constants ===
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);
const ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4; //about 10 meters
const INTERACT_RADIUS = 4;
const TOKEN_PROBABILITY = 0.3; // 30% chance of token in each cell
const WORLD_RADIUS = 20;
const FINAL_TOKEN_VALUE = 32;

// === Color Constants ===
const COLOR_TOKEN = "#4CAF50";
const COLOR_EMPTY = "#999";
const COLOR_COMBINED = "#c4dd38ff";
const MOVE_STEP = TILE_DEGREES; // how much to move per button press

let heldToken: number | null = null;
let playerLatLng = CLASSROOM_LATLNG;

// === Setup Map Element ===
const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.appendChild(mapDiv);

// Create the map (element with id "map" is defined in index.html)
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

//UI Elements
const statusPanel = document.createElement("div");
statusPanel.id = "statusPanel";
document.body.appendChild(statusPanel);

function updateStatus() {
  // Display hand status and goal achievement
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

// Add a marker to represent the player
const playerMarker = leaflet.marker(CLASSROOM_LATLNG).bindTooltip(
  "You are here",
).addTo(map);

const useGPS = new URLSearchParams(location.search).get("gps") === "1";
const movementController = useGPS ? new GeoMovement() : new ButtonMovement();

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

movementController.onMove?.((update: leaflet.LatLng | string) => {
  if (typeof update === "string") {
    // Button movement - update is a direction string
    movePlayer(update);
  } else if (update instanceof leaflet.LatLng) {
    // GPS movement - update is already a LatLng
    playerLatLng = update;
  }

  playerMarker.setLatLng(playerLatLng);
  map.panTo(playerLatLng);
  refreshVisibleCells();
});

// FIXED: Start movement controller
movementController.start?.();

map.on("moveend", () => {
  refreshVisibleCells();
});

//Direction Buttons (N/S/E/W)
const controlPanel = document.createElement("div");
controlPanel.id = "controlPanel";
document.body.appendChild(controlPanel);

if (useGPS) {
  controlPanel.style.display = "none";
}

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

function cellKey(i: number, j: number): string {
  return `${i},${j}`;
}

// === Persistent memory for modified cells (Memento storage) ===
const modifiedCells = new Map<string, number>();

// === Dynamic cells ===
const visibleCells = new Map<
  string,
  { rect: leaflet.Rectangle; label: leaflet.Marker; value: number }
>();

// === Helper: convert a latitude/longitude to a grid cell coordinate ===
function latLngToCell(lat: number, lng: number) {
  return {
    i: Math.floor(lat / TILE_DEGREES),
    j: Math.floor(lng / TILE_DEGREES),
  };
}

// === Helper: convert a cell coordinate back to a bounding box in lat/lng ===
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
  return { color: COLOR_COMBINED, fillOpacity: 0.6 }; // combined cells
}

function spawnCell(i: number, j: number) {
  const key = cellKey(i, j);
  if (visibleCells.has(key)) return;

  const bounds = cellToBounds(i, j);

  let tokenValue: number;

  // Procedurally generate default state

  if (modifiedCells.has(key)) {
    // Restore saved state
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

  // === Interaction: pick up / combine token ===
  rect.on("click", () => {
    const { i: ci, j: cj } = latLngToCell(playerLatLng.lat, playerLatLng.lng);

    if (
      Math.abs(i - ci) > INTERACT_RADIUS || Math.abs(j - cj) > INTERACT_RADIUS
    ) return;

    let newValue = tokenValue;

    // ---- PICK UP TOKEN ----
    if (heldToken === null && tokenValue > 0) {
      heldToken = tokenValue;
      newValue = 0;
      updateCellLabel(label, 0);
      rect.setStyle({ color: COLOR_EMPTY, fillOpacity: 0.2 });

      // Save modified state
      modifiedCells.set(cellKey(i, j), newValue);
    } // ---- COMBINE TOKEN ----
    else if (heldToken !== null && tokenValue === heldToken) {
      // Combine tokens
      newValue = tokenValue * 2;
      modifiedCells.set(cellKey(i, j), newValue);
      heldToken = null;
      updateCellLabel(label, newValue);
      rect.setStyle({ color: COLOR_COMBINED, fillOpacity: 0.6 });
    }
    tokenValue = newValue;
    // ---- SAVE THE UPDATED VALUE ----
    const old = visibleCells.get(key)!;
    visibleCells.set(key, { ...old, value: newValue });
    updateStatus();
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

  // Despawn cells that leave visible range (forget their state), but does not delete from modifiedCells
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
