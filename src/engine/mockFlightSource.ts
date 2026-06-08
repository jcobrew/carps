/**
 * The mock "bulb" plugged into the FlightDataSource socket.
 *
 * Reads the hand-curated `data/destinations.json` and answers flight-estimate
 * queries by indexing it. A future real-API source would implement the same
 * `FlightDataSource` interface and the engine would not change.
 */
import destinationsData from '../../data/destinations.json';
import type { Destination, FlightEstimate, AirportCode } from './types';

export const destinations: Destination[] = destinationsData as Destination[];

/** Fast lookup: destinationCode -> Destination. */
const byCode = new Map<string, Destination>(
  destinations.map((d) => [d.code, d]),
);

import type { FlightDataSource } from './flightSource';

export const mockFlightSource: FlightDataSource = {
  getFlightEstimate(
    origin: AirportCode,
    destinationCode: string,
  ): FlightEstimate | null {
    const dest = byCode.get(destinationCode);
    if (!dest) return null;
    return dest.flights[origin] ?? null;
  },
};

/** All origin airport codes that appear in the mock data (deduped, sorted). */
export const knownOrigins: AirportCode[] = Array.from(
  new Set(destinations.flatMap((d) => Object.keys(d.flights))),
).sort();
