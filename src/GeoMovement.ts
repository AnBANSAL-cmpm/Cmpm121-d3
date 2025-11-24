import leaflet from "leaflet";
import { MovementFacade } from "./Movement.ts";

// GeoMovement translates device movement into game coordinates
export class GeoMovement implements MovementFacade {
  private watchId: number | null = null;
  private moveCb?: (latlng: leaflet.LatLng) => void;
  private errorCb?: (error: GeolocationPositionError) => void;
  private lastPos: GeolocationCoordinates | null = null;
  private sensitivity = 0.0001; // ~10m threshold

  isGPSBased(): boolean {
    return true;
  }

  onError(callback: (error: GeolocationPositionError) => void): void {
    this.errorCb = callback;
  }

  start() {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePositionUpdate(pos),
      (err) => {
        console.error("Geolocation error:", err);
        // ADD: Call error callback if permission denied
        if (this.errorCb) {
          this.errorCb(err);
        }
      },
      { enableHighAccuracy: true },
    );
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  onMove(callback: (latlng: leaflet.LatLng) => void) {
    this.moveCb = callback;
  }

  move(_direction: "north" | "south" | "east" | "west") {
    // No-op for geolocation movement - movement is automatic
  }

  private handlePositionUpdate(position: GeolocationPosition) {
    const coords = position.coords;

    // Create a new LatLng from the GPS coordinates
    const newLatLng = leaflet.latLng(coords.latitude, coords.longitude);

    if (!this.lastPos) {
      this.lastPos = coords;
      if (this.moveCb) {
        this.moveCb(newLatLng);
      }
      return;
    }

    // For subsequent positions, check if movement is significant
    const latDiff = Math.abs(coords.latitude - this.lastPos.latitude);
    const lonDiff = Math.abs(coords.longitude - this.lastPos.longitude);

    if (latDiff < this.sensitivity && lonDiff < this.sensitivity) {
      return; // Movement too small, ignore
    }

    this.lastPos = coords;

    // Notify listeners of the new position
    if (this.moveCb) {
      this.moveCb(newLatLng);
    }
  }
}
