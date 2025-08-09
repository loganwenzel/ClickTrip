import { NextRequest, NextResponse } from 'next/server';
import { parseTripUpdates, TripUpdate } from '../../../lib/gtfs-parser';

const TRANSLINK_API_KEY = process.env.TRANSLINK_API_KEY;
const TRANSLINK_GTFS_BASE_URL = 'https://gtfsapi.translink.ca/v3';

interface DepartureInfo {
  tripId: string;
  routeId?: string;
  directionId?: number;
  stopUpdates: Array<{
    stopId?: string;
    stopSequence?: number;
    arrivalTime?: number;
    departureTime?: number;
    arrivalDelay?: number;
    departureDelay?: number;
    scheduleRelationship?: string;
  }>;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const routeIds = searchParams.get('routeIds')?.split(',') || [];
  const maxDepartures = parseInt(searchParams.get('maxDepartures') || '10');

  console.log('Departures API called with routes:', routeIds);

  if (!TRANSLINK_API_KEY) {
    return NextResponse.json(
      { error: 'Translink API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Fetch GTFS Realtime trip updates (protobuf data)
    const url = `${TRANSLINK_GTFS_BASE_URL}/gtfsrealtime?apikey=${TRANSLINK_API_KEY}`;

    console.log('Fetching GTFS trip updates:', url.replace(TRANSLINK_API_KEY, 'REDACTED'));

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/x-protobuf',
      },
    });

    console.log('GTFS Trip Updates API response:', {
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

    // Parse the protobuf data to get trip updates
    const buffer = await response.arrayBuffer();
    console.log('Received protobuf data, size:', buffer.byteLength, 'bytes');

    const tripUpdates = await parseTripUpdates(buffer);
    console.log(`Parsed ${tripUpdates.length} trip updates`);

    // Filter by route IDs if specified
    let filteredUpdates = tripUpdates;
    if (routeIds.length > 0 && routeIds[0] !== '') {
      filteredUpdates = tripUpdates.filter(update =>
        update.routeId && routeIds.includes(update.routeId)
      );
      console.log(`Filtered to ${filteredUpdates.length} updates for routes: ${routeIds.join(', ')}`);
    }

    // Convert to departure info format and limit results
    const departures: DepartureInfo[] = filteredUpdates
      .slice(0, maxDepartures)
      .map(update => ({
        tripId: update.tripId,
        routeId: update.routeId,
        directionId: update.directionId,
        stopUpdates: update.stopTimeUpdates.map(stu => ({
          stopId: stu.stopId,
          stopSequence: stu.stopSequence,
          arrivalTime: stu.arrival?.time,
          departureTime: stu.departure?.time,
          arrivalDelay: stu.arrival?.delay,
          departureDelay: stu.departure?.delay,
          scheduleRelationship: stu.scheduleRelationship
        }))
      }));

    // Get unique route IDs for summary
    const foundRoutes = [...new Set(departures.map(d => d.routeId).filter(Boolean))];

    return NextResponse.json({
      success: true,
      requestedRoutes: routeIds,
      foundRoutes,
      departureCount: departures.length,
      totalTripUpdates: tripUpdates.length,
      departures,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching departures from Translink API:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch departures from Translink API',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'This may be due to API restrictions or protobuf parsing errors.'
      },
      { status: 500 }
    );
  }
}
