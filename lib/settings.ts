import Cookies from 'js-cookie';
import type { UserSettings } from '@/types/transit';

const SETTINGS_COOKIE_NAME = 'clicktrip-settings';

export const defaultSettings: UserSettings = {
  radius: 500, // 500 meters
  timeWindow: 20, // 20 minutes
};

export const getSettings = (): UserSettings => {
  try {
    const cookieValue = Cookies.get(SETTINGS_COOKIE_NAME);
    if (cookieValue) {
      const settings = JSON.parse(cookieValue);
      return {
        radius: settings.radius ?? defaultSettings.radius,
        timeWindow: settings.timeWindow ?? defaultSettings.timeWindow,
      };
    }
  } catch (error) {
    console.warn('Failed to parse settings cookie:', error);
  }
  return defaultSettings;
};

export const saveSettings = (settings: UserSettings): void => {
  try {
    Cookies.set(SETTINGS_COOKIE_NAME, JSON.stringify(settings), {
      expires: 365, // 1 year
      sameSite: 'strict',
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};
