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
const INTERACT_RADIUS = 4;
const TOKEN_PROBABILITY = 0.3; // 30% chance of token in each cell
const WORLD_RADIUS = 20;
const FINAL_TOKEN_VALUE = 16;

// === Color Constants ===
const COLOR_TOKEN = "#4CAF50";
const COLOR_EMPTY = "#999";
const COLOR_COMBINED = "#c4dd38ff";

let heldToken: number | null = null;

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
leaflet.marker(CLASSROOM_LATLNG).bindTooltip("You are here").addTo(map);

// === Draw Grid of Cells Around world ===
for (let i = -WORLD_RADIUS; i <= WORLD_RADIUS; i++) {
  for (let j = -WORLD_RADIUS; j <= WORLD_RADIUS; j++) {
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
    const hasToken = luck([i, j].toString()) < TOKEN_PROBABILITY;
    let tokenValue = hasToken ? 1 : 0;

    // Visualize differently if it has a token
    const rect = leaflet.rectangle(bounds, {
      color: hasToken ? COLOR_TOKEN : COLOR_EMPTY,
      weight: 1,
      fillOpacity: hasToken ? 0.6 : 0.2,
    }).addTo(map);

    // Add token value text as a marker at center
    const center = bounds.getCenter();
    const label = leaflet.marker(center, {
      icon: leaflet.divIcon({
        className: "token-label",
        html: `<b>${tokenValue}</b>`,
      }),
      interactive: false, //label itself should not capture clicks
    }).addTo(map);

    // === Interaction: pick up token if hand empty ===
    rect.on("click", () => {
      if (Math.abs(i) > INTERACT_RADIUS || Math.abs(j) > INTERACT_RADIUS) {
        return; // too far, ignore click
      }

      if (heldToken === null && tokenValue > 0) {
        // === Pick up token if hand empty ===
        heldToken = tokenValue;
        tokenValue = 0;

        // update rectangle color
        rect.setStyle({ color: COLOR_EMPTY, fillOpacity: 0.2 });

        // update label to show 0
        updateCellLabel(label, tokenValue);
        updateStatus();
      } else if (heldToken !== null && tokenValue === heldToken) {
        // === Combine token with matchqing cell ===
        tokenValue = heldToken * 2; // double value
        heldToken = null; // hand is now empty

        // update rectangle color for a combined token
        rect.setStyle({ color: COLOR_COMBINED, fillOpacity: 0.6 });

        // update label to show new token value
        updateCellLabel(label, tokenValue);
        updateStatus();
      }
    });
  }
}

updateStatus();
