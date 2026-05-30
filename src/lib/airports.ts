/**
 * Home-airport options for the member dropdown.
 *
 * These codes must exist as origins in `data/destinations.json` so the engine
 * can price every member's flights. Keep the two in sync.
 * // TODO: post-v0 — replace with a real airport search backed by a flight API.
 */
export interface AirportOption {
  code: string;
  label: string;
}

export const AIRPORTS: AirportOption[] = [
  { code: 'NRT', label: 'Tokyo — Narita (NRT)' },
  { code: 'HND', label: 'Tokyo — Haneda (HND)' },
  { code: 'GRU', label: 'São Paulo — Guarulhos (GRU)' },
  { code: 'LHR', label: 'London — Heathrow (LHR)' },
  { code: 'FRA', label: 'Frankfurt (FRA)' },
  { code: 'JFK', label: 'New York — JFK' },
  { code: 'SYD', label: 'Sydney (SYD)' },
];

export const AIRPORT_LABELS: Record<string, string> = Object.fromEntries(
  AIRPORTS.map((a) => [a.code, a.label]),
);
