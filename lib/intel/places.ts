/**
 * B2B-INTEL-001 · Stages 1 & 2 — Places API (New).
 *
 * Stage 1 "Find":   Text Search Pro sweeps a geo+industry boundary → Place IDs.
 * Stage 2 "Detail": Place Details Pro turns each Place ID into firmographics.
 *
 * Both stages are the cheap, broad top of the waterfall, so they run first and
 * gate everything downstream.
 */

import {
  PLACES_BASE_URL,
  TEXT_SEARCH_FIELD_MASK,
  PLACE_DETAILS_FIELD_MASK,
} from './config'
import type { PlaceSeed, PlaceDetails } from '@/lib/types/intel'

/** Injectable for tests; defaults to global fetch. */
export type Fetcher = typeof fetch

type AddressComponent = {
  longText?: string
  shortText?: string
  types?: string[]
}

function pickComponent(
  components: AddressComponent[] | undefined,
  type: string,
  field: 'longText' | 'shortText' = 'longText',
): string | null {
  const hit = components?.find((c) => c.types?.includes(type))
  return hit?.[field] ?? null
}

/* ───────────────────── Stage 1: Text Search Pro ────────────────── */

export async function textSearchSeeds(
  query: string,
  apiKey: string,
  opts: { limit?: number; fetcher?: Fetcher } = {},
): Promise<PlaceSeed[]> {
  const fetcher = opts.fetcher ?? fetch
  const res = await fetcher(`${PLACES_BASE_URL}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': TEXT_SEARCH_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: Math.min(opts.limit ?? 20, 20),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Places Text Search ${res.status}: ${body}`)
  }

  const json = (await res.json()) as {
    places?: { id?: string; displayName?: { text?: string } }[]
  }

  const seeds: PlaceSeed[] = []
  for (const p of json.places ?? []) {
    if (!p.id) continue
    seeds.push({ placeId: p.id, name: p.displayName?.text ?? p.id })
  }
  return opts.limit ? seeds.slice(0, opts.limit) : seeds
}

/* ──────────────────── Stage 2: Place Details Pro ───────────────── */

export async function placeDetails(
  placeId: string,
  apiKey: string,
  opts: { fetcher?: Fetcher } = {},
): Promise<PlaceDetails> {
  const fetcher = opts.fetcher ?? fetch
  const res = await fetcher(
    `${PLACES_BASE_URL}/places/${encodeURIComponent(placeId)}`,
    {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
      },
    },
  )

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Places Details ${res.status} for ${placeId}: ${body}`)
  }

  const raw: Record<string, unknown> = await res.json()
  return mapPlaceDetails(placeId, raw)
}

/** Pure mapper from a Places Details payload to our normalized shape. */
export function mapPlaceDetails(
  placeId: string,
  raw: Record<string, unknown>,
): PlaceDetails {
  const r = raw as {
    id?: string
    displayName?: { text?: string }
    formattedAddress?: string
    internationalPhoneNumber?: string
    nationalPhoneNumber?: string
    websiteUri?: string
    businessStatus?: string
    types?: string[]
    location?: { latitude?: number; longitude?: number }
    addressComponents?: AddressComponent[]
  }

  return {
    placeId: r.id ?? placeId,
    name: r.displayName?.text ?? placeId,
    formattedAddress: r.formattedAddress ?? null,
    phone: r.internationalPhoneNumber ?? r.nationalPhoneNumber ?? null,
    website: r.websiteUri ?? null,
    businessStatus: r.businessStatus ?? null,
    types: r.types ?? [],
    city:
      pickComponent(r.addressComponents, 'locality') ??
      pickComponent(r.addressComponents, 'postal_town'),
    province: pickComponent(
      r.addressComponents,
      'administrative_area_level_1',
      'shortText',
    ),
    country: pickComponent(r.addressComponents, 'country', 'shortText'),
    latitude: r.location?.latitude ?? null,
    longitude: r.location?.longitude ?? null,
    raw,
  }
}
