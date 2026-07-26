"use client";

import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  ScaleControl,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { BIDS } from "@/lib/mockData";
import {
  OSM_TILE_ATTRIBUTION,
  OSM_TILE_URL,
  OSRM_ROUTE_URL,
  PROJECT_SITE,
  SUPPLIER_LOCATIONS,
  type Coordinate,
  type RouteState,
} from "@/lib/mapData";

type SupplierMapCanvasProps = {
  selectedId: string;
  onSelect: (id: string) => void;
  onRouteStateChange: (state: RouteState) => void;
};

type OsrmRouteResponse = {
  code: string;
  message?: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: { coordinates?: [number, number][] };
  }>;
};

function routeUrl(origin: Coordinate, destination: Coordinate) {
  const [originLatitude, originLongitude] = origin;
  const [destinationLatitude, destinationLongitude] = destination;
  const coordinates = `${originLongitude},${originLatitude};${destinationLongitude},${destinationLatitude}`;
  return `${OSRM_ROUTE_URL.replace(/\/$/, "")}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`;
}

function RouteBounds({ positions }: { positions: Coordinate[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length < 2) return;
    map.fitBounds(positions as LatLngBoundsExpression, { padding: [28, 28], animate: true });
  }, [map, positions]);

  return null;
}

function RoadRoute({
  supplierId,
  onRouteStateChange,
}: {
  supplierId: string;
  onRouteStateChange: (state: RouteState) => void;
}) {
  const [positions, setPositions] = useState<Coordinate[]>([]);
  const location = SUPPLIER_LOCATIONS[supplierId];

  useEffect(() => {
    const controller = new AbortController();
    setPositions([]);
    onRouteStateChange({ status: "loading" });

    async function loadRoadRoute() {
      try {
        const response = await fetch(routeUrl(location.coordinate, PROJECT_SITE.coordinate), {
          signal: controller.signal,
        });
        const payload = (await response.json()) as OsrmRouteResponse;
        const route = payload.code === "Ok" ? payload.routes?.[0] : undefined;
        const coordinates = route?.geometry?.coordinates;

        if (!response.ok || !route || !coordinates || coordinates.length < 2) {
          throw new Error(payload.message || "No drivable road route was returned.");
        }

        const roadPositions = coordinates.map(([longitude, latitude]) => [latitude, longitude] as Coordinate);
        setPositions(roadPositions);
        onRouteStateChange({
          status: "ready",
          distanceMeters: route.distance,
          durationSeconds: route.duration,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Road routing is unavailable.";
        setPositions([]);
        onRouteStateChange({ status: "unavailable", message });
      }
    }

    void loadRoadRoute();
    return () => controller.abort();
  }, [location, onRouteStateChange]);

  if (positions.length < 2) return null;

  return (
    <>
      <Polyline positions={positions} pathOptions={{ color: "#38BDF8", weight: 4, opacity: 0.9 }} />
      <RouteBounds positions={positions} />
    </>
  );
}

export default function SupplierMapCanvas({
  selectedId,
  onSelect,
  onRouteStateChange,
}: SupplierMapCanvasProps) {
  const selectedLocation = SUPPLIER_LOCATIONS[selectedId];

  return (
    <MapContainer
      center={selectedLocation.coordinate}
      zoom={11}
      scrollWheelZoom
      className="h-full w-full"
      aria-label="Supplier locations and road route to the project site"
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_TILE_ATTRIBUTION} maxZoom={19} />
      <ScaleControl imperial={false} />
      <CircleMarker
        center={PROJECT_SITE.coordinate}
        radius={8}
        pathOptions={{ color: "#F8FAFC", fillColor: "#818CF8", fillOpacity: 1, weight: 2 }}
      >
        <Tooltip direction="top" offset={[0, -8]}>Project site</Tooltip>
        <Popup>
          <strong>{PROJECT_SITE.label}</strong>
          <br />
          {PROJECT_SITE.provenance}
        </Popup>
      </CircleMarker>
      {BIDS.map((bid) => {
        const isSelected = bid.id === selectedId;
        return (
          <CircleMarker
            key={bid.id}
            center={SUPPLIER_LOCATIONS[bid.id].coordinate}
            radius={isSelected ? 9 : 6}
            eventHandlers={{ click: () => onSelect(bid.id) }}
            pathOptions={{
              color: "#090D16",
              fillColor: isSelected ? "#38BDF8" : "#60A5FA",
              fillOpacity: isSelected ? 1 : 0.72,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>{bid.vendor}</Tooltip>
            <Popup>
              <strong>{bid.vendor}</strong>
              <br />
              {SUPPLIER_LOCATIONS[bid.id].provenance}
            </Popup>
          </CircleMarker>
        );
      })}
      <RoadRoute supplierId={selectedId} onRouteStateChange={onRouteStateChange} />
    </MapContainer>
  );
}
