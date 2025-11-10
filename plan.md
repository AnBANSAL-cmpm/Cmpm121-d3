# D3: World of Bits

## Game Design Vision

A 2048-style game played on a world map. Collect and combine tokens on a lat/lng grid. Win by crafting 32.

## Technologies

- TypeScript + Deno + Vite
- Leaflet for maps
- Deterministic hashing for cell state
- GitHub Actions + Pages for deployment

## Assignments

## D3.a: Core Mechanics (token collecting and crafting)

**Goal:** Player can collect and craft tokens up to 32 on a map.

Key technical challenge: Can you assemble a map-based user interface using the Leaflet mapping framework?
Key gameplay challenge: Can players collect and craft tokens from nearby locations to finally make one of sufficiently high value?

### Steps

- [x] create new GitHub repo from template
- [x] Run locally on Github Codespaces
- [x] create a plan.md
- [x] read and understand starter code in main.ts
- [x] copy main.ts into a reference.ts
- [x] delete main.ts
- [x] initialize Leaflet map centered on classroom (lat: 37.?, lng: -122.?)
- [x] draw player’s location on map
- [x] define grid cell size (e.g., 0.0001°)
- [x] draw one cell at player location
- [x] loop to draw 5x5 grid of cells around player
- [x] use deterministic hash to decide if cell has token (value 1 or 0)
- [ ] display token value in cell (text inside rectangle)
- [ ] make clickable cells: pick up token if empty hand
- [ ] if holding token, click matching cell to combine → new value
