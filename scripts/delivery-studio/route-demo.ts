/**
 * Public OSRM demonstration endpoint is used on explicit test action only.
 * It is NOT suitable for a real checkout, is best-effort, and must be
 * replaced with a contracted routing service before commercial operation.
 * Only approximate CEP coordinates are sent (no names or full addresses).
 */
import type { Coordinates, StoreId } from "@/lib/delivery";

export type RoadRoute = { storeId: StoreId; km: number; minutes: number };

function valid(point: Coordinates) {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180 &&
    !(point.latitude === 0 && point.longitude === 0);
}

export async function calculateDemoRoadRoutes(
  stores: { id: StoreId; coordinates: Coordinates }[],
  destination: Coordinates,
  signal?: AbortSignal,
): Promise<RoadRoute[]> {
  if (!valid(destination) || stores.length === 0 ||
      stores.length > 2 || stores.some((store) => !valid(store.coordinates))) {
    throw new Error("Coordenadas não disponíveis para esta simulação.");
  }
  const positions = [...stores.map((s) => s.coordinates), destination];
  const coord = positions.map(p => [p.longitude, p.latitude].join(",")).join(";");
  const sources = stores.map((_, i) => i).join(";");
  const url = "https://router.project-osrm.org/table/v1/driving/" + coord +
    "?sources=" + sources + "&destinations=" + stores.length +
    "&annotations=distance,duration";
  const deadline = AbortSignal.timeout(9000);
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const response = await fetch(url, { signal: combined, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("O serviço de rotas não respondeu.");
  const result: unknown = await response.json();
  if (!result || typeof result !== "object") throw new Error("Resposta de rota inválida.");
  const data = result as { code?: unknown; distances?: unknown; durations?: unknown };
  if (data.code !== "Ok" || !Array.isArray(data.distances) || !Array.isArray(data.durations)) {
    throw new Error("Não foi possível determinar rotas para esse CEP.");
  }
  const distances = data.distances as unknown[][];
  const durations = data.durations as unknown[][];
  const routes = stores.flatMap(({ id }, i) => {
    const distance = Array.isArray(distances[i]) ? distances[i][0] : null;
    const duration = Array.isArray(durations[i]) ? durations[i][0] : null;
    if (typeof distance !== "number" || !Number.isFinite(distance) || distance < 0 ||
        typeof duration !== "number" || !Number.isFinite(duration) || duration < 0) return [];
    return [{ storeId: id, km: Math.round(distance) / 1000, minutes: Math.ceil(duration / 60) }];
  });
  if (routes.length === 0) throw new Error("Não existe rota disponível para esse CEP.");
  return routes;
}
