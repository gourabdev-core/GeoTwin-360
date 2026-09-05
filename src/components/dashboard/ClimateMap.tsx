import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { riskService } from '../../services/riskService.js';
import { ClimateMetrics } from '../../types/domain.js';

interface ClimateMapProps {
  locationId: string;
  latitude: number;
  longitude: number;
  locationName: string;
  year: number;
  heatRiskLevel?: string | null;
  floodRiskLevel?: string | null;
  metrics?: ClimateMetrics | null;
}

// Controller to dynamically pan the map when coordinate props change
const MapController: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 12, { animate: true });
  }, [lat, lng, map]);
  return null;
};

// Custom pulsing Leaflet DivIcon matching GeoTwin Spotify green theme
const customMarkerIcon = L.divIcon({
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

export const ClimateMap: React.FC<ClimateMapProps> = ({
  locationId,
  latitude,
  longitude,
  locationName,
  year,
  heatRiskLevel = null,
  floodRiskLevel = null,
  metrics = null,
}) => {
  const parsedLat = Number(latitude);
  const parsedLng = Number(longitude);

  const mapRef = React.useRef<L.Map | null>(null);

  // Clean up Leaflet map instance on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // Ignore
        }
        mapRef.current = null;
      }
    };
  }, []);

  const [activeOverlay, setActiveOverlay] = useState<string | null>('temperature');
  const [overlayFeatures, setOverlayFeatures] = useState<any[]>([]);
  const [activeOverlayDataType, setActiveOverlayDataType] = useState<string | null>(null);
  const [loadingFeatures, setLoadingFeatures] = useState<boolean>(false);

  const [availableLayers, setAvailableLayers] = useState<Record<string, boolean>>({
    temperature: true,
    flood: true,
    aqi: true,
    water: true,
    green: true,
  });
  const [checkingAvailability, setCheckingAvailability] = useState<boolean>(false);

  const layers = [
    { id: 'temperature', name: 'Temperature' },
    { id: 'flood', name: 'Flood Risk' },
    { id: 'aqi', name: 'Air Quality' },
    { id: 'water', name: 'Water Stress' },
    { id: 'green', name: 'Green Cover' },
  ];

  const getFallbackStatus = (layerId: string) => {
    switch (layerId) {
      case 'temperature':
        return metrics?.temperature?.value != null ? `${metrics.temperature.value}°C` : 'Active';
      case 'flood':
        return floodRiskLevel ? floodRiskLevel.replace('_', ' ') : 'Low';
      case 'aqi':
        return metrics?.airQuality?.aqi != null ? `${metrics.airQuality.aqi} AQI` : 'N/A';
      case 'water':
        return metrics?.waterAvailability?.value != null
          ? `${metrics.waterAvailability.value}%`
          : (metrics?.waterAvailability?.stressLevel?.replace(' Stress', '') ?? 'N/A');
      case 'green':
        return metrics?.greenCover?.value != null ? `${metrics.greenCover.value}%` : 'N/A';
      default:
        return 'Active';
    }
  };

  // Fetch availability of spatial overlays on location or year change
  useEffect(() => {
    if (!locationId) return;

    let isMounted = true;
    setCheckingAvailability(true);

    const checkAvailability = async () => {
      const metricsList = ['temperature', 'flood', 'aqi', 'water', 'green'];
      const availability: Record<string, boolean> = {
        temperature: true,
        flood: true,
        aqi: true,
        water: true,
        green: true,
      };

      try {
        await Promise.all(
          metricsList.map(async (metric) => {
            let metricParam = metric;
            if (metric === 'aqi') metricParam = 'air_quality';
            if (metric === 'water') metricParam = 'water_stress';
            if (metric === 'green') metricParam = 'green_cover';

            try {
              const data = await riskService.getRiskMapData(locationId, metricParam, year);
              if (data && data.features && data.features.length > 0) {
                availability[metric] = true;
              }
            } catch (err) {
              console.warn(`[ClimateMap] Availability check warning for ${metric}:`, err);
            }
          })
        );

        if (isMounted) {
          setAvailableLayers(availability);
          setCheckingAvailability(false);
        }
      } catch (err) {
        console.error('[ClimateMap] Error in availability checks:', err);
        if (isMounted) {
          setCheckingAvailability(false);
        }
      }
    };

    checkAvailability();

    return () => {
      isMounted = false;
    };
  }, [locationId, year]);

  // Fetch active overlay features when activeOverlay, locationId, or year changes
  useEffect(() => {
    if (!activeOverlay) {
      setOverlayFeatures([]);
      setActiveOverlayDataType(null);
      return;
    }

    let isMounted = true;
    setLoadingFeatures(true);

    const fetchFeatures = async () => {
      try {
        let metricParam = activeOverlay;
        if (activeOverlay === 'aqi') metricParam = 'air_quality';
        if (activeOverlay === 'water') metricParam = 'water_stress';
        if (activeOverlay === 'green') metricParam = 'green_cover';

        const data = await riskService.getRiskMapData(locationId, metricParam, year);
        if (isMounted) {
          if (data && data.features && data.features.length > 0) {
            setOverlayFeatures(data.features);
            const firstFeature = data.features[0];
            const dataType = firstFeature.properties?.metadata?.dataType || (firstFeature.properties as any)?.dataType || 'PROJECTED';
            setActiveOverlayDataType(dataType);
          } else {
            setOverlayFeatures([]);
            setActiveOverlayDataType(null);
          }
          setLoadingFeatures(false);
        }
      } catch (err) {
        console.error(`[ClimateMap] Failed to load features for ${activeOverlay}:`, err);
        if (isMounted) {
          setOverlayFeatures([]);
          setActiveOverlayDataType(null);
          setLoadingFeatures(false);
        }
      }
    };

    fetchFeatures();

    return () => {
      isMounted = false;
    };
  }, [activeOverlay, locationId, year]);

  const handleToggleOverlay = (layerId: string) => {
    setActiveOverlay((prev) => (prev === layerId ? null : layerId));
  };

  if (isNaN(parsedLat) || isNaN(parsedLng) || latitude === null || longitude === null) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-mid-dark rounded-lg min-h-[350px] border border-border-gray/30 text-center flex-grow w-full">
        <span className="text-sm text-text-silver font-sans">
          Climate map is temporarily unavailable for this location.
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-[400px] w-full rounded-lg overflow-hidden border border-border-gray bg-mid-dark">
      {/* Floating Risk Legend (Top-Left) */}
      {activeOverlay && (
        <div className="absolute top-3 left-3 z-[1000] flex flex-col space-y-1.5 p-2.5 bg-dark-surface/95 border border-border-gray rounded-lg shadow-heavy backdrop-blur-md w-[140px]">
          <span className="text-[10px] font-bold text-text-base uppercase tracking-wider px-1 font-sans">
            {layers.find((l) => l.id === activeOverlay)?.name}
          </span>
          {loadingFeatures ? (
            <span className="text-[10px] text-text-silver font-sans px-1 italic">Loading...</span>
          ) : (
            <>
              {activeOverlayDataType && (
                <span className="text-[9px] text-spotify-green font-bold uppercase tracking-wider px-1 font-sans">
                  {activeOverlayDataType}
                </span>
              )}
              <div className="flex flex-col space-y-1 text-[11px] font-sans px-1 pt-1.5 border-t border-border-gray/40">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#f3727f]"></span>
                  <span className="text-text-silver">Very High</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#ffa42b]"></span>
                  <span className="text-text-silver font-sans">High</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#eed329]"></span>
                  <span className="text-text-silver font-sans">Medium</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#4beb4b]"></span>
                  <span className="text-text-silver font-sans">Low</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#539df5]"></span>
                  <span className="text-text-silver font-sans">Very Low</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Risk Layer Controls (Top-Right) */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col space-y-2 w-[190px] p-2.5 bg-dark-surface/95 border border-border-gray rounded-lg shadow-heavy backdrop-blur-md">
        <span className="text-[10px] font-bold text-text-silver uppercase tracking-wider px-1">Risk Overlays</span>
        <div className="flex flex-col space-y-1">
          {layers.map((layer) => {
            const isActive = activeOverlay === layer.id;
            const isAvailable = availableLayers[layer.id] ?? true;
            const badgeText = checkingAvailability
              ? '...'
              : isActive
                ? 'ACTIVE'
                : isAvailable
                  ? getFallbackStatus(layer.id)
                  : 'N/A';

            return (
              <button
                key={layer.id}
                onClick={() => handleToggleOverlay(layer.id)}
                title={`${layer.name} risk overlay`}
                className={`text-left text-xs font-sans px-2.5 py-1.5 rounded transition-colors duration-150 flex items-center justify-between font-semibold select-none gap-2 ${
                  isActive
                    ? 'bg-spotify-green text-black hover:bg-spotify-green/90 font-bold cursor-pointer'
                    : 'text-text-silver hover:bg-mid-dark hover:text-text-base cursor-pointer'
                }`}
              >
                <span className="truncate">{layer.name}</span>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                  isActive
                    ? 'border-black/30 bg-black/10 text-black'
                    : 'border-border-gray/50 bg-mid-dark text-text-silver'
                }`}>
                  {badgeText}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Leaflet Map */}
      <MapContainer
        key={`${locationId}-${parsedLat}-${parsedLng}`}
        ref={mapRef}
        center={[parsedLat, parsedLng]}
        zoom={12}
        scrollWheelZoom={false}
        zoomControl={true}
        className="w-full h-full min-h-[400px] z-[1]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[parsedLat, parsedLng]} icon={customMarkerIcon}>
          <Popup className="custom-leaflet-popup">
            <div className="text-near-black p-1.5 bg-white font-sans rounded w-48">
              <h4 className="font-bold text-xs text-near-black mb-0.5">{locationName}</h4>
              <p className="text-[10px] text-light-border font-mono mb-2">
                {parsedLat.toFixed(4)}° N, {parsedLng.toFixed(4)}° E
              </p>
              <div className="border-t border-gray-200 pt-1.5 mt-1.5 space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-600">Heat Risk:</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    heatRiskLevel === 'VERY_HIGH' ? 'bg-red-100 text-red-700' :
                    heatRiskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    heatRiskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    heatRiskLevel === 'LOW' ? 'bg-green-100 text-green-700' :
                    heatRiskLevel === 'VERY_LOW' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {heatRiskLevel?.replace('_', ' ') || 'Moderate'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-600">Flood Risk:</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    floodRiskLevel === 'VERY_HIGH' ? 'bg-red-100 text-red-700' :
                    floodRiskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    floodRiskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    floodRiskLevel === 'LOW' ? 'bg-green-100 text-green-700' :
                    heatRiskLevel === 'VERY_LOW' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {floodRiskLevel?.replace('_', ' ') || 'Low'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-semibold">Air Quality:</span>
                  <span className="font-semibold text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                    {metrics?.airQuality?.aqi != null ? `${metrics.airQuality.aqi} AQI` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-semibold">Water Stress:</span>
                  <span className="font-semibold text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                    {metrics?.waterAvailability?.value != null ? `${metrics.waterAvailability.value}%` : (metrics?.waterAvailability?.stressLevel ?? 'N/A')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-semibold">Green Cover:</span>
                  <span className="font-semibold text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                    {metrics?.greenCover?.value != null ? `${metrics.greenCover.value}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>

        {activeOverlay && overlayFeatures.length > 0 && (
          <GeoJSON
            key={`${locationId}-${year}-${activeOverlay}-${overlayFeatures.length}`}
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
              if (level) {
                layer.bindPopup(`
                  <div class="text-near-black p-1 bg-white font-sans rounded">
                    <h4 class="font-bold text-xs mb-0.5">${layers.find((l) => l.id === activeOverlay)?.name} Risk Zone</h4>
                    <div class="text-[11px] space-y-1">
                      <div><span class="font-semibold">Level:</span> ${level.replace('_', ' ')}</div>
                      ${score !== null ? `<div><span class="font-semibold">Score:</span> ${score.toFixed(4)}</div>` : ''}
                      ${dataType ? `<div><span class="font-semibold">Data Type:</span> ${dataType}</div>` : ''}
                      ${source ? `<div><span class="font-semibold">Source:</span> ${source}</div>` : ''}
                    </div>
                  </div>
                `);
              }
            }}
          />
        )}

        <MapController lat={parsedLat} lng={parsedLng} />
      </MapContainer>
    </div>
  );
};

export default ClimateMap;
