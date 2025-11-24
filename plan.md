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
- [x] display token value in cell (text inside rectangle)
- [x] make clickable cells: pick up token if empty hand
- [x] if holding token, click matching cell to combine → new value
- [x] cells visible throughout entire world (but player can only interact with nearby)
- [x] game detects sufficent value (32)
- [x] 4 UI buttons for directions (N, S, E, W)
- [x] player’s position moves accordingly when direction buttons are clicked
- [x] detect map movement using `moveend` event to refresh visible cells
- [x] spawn/despawn cells dynamically to keep visible area full
- [x] use earth-spanning grid anchored at Null Island (0° lat, 0° lng)
- [x] implement helper functions to convert between lat/lng and cell coordinates
- [x] cells forget their state when leaving visible range (“memoryless” behavior)
- [x] increase victory condition to crafting a token of value 32
- [x] fix code smells as of D.3b
- [x] add `modifiedCells` Map to store user-modified cells (key = "i,j", value = tokenValue)
- [x] update `spawnCell` so it restores tokenValue from `modifiedCells` if present (otherwise use randomness/luck)
- [x] when player picks up a token, save modifiedCells.set(key, 0)
- [x] when player combines tokens, save modifiedCells.set(key, newValue)
- [x] ensure despawn does NOT delete entries from modifiedCells (so modified cells persist)
- [x] verify memoryless behavior for unmodified cells but persistence for modified cells
- [ ] refactoring D3.c: extract key creation cellKey(i, j) and use everywhere
- [x] add MovementFacade interface to decouple game from how player moves
- [x] implement ButtonMovement (adapter) that uses existing button controls (wrapper)
- [x] implement GeoMovement (adapter) that uses browser geolocation API (watchPosition)
- [x] add runtime toggle UI to switch between ButtonMovement and GeoMovement
- [x] hide movement details behind MovementFacade so rest of game uses only facade methods/events
- [x] persist game state (playerLatLng, heldToken, modifiedCells) to localStorage on every meaningful change
- [x] on load, restore game state from localStorage if present
- [x] provide a "New Game" control that clears stored state and resets map
- [x] ensure safe permission handling and fallback: if geolocation denied, fall back to ButtonMovement
