export interface Location {
  latitude: number;
  longitude: number;
}

export interface TransitStop {
  id: string;
  name: string;
  code?: string;
  location: Location;
  distance: number; // in meters
}

export interface Route {
  id: string;
  shortName: string;
  longName: string;
  type: 'bus' | 'train' | 'ferry';
  color?: string;
  textColor?: string;
}

export interface Departure {
  routeId: string;
  route: Route;
  stopId: string;
  stop: TransitStop;
  scheduledTime: Date;
  realTimeTime?: Date;
  delay?: number; // in minutes
  headsign: string;
  walkingTimeToStop: number; // in minutes
}

export interface UserSettings {
  radius: number; // in meters, default 500
  timeWindow: number; // in minutes, default 20
}
