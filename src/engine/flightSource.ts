/**
 * The swappable flight-data interface (the "socket" in socket-and-bulb).
 *
 * The engine only ever depends on this interface, never on a concrete data
 * source. Today the bulb is `mockFlightSource` (reads a hand-written JSON file);
 * tomorrow a real flight API can implement the same interface without the
 * ranking logic changing at all.
 */
import type { AirportCode, FlightEstimate } from './types';

export interface FlightDataSource {
  /**
   * Returns a round-trip estimate from `origin` to the destination identified
   * by `destinationCode`, or `null` when no route is known. The engine treats a
   * `null` as "this member can't reach this destination", which invalidates the
   * candidate for them.
   */
  getFlightEstimate(
    origin: AirportCode,
    destinationCode: string,
  ): FlightEstimate | null;
}
