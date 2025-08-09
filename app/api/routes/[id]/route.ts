import { NextRequest, NextResponse } from 'next/server';

const TRANSLINK_API_KEY = process.env.TRANSLINK_API_KEY;
const TRANSLINK_BASE_URL = 'https://api.translink.ca/rttiapi/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routeId = params.id;

  if (!TRANSLINK_API_KEY) {
    return NextResponse.json(
      { error: 'Translink API key not configured' },
      { status: 500 }
    );
  }

  try {
    const url = `${TRANSLINK_BASE_URL}/routes/${routeId}?apikey=${TRANSLINK_API_KEY}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If route not found, return basic info
      return NextResponse.json({
        RouteNo: routeId,
        RouteName: `Route ${routeId}`,
      });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching route info from Translink API:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch route info from Translink API',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'This may be due to IP restrictions. Contact Translink to whitelist your IP address.'
      },
      { status: 500 }
    );
  }
}
