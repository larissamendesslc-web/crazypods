import { useEffect, useRef, useState } from "react";
// A minimal browser-only type boundary avoids importing a map library during SSR.
type Point = { lat: number; lng: number };
type MapInstance = { panTo: (p: Point) => void };
type MarkerInstance = { setPosition: (p: Point) => void; setMap: (m: MapInstance | null) => void };
type MapsApi = { Map: new (el: HTMLElement, opts: object) => MapInstance; Marker: new (opts: object) => MarkerInstance };
declare global { interface Window { google?: { maps: MapsApi }; crazyTrackingMapReady?: () => void } }
let loading: Promise<MapsApi> | undefined;
function loadMap(): Promise<MapsApi> {
  if (window.google?.maps.Map) return Promise.resolve(window.google.maps);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
    if (!key) { reject(new Error("Mapa indisponível: conexão Google Maps não configurada.")); return; }
    window.crazyTrackingMapReady = () => { if (window.google?.maps) resolve(window.google.maps); else reject(new Error("Não foi possível abrir o mapa.")); };
    const script = document.createElement("script");
    const params = new URLSearchParams({ key, loading: "async", callback: "crazyTrackingMapReady", channel: import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] ?? "", language: "pt-BR", region: "BR" });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true; script.onerror = () => { loading = undefined; reject(new Error("Não foi possível carregar o mapa.")); };
    document.head.appendChild(script);
  });
  return loading;
}
export default function TrackingMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const marker = useRef<MarkerInstance | null>(null);
  const position = useRef({ lat: latitude, lng: longitude });
  position.current = { lat: latitude, lng: longitude };
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    loadMap().then((api) => {
      if (cancelled || !container.current) return;
      map.current = new api.Map(container.current, { center: position.current, zoom: 16, clickableIcons: false, mapTypeControl: false, streetViewControl: false, internalUsageAttributionIds: ["gmp_lovable_agentskills_v1"] });
      marker.current = new api.Marker({ map: map.current, position: position.current, title: "Motoboy" });
    }).catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : "Mapa indisponível"); });
    return () => { cancelled = true; marker.current?.setMap(null); marker.current = null; map.current = null; };
  }, []);
  useEffect(() => { marker.current?.setPosition(position.current); map.current?.panTo(position.current); }, [latitude, longitude]);
  return error ? <p className="border-y py-6 text-sm text-muted-foreground" role="alert">{error}</p> : <div ref={container} className="h-80 w-full overflow-hidden rounded-lg border sm:h-96" aria-label="Localização do motoboy no mapa" />;
}