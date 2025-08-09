# ClickTrip

A one-click transit app for Metro Vancouver. See exactly when your nearby buses and trains are arriving - faster than opening Google Maps.

## The Problem
Getting quick transit times requires too many steps: open Maps → search destination → switch from driving to transit → find your route. When you just want to know "when's my bus coming?", this is overkill.

## The Solution
ClickTrip shows a simple dashboard of all transit departures within walking distance, sorted by time. One click opens walking directions in Google Maps.

**Key Features:**
- 📍 **Location-aware**: Automatically finds stops within 500m of your current location
- ⚡ **Real-time**: Live departure times and delays from Translink's GTFS API
- 📱 **Mobile-optimized**: Fast loading with a clean, responsive design  
- ⚙️ **Customizable**: Adjust search radius (250m-1km) and time window (10-60 min)
- 🗺️ **One-click directions**: Tap any card to start walking navigation

## Architecture

**Tech Stack:**
- **Next.js 14** with App Router - React framework with built-in API routes
- **TypeScript** - Type safety and better development experience
- **Tailwind CSS** - Utility-first styling for rapid development
- **Translink GTFS** - Real-time transit data for Metro Vancouver

**Project Structure:**
```
app/
├── api/           # API routes for transit data
├── page.tsx       # Main dashboard
└── layout.tsx     # Root layout

components/        # React components
├── TransitCard.tsx      # Departure card UI
├── AddressSearch.tsx    # Location search
├── LoadingCard.tsx      # Loading states
└── SettingsModal.tsx    # User preferences

lib/               # Core utilities  
├── translink.ts         # Transit API integration
├── geolocation.ts       # Location services
└── settings.ts          # User preferences
```
