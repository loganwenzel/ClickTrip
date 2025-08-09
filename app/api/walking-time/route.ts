import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fromLat = searchParams.get('fromLat');
  const fromLng = searchParams.get('fromLng');
  const toLat = searchParams.get('toLat');
  const toLng = searchParams.get('toLng');

  if (!fromLat || !fromLng || !toLat || !toLng) {
    return NextResponse.json(
      { error: 'Missing required parameters: fromLat, fromLng, toLat, toLng' },
      { status: 400 }
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
    // Fallback to distance-based estimation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (parseFloat(fromLat) * Math.PI) / 180;
    const φ2 = (parseFloat(toLat) * Math.PI) / 180;
    const Δφ = ((parseFloat(toLat) - parseFloat(fromLat)) * Math.PI) / 180;
    const Δλ = ((parseFloat(toLng) - parseFloat(fromLng)) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    const walkingSpeedMs = 1.4; // meters per second (5 km/h)
    const walkingTimeMinutes = Math.ceil(distance / walkingSpeedMs / 60);

    return NextResponse.json({ walkingTimeMinutes });
  }

  try {
    const origin = `${fromLat},${fromLng}`;
    const destination = `${toLat},${toLng}`;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=walking&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
      throw new Error('No walking route found');
    }

    // Extract duration from the first route
    const duration = data.routes[0].legs[0].duration.value; // duration in seconds
    const walkingTimeMinutes = Math.ceil(duration / 60); // convert to minutes

    return NextResponse.json({ walkingTimeMinutes });

  } catch (error) {
    console.warn('Error fetching walking time from Google Maps, using fallback:', error);

    // Fallback to distance-based estimation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (parseFloat(fromLat) * Math.PI) / 180;
    const φ2 = (parseFloat(toLat) * Math.PI) / 180;
    const Δφ = ((parseFloat(toLat) - parseFloat(fromLat)) * Math.PI) / 180;
    const Δλ = ((parseFloat(toLng) - parseFloat(fromLng)) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    const walkingSpeedMs = 1.4; // meters per second (5 km/h)
    const walkingTimeMinutes = Math.ceil(distance / walkingSpeedMs / 60);

    return NextResponse.json({ walkingTimeMinutes });
  }
}
