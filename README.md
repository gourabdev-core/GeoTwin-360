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

### 5. Secure Supabase Authentication & Google OAuth
- **Global Auth Observer**: Listens to active user sessions globally using `supabase.auth.onAuthStateChange` mounted at the React DOM root level.
- **Flexible Providers**: Supports standard Email/Password accounts and Google OAuth with automatic user profile and avatar synchronization.
- **Resilient Pre-Flight Verification**: Gracefully detects unconfigured OAuth providers and offers a one-click local developer/demo session.
- **User Session Display**: Displays personalized user credentials, Google profile avatars, and Sign Out triggers in the navigation header.

---

## Google OAuth Configuration Guide

To enable live Google Sign-In and Sign-Up for production:

1. **Google Cloud Console**:
   - Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
   - Create an **OAuth 2.0 Client ID** (Web application).
   - In **Authorized redirect URIs**, add:
     ```text
     https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback
     ```
   - Copy the generated **Client ID** and **Client Secret**.

2. **Supabase Dashboard**:
   - Navigate to **Authentication > Providers > Google** in your Supabase project dashboard.
   - Toggle **Enable Google provider**.
   - Paste your **Client ID** and **Client Secret**.
   - Click **Save**.

3. **In-App Resilient Mode**:
   - If Google OAuth has not yet been toggled on in Supabase, the app automatically detects this, alerts the user, and provides a **Continue with Google (Demo Account)** button so you can test the full authenticated flow immediately.

---

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons, React-Leaflet, jsPDF
- **Backend**: Node.js, Express, TypeScript
- **Services & APIs**: OpenWeather API, NASA POWER API, Google Gemini AI Engine, Supabase (PostgreSQL + PostGIS + Auth)

---

## Getting Started

### 1. Install Dependencies
```bash
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
