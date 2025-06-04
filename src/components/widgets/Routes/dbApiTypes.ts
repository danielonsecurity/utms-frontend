export interface FPTFLocation {
  type: "location" | "stop" | "station";
  id: string;
  name?: string;
  address?: string;
  longitude?: number;
  latitude?: number;
  // products?: Record<string, boolean>;
}

export interface FPTFStop extends FPTFLocation {
  // Specific properties for stops/stations if needed beyond FPTFLocation
}

export interface FPTFLine {
  type: "line";
  id: string;
  fahrtNr?: string;
  name?: string;
  mode?:
    | "train"
    | "bus"
    | "watercraft"
    | "taxi"
    | "gondola"
    | "aircraft"
    | "car"
    | "bicycle"
    | "walking"
    | string;
  product?: string; // e.g., 'suburban', 'regional', 'long-distance'
  operator?: { id: string; name: string; type: "operator" };
  // ...
}

export interface FPTFDepartureArrival {
  tripId: string;
  stop: FPTFStop;
  when: string | null; // Actual time ISO8601
  plannedWhen: string | null; // Planned time ISO8601
  delay: number | null; // In seconds
  platform: string | null;
  plannedPlatform: string | null;
  line?: FPTFLine;
  direction?: string;
  currentTripPosition?: FPTFLocation; // If available
  remarks?: FPTFRemark[];
  cancelled?: boolean;
  // origin?: FPTFStop | FPTFLocation | null;
  // destination?: FPTFStop | FPTFLocation | null;
}

export interface FPTFRemark {
  type: "remark";
  code?: string;
  summary?: string;
  text: string;
  // ...
}

// Response from /locations endpoint
export type LocationsResponse = FPTFLocation[]; // It's typically an array of locations/stops

export interface DeparturesResponse {
  departures: FPTFDepartureArrival[];
  realtimeDataUpdatedAt?: number | null; // Or string if it's an ISO timestamp
}

// Available profiles for the widget config - from api.js of db-vendo-client
export const TRANSPORTATION_API_PROFILES = [
  { value: "db", label: "DB (Balanced)" },
  { value: "dbnav", label: "DB Navigator (Stable)" },
  { value: "dbweb", label: "Bahn.de (Web)" },
  { value: "dbbahnhof", label: "Bahnhofstafel (Boards)" },
  // 'dbris' needs API key from its docs, 'dbregioguide' less common for general departures
];

export const API_BASE_URL = "http://localhost:3001"; // Your Dockerized API

import {
  FPTFLocation,
  FPTFStop,
  FPTFLine,
  FPTFRemark,
} from "../Routes/dbApiTypes";

export interface FPTFLeg {
  // A leg of a journey
  tripId?: string;
  origin: FPTFStop | FPTFLocation;
  destination: FPTFStop | FPTFLocation;
  departure: string | null; // ISO8601
  plannedDeparture: string | null;
  departureDelay: number | null; // seconds
  departurePlatform?: string | null;
  arrival: string | null; // ISO8601
  plannedArrival: string | null;
  arrivalDelay: number | null; // seconds
  arrivalPlatform?: string | null;
  line?: FPTFLine;
  direction?: string;
  walking?: boolean; // if it's a walking leg
  distance?: number; // for walking legs
  remarks?: FPTFRemark[];
  // ... and more from FPTF
}

export interface FPTFJourney {
  type: "journey";
  id?: string; // Optional journey ID
  legs: FPTFLeg[];
  remarks?: FPTFRemark[];
  price?: { amount: number; currency: string; hint?: string }; // If available
  // refreshToken?: string; // For refreshJourney
}

// Response from /journeys endpoint
export interface JourneysResponse {
  journeys: FPTFJourney[];
  realtimeDataUpdatedAt?: number | null;
  // refreshToken?: string; // For refreshing the whole set of journeys
}

// Config for favorite stations can be reused
export interface FavoriteStationRouteConfig {
  // Same as FavoriteStationConfig for Departures
  id: string;
  name: string;
}

export interface RoutesWidgetConfig {
  name: string;
  fromStation: { id: string; name: string } | null; // Store both ID and name for display
  toStation: { id: string; name: string } | null;
  resultsCount: number;
  refreshIntervalSeconds: number;
}
