import { NextRequest, NextResponse } from 'next/server';
import { parseVehiclePositions, VehiclePosition } from '../../../lib/gtfs-parser';

const TRANSLINK_API_KEY = process.env.TRANSLINK_API_KEY;
const TRANSLINK_GTFS_BASE_URL = 'https://gtfsapi.translink.ca/v3';

export async function GET(request: NextRequest) {
  console.log('Vehicle Positions API called');

  const searchParams = request.nextUrl.searchParams;
  const stationIds = searchParams.get('stationIds')?.split(',') || [];
  const maxDistance = parseFloat(searchParams.get('maxDistance') || '200'); // Default 200m radius

  if (!TRANSLINK_API_KEY) {
    return NextResponse.json(
      {
        error: 'Translink API key not configured',
        details: 'Please add TRANSLINK_API_KEY to your .env.local file',
        hasApiKey: false
      },
      { status: 500 }
    );
  }

  try {
    // Fetch GTFS vehicle positions (protobuf data)
    const url = `${TRANSLINK_GTFS_BASE_URL}/gtfsposition?apikey=${TRANSLINK_API_KEY}`;

    console.log('Fetching GTFS vehicle positions:', url.replace(TRANSLINK_API_KEY, 'REDACTED'));

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/x-protobuf',
      },
    });

    console.log('GTFS Vehicle Positions API response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('GTFS API error response:', errorText);
      throw new Error(`Translink GTFS API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Get the raw protobuf data and parse it
    const buffer = await response.arrayBuffer();
    console.log('Received protobuf data, size:', buffer.byteLength, 'bytes');

    // Parse the protobuf data to get vehicle positions
    const vehiclePositions = await parseVehiclePositions(buffer);
    console.log(`Parsed ${vehiclePositions.length} vehicle positions`);

    // If station filtering is requested, we'll need station coordinates
    // For now, return all vehicle positions (we'll add filtering in the next step)
    const filteredVehicles = vehiclePositions.filter(vehicle => {
      // Only include vehicles that have valid coordinates and route info
      return vehicle.latitude && vehicle.longitude && vehicle.routeId;
    });

    console.log(`Returning ${filteredVehicles.length} vehicles with valid data`);

    return NextResponse.json({
      success: true,
      vehicleCount: filteredVehicles.length,
      totalVehicles: vehiclePositions.length,
      vehicles: filteredVehicles,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching vehicle positions from Translink API:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch vehicle positions from Translink API',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'This may be due to API restrictions or protobuf parsing errors.'
      },
      { status: 500 }
    );
  }
}
