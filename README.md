# ClickTrip

A fast, responsive web app for getting real-time transit information in Metro Vancouver. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 📍 **Location-based**: Uses your current location to find nearby transit stops
- ⚡ **Real-time data**: Shows live departure times from Translink
- 🚌 **Multi-modal**: Supports buses, trains, and ferries
- 📱 **Mobile-first**: Optimized for phone usage with responsive design
- ⚙️ **Customizable**: Adjust search radius and time window
- 🗺️ **Google Maps integration**: One-click walking directions to stops
- 💾 **Persistent settings**: Your preferences are saved using cookies

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd clicktrip
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file and add your API keys:
```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
TRANSLINK_API_KEY=your_translink_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

- `GOOGLE_MAPS_API_KEY`: Required for accurate walking time estimates and directions (get from [Google Cloud Console](https://console.cloud.google.com/))
- `TRANSLINK_API_KEY`: Required for real-time transit data (get from [Translink API](https://www.translink.ca/about-us/doing-business-with-translink/app-developer-resources))

## How It Works

1. **Location Detection**: The app requests your current location using the browser's geolocation API
2. **Find Nearby Stops**: Searches for transit stops within your specified radius (default: 500m)
3. **Get Departures**: Fetches real-time departure information from Translink's GTFS API
4. **Display Results**: Shows departures sorted by time with walking distance and delay information
5. **Quick Directions**: Click any card to open walking directions in Google Maps

## API Integration

### Translink GTFS Data

The app integrates with Translink's GTFS (General Transit Feed Specification) APIs:

- **Static Data**: Stop locations, route information, and schedules
- **Real-time Data**: Live departure times, delays, and service alerts

*Note: Requires valid Translink API key for real-time data. Register at [Translink Developer Resources](https://www.translink.ca/about-us/doing-business-with-translink/app-developer-resources).*

### Google Maps

- **Directions API**: Calculates walking times to transit stops
- **Maps URLs**: Opens navigation with a single click

## Development

### Project Structure

```
clicktrip/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main dashboard
├── components/            # React components
│   ├── TransitCard.tsx    # Individual transit departure card
│   ├── LoadingCard.tsx    # Loading skeleton
│   └── SettingsModal.tsx  # Settings configuration
├── lib/                   # Utility libraries
│   ├── geolocation.ts     # Location services
│   ├── settings.ts        # User preferences
│   └── translink.ts       # Transit API integration
├── types/                 # TypeScript type definitions
│   └── transit.ts         # Transit data models
└── public/               # Static assets
```

### Key Technologies

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety and better development experience  
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **js-cookie**: Client-side cookie management for settings persistence

## Deployment

### Vercel (Recommended)

1. Push your code to a Git repository
2. Connect your repository to [Vercel](https://vercel.com)
3. Add environment variables in the Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- Render

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## Future Enhancements

- [ ] Service alerts and disruptions
- [ ] Favorite routes/stops
- [ ] Push notifications for delays
- [ ] Support for other transit agencies
- [ ] Offline mode with cached data
- [ ] PWA (Progressive Web App) features

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Translink](https://www.translink.ca/) for providing open transit data
- [Google Maps](https://developers.google.com/maps) for location and direction services
