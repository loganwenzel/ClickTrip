'use client';

import { useState, useEffect } from 'react';
import TransitCard from '@/components/TransitCard';
import LoadingCard from '@/components/LoadingCard';
import SettingsModal from '@/components/SettingsModal';
import AddressSearch from '@/components/AddressSearch';
import { getCurrentLocation } from '@/lib/geolocation';
import { findNearbyTransit, getDepartures, getWalkingTime, geocodeAddress } from '@/lib/translink';
import { getSettings, saveSettings } from '@/lib/settings';
import type { Location, Departure, UserSettings } from '@/types/transit';

type LoadingState = 'initial' | 'location' | 'transit' | 'loaded' | 'error';

export default function Home() {
  const [loadingState, setLoadingState] = useState<LoadingState>('initial');
  const [location, setLocation] = useState<Location | null>(null);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>(() => getSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);

  function openGoogleMaps(departure: Departure) {
    if (!location) return;

    // Create Google Maps URL for walking directions
    const origin = `${location.latitude},${location.longitude}`;
    const destination = `${departure.stop.location.latitude},${departure.stop.location.longitude}`;
    const mapsUrl = `https://www.google.com/maps/dir/${origin}/${destination}?travelmode=walking`;

    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  }

  async function loadTransitData(userLocation: Location, userSettings: UserSettings) {
    try {
      setLoadingState('transit');

      // Find nearby transit stations and vehicles
      const transitInfo = await findNearbyTransit(userLocation, userSettings.radius, 200);

      if (transitInfo.stations.length === 0) {
        throw new Error('No transit stations found within your search radius. Try increasing the radius in settings.');
      }

      if (transitInfo.vehicles.length === 0) {
        throw new Error('No active vehicles found near your transit stations. Transit may not be running right now.');
      }

      // Get trip updates for the active routes
      const transitDepartures = await getDepartures(transitInfo.summary.routeIds, 10);

      if (transitDepartures.length === 0) {
        console.warn('No trip updates found, but vehicles are active. Using vehicle data for display.');
      }

      // Create enhanced departures with station and vehicle info
      const enhancedDepartures: Departure[] = [];

      // Combine trip updates with vehicle and station data
      for (const vehicle of transitInfo.vehicles) {
        if (!vehicle.routeId) continue;

        // Find the corresponding station
        const station = transitInfo.stations.find(s => s.id === vehicle.nearestStationId);
        if (!station) continue;

        // Find trip updates for this route
        const routeUpdates = transitDepartures.filter(d => d.routeId === vehicle.routeId);

        // Create a departure entry based on real vehicle position
        const departure: Departure = {
          routeId: vehicle.routeId,
          route: routeUpdates[0]?.route || {
            id: vehicle.routeId,
            shortName: vehicle.routeId,
            longName: `Route ${vehicle.routeId}`,
            type: 'bus',
          },
          stopId: station.id,
          stop: {
            id: station.id,
            name: station.name,
            code: station.id,
            location: {
              latitude: station.lat,
              longitude: station.lng,
            },
            distance: station.distance,
          },
          scheduledTime: new Date(Date.now() + 2 * 60000), // Estimate 2 minutes from now
          realTimeTime: new Date(Date.now() + 2 * 60000),
          delay: 0,
          headsign: `${vehicle.routeId} - ${station.name}`,
          walkingTimeToStop: Math.ceil(station.distance / 80), // ~5km/h walking speed
        };

        enhancedDepartures.push(departure);
      }

      // Add any additional trip updates that don't match vehicles
      for (const tripDeparture of transitDepartures) {
        const alreadyIncluded = enhancedDepartures.some(d =>
          d.routeId === tripDeparture.routeId && d.stopId === tripDeparture.stopId
        );

        if (!alreadyIncluded) {
          enhancedDepartures.push(tripDeparture);
        }
      }

      // Update walking times with more accurate Google Maps estimates (in background)
      const departuresWithAccurateWalkingTimes = await Promise.all(
        enhancedDepartures.slice(0, 10).map(async (departure) => {
          try {
            const accurateWalkingTime = await getWalkingTime(userLocation, departure.stop.location);
            return {
              ...departure,
              walkingTimeToStop: accurateWalkingTime,
            };
          } catch (error) {
            // Keep original walking time if Google Maps fails
            return departure;
          }
        })
      );

      setDepartures(departuresWithAccurateWalkingTimes);
      setLoadingState('loaded');
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transit data');
      setLoadingState('error');
    }
  }

  async function handleLocationAndLoad() {
    try {
      setLoadingState('location');
      setError(null);
      setCurrentAddress(null);

      const userLocation = await getCurrentLocation();
      setLocation(userLocation);

      await loadTransitData(userLocation, settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location');
      setLoadingState('error');
    }
  }

  async function handleAddressSearch(address: string) {
    try {
      setLoadingState('location');
      setError(null);

      const geocodedLocation = await geocodeAddress(address);
      setLocation({
        latitude: geocodedLocation.latitude,
        longitude: geocodedLocation.longitude,
      });
      setCurrentAddress(geocodedLocation.formattedAddress);

      await loadTransitData({
        latitude: geocodedLocation.latitude,
        longitude: geocodedLocation.longitude,
      }, settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find location');
      setLoadingState('error');
    }
  }

  function handleRefresh() {
    if (location) {
      loadTransitData(location, settings);
    } else {
      handleLocationAndLoad();
    }
  }

  async function handleSettingsChange(newSettings: UserSettings) {
    setSettings(newSettings);
    saveSettings(newSettings);

    // Reload data with new settings
    if (location) {
      await loadTransitData(location, newSettings);
    }
  }

  function getLoadingMessage() {
    switch (loadingState) {
      case 'location':
        return 'Getting your location...';
      case 'transit':
        return 'Loading transit information...';
      default:
        return 'Loading...';
    }
  }

  function formatLastRefresh() {
    if (!lastRefresh) return '';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return lastRefresh.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  useEffect(() => {
    // Automatically try to get user's location on app start
    handleLocationAndLoad();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ClickTrip</h1>
            <p className="text-sm text-gray-600">Check nearby transit near you</p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loadingState === 'location' || loadingState === 'transit'}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200 disabled:opacity-50"
              title="Refresh"
            >
              <svg
                className={`w-5 h-5 ${loadingState === 'transit' ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Current Location Display */}
        {currentAddress && loadingState === 'loaded' && (
          <div className="bg-white rounded-lg p-3 mb-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <span className="text-sm">{currentAddress}</span>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Status Info */}
        {lastRefresh && loadingState === 'loaded' && (
          <div className="text-xs text-gray-500 mb-4 text-center">
            Updated {formatLastRefresh()} • {departures.length} departures • {settings.radius}m radius
          </div>
        )}

        {/* Loading State */}
        {(loadingState === 'location' || loadingState === 'transit') && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium text-gray-900">{getLoadingMessage()}</span>
              </div>
            </div>

            {/* Loading Cards */}
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <LoadingCard key={i} />
              ))}
            </div>
          </div>
        )}



        {/* Error State */}
        {loadingState === 'error' && (
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-red-900 mb-2">No Transit Found</h3>
              <p className="text-red-700 mb-4">{error}</p>

              {/* Show address search in error state */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Try a different location:</h4>
                <AddressSearch
                  onAddressSelect={handleAddressSearch}
                  onUseCurrentLocation={handleLocationAndLoad}
                  isLoading={false}
                  disabled={false}
                />
              </div>

              <div className="mt-4">
                <button onClick={handleRefresh} className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors">
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transit Cards */}
        {loadingState === 'loaded' && departures.length > 0 && (
          <div className="space-y-3">
            {departures.map((departure, index) => (
              <TransitCard
                key={`${departure.routeId}-${departure.stopId}-${departure.scheduledTime.getTime()}-${index}`}
                departure={departure}
                onOpenMaps={openGoogleMaps}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {loadingState === 'loaded' && departures.length === 0 && (
          <div className="text-center py-8">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-8">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No transit nearby</h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                We couldn't find any active transit in this area right now. Let's try expanding your search or checking a busier location.
              </p>

              {/* Show address search in no results state */}
              <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">🔍 Search a different area:</h4>
                <AddressSearch
                  onAddressSelect={handleAddressSearch}
                  onUseCurrentLocation={handleLocationAndLoad}
                  isLoading={false}
                  disabled={false}
                />
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowSettings(true)}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Expand Search
                </button>
                <button
                  onClick={handleRefresh}
                  className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSave={handleSettingsChange}
          onLocationChange={handleAddressSearch}
          onUseCurrentLocation={handleLocationAndLoad}
          currentAddress={currentAddress}
        />
      </div>
    </div>
  );
}
