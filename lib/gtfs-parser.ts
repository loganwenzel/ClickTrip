import protobuf from 'protobufjs';
import path from 'path';

// GTFS Realtime interfaces
export interface VehiclePosition {
  vehicleId: string;
  tripId?: string;
  routeId?: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp: number;
  currentStopSequence?: number;
  currentStatus?: string;
}

export interface TripUpdate {
  tripId: string;
  routeId?: string;
  directionId?: number;
  scheduleRelationship?: string;
  stopTimeUpdates: StopTimeUpdate[];
}

export interface StopTimeUpdate {
  stopSequence?: number;
  stopId?: string;
  arrival?: {
    delay?: number;
    time?: number;
    uncertainty?: number;
  };
  departure?: {
    delay?: number;
    time?: number;
    uncertainty?: number;
  };
  scheduleRelationship?: string;
}

export interface Alert {
  activePeriods: Array<{
    start?: number;
    end?: number;
  }>;
  informedEntities: Array<{
    agencyId?: string;
    routeId?: string;
    routeType?: number;
    trip?: {
      tripId: string;
      routeId?: string;
      directionId?: number;
    };
    stopId?: string;
  }>;
  cause?: string;
  effect?: string;
  url?: {
    translation: Array<{
      text: string;
      language?: string;
    }>;
  };
  headerText?: {
    translation: Array<{
      text: string;
      language?: string;
    }>;
  };
  descriptionText?: {
    translation: Array<{
      text: string;
      language?: string;
    }>;
  };
}

let gtfsRealtimeRoot: protobuf.Root | null = null;

async function getGtfsRealtimeRoot() {
  if (!gtfsRealtimeRoot) {
    const protoPath = path.join(process.cwd(), 'gtfs-realtime.proto');
    gtfsRealtimeRoot = await protobuf.load(protoPath);
  }
  return gtfsRealtimeRoot;
}

export async function parseVehiclePositions(buffer: ArrayBuffer): Promise<VehiclePosition[]> {
  try {
    const root = await getGtfsRealtimeRoot();
    const FeedMessage = root.lookupType('transit_realtime.FeedMessage');

    const uint8Array = new Uint8Array(buffer);
    const message = FeedMessage.decode(uint8Array);
    const object = FeedMessage.toObject(message);

    const vehiclePositions: VehiclePosition[] = [];

    for (const entity of object.entity || []) {
      if (entity.vehicle && entity.vehicle.position) {
        const vehicle = entity.vehicle;
        const position = vehicle.position;

        vehiclePositions.push({
          vehicleId: entity.id || 'unknown',
          tripId: vehicle.trip?.tripId,
          routeId: vehicle.trip?.routeId,
          latitude: position.latitude,
          longitude: position.longitude,
          bearing: position.bearing,
          speed: position.speed,
          timestamp: vehicle.timestamp || Date.now() / 1000,
          currentStopSequence: vehicle.currentStopSequence,
          currentStatus: vehicle.currentStatus
        });
      }
    }

    return vehiclePositions;
  } catch (error) {
    console.error('Error parsing vehicle positions:', error);
    throw new Error(`Failed to parse vehicle positions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function parseTripUpdates(buffer: ArrayBuffer): Promise<TripUpdate[]> {
  try {
    const root = await getGtfsRealtimeRoot();
    const FeedMessage = root.lookupType('transit_realtime.FeedMessage');

    const uint8Array = new Uint8Array(buffer);
    const message = FeedMessage.decode(uint8Array);
    const object = FeedMessage.toObject(message);

    const tripUpdates: TripUpdate[] = [];

    for (const entity of object.entity || []) {
      if (entity.tripUpdate) {
        const tripUpdate = entity.tripUpdate;

        tripUpdates.push({
          tripId: tripUpdate.trip?.tripId || 'unknown',
          routeId: tripUpdate.trip?.routeId,
          directionId: tripUpdate.trip?.directionId,
          scheduleRelationship: tripUpdate.trip?.scheduleRelationship,
          stopTimeUpdates: (tripUpdate.stopTimeUpdate || []).map((stu: any) => ({
            stopSequence: stu.stopSequence,
            stopId: stu.stopId,
            arrival: stu.arrival ? {
              delay: stu.arrival.delay,
              time: stu.arrival.time,
              uncertainty: stu.arrival.uncertainty
            } : undefined,
            departure: stu.departure ? {
              delay: stu.departure.delay,
              time: stu.departure.time,
              uncertainty: stu.departure.uncertainty
            } : undefined,
            scheduleRelationship: stu.scheduleRelationship
          }))
        });
      }
    }

    return tripUpdates;
  } catch (error) {
    console.error('Error parsing trip updates:', error);
    throw new Error(`Failed to parse trip updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function parseAlerts(buffer: ArrayBuffer): Promise<Alert[]> {
  try {
    const root = await getGtfsRealtimeRoot();
    const FeedMessage = root.lookupType('transit_realtime.FeedMessage');

    const uint8Array = new Uint8Array(buffer);
    const message = FeedMessage.decode(uint8Array);
    const object = FeedMessage.toObject(message);

    const alerts: Alert[] = [];

    for (const entity of object.entity || []) {
      if (entity.alert) {
        const alert = entity.alert;

        alerts.push({
          activePeriods: (alert.activePeriod || []).map((period: any) => ({
            start: period.start,
            end: period.end
          })),
          informedEntities: (alert.informedEntity || []).map((ie: any) => ({
            agencyId: ie.agencyId,
            routeId: ie.routeId,
            routeType: ie.routeType,
            trip: ie.trip ? {
              tripId: ie.trip.tripId,
              routeId: ie.trip.routeId,
              directionId: ie.trip.directionId
            } : undefined,
            stopId: ie.stopId
          })),
          cause: alert.cause,
          effect: alert.effect,
          url: alert.url ? {
            translation: (alert.url.translation || []).map((t: any) => ({
              text: t.text,
              language: t.language
            }))
          } : undefined,
          headerText: alert.headerText ? {
            translation: (alert.headerText.translation || []).map((t: any) => ({
              text: t.text,
              language: t.language
            }))
          } : undefined,
          descriptionText: alert.descriptionText ? {
            translation: (alert.descriptionText.translation || []).map((t: any) => ({
              text: t.text,
              language: t.language
            }))
          } : undefined
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error parsing alerts:', error);
    throw new Error(`Failed to parse alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
