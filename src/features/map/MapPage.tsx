import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import {
  Compass,
  AlertCircle,
  RefreshCw,
  Thermometer,
  Droplet,
  Wind,
  MapPin,
  Layers,
  Loader2,
  Navigation,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { useLocation } from '../../context/LocationContext.js';
import { LocationService } from '../../services/locationService.js';
import { riskService } from '../../services/riskService.js';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer.js';

// Map Controller to smoothly adjust view and handle resize without reinitializing the map
const MapController: React.FC<{ lat: number | null; lng: number | null }> = ({ lat, lng }) => {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // Ignore if map unmounted
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      map.flyTo([lat, lng], 13, { duration: 1.2 });
    }
  }, [lat, lng, map]);

  return null;
};

// Map Click Listener to select locations anywhere on the map
const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Spotify-green pulsing Leaflet marker icon for selected location
const primaryMarkerIcon = L.divIcon({
  html: `
    <div class="relative w-8 h-8 flex items-center justify-center pointer-events-none">
      <div class="absolute w-8 h-8 bg-[#1ed760]/30 rounded-full animate-ping"></div>
      <div class="relative w-4 h-4 bg-[#1ed760] border-2 border-white rounded-full shadow-heavy"></div>
    </div>
  `,
  className: 'custom-map-marker-container',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Temporary clicked marker icon while reverse geocoding
const pendingMarkerIcon = L.divIcon({
  html: `
    <div class="relative w-8 h-8 flex items-center justify-center pointer-events-none">
      <div class="absolute w-8 h-8 bg-[#539df5]/40 rounded-full animate-ping"></div>
      <div class="relative w-4 h-4 bg-[#539df5] border-2 border-white rounded-full shadow-heavy"></div>
    </div>
  `,
  className: 'custom-pending-marker-container',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const MapPage: React.FC = () => {
  const { selectedLocation, selectLocation, formatLocationName } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedYear, setSelectedYearState] = useState<number>(() => {
    const param = searchParams.get('year');
    if (param) {
      const parsed = parseInt(param, 10);
      if ([2030, 2035, 2040, 2050].includes(parsed)) return parsed;
    }
    try {
      const stored = localStorage.getItem('geotwin_selected_year');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if ([2030, 2035, 2040, 2050].includes(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return 2035;
  });

  const setSelectedYear = useCallback((year: number) => {
    setSelectedYearState(year);
    try {
      localStorage.setItem('geotwin_selected_year', String(year));
    } catch {
      // Ignore
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('year', String(year));
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  useEffect(() => {
    const paramYear = searchParams.get('year');
    if (paramYear) {
      const parsed = parseInt(paramYear, 10);
      if ([2030, 2035, 2040, 2050].includes(parsed) && parsed !== selectedYear) {
        setSelectedYearState(parsed);
      }
    }
  }, [searchParams, selectedYear]);

  // Risk Overlays state
  const [activeRiskOverlay, setActiveRiskOverlay] = useState<string | null>('temperature');
  const [overlayFeatures, setOverlayFeatures] = useState<any[]>([]);
  const [loadingOverlay, setLoadingOverlay] = useState<boolean>(false);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          // Ignore
        }
        mapRef.current = null;
      }
    };
  }, []);

  const riskLayers = [
    { id: 'temperature', name: 'Heat Risk' },
    { id: 'flood', name: 'Flood Risk' },
    { id: 'aqi', name: 'Air Quality' },
    { id: 'water', name: 'Water Stress' },
    { id: 'green', name: 'Green Cover' },
  ];

  // Fetch risk overlay features
  useEffect(() => {
    if (!activeRiskOverlay || !selectedLocation?.id) {
      setOverlayFeatures([]);
      return;
    }

    let isMounted = true;
    setOverlayFeatures([]);
    setLoadingOverlay(true);

    let metricParam = activeRiskOverlay;
    if (activeRiskOverlay === 'aqi') metricParam = 'air_quality';
    if (activeRiskOverlay === 'water') metricParam = 'water_stress';
    if (activeRiskOverlay === 'green') metricParam = 'green_cover';

    riskService.getRiskMapData(selectedLocation.id, metricParam, selectedYear)
      .then((data) => {
        if (isMounted) {
          setOverlayFeatures(data?.features || []);
        }
      })
      .catch((err) => {
        console.warn('[MapPage] Risk overlay fetch error:', err);
        if (isMounted) setOverlayFeatures([]);
      })
      .finally(() => {
        if (isMounted) setLoadingOverlay(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeRiskOverlay, selectedLocation?.id, selectedYear]);

  const [mapData, setMapData] = useState<{
    temperature: number | null;
    precipitation: number | null;
    aqi: number | null;
    pm2_5: number | null;
    pm10: number | null;
  } | null>(null);

  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Clicked location state
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvingClick, setResolvingClick] = useState<boolean>(false);
  const [clickStatusMessage, setClickStatusMessage] = useState<string | null>(null);

  // Map layer controls
  const [showAqiBuffer, setShowAqiBuffer] = useState<boolean>(true);
  const [tileStyle, setTileStyle] = useState<'dark' | 'standard'>('dark');

  const lat = selectedLocation ? Number(selectedLocation.latitude) : null;
  const lng = selectedLocation ? Number(selectedLocation.longitude) : null;

  // Fallback map center (regional overview) if no location selected yet
  const defaultCenterLat = 22.5726;
  const defaultCenterLng = 88.3639;

  // Fetch real-time environmental data for selected coordinates
  const fetchEnvironmentalData = useCallback(async (latitude: number, longitude: number) => {
    setMapData(null);
    setLoadingMetrics(true);
    setMetricsError(null);

    try {
      const [forecastRes, aqRes] = await Promise.all([
        axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation`,
          { timeout: 7000 }
        ),
        axios.get(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5,us_aqi`,
          { timeout: 7000 }
        ),
      ]);

      const fc = forecastRes.data?.current;
      const aq = aqRes.data?.current;

      setMapData({
        temperature: fc?.temperature_2m ?? null,
        precipitation: fc?.precipitation ?? null,
        aqi: aq?.us_aqi ?? null,
        pm2_5: aq?.pm2_5 ?? null,
        pm10: aq?.pm10 ?? null,
      });
    } catch (err: any) {
      console.warn('[MapPage] Environmental data fetch notice:', sanitizeErrorMessage(err));
      setMetricsError(sanitizeErrorMessage(err, 'Environmental metrics temporarily unavailable.'));
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      fetchEnvironmentalData(lat, lng);
    } else {
      setMapData(null);
      setMetricsError(null);
    }
  }, [lat, lng, fetchEnvironmentalData]);

  // Handle user clicking directly on the map to choose a location
  const handleMapClick = async (clickedLat: number, clickedLng: number) => {
    setClickedCoords({ lat: clickedLat, lng: clickedLng });
    setResolvingClick(true);
    setClickStatusMessage(`Resolving coordinates (${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)})...`);

    try {
      const resolved = await LocationService.reverseGeocode(clickedLat, clickedLng);

      if (resolved && resolved.name) {
        const stateName = resolved.state || resolved.region;
        const displayName =
          resolved.displayName ||
          [resolved.name, stateName, resolved.country].filter(Boolean).join(', ');

        await selectLocation({
          name: resolved.name,
          city: resolved.city || resolved.name,
          region: stateName,
          state: stateName,
          country: resolved.country || 'Unknown',
          countryCode: resolved.countryCode,
          latitude: clickedLat,
          longitude: clickedLng,
          timezone: resolved.timezone,
          displayName,
        });
        setClickStatusMessage(null);
      } else {
        // Fallback if reverse-geocoding does not return a named place
        const coordName = `Location (${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)})`;
        await selectLocation({
          name: coordName,
          city: coordName,
          country: 'Unknown',
          latitude: clickedLat,
          longitude: clickedLng,
          displayName: coordName,
        });
        setClickStatusMessage(null);
      }
    } catch (err: any) {
      console.warn('[MapPage] Reverse geocode error on map click, using coordinate label:', err.message);
      const coordName = `Location (${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)})`;
      await selectLocation({
        name: coordName,
        city: coordName,
        country: 'Unknown',
        latitude: clickedLat,
        longitude: clickedLng,
        displayName: coordName,
      });
      setClickStatusMessage(null);
    } finally {
      setResolvingClick(false);
      setClickedCoords(null);
    }
  };

  const getAqiColor = (aqi: number | null) => {
    if (aqi === null) return '#7c7c7c';
    if (aqi <= 50) return '#1ed760'; // Good
    if (aqi <= 100) return '#eed329'; // Moderate
    if (aqi <= 150) return '#ffa42b'; // Sensitive groups
    return '#f3727f'; // Poor / Unhealthy
  };

  const getAqiLabel = (aqi: number | null) => {
    if (aqi === null) return 'N/A';
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Sensitive groups';
    return 'Poor';
  };

  const aqiColor = getAqiColor(mapData?.aqi ?? null);
  const locationDisplayName = selectedLocation
    ? selectedLocation.displayName || formatLocationName(selectedLocation)
    : null;

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-dark-surface rounded-lg shadow-medium border border-border-gray/30">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-mid-dark rounded-full text-spotify-green animate-pulse">
            <Compass size={22} />
          </div>
          <div>
            <h2 className="text-lg font-title font-bold text-text-base">Climate Map Explorer</h2>
            <p className="text-xs text-text-silver">
              High-resolution geospatial environmental overlays and interactive location intelligence
            </p>
          </div>
        </div>

        {/* Year Selector & Location Status Badge */}
        <div className="flex flex-wrap items-center gap-3">
          {selectedLocation && (
            <div className="flex bg-mid-dark p-1 rounded-full border border-border-gray/50">
              {[2030, 2035, 2040, 2050].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-200 ${
                    selectedYear === yr
                      ? 'bg-spotify-green text-black shadow-sm'
                      : 'text-text-silver hover:text-text-base'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}

          {selectedLocation ? (
            <div className="flex items-center space-x-2 bg-mid-dark border border-border-gray/50 px-3.5 py-1.5 rounded-full text-xs">
              <MapPin size={14} className="text-spotify-green shrink-0" />
              <span className="font-semibold text-text-base truncate max-w-[200px] md:max-w-xs">
                {locationDisplayName}
              </span>
              <span className="text-[10px] text-text-silver font-mono shrink-0">
                {lat?.toFixed(4)}°, {lng?.toFixed(4)}°
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-mid-dark border border-border-gray/40 px-3.5 py-1.5 rounded-full text-xs text-text-silver">
              <Navigation size={14} className="text-text-silver/60" />
              <span>Standby — Click map or search above</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative rounded-lg overflow-hidden border border-border-gray bg-mid-dark min-h-[360px] sm:min-h-[480px] lg:min-h-[580px] flex flex-col">
        {/* Layer Controls Bar (Top Left) */}
        <div className="absolute top-3 left-3 z-[1000] flex flex-col space-y-2.5 p-2 sm:p-2.5 bg-dark-surface/95 border border-border-gray rounded-lg shadow-heavy backdrop-blur-md max-w-[160px] sm:max-w-[200px]">
          <div className="flex items-center space-x-1.5 text-[10px] font-bold text-text-silver uppercase tracking-wider px-1">
            <Layers size={13} className="text-spotify-green" />
            <span>Map Layers</span>
          </div>

          <div className="flex flex-col space-y-1.5 text-xs font-sans">
            <button
              onClick={() => setTileStyle((prev) => (prev === 'dark' ? 'standard' : 'dark'))}
              className="text-left px-2 py-1 rounded bg-mid-dark hover:bg-dark-card text-text-base border border-border-gray/40 flex items-center justify-between gap-2 cursor-pointer transition-colors"
            >
              <span className="text-[11px]">Base Style</span>
              <span className="text-[10px] font-bold text-spotify-green uppercase">
                {tileStyle === 'dark' ? 'Dark CARTO' : 'OpenStreet'}
              </span>
            </button>

            <button
              onClick={() => setShowAqiBuffer((prev) => !prev)}
              className={`text-left px-2 py-1 rounded border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                showAqiBuffer
                  ? 'bg-spotify-green/10 border-spotify-green/50 text-spotify-green font-semibold'
                  : 'bg-mid-dark border-border-gray/40 text-text-silver'
              }`}
            >
              <span className="text-[11px]">AQI Radius</span>
              <span className="text-[10px] font-mono font-bold">
                {showAqiBuffer ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Risk Layer Overlays */}
          {selectedLocation && (
            <div className="pt-2 border-t border-border-gray/40 space-y-1.5">
              <span className="text-[10px] font-bold text-text-silver uppercase tracking-wider block px-1">
                Risk Overlays ({selectedYear})
              </span>
              <div className="grid grid-cols-1 gap-1 text-xs">
                {riskLayers.map((layer) => {
                  const isActive = activeRiskOverlay === layer.id;
                  return (
                    <button
                      key={layer.id}
                      onClick={() => setActiveRiskOverlay(isActive ? null : layer.id)}
                      className={`text-left px-2 py-1 rounded border flex items-center justify-between gap-1.5 cursor-pointer transition-colors text-xs ${
                        isActive
                          ? 'bg-spotify-green/15 border-spotify-green text-spotify-green font-bold'
                          : 'bg-mid-dark border-border-gray/40 text-text-silver hover:text-text-base'
                      }`}
                    >
                      <span className="text-[11px] truncate">{layer.name}</span>
                      <span className="text-[9px] font-mono uppercase font-bold">
                        {isActive ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Live Metrics HUD (Top Right) */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col space-y-2.5 w-[180px] sm:w-[220px] p-2 sm:p-3 bg-dark-surface/95 border border-border-gray rounded-lg shadow-heavy backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-silver uppercase tracking-wider">
              Environmental Metrics
            </span>
            {selectedLocation && (
              <button
                onClick={() => lat && lng && fetchEnvironmentalData(lat, lng)}
                title="Refresh metrics"
                className="p-1 hover:text-spotify-green text-text-silver transition-colors cursor-pointer"
              >
                <RefreshCw size={12} className={loadingMetrics ? 'animate-spin text-spotify-green' : ''} />
              </button>
            )}
          </div>

          {resolvingClick && (
            <div className="flex items-center space-x-2 text-spotify-green text-xs py-1">
              <Loader2 size={13} className="animate-spin shrink-0" />
              <span className="text-[11px]">Resolving location...</span>
            </div>
          )}

          {!selectedLocation ? (
            <div className="text-xs text-text-silver py-2 leading-relaxed">
              Click anywhere on the map to pinpoint and analyze a location.
            </div>
          ) : loadingMetrics ? (
            <div className="flex items-center space-x-2 text-text-silver text-xs py-2">
              <RefreshCw size={14} className="animate-spin text-spotify-green shrink-0" />
              <span>Fetching live metrics...</span>
            </div>
          ) : metricsError ? (
            <div className="space-y-1.5">
              <div className="flex items-start space-x-1.5 text-red-400 text-[11px] leading-tight">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{metricsError}</span>
              </div>
              <button
                onClick={() => lat && lng && fetchEnvironmentalData(lat, lng)}
                className="text-[10px] text-spotify-green hover:underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-2 text-xs font-sans">
              <div className="flex justify-between items-center text-text-base">
                <span className="flex items-center gap-1.5 text-text-silver">
                  <Thermometer size={14} className="text-red-400" />
                  Temperature:
                </span>
                <span className="font-bold">
                  {mapData?.temperature !== null ? `${mapData?.temperature}°C` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-text-base">
                <span className="flex items-center gap-1.5 text-text-silver">
                  <Droplet size={14} className="text-blue-400" />
                  Precipitation:
                </span>
                <span className="font-bold">
                  {mapData?.precipitation !== null ? `${mapData?.precipitation} mm` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-text-base">
                <span className="flex items-center gap-1.5 text-text-silver">
                  <Wind size={14} className="text-spotify-green" />
                  Air Quality:
                </span>
                <span
                  className="font-bold px-1.5 py-0.5 rounded text-[10px] border border-border-gray/50 bg-mid-dark"
                  style={{ color: aqiColor }}
                >
                  {mapData?.aqi !== null ? `${mapData?.aqi} AQI` : 'N/A'}
                </span>
              </div>
              <div className="pt-1.5 border-t border-border-gray/40 flex justify-between text-[10px] text-text-silver">
                <span>PM2.5: {mapData?.pm2_5 !== null ? `${mapData?.pm2_5} µg/m³` : 'N/A'}</span>
                <span>PM10: {mapData?.pm10 !== null ? `${mapData?.pm10} µg/m³` : 'N/A'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Informational Banner / Guide (Bottom Left) */}
        {clickStatusMessage && (
          <div className="absolute bottom-4 left-4 z-[1000] flex items-center space-x-2 bg-dark-surface/95 border border-spotify-green/50 text-spotify-green text-xs px-3.5 py-2 rounded-lg shadow-heavy backdrop-blur-md">
            <Loader2 size={14} className="animate-spin shrink-0" />
            <span>{clickStatusMessage}</span>
          </div>
        )}

        {/* Dynamic Risk Legend (Bottom Left when Overlay active) */}
        {activeRiskOverlay && (
          <div className={`absolute ${clickStatusMessage ? 'bottom-16' : 'bottom-4'} left-4 z-[1000] flex flex-col space-y-1.5 p-2.5 bg-dark-surface/95 border border-border-gray rounded-lg shadow-heavy backdrop-blur-md w-[140px]`}>
            <span className="text-[10px] font-bold text-text-base uppercase tracking-wider px-1 font-sans">
              {riskLayers.find((l) => l.id === activeRiskOverlay)?.name}
            </span>
            {loadingOverlay ? (
              <span className="text-[10px] text-text-silver font-sans px-1 italic">Loading layer...</span>
            ) : (
              <div className="flex flex-col space-y-1 text-[11px] font-sans px-1 pt-1.5 border-t border-border-gray/40">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#f3727f]"></span>
                  <span className="text-text-silver">Very High</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#ffa42b]"></span>
                  <span className="text-text-silver">High</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#eed329]"></span>
                  <span className="text-text-silver">Medium</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#4beb4b]"></span>
                  <span className="text-text-silver">Low</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#539df5]"></span>
                  <span className="text-text-silver">Very Low</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaflet Map Component */}
        <div className="w-full h-[580px] z-[1]">
          <MapContainer
            center={[lat ?? defaultCenterLat, lng ?? defaultCenterLng]}
            zoom={lat && lng ? 13 : 5}
            scrollWheelZoom={true}
            zoomControl={true}
            doubleClickZoom={true}
            dragging={true}
            className="w-full h-full"
          >
            {tileStyle === 'dark' ? (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                maxZoom={19}
              />
            ) : (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
            )}

            {/* Permanent marker for selected location */}
            {lat !== null && lng !== null && (
              <Marker position={[lat, lng]} icon={primaryMarkerIcon}>
                <Popup className="custom-leaflet-popup">
                  <div className="text-near-black p-2 bg-white font-sans rounded w-56">
                    <h4 className="font-bold text-xs text-near-black mb-0.5">
                      {locationDisplayName}
                    </h4>
                    <p className="text-[9px] text-gray-500 font-mono mb-2">
                      {Math.abs(lat).toFixed(4)}° {lat >= 0 ? 'N' : 'S'}, {Math.abs(lng).toFixed(4)}° {lng >= 0 ? 'E' : 'W'}
                    </p>
                    <div className="border-t border-gray-200 pt-2 space-y-1 text-[11px] text-gray-700">
                      <div className="flex justify-between">
                        <span className="font-semibold">Temperature:</span>
                        <span>{mapData?.temperature !== null ? `${mapData?.temperature} °C` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Precipitation:</span>
                        <span>{mapData?.precipitation !== null ? `${mapData?.precipitation} mm` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Air Quality (AQI):</span>
                        <span className="font-bold" style={{ color: aqiColor }}>
                          {mapData?.aqi !== null ? `${mapData?.aqi} (${getAqiLabel(mapData?.aqi ?? null)})` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>PM2.5:</span>
                        <span>{mapData?.pm2_5 !== null ? `${mapData?.pm2_5} µg/m³` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>PM10:</span>
                        <span>{mapData?.pm10 !== null ? `${mapData?.pm10} µg/m³` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Pending Click Marker */}
            {clickedCoords && (
              <Marker position={[clickedCoords.lat, clickedCoords.lng]} icon={pendingMarkerIcon} />
            )}

            {/* Air Quality Impact Buffer Circle */}
            {showAqiBuffer && lat !== null && lng !== null && mapData?.aqi !== null && (
              <Circle
                center={[lat, lng]}
                radius={3000}
                pathOptions={{
                  fillColor: aqiColor,
                  fillOpacity: 0.22,
                  color: aqiColor,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="text-near-black font-sans text-xs">
                    <span className="font-bold">Air Quality Influence Zone</span>
                    <p className="mt-1">
                      Ambient AQI within 3km radius is classified as{' '}
                      <span className="font-bold" style={{ color: aqiColor }}>
                        {getAqiLabel(mapData?.aqi ?? null)}
                      </span>.
                    </p>
                  </div>
                </Popup>
              </Circle>
            )}

            {/* Risk Overlay GeoJSON */}
            {activeRiskOverlay && overlayFeatures.length > 0 && (
              <GeoJSON
                key={`${selectedLocation?.id}-${selectedYear}-${activeRiskOverlay}-${overlayFeatures.length}`}
                data={{
                  type: 'FeatureCollection',
                  features: overlayFeatures,
                } as any}
                style={(feature) => {
                  const level = feature?.properties?.riskLevel;
                  let color = '#7c7c7c';
                  if (level === 'VERY_HIGH') color = '#f3727f';
                  else if (level === 'HIGH') color = '#ffa42b';
                  else if (level === 'MEDIUM') color = '#eed329';
                  else if (level === 'LOW') color = '#4beb4b';
                  else if (level === 'VERY_LOW') color = '#539df5';

                  return {
                    fillColor: color,
                    weight: 1.5,
                    opacity: 0.8,
                    color: '#121212',
                    fillOpacity: 0.45,
                  };
                }}
                onEachFeature={(feature, layer) => {
                  const score = feature?.properties?.riskScore;
                  const level = feature?.properties?.riskLevel;
                  const source = feature?.properties?.source;
                  const dataType = feature?.properties?.metadata?.dataType || feature?.properties?.dataType || 'PROJECTED';
                  const layerName = riskLayers.find((l) => l.id === activeRiskOverlay)?.name || 'Risk';
                  if (level) {
                    const scoreText = typeof score === 'number' && !isNaN(score)
                      ? `<p><strong>Score:</strong> ${(score <= 1 ? score * 100 : score).toFixed(1)}/100</p>`
                      : '';
                    const levelColor = level === 'VERY_HIGH' ? '#dc2626' :
                      level === 'HIGH' ? '#ea580c' :
                      level === 'MEDIUM' ? '#ca8a04' :
                      level === 'LOW' ? '#16a34a' : '#2563eb';
                    layer.bindPopup(`
                      <div class="text-near-black p-1 bg-white font-sans rounded">
                        <h4 class="font-bold text-xs mb-0.5">${layerName} Zone</h4>
                        <div class="text-[11px] space-y-1">
                          <p><strong>Level:</strong> <span style="font-weight: bold; color: ${levelColor}">${level.replace('_', ' ')}</span></p>
                          ${scoreText}
                          <p><strong>Source:</strong> ${source || 'GeoTwin Models'}</p>
                          <p><strong>Status:</strong> ${dataType}</p>
                        </div>
                      </div>
                    `);
                  }
                }}
              />
            )}

            <MapController lat={lat} lng={lng} />
            <MapClickHandler onMapClick={handleMapClick} />
          </MapContainer>
        </div>
      </div>

      {/* Location Details Card */}
      {selectedLocation && (
        <Card className="p-4 bg-dark-surface border border-border-gray flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-spotify-green uppercase tracking-wider">
              Selected Location Dossier
            </span>
            <h3 className="text-sm font-bold text-text-base">{locationDisplayName}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-silver">
              {selectedLocation.region && <span>Region: {selectedLocation.region}</span>}
              {selectedLocation.country && <span>Country: {selectedLocation.country}</span>}
              <span className="font-mono">
                Coordinates: {lat?.toFixed(5)}° N, {lng?.toFixed(5)}° E
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-text-silver block">Provider Status</span>
              <span className="text-xs font-semibold text-spotify-green flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-spotify-green animate-pulse" />
                Live Satellite & Weather Feed
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MapPage;
