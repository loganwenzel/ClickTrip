import { NextRequest, NextResponse } from 'next/server';
import { parseVehiclePositions, parseTripUpdates } from '../../../lib/gtfs-parser';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const TRANSLINK_API_KEY = process.env.TRANSLINK_API_KEY;
const TRANSLINK_GTFS_BASE_URL = 'https://gtfsapi.translink.ca/v3';

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

export async function GET(request: NextRequest) {
  console.log('Nearby Transit API called');

  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '500';
  const vehicleRadius = parseFloat(searchParams.get('vehicleRadius') || '200'); // Distance vehicles can be from stations

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Missing required parameters: lat, lng' },
      { status: 400 }
    );
  }

  if (!GOOGLE_MAPS_API_KEY || !TRANSLINK_API_KEY) {
    return NextResponse.json(
      {
        error: 'API keys not configured',
        details: 'Please add GOOGLE_MAPS_API_KEY and TRANSLINK_API_KEY to your .env.local file',
        hasGoogleKey: !!GOOGLE_MAPS_API_KEY,
        hasTranslinkKey: !!TRANSLINK_API_KEY
      },
      { status: 500 }
    );
  }

  try {
    console.log(`Finding transit info near ${lat}, ${lng} within ${radius}m`);

    // Step 1: Get nearby transit stations from Google Places API
    const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    placesUrl.searchParams.set('location', `${lat},${lng}`);
    placesUrl.searchParams.set('radius', radius);
    placesUrl.searchParams.set('type', 'transit_station');
    placesUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);

    console.log('Fetching transit stations...');
    const placesResponse = await fetch(placesUrl.toString());

    if (!placesResponse.ok) {
      throw new Error(`Google Places API error: ${placesResponse.status}`);
    }

    const placesData = await placesResponse.json();

    if (placesData.status !== 'OK') {
      throw new Error(`Google Places API error: ${placesData.status}`);
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const stations: TransitStation[] = placesData.results.map((place: any) => {
      const stationLat = place.geometry.location.lat;
      const stationLng = place.geometry.location.lng;
      const distance = calculateDistance(userLat, userLng, stationLat, stationLng);

      return {
        id: place.place_id,
        name: place.name,
        lat: stationLat,
        lng: stationLng,
        distance: Math.round(distance),
        address: place.vicinity,
        types: place.types
      };
    }).sort((a: TransitStation, b: TransitStation) => a.distance - b.distance);

    console.log(`Found ${stations.length} transit stations`);

    // Step 2: Get vehicle positions from GTFS
    console.log('Fetching vehicle positions...');
    const vehicleUrl = `${TRANSLINK_GTFS_BASE_URL}/gtfsposition?apikey=${TRANSLINK_API_KEY}`;

    const vehicleResponse = await fetch(vehicleUrl, {
      headers: { 'Accept': 'application/x-protobuf' },
    });

    if (!vehicleResponse.ok) {
      throw new Error(`GTFS Vehicle Positions API error: ${vehicleResponse.status}`);
    }

    const vehicleBuffer = await vehicleResponse.arrayBuffer();
    const allVehicles = await parseVehiclePositions(vehicleBuffer);

    console.log(`Parsed ${allVehicles.length} total vehicles`);

    // Step 3: Filter vehicles that are near our transit stations
    const nearbyVehicles: NearbyVehicle[] = [];

    for (const vehicle of allVehicles) {
      if (!vehicle.latitude || !vehicle.longitude || !vehicle.routeId) continue;

      // Find the nearest station to this vehicle
      let nearestStation: TransitStation | null = null;
      let minDistance = Infinity;

      for (const station of stations) {
        const distance = calculateDistance(
          vehicle.latitude, vehicle.longitude,
          station.lat, station.lng
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestStation = station;
        }
      }

      // If vehicle is within the specified radius of a station, include it
      if (nearestStation && minDistance <= vehicleRadius) {
        nearbyVehicles.push({
          ...vehicle,
          distanceToStation: Math.round(minDistance),
          nearestStationId: nearestStation.id,
          nearestStationName: nearestStation.name
        });
      }
    }

    console.log(`Found ${nearbyVehicles.length} vehicles near transit stations`);

    // Step 4: Create summary
    const uniqueRoutes = [...new Set(nearbyVehicles.map(v => v.routeId).filter(Boolean))];

    const result: TransitInfo = {
      stations,
      vehicles: nearbyVehicles,
      summary: {
        stationCount: stations.length,
        vehicleCount: nearbyVehicles.length,
        routeIds: uniqueRoutes as string[]
      }
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching nearby transit info:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch nearby transit info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
