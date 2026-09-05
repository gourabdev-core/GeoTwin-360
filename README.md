# GeoTwin 360

GeoTwin 360 is a modern, interactive digital twin dashboard designed for climate resilience planning and urban sustainability simulations. The platform combines real-time weather and air quality telemetry, interactive geographical mappings, climate projection algorithms, and AI-powered recommendations.

---

## Key Features

### 1. Interactive Climate Dashboard
- **Telemetry Grid**: Displays real-time environmental parameters including Temperature, Precipitation, AQI, Green Cover, and CO2 Emissions.
- **Scenario Simulator**: Models the environmental impacts of interventions (e.g., Cool Roofs, Canopy Expansion) projected to the year 2035.
- **Live Risk HUD**: Displays real-time overlay statuses for Heat, Flood, Air Quality, Water Stress, and Green Cover.

### 2. Live Map Explorer
- **Interactive Leaflet Map**: Implements Leaflet interactive map rendering styled with the dark CartoDB Dark Matter theme.
- **Pulsing Indicator**: Highlights the active location with a green pulsing marker.
- **Air Quality Buffer Zone**: Visualizes a circular buffer zone overlay around selected coordinates colored dynamically based on AQI severity.
- **Live HUD Display**: Displays real-time weather and air quality parameters retrieved directly on the client.

### 3. Location-Aware Solutions Catalog
- **Initiatives Grid**: Curates a list of sustainability actions (Urban Canopy, Cool Roofs, Rainwater Harvesting, Solar Micro-Grids).
- **Dynamic Math Scales**: Automatically calculates temperature cooling effects, water availability improvements, and flood risk reductions mapped relative to the current location's live telemetry.
- **Automatic Priority Tagging**: Computes priority levels (e.g., `High Priority` vs `Recommended`) dynamically based on active local risk feeds.

### 4. Robust PDF Report Generator
- **Intervention Reports**: Compiles baseline summaries, intervention impacts, and AI recommendations into a clean PDF.
- **Offline / Cached Failover**: Implements client-side compiling fallback using `jsPDF` if network connections are lost or external API limits are exceeded.

### 5. Secure Firebase Authentication
- **Global Auth Observer**: Listens to active user sessions globally using `onAuthStateChanged` mounted at the React DOM body level.
- **Flexible Providers**: Supports standard Email/Password accounts and Google OAuth redirects.
- **User Session HUD**: Displays personalized user credentials and Sign Out triggers in the dashboard navigation header.

---

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons, React-Leaflet, jsPDF
- **Backend**: Node.js, Express, TypeScript
- **Services & APIs**: Open-Meteo REST APIs, Google Gemini AI Engine, Supabase Database Client, Firebase Auth SDK

---

## Getting Started

### 1. Install Dependencies
```bash
# Install package dependencies
npm install
```

### 2. Configure Environment variables
Create a `.env` file in the workspace root directory and declare your credentials:
```env
# SUPABASE
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# OPENWEATHER
OPENWEATHER_API_KEY=<your-openweather-key>

# GEMINI
GEMINI_API_KEY=<your-gemini-key>

# FIREBASE CONFIG (Optional fallbacks active if omitted)
VITE_FIREBASE_API_KEY=<your-firebase-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-firebase-auth-domain>
VITE_FIREBASE_PROJECT_ID=<your-firebase-project-id>
```

### 3. Run Development Server
```bash
# Start development workspace
npm run dev
```

### 4. Build Production Bundle
```bash
# Compile client and server bundles
npm run build
```

---

## Project Structure

```
├── server/                 # Express backend server (routing, telemetry adapters, Gemini proxy)
├── src/
│   ├── app/                # Main router entries and base Layout
│   ├── components/         # Common UI libraries (Cards, inputs, AuthModal)
│   ├── context/            # LocationContext coordinates store
│   ├── features/           # Feature pages (Dashboard, Map Explorer, Solutions)
│   ├── services/           # Telemetry API clients
│   ├── utils/              # Client-side PDF generators
│   └── main.tsx            # DOM initialization entrypoint
```
