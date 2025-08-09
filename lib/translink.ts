import type { Location, TransitStop, Route, Departure } from '@/types/transit';
import { calculateDistance } from './geolocation';

// New interface for our updated data structure
interface TransitStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  address?: string;
  types: string[];
}

interface NearbyVehicle {
  vehicleId: string;
  tripId?: string;
  routeId?: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp: number;
  distanceToStation: number;
  nearestStationId: string;
  nearestStationName: string;
}

interface TransitInfo {
  stations: TransitStation[];
  vehicles: NearbyVehicle[];
  summary: {
    stationCount: number;
    vehicleCount: number;
    routeIds: string[];
  };
}

// Function that finds nearby transit using our new combined API
export const findNearbyTransit = async (
  location: Location,
  radius: number,
  vehicleRadius: number = 200
): Promise<TransitInfo> => {
  try {
    const url = `/api/nearby-transit?lat=${location.latitude}&lng=${location.longitude}&radius=${radius}&vehicleRadius=${vehicleRadius}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `API error: ${response.status}`;
      const details = errorData.details ? ` - ${errorData.details}` : '';
      const suggestion = errorData.suggestion ? `\n\nSuggestion: ${errorData.suggestion}` : '';
      throw new Error(`${errorMessage}${details}${suggestion}`);
    }

    const data = await response.json();
    return data as TransitInfo;

  } catch (error) {
    console.error('Error fetching nearby transit:', error);
    throw new Error('Failed to fetch nearby transit info. Please check your internet connection and try again.');
  }
};

// Convert transit stations to our legacy TransitStop format for compatibility
export const findNearbyStops = async (
  location: Location,
  radius: number
): Promise<TransitStop[]> => {
  try {
    const transitInfo = await findNearbyTransit(location, radius);

    // Convert stations to stops format
    const stops: TransitStop[] = transitInfo.stations.map((station) => ({
      id: station.id,
      name: station.name,
      code: station.id,
      location: {
        latitude: station.lat,
        longitude: station.lng,
      },
      distance: station.distance,
    }));

    return stops.sort((a, b) => a.distance - b.distance);

  } catch (error) {
    console.error('Error fetching nearby stops:', error);
    throw new Error('Failed to fetch nearby transit stops. Please check your internet connection and try again.');
  }
};

export const getRouteInfo = async (routeId: string): Promise<Route> => {
  try {
    // Use our API route instead of calling Translink directly
    const url = `/api/routes/${routeId}`;

    const response = await fetch(url);

    if (!response.ok) {
      // If route not found, return basic info
      return {
        id: routeId,
        shortName: routeId,
        longName: `Route ${routeId}`,
        type: 'bus',
      };
    }

    const data = await response.json();

    // Determine transport type based on route characteristics
    const getTransportType = (routeNumber: string, routeName: string): 'bus' | 'train' | 'ferry' => {
      const name = routeName.toLowerCase();
      const number = routeNumber.toLowerCase();

      if (name.includes('line') || name.includes('skytrain') || number.includes('expo') || number.includes('millennium') || number.includes('canada')) {
        return 'train';
      }
      if (name.includes('seabus') || name.includes('ferry')) {
        return 'ferry';
      }
      return 'bus';
    };

    return {
      id: routeId,
      shortName: data.RouteNo || routeId,
      longName: data.RouteName || `Route ${routeId}`,
      type: getTransportType(data.RouteNo || routeId, data.RouteName || ''),
      color: '#0760A3', // Default Translink blue
      textColor: '#FFFFFF',
    };

  } catch (error) {
    console.error('Error fetching route info:', error);
    // Return fallback info on error
    return {
      id: routeId,
      shortName: routeId,
      longName: `Route ${routeId}`,
      type: 'bus',
    };
  }
};

export const getDepartures = async (
  routeIds: string[],
  maxDepartures: number = 20
): Promise<Departure[]> => {
  const allDepartures: Departure[] = [];
  const now = new Date();

  try {
    // Get trip updates for the specified routes
    const url = `/api/departures?routeIds=${routeIds.join(',')}&maxDepartures=${maxDepartures}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Failed to fetch departures: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.success || !data.departures) {
      console.warn('Invalid departures response format');
      return [];
    }

    // Process each trip update
    for (const tripUpdate of data.departures) {
      if (!tripUpdate.routeId) continue;

      const route = await getRouteInfo(tripUpdate.routeId);

      // Process stop updates for this trip
      for (const stopUpdate of tripUpdate.stopUpdates || []) {
        if (!stopUpdate.departureTime && !stopUpdate.arrivalTime) continue;

        try {
          // Use departure time if available, otherwise arrival time
          const timeValue = stopUpdate.departureTime || stopUpdate.arrivalTime;
          const departureTime = new Date(timeValue.low * 1000); // Convert from Unix timestamp

          // Skip if in the past or too far in the future
          const minutesFromNow = (departureTime.getTime() - now.getTime()) / 60000;
          if (minutesFromNow < 0 || minutesFromNow > 120) { // Next 2 hours
            continue;
          }

          // Calculate delay information
          const delaySeconds = stopUpdate.departureDelay || stopUpdate.arrivalDelay || 0;
          const isRealTime = delaySeconds !== 0;
          const scheduledTime = new Date(departureTime.getTime() - (delaySeconds * 1000));

          // Create a basic stop for the departure
          const stop: TransitStop = {
            id: stopUpdate.stopId || 'unknown',
            name: `Stop ${stopUpdate.stopId}`,
            code: stopUpdate.stopId || 'unknown',
            location: { latitude: 0, longitude: 0 }, // We don't have location info from GTFS
            distance: 0,
          };

          allDepartures.push({
            routeId: tripUpdate.routeId,
            route,
            stopId: stop.id,
            stop,
            scheduledTime,
            realTimeTime: isRealTime ? departureTime : undefined,
            delay: Math.floor(delaySeconds / 60), // Convert to minutes
            headsign: route.longName,
            walkingTimeToStop: 0, // Will be calculated later when we have stop locations
          });
        } catch (error) {
          console.warn('Error parsing trip update:', error);
        }
      }
    }

    // Sort by departure time and limit results
    return allDepartures
      .sort((a, b) => {
        const timeA = a.realTimeTime || a.scheduledTime;
        const timeB = b.realTimeTime || b.scheduledTime;
        return timeA.getTime() - timeB.getTime();
      })
      .slice(0, maxDepartures);

  } catch (error) {
    console.error('Error fetching departures:', error);
    throw new Error('Failed to fetch departure times. Please check your internet connection and try again.');
  }
};

export const getWalkingTime = async (
  from: Location,
  to: Location
): Promise<number> => {
  try {
    // Use our API route instead of calling Google Maps directly
    const url = `/api/walking-time?fromLat=${from.latitude}&fromLng=${from.longitude}&toLat=${to.latitude}&toLng=${to.longitude}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Walking time API error: ${response.status}`);
    }

    const data = await response.json();
    return data.walkingTimeMinutes;

  } catch (error) {
    console.warn('Error fetching walking time, using fallback:', error);
    // Fallback to distance-based estimation
    const distance = calculateDistance(from, to);
    const walkingSpeedMs = 1.4; // meters per second (5 km/h)
    return Math.ceil(distance / walkingSpeedMs / 60); // minutes
  }
};

// Geocode address to coordinates
export const geocodeAddress = async (address: string): Promise<Location & { formattedAddress: string }> => {
  try {
    const url = `/api/geocode?address=${encodeURIComponent(address)}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `Geocoding error: ${response.status}`;
      const details = errorData.details ? ` - ${errorData.details}` : '';
      const suggestion = errorData.suggestion ? `\n\nSuggestion: ${errorData.suggestion}` : '';
      throw new Error(`${errorMessage}${details}${suggestion}`);
    }

    const data = await response.json();
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      formattedAddress: data.formattedAddress
    };

  } catch (error) {
    console.error('Error geocoding address:', error);
    throw new Error('Failed to find location for the address. Please check the spelling and try again.');
  }
};
