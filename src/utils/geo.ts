export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Calculates straight-line distance in kilometers using the Haversine formula
 */
export function calculateHaversineDistance(
  coord1: LatLng,
  coord2: LatLng
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Estimates realistic road driving distance in kilometers
 * In Bulacan roads & MacArthur Hwy, road distance is on average ~1.30x straight-line distance.
 */
export function estimateRoadDistance(coord1: LatLng, coord2: LatLng): number {
  const straightLine = calculateHaversineDistance(coord1, coord2);
  const roadFactor = 1.30;
  return Math.round(straightLine * roadFactor * 10) / 10;
}

/**
 * Estimates travel time for a motorcycle delivery in Bulacan traffic
 * Average motorcycle speed ~28 km/h plus 2 minutes road buffer
 */
export function estimateTravelTimeMinutes(distanceKm: number): number {
  const speedKmh = 24; // typical motorcycle delivery average speed
  const travelMinutes = (distanceKm / speedKmh) * 60;
  const bufferMinutes = 2.5;
  return Math.max(3, Math.round(travelMinutes + bufferMinutes));
}

/**
 * Solves Nearest-Neighbor sequence for multiple delivery points starting from current point
 */
export function optimizeRouteSequence<T extends { location: LatLng }>(
  startLocation: LatLng,
  destinations: T[]
): { item: T; distanceKm: number; etaMinutes: number; cumulativeDistanceKm: number }[] {
  if (destinations.length === 0) return [];

  const unvisited = [...destinations];
  const orderedResult: {
    item: T;
    distanceKm: number;
    etaMinutes: number;
    cumulativeDistanceKm: number;
  }[] = [];

  let current = startLocation;
  let cumulativeDist = 0;

  while (unvisited.length > 0) {
    let bestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = estimateRoadDistance(current, unvisited[i].location);
      if (dist < minDistance) {
        minDistance = dist;
        bestIndex = i;
      }
    }

    const nextStop = unvisited.splice(bestIndex, 1)[0];
    cumulativeDist += minDistance;
    orderedResult.push({
      item: nextStop,
      distanceKm: minDistance,
      etaMinutes: estimateTravelTimeMinutes(minDistance),
      cumulativeDistanceKm: Math.round(cumulativeDist * 10) / 10,
    });

    current = nextStop.location;
  }

  return orderedResult;
}

/**
 * Open external Google Maps navigation
 */
export function getGoogleMapsNavigationUrl(
  destination: LatLng,
  origin?: LatLng
): string {
  if (origin) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`;
}

/**
 * Generates an SVG or Leaflet friendly format
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} mins`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}
