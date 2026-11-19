
"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Incident = {
  id: string;
  title: string;
  road: string;
  status: string;
  start: string;
  end: string;
  lat: number;
  lng: number;
  detail: string;
};

export default function TrafficMap({
  incidents,
  selected,
  onSelect,
}: {
  incidents: Incident[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || mapRef.current) return;

    const map = L.map(container).setView(
      [37.5665, 126.9780],
      11
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    ).addTo(map);

    const markers = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersRef.current = markers;

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      markersRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const markers = markersRef.current;

    if (!markers) return;

    markers.clearLayers();

    incidents.forEach((item) => {
      const isSelected = selected === item.id;
      const isPlanned = item.status === "통제 예정";

      const marker = L.circleMarker(
        [item.lat, item.lng],
        {
          radius: isSelected ? 11 : 8,
          color: isPlanned ? "#d58b32" : "#e45151",
          fillColor: isPlanned ? "#f2ae53" : "#ef6262",
          fillOpacity: 0.9,
          weight: isSelected ? 4 : 2,
        }
      );

      const popup = document.createElement("div");
      const road = document.createElement("b");

      road.textContent = item.road;

      popup.append(
        road,
        document.createElement("br"),
        document.createTextNode(item.title),
        document.createElement("br"),
        document.createTextNode(
          `${item.start.slice(11, 16)}–${item.end.slice(11, 16)}`
        ),
        document.createElement("br"),
        document.createTextNode(item.detail)
      );

      marker
        .bindPopup(popup)
        .on("click", () => onSelect(item.id))
        .addTo(markers);
    });
  }, [incidents, selected, onSelect]);

  return (
    <div
      ref={containerRef}
      className="map"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
