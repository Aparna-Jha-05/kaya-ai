export type Coordinate = [latitude: number, longitude: number];

export type RouteState =
  | { status: "loading" }
  | { status: "ready"; distanceMeters: number; durationSeconds: number }
  | { status: "unavailable"; message: string };

// These coordinates are deliberately demo-only. They make the interactive map
// testable without implying that a supplier location has been verified.
export const PROJECT_SITE = {
  label: "Project site",
  coordinate: [13.0067, 80.244] as Coordinate,
  provenance: "Demo project coordinate",
};

export const SUPPLIER_LOCATIONS: Record<
  string,
  { coordinate: Coordinate; provenance: string }
> = {
  A: {
    coordinate: [13.0827, 80.2707],
    provenance: "Demo supplier coordinate — verification pending",
  },
  B: {
    coordinate: [12.9716, 80.2207],
    provenance: "Demo supplier coordinate — verification pending",
  },
  C: {
    coordinate: [13.0475, 80.2087],
    provenance: "Demo supplier coordinate — verification pending",
  },
};

export const OSM_TILE_URL =
  process.env.NEXT_PUBLIC_OSM_TILE_URL ??
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export const OSM_TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_OSM_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const OSRM_ROUTE_URL =
  process.env.NEXT_PUBLIC_OSRM_ROUTE_URL ?? "https://router.project-osrm.org";
