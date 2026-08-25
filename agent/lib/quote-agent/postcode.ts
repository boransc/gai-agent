import type { BusinessConfig, PostcodeLookupResult } from "./types";

/**
 * postcodes.io response shapes, verified against the live API:
 *   GET /postcodes/CR01AA -> 200 { status, result: { latitude, longitude, ... } }
 *   GET /postcodes/ZZ99ZZ -> 404 { status: 404, error: "Postcode not found" }
 * A malformed postcode and a non-existent one both surface as a 404, so a
 * single "invalid_postcode" path covers each.
 */
interface PostcodesIoResult {
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  admin_district: string | null;
  region: string | null;
}

const POSTCODES_IO = "https://api.postcodes.io/postcodes";

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance. This is straight-line, not road distance — road
 * mileage will run longer, which is why the surcharge band is treated as
 * "borderline, ask a human" rather than a precise cutoff.
 */
export function distanceInMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

async function resolvePostcode(
  postcode: string,
): Promise<PostcodesIoResult | null> {
  const normalised = postcode.replace(/\s+/g, "").toUpperCase();
  if (!normalised) return null;

  const response = await fetch(
    `${POSTCODES_IO}/${encodeURIComponent(normalised)}`,
    { headers: { accept: "application/json" } },
  );

  // 404 covers both "malformed" and "no such postcode".
  if (!response.ok) return null;

  const body = (await response.json()) as { result?: PostcodesIoResult };
  const result = body.result;
  if (!result || result.latitude === null || result.longitude === null) {
    return null;
  }
  return result;
}

/** Resolved once per process — the business's origin never changes mid-session. */
const baseCache = new Map<string, { latitude: number; longitude: number }>();

async function resolveBase(config: BusinessConfig) {
  const cached = baseCache.get(config.basePostcode);
  if (cached) return cached;

  const base = await resolvePostcode(config.basePostcode);
  if (!base || base.latitude === null || base.longitude === null) {
    throw new Error(
      `Business base postcode "${config.basePostcode}" could not be resolved; check the business configuration.`,
    );
  }
  const coords = { latitude: base.latitude, longitude: base.longitude };
  baseCache.set(config.basePostcode, coords);
  return coords;
}

/**
 * Tool 1 of 3. Resolves a customer postcode and measures it against the
 * configured service area. Distances and radii come from config only.
 */
export async function lookupPostcode(
  postcode: string,
  config: BusinessConfig,
): Promise<PostcodeLookupResult> {
  const resolved = await resolvePostcode(postcode);
  if (!resolved || resolved.latitude === null || resolved.longitude === null) {
    return { status: "invalid_postcode", postcode };
  }

  const base = await resolveBase(config);
  const distanceMiles =
    Math.round(
      distanceInMiles(base, {
        latitude: resolved.latitude,
        longitude: resolved.longitude,
      }) * 10,
    ) / 10;

  const inServiceArea = distanceMiles <= config.serviceRadiusMiles;
  const withinFreeRadius = distanceMiles <= config.freeRadiusMiles;

  return {
    status: "resolved",
    postcode: resolved.postcode,
    location: resolved.admin_district ?? resolved.postcode,
    region: resolved.region ?? "",
    latitude: resolved.latitude,
    longitude: resolved.longitude,
    distanceMiles,
    inServiceArea,
    withinFreeRadius,
    borderline: inServiceArea && !withinFreeRadius,
  };
}
