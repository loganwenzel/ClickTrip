import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface GoogleMapsPlace {
  place_id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  vicinity?: string;
  types: string[];
  rating?: number;
}

interface TransitStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  address?: string;
  types: string[];
}

export async function GET(request: NextRequest) {
  console.log('Transit Stations API called with URL:', request.nextUrl.toString());
  console.log('GOOGLE_MAPS_API_KEY exists:', !!GOOGLE_MAPS_API_KEY);

  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius');

  console.log('Parameters:', { lat, lng, radius });

  if (!lat || !lng || !radius) {
    return NextResponse.json(
      { error: 'Missing required parameters: lat, lng, radius' },
      { status: 400 }
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY is not set in environment variables');
    return NextResponse.json(
      {
        error: 'Google Maps API key not configured',
        details: 'Please add GOOGLE_MAPS_API_KEY to your .env.local file',
        hasApiKey: false
      },
      { status: 500 }
    );
  }

  try {
    // Use Google Maps Places API to find nearby transit stations
    const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    placesUrl.searchParams.set('location', `${lat},${lng}`);
    placesUrl.searchParams.set('radius', radius);
    placesUrl.searchParams.set('type', 'transit_station');
    placesUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);

    console.log('Calling Google Places API:', placesUrl.toString().replace(GOOGLE_MAPS_API_KEY, 'REDACTED'));

    const response = await fetch(placesUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Google Places API error:', errorText);
      throw new Error(`Google Places API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Google Places API response status:', data.status);
    console.log('Found places:', data.results?.length || 0);

    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    // Calculate distance for each station and format the response
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const transitStations: TransitStation[] = data.results.map((place: GoogleMapsPlace) => {
      const stationLat = place.geometry.location.lat;
      const stationLng = place.geometry.location.lng;

      // Calculate distance using Haversine formula
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
    });

    // Sort by distance
    transitStations.sort((a, b) => a.distance - b.distance);

    console.log(`Found ${transitStations.length} transit stations within ${radius}m`);

    return NextResponse.json(transitStations);

  } catch (error) {
    console.error('Error fetching transit stations:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch transit stations',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Check your Google Maps API key and ensure Places API is enabled'
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
