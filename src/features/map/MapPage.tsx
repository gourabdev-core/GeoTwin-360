import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { Compass, AlertCircle, RefreshCw, Thermometer, Droplet, Wind } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { useLocation } from '../../context/LocationContext.js';

// Custom Map Controller to auto-recenter when location changes
const MapController: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 12, { animate: true });
  }, [lat, lng, map]);
  return null;
};

// Spotify-green pulsing Leaflet marker icon
const mapMarkerIcon = L.divIcon({
  html: `
    <div class="relative w-8 h-8 flex items-center justify-center">
      <div class="absolute w-8 h-8 bg-[#1ed760]/30 rounded-full animate-ping"></div>
      <div class="relative w-4 h-4 bg-[#1ed760] border-2 border-white rounded-full shadow-heavy"></div>
    </div>
  `,
  className: 'custom-map-marker-container',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const MapPage: React.FC = () => {
  const { selectedLocation } = useLocation();
  const [mapData, setMapData] = useState<{
    temperature: number | null;
    precipitation: number | null;
    aqi: number | null;
    pm2_5: number | null;
    pm10: number | null;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const lat = selectedLocation ? Number(selectedLocation.latitude) : null;
  const lng = selectedLocation ? Number(selectedLocation.longitude) : null;

  useEffect(() => {
    if (lat === null || lng === null) {
      setMapData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchEnvironmentalData = async () => {
      try {
        const [forecastRes, aqRes] = await Promise.all([
          axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation`, { timeout: 5000 }),
          axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5,us_aqi`, { timeout: 5000 }),
        ]);

        if (isMounted) {
          const fc = forecastRes.data?.current;
          const aq = aqRes.data?.current;

          setMapData({
            temperature: fc?.temperature_2m ?? null,
            precipitation: fc?.precipitation ?? null,
            aqi: aq?.us_aqi ?? null,
            pm2_5: aq?.pm2_5 ?? null,
            pm10: aq?.pm10 ?? null,
          });
        }
      } catch (err: any) {
        console.error('[MapExplorer] Failed to fetch environmental details:', err);
        if (isMounted) {
          setError(err.message || 'Failed to retrieve real-time environmental metrics.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchEnvironmentalData();

    return () => {
      isMounted = false;
    };
  }, [lat, lng]);

  const getAqiColor = (aqi: number | null) => {
    if (aqi === null) return '#7c7c7c';
    if (aqi <= 50) return '#1ed760'; // Good
    if (aqi <= 100) return '#eed329'; // Moderate
    if (aqi <= 150) return '#ffa42b'; // Sensitive
    return '#f3727f'; // Poor
  };

  const getAqiLabel = (aqi: number | null) => {
    if (aqi === null) return 'N/A';
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Sensitive groups';
    return 'Poor';
  };

  const aqiColor = getAqiColor(mapData?.aqi ?? null);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 p-4 bg-dark-surface rounded-lg shadow-medium border border-border-gray/30">
        <div className="p-2 bg-mid-dark rounded-full text-spotify-green animate-pulse">
          <Compass size={24} />
        </div>
        <div>
          <h2 className="text-lg font-title font-bold text-text-base">Climate Map Explorer</h2>
          <p className="text-xs text-text-silver">High-resolution geospatial environmental overlays</p>
        </div>
      </div>

      {lat === null || lng === null ? (
        <Card className="min-h-[500px] flex flex-col items-center justify-center text-center p-8 bg-dark-surface border border-border-gray">
          <div className="p-4 bg-mid-dark rounded-full mb-4">
            <Compass size={48} className="text-text-silver/40" />
          </div>
          <h3 className="text-base font-title font-bold text-text-base mb-2">Map Interface Standby</h3>
          <p className="text-xs text-text-silver max-w-xs leading-relaxed">
            Search for a location in the search bar to initialize the interactive map explorer.
          </p>
        </Card>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-border-gray bg-mid-dark min-h-[500px] flex flex-col">
          {/* Real-time environmental overlays HUD */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col space-y-2.5 w-[200px] p-3 bg-dark-surface/95 border border-border-gray rounded-lg shadow-heavy backdrop-blur-md">
            <span className="text-[10px] font-bold text-text-silver uppercase tracking-wider">Live Metrics</span>
            
            {loading ? (
              <div className="flex items-center space-x-2 text-text-silver text-xs py-2">
                <RefreshCw size={14} className="animate-spin text-spotify-green" />
                <span>Loading metrics...</span>
              </div>
            ) : error ? (
              <div className="flex items-start space-x-1.5 text-red-400 text-[11px] leading-tight">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : (
              <div className="space-y-2 text-xs font-sans">
                <div className="flex justify-between items-center text-text-base">
                  <span className="flex items-center gap-1.5 text-text-silver">
                    <Thermometer size={14} className="text-red-400" />
                    Temp:
                  </span>
                  <span className="font-bold">{mapData?.temperature !== null ? `${mapData?.temperature}°C` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-text-base">
                  <span className="flex items-center gap-1.5 text-text-silver">
                    <Droplet size={14} className="text-blue-400" />
                    Precip:
                  </span>
                  <span className="font-bold">{mapData?.precipitation !== null ? `${mapData?.precipitation} mm` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-text-base">
                  <span className="flex items-center gap-1.5 text-text-silver">
                    <Wind size={14} className="text-spotify-green" />
                    Air Quality:
                  </span>
                  <span className="font-bold px-1.5 py-0.5 rounded text-[10px] border border-border-gray/50 bg-mid-dark" style={{ color: aqiColor }}>
                    {mapData?.aqi !== null ? `${mapData?.aqi} AQI` : 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="w-full h-[500px] z-[1]">
            <MapContainer
              center={[lat, lng]}
              zoom={12}
              scrollWheelZoom={false}
              zoomControl={true}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <Marker position={[lat, lng]} icon={mapMarkerIcon}>
                <Popup className="custom-leaflet-popup">
                  <div className="text-near-black p-2 bg-white font-sans rounded w-52">
                    <h4 className="font-bold text-xs text-near-black mb-0.5">{selectedLocation?.name}</h4>
                    <p className="text-[9px] text-gray-500 font-mono mb-2">
                      {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
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

              {mapData?.aqi !== null && (
                <Circle
                  center={[lat, lng]}
                  radius={2500}
                  pathOptions={{
                    fillColor: aqiColor,
                    fillOpacity: 0.25,
                    color: aqiColor,
                    weight: 1.5,
                  }}
                >
                  <Popup>
                    <div className="text-near-black font-sans text-xs">
                      <span className="font-bold">Air Quality Buffer Zone</span>
                      <p className="mt-1">AQI level inside this radius is classified as <span className="font-bold" style={{ color: aqiColor }}>{getAqiLabel(mapData?.aqi ?? null)}</span>.</p>
                    </div>
                  </Popup>
                </Circle>
              )}

              <MapController lat={lat} lng={lng} />
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
