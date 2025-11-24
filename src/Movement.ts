import leaflet from "leaflet";

// === Facade interface ===
export interface MovementFacade {
  start?(): void; // start background tracking
  stop?(): void; // stop background tracking
  move?(direction: "north" | "south" | "east" | "west"): void; // optional programmatic move
  onMove?(callback: (latlng: leaflet.LatLng | string) => void): void; // subscribe to movement events
  isGPSBased?(): boolean;
  onError?(callback: (error: GeolocationPositionError) => void): void;
}

// === Button adapter ===
export class ButtonMovement implements MovementFacade {
  private moveCb?: (latlng: leaflet.LatLng | string) => void;
  private MOVE_STEP = 1e-4; // Same as TILE_DEGREES

  isGPSBased(): boolean {
    return false;
  }

  onError(_callback: (error: GeolocationPositionError) => void): void {
    // No-op for button movement - buttons don't have permission errors
  }

  move(direction: "north" | "south" | "east" | "west") {
    // Don't call external functions - just notify via callback
    // The actual movement logic will be in main.ts
    if (this.moveCb) {
      // Pass the direction as part of the callback
      this.moveCb(direction as leaflet.LatLng | string);
    }
  }

  onMove(callback: (latlng: leaflet.LatLng | string) => void) {
    this.moveCb = callback;
  }

  start() {
  }

  stop() {
  }
}
