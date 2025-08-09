import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city?: string;
  country?: string;
}

export async function GET(request: NextRequest) {
  console.log('Geocoding API called');

  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: 'Missing required parameter: address' },
      { status: 400 }
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
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
    // Use Google Geocoding API to convert address to coordinates
    const geocodeUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    geocodeUrl.searchParams.set('address', address);
    geocodeUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);

    console.log('Calling Google Geocoding API:', geocodeUrl.toString().replace(GOOGLE_MAPS_API_KEY, 'REDACTED'));

    const response = await fetch(geocodeUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Google Geocoding API error:', errorText);
      throw new Error(`Google Geocoding API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Google Geocoding API response status:', data.status);

    if (data.status !== 'OK') {
      if (data.status === 'ZERO_RESULTS') {
        throw new Error(`No results found for address: "${address}". Please try a more specific address.`);
      }
      throw new Error(`Google Geocoding API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    if (!data.results || data.results.length === 0) {
      throw new Error(`No geocoding results found for: "${address}"`);
    }

    // Get the first (best) result
    const result = data.results[0];
    const location = result.geometry.location;

    // Extract additional location info
    const addressComponents = result.address_components || [];
    const city = addressComponents.find((component: any) =>
      component.types.includes('locality') || component.types.includes('administrative_area_level_1')
    )?.long_name;

    const country = addressComponents.find((component: any) =>
      component.types.includes('country')
    )?.long_name;

    const geocodeResult: GeocodeResult = {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address,
      city,
      country
    };

    console.log(`Geocoded "${address}" to:`, {
      lat: geocodeResult.latitude,
      lng: geocodeResult.longitude,
      address: geocodeResult.formattedAddress
    });

    return NextResponse.json(geocodeResult);

  } catch (error) {
    console.error('Error geocoding address:', error);
    return NextResponse.json(
      {
        error: 'Failed to geocode address',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Please check the address spelling and try again'
      },
      { status: 500 }
    );
  }
}
