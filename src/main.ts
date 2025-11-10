// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function
import luck from "./_luck.ts";

// === Constants ===
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);
const ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4; //about 10 meters
const GRID_RADIUS = 2; // 5x5 grid
const TOKEN_PROBABILITY = 0.3; // 30% chance of token in each cell

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

// Add a marker to represent the player
const playerMarker = leaflet.marker(CLASSROOM_LATLNG);
playerMarker.bindTooltip("You are here");
playerMarker.addTo(map);

// === Draw 5x5 Grid of Cells Around Player ===
for (let i = -GRID_RADIUS; i <= GRID_RADIUS; i++) {
  for (let j = -GRID_RADIUS; j <= GRID_RADIUS; j++) {
    const bounds = leaflet.latLngBounds([
      [
        CLASSROOM_LATLNG.lat + i * TILE_DEGREES,
        CLASSROOM_LATLNG.lng + j * TILE_DEGREES,
      ],
      [
        CLASSROOM_LATLNG.lat + (i + 1) * TILE_DEGREES,
        CLASSROOM_LATLNG.lng + (j + 1) * TILE_DEGREES,
      ],
    ]);

    // Deterministic token assignment
    const chance = luck([i, j].toString());
    const hasToken = chance < TOKEN_PROBABILITY;

    // Visualize differently if it has a token
    const rect = leaflet.rectangle(bounds, {
      color: hasToken ? "#3388ff" : "#999",
      weight: 1,
      fillOpacity: hasToken ? 0.6 : 0.2,
    });
    rect.addTo(map);
    rect.bindTooltip(`Cell (${i}, ${j}) — token: ${hasToken ? "1" : "0"}`);
  }
}
