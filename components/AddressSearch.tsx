'use client';

import { useState } from 'react';
import { MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface AddressSearchProps {
  onAddressSelect: (address: string) => void;
  onUseCurrentLocation: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

const popularAddresses = [
  "Downtown Vancouver, BC",
  "Vancouver International Airport, BC",
  "University of British Columbia, Vancouver, BC",
  "Granville Island, Vancouver, BC",
  "Stanley Park, Vancouver, BC",
  "Robson Street, Vancouver, BC",
  "Gastown, Vancouver, BC",
  "Coal Harbour, Vancouver, BC",
  "Kitsilano, Vancouver, BC",
  "Commercial Drive, Vancouver, BC"
];

export default function AddressSearch({
  onAddressSelect,
  onUseCurrentLocation,
  isLoading,
  disabled = false
}: AddressSearchProps) {
  const [searchValue, setSearchValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onAddressSelect(searchValue.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (address: string) => {
    setSearchValue(address);
    onAddressSelect(address);
    setShowSuggestions(false);
  };

  const filteredSuggestions = popularAddresses.filter(address =>
    address.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="relative">
      {/* Address Search Form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search address or location..."
            disabled={disabled || isLoading}
            className="w-full px-4 py-3 pl-11 pr-12 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <MapPinIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          <button
            type="submit"
            disabled={disabled || isLoading || !searchValue.trim()}
            className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-blue-600 focus:outline-none focus:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* Current Location Button */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onUseCurrentLocation}
          disabled={disabled || isLoading}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          <span className="text-sm font-medium">Use Current Location</span>
        </button>
      </div>

      {/* Address Suggestions */}
      {showSuggestions && searchValue && !isLoading && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredSuggestions.length > 0 ? (
            <>
              {filteredSuggestions.map((address, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(address)}
                  className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{address}</span>
                  </div>
                </button>
              ))}
            </>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              No suggestions found. Press Enter to search for "{searchValue}"
            </div>
          )}
        </div>
      )}

      {/* Popular Locations (when no search) */}
      {showSuggestions && !searchValue && !isLoading && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
            Popular Vancouver Locations
          </div>
          {popularAddresses.map((address, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(address)}
              className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <MapPinIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{address}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Click outside to close suggestions */}
      {showSuggestions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}
