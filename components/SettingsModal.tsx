'use client';

import { useState } from 'react';
import type { UserSettings } from '@/types/transit';
import AddressSearch from './AddressSearch';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
  onLocationChange?: (address: string) => void;
  onUseCurrentLocation?: () => void;
  currentAddress?: string | null;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onLocationChange,
  onUseCurrentLocation,
  currentAddress,
}) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleClose}
    >
      <div className="bg-white rounded-xl max-w-md w-full p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Location Section */}
          {(onLocationChange || onUseCurrentLocation) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              {currentAddress && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                    <span className="text-sm">{currentAddress}</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {onLocationChange && (
                  <AddressSearch
                    onAddressSelect={(address) => {
                      onLocationChange(address);
                      onClose();
                    }}
                    onUseCurrentLocation={() => {
                      if (onUseCurrentLocation) {
                        onUseCurrentLocation();
                        onClose();
                      }
                    }}
                    isLoading={false}
                    disabled={false}
                  />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Change your search location to see transit info for a different area
              </p>
            </div>
          )}

          {/* Search Radius */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Radius
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="200"
                max="1000"
                step="50"
                value={localSettings.radius}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    radius: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>200m</span>
                <span className="font-medium">{localSettings.radius}m</span>
                <span>1000m</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              How far to search for transit stops around your location
            </p>
          </div>

          {/* Time Window */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Window
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={localSettings.timeWindow}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    timeWindow: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>10 min</span>
                <span className="font-medium">{localSettings.timeWindow} min</span>
                <span>60 min</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Show departures within this time window
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 btn-primary"
          >
            Save Settings
          </button>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default SettingsModal;
