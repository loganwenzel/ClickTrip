'use client';

import { useState } from 'react';
import type { Departure } from '@/types/transit';

interface TransitCardProps {
  departure: Departure;
  onOpenMaps: (departure: Departure) => void;
}

const TransitCard: React.FC<TransitCardProps> = ({ departure, onOpenMaps }) => {
  const [isPressed, setIsPressed] = useState(false);

  const getTimeUntilDeparture = () => {
    const now = new Date();
    const departureTime = departure.realTimeTime || departure.scheduledTime;
    const diffInMinutes = Math.floor((departureTime.getTime() - now.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Now';
    if (diffInMinutes === 1) return '1 min';
    return `${diffInMinutes} mins`;
  };

  const getTransportIcon = () => {
    switch (departure.route.type) {
      case 'train':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8 2 5 5 5 9V15C5 16.1 5.9 17 7 17L6 18V19H7L8.5 17.5H15.5L17 19H18V18L17 17C18.1 17 19 16.1 19 15V9C19 5 16 2 12 2ZM7.5 15C6.7 15 6 14.3 6 13.5S6.7 12 7.5 12 9 12.7 9 13.5 8.3 15 7.5 15ZM16.5 15C15.7 15 15 14.3 15 13.5S15.7 12 16.5 12 18 12.7 18 13.5 17.3 15 16.5 15ZM18 10H6V6H18V10Z" />
          </svg>
        );
      case 'ferry':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 21C18.39 21 17 19.61 17 18H16V17H8V18H7C7 19.61 5.61 21 4 21H2V19H4C4.55 19 5 18.55 5 18H3L4 14H6L7 10H9L10.5 7H13.5L15 10H17L18 14H20L21 18H19C19 18.55 19.45 19 20 19H22V21H20ZM6.5 16H17.5L17 14H7L6.5 16Z" />
          </svg>
        );
      default: // bus
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 16C4 16.88 4.39 17.67 5 18.22V20C5 20.55 5.45 21 6 21H7C7.55 21 8 20.55 8 20V19H16V20C16 20.55 16.45 21 17 21H18C18.55 21 19 20.55 19 20V18.22C19.61 17.67 20 16.88 20 16V6C20 2.5 16.42 2 12 2S4 2.5 4 6V16ZM6.5 17C5.67 17 5 16.33 5 15.5S5.67 14 6.5 14 8 14.67 8 15.5 7.33 17 6.5 17ZM17.5 17C16.67 17 16 16.33 16 15.5S16.67 14 17.5 14 19 14.67 19 15.5 18.33 17 17.5 17ZM18 11H6V6H18V11Z" />
          </svg>
        );
    }
  };

  const getRouteTypeColor = () => {
    switch (departure.route.type) {
      case 'train':
        return 'text-blue-600 bg-blue-50';
      case 'ferry':
        return 'text-teal-600 bg-teal-50';
      default: // bus
        return 'text-green-600 bg-green-50';
    }
  };

  const handleClick = () => {
    onOpenMaps(departure);
  };

  return (
    <div
      className={`card cursor-pointer select-none transition-transform duration-150 ${isPressed ? 'scale-95' : 'hover:scale-105'
        }`}
      onClick={handleClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Transport Icon */}
          <div className={`p-2 rounded-lg ${getRouteTypeColor()}`}>
            {getTransportIcon()}
          </div>

          {/* Route Info */}
          <div className="flex-1">
            <div className="font-semibold text-lg text-gray-900">
              {departure.route.shortName}
            </div>
            <div className="text-sm text-gray-600">
              {departure.stop.name}
            </div>
            <div className="text-xs text-gray-500">
              {departure.headsign}
            </div>
          </div>
        </div>

        {/* Time Info */}
        <div className="text-right">
          <div className="font-bold text-lg text-primary-600">
            {getTimeUntilDeparture()}
          </div>
          <div className="text-sm text-gray-600">
            {departure.walkingTimeToStop}min walk
          </div>
          <div className="text-xs text-gray-500">
            {Math.round(departure.stop.distance)}m away
          </div>
        </div>

        {/* Google Maps Icon */}
        <div className="ml-2 text-gray-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5Z" />
          </svg>
        </div>
      </div>

      {/* Delay indicator */}
      {departure.delay && Math.abs(departure.delay) > 1 && (
        <div className="mt-2 text-xs">
          {departure.delay > 0 ? (
            <span className="text-red-600 bg-red-50 px-2 py-1 rounded">
              {departure.delay} min late
            </span>
          ) : (
            <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
              {Math.abs(departure.delay)} min early
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TransitCard;
