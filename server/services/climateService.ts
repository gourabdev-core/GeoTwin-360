import { supabase } from '../config/supabase.js';
import { LocationService } from './locationService.js';
import { WeatherService } from './weatherService.js';
import { NasaPowerService } from './nasaPowerService.js';
import { ClimateData, GeoTwinLocation } from '../types/climate.js';

export class ClimateService {
  /**
   * Get current climate data for given coordinates.
   * Utilizes database caching, calls OpenWeather adapter on cache miss,
   * writes back to the database preventing duplicates, and manages fallback.
   */
  static async getCurrentClimate(lat: number, lng: number): Promise<ClimateData> {
    // 1. Validation
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      const err: any = new Error('Invalid coordinate parameters.');
      err.statusCode = 400;
      err.code = 'INVALID_COORDINATES';
      throw err;
    }

    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));
    let locationId: string | null = null;
    let locationName = 'Unknown Location';
    let countryName = 'Unknown Country';
    let city = '';
    let region = '';
    let countryCode = '';

    // 2. Resolve location
    try {
      const { data: locData, error: locErr } = await supabase
        .from('locations')
        .select('*')
        .eq('latitude', roundedLat)
        .eq('longitude', roundedLng)
        .maybeSingle();

      if (locErr) {
        console.error('[ClimateService] Supabase location lookup failure:', locErr.message);
      }

      if (locData) {
        locationId = locData.id;
        locationName = locData.name;
        countryName = locData.country;
        city = locData.city || '';
        region = locData.region || '';
        countryCode = locData.country_code || '';
      } else {
        console.log(`[ClimateService] Coordinates (${roundedLat}, ${roundedLng}) not in DB. Reverse geocoding...`);
        const geoResult = await LocationService.reverseGeocode(roundedLat, roundedLng);
        const createdLoc = await LocationService.getOrCreateLocation(geoResult);
        locationId = createdLoc.id;
        locationName = createdLoc.name;
        countryName = createdLoc.country;
        city = createdLoc.city || '';
        region = createdLoc.region || '';
        countryCode = createdLoc.country_code || '';
      }
    } catch (locResolutionError: any) {
      console.error('[ClimateService] Location resolution failed:', locResolutionError.message);
    }

    const locationContext: GeoTwinLocation = {
      id: locationId || undefined,
      name: locationName,
      city,
      region,
      country: countryName,
      countryCode,
      latitude: roundedLat,
      longitude: roundedLng,
    };

    // 3. Check cache in database (last 10 minutes)
    if (locationId) {
      try {
        const cacheExpiry = new Date(Date.now() - 10 * 60 * 1000);
        const { data: cachedObs, error: cacheErr } = await supabase
          .from('climate_observations')
          .select('*')
          .eq('location_id', locationId)
          .eq('source', 'OpenWeather')
          .gte('created_at', cacheExpiry.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (cacheErr) {
          console.error('[ClimateService] Cache fetch error:', cacheErr.message);
        } else if (cachedObs && cachedObs.length > 0) {
          const cached = cachedObs[0];
          console.log(`[ClimateService] Cache HIT for locationId: ${locationId}`);
          return {
            location: locationContext,
            latitude: roundedLat,
            longitude: roundedLng,
            observedAt: cached.observed_at,
            temperature: cached.temperature !== null ? Number(cached.temperature) : null,
            feelsLike: cached.metadata?.feels_like !== undefined ? Number(cached.metadata.feels_like) : null,
            humidity: cached.metadata?.humidity !== undefined ? Number(cached.metadata.humidity) : null,
            pressure: cached.metadata?.pressure !== undefined ? Number(cached.metadata.pressure) : null,
            precipitation: cached.metadata?.precipitation !== undefined ? Number(cached.metadata.precipitation) : null,
            wind: (cached.metadata?.wind_speed !== undefined || cached.metadata?.wind_direction !== undefined) ? {
              speed: cached.metadata?.wind_speed !== undefined ? Number(cached.metadata.wind_speed) : null,
              direction: cached.metadata?.wind_direction !== undefined ? Number(cached.metadata.wind_direction) : null,
            } : null,
            source: 'OpenWeather',
            dataType: 'cached',
            retrievedAt: cached.metadata?.retrieved_at || cached.created_at || new Date().toISOString(),
            // Backward compatibility
            windSpeed: cached.metadata?.wind_speed !== undefined ? Number(cached.metadata.wind_speed) : undefined,
            windDirection: cached.metadata?.wind_direction !== undefined ? Number(cached.metadata.wind_direction) : undefined,
            cloudiness: cached.metadata?.cloudiness !== undefined ? Number(cached.metadata.cloudiness) : undefined,
            description: cached.metadata?.weather_condition || undefined,
            icon: cached.metadata?.icon || undefined,
            aqi: cached.metadata?.aqi !== undefined ? Number(cached.metadata.aqi) : undefined,
          };
        }
      } catch (cacheFetchError: any) {
        console.error('[ClimateService] Cache reading failed:', cacheFetchError.message);
      }
    }

    // 4. Cache miss: Fetch from live adapter
    try {
      console.log(`[ClimateService] Cache MISS. Fetching live weather from adapter...`);
      const liveData = await WeatherService.fetchLiveWeather(roundedLat, roundedLng);
      liveData.location = locationContext;

      // Persist cache in database if locationId exists
      if (locationId) {
        try {
          // Prevent duplicates by checking if record exists at the exact same observed_at & source
          const { data: existingObs } = await supabase
            .from('climate_observations')
            .select('id')
            .eq('location_id', locationId)
            .eq('observed_at', liveData.observedAt)
            .eq('source', 'OpenWeather')
            .maybeSingle();

          if (!existingObs) {
            const { error: insertErr } = await supabase
              .from('climate_observations')
              .insert({
                location_id: locationId,
                observed_at: liveData.observedAt,
                temperature: liveData.temperature,
                source: 'OpenWeather',
                metadata: {
                  feels_like: liveData.feelsLike,
                  humidity: liveData.humidity,
                  pressure: liveData.pressure,
                  wind_speed: liveData.wind?.speed ?? liveData.windSpeed,
                  wind_direction: liveData.wind?.direction ?? liveData.windDirection,
                  cloudiness: liveData.cloudiness,
                  weather_condition: liveData.description,
                  retrieved_at: liveData.retrievedAt,
                  icon: liveData.icon,
                  aqi: liveData.aqi,
                }
              });

            if (insertErr) {
              console.error('[ClimateService] Cache write failure:', insertErr.message);
            } else {
              console.log(`[ClimateService] Live weather cached successfully.`);
            }
          } else {
            console.log(`[ClimateService] Observation already exists in DB. Skipping insert to prevent duplication.`);
          }
        } catch (dbWriteError: any) {
          console.error('[ClimateService] Cache persistence failed:', dbWriteError.message);
        }
      }

      return liveData;
    } catch (apiError: any) {
      console.error('[ClimateService] Adapter live fetch failed:', apiError.message);
    }

    // 5. Fallback strategy: return cached database observations even if older
    if (locationId) {
      try {
        console.log(`[ClimateService] Fetching older observations as fallback...`);
        const { data: oldObs, error: oldErr } = await supabase
          .from('climate_observations')
          .select('*')
          .eq('location_id', locationId)
          .eq('source', 'OpenWeather')
          .order('observed_at', { ascending: false })
          .limit(1);

        if (!oldErr && oldObs && oldObs.length > 0) {
          const old = oldObs[0];
          console.log(`[ClimateService] Returning older database observation as fallback.`);
          return {
            location: locationContext,
            latitude: roundedLat,
            longitude: roundedLng,
            observedAt: old.observed_at,
            temperature: old.temperature !== null ? Number(old.temperature) : null,
            feelsLike: old.metadata?.feels_like !== undefined ? Number(old.metadata.feels_like) : null,
            humidity: old.metadata?.humidity !== undefined ? Number(old.metadata.humidity) : null,
            pressure: old.metadata?.pressure !== undefined ? Number(old.metadata.pressure) : null,
            precipitation: old.metadata?.precipitation !== undefined ? Number(old.metadata.precipitation) : null,
            wind: (old.metadata?.wind_speed !== undefined || old.metadata?.wind_direction !== undefined) ? {
              speed: old.metadata?.wind_speed !== undefined ? Number(old.metadata.wind_speed) : null,
              direction: old.metadata?.wind_direction !== undefined ? Number(old.metadata.wind_direction) : null,
            } : null,
            source: 'OpenWeather',
            dataType: 'cached',
            retrievedAt: old.metadata?.retrieved_at || old.created_at || new Date().toISOString(),
            // Backward compatibility
            windSpeed: old.metadata?.wind_speed !== undefined ? Number(old.metadata.wind_speed) : undefined,
            windDirection: old.metadata?.wind_direction !== undefined ? Number(old.metadata.wind_direction) : undefined,
            cloudiness: old.metadata?.cloudiness !== undefined ? Number(old.metadata.cloudiness) : undefined,
            description: old.metadata?.weather_condition || undefined,
            icon: old.metadata?.icon || undefined,
            aqi: old.metadata?.aqi !== undefined ? Number(old.metadata.aqi) : undefined,
          };
        }
      } catch (fallbackQueryErr: any) {
        console.error('[ClimateService] Fallback DB query failed:', fallbackQueryErr.message);
      }
    }

    // 6. Absolute Fallback: generate coordinate-based mock fallback under development/testing conditions
    console.warn('[ClimateService] All methods failed. Generating coordinate-dependent mock fallback...');
    const tempOffset = 25 - Math.abs(roundedLat) * 0.2;
    const fallbackTemp = parseFloat(tempOffset.toFixed(1));
    const fallbackFeelsLike = parseFloat((tempOffset + 1).toFixed(1));

    return {
      location: locationContext,
      latitude: roundedLat,
      longitude: roundedLng,
      observedAt: new Date().toISOString(),
      temperature: fallbackTemp,
      feelsLike: fallbackFeelsLike,
      humidity: 60,
      pressure: 1013,
      precipitation: 0,
      wind: { speed: 3.5, direction: 180 },
      source: 'MockWeather',
      dataType: 'fallback',
      retrievedAt: new Date().toISOString(),
      // Backward compatibility
      windSpeed: 3.5,
      windDirection: 180,
      cloudiness: 40,
      description: 'clear sky (fallback)',
    };
  }

  /**
   * Get historical climate data for a saved location.
   * Utilizes database caching, calls NASA POWER adapter on cache miss,
   * writes back to the database preventing duplicates, and manages fallback.
   */
  static async getHistoricalClimate(locationId: string): Promise<ClimateData[]> {
    // 1. Resolve coordinates from location ID
    const { data: locData, error: locErr } = await supabase
      .from('locations')
      .select('*')
      .eq('id', locationId)
      .maybeSingle();

    if (locErr || !locData) {
      const err: any = new Error('Location not found.');
      err.statusCode = 404;
      err.code = 'LOCATION_NOT_FOUND';
      throw err;
    }

    const roundedLat = parseFloat(Number(locData.latitude).toFixed(6));
    const roundedLng = parseFloat(Number(locData.longitude).toFixed(6));
    const startYear = 2015;
    const endYear = 2024;
    const expectedYears = endYear - startYear + 1;

    const locationContext: GeoTwinLocation = {
      id: locData.id,
      name: locData.name,
      city: locData.city,
      region: locData.region,
      country: locData.country,
      countryCode: locData.country_code,
      latitude: roundedLat,
      longitude: roundedLng,
    };

    // 2. Check cache in database (must have exactly the number of expected years)
    try {
      console.log(`[ClimateService] Checking cache for historical climate of location: ${locationId}`);
      const { data: cachedObs, error: cacheErr } = await supabase
        .from('climate_observations')
        .select('*')
        .eq('location_id', locationId)
        .eq('source', 'NASA POWER')
        .order('observed_at', { ascending: true });

      if (cacheErr) {
        console.error('[ClimateService] Historical cache query failed:', cacheErr.message);
      } else if (cachedObs && cachedObs.length === expectedYears) {
        console.log(`[ClimateService] Historical cache HIT. Returning cached observations.`);
        return cachedObs.map((obs) => {
          const obsYear = new Date(obs.observed_at).getUTCFullYear();
          return {
            location: locationContext,
            latitude: roundedLat,
            longitude: roundedLng,
            observedAt: obs.observed_at,
            temperature: obs.temperature !== null ? Number(obs.temperature) : null,
            feelsLike: obs.metadata?.feels_like !== undefined ? Number(obs.metadata.feels_like) : null,
            humidity: obs.metadata?.humidity !== undefined ? Number(obs.metadata.humidity) : null,
            pressure: obs.metadata?.pressure !== undefined ? Number(obs.metadata.pressure) : null,
            precipitation: obs.metadata?.precipitation !== undefined ? Number(obs.metadata.precipitation) : null,
            wind: null,
            source: 'NASA POWER',
            dataType: 'historical',
            retrievedAt: obs.metadata?.retrieved_at || obs.created_at || new Date().toISOString(),
            // Backward compatibility
            year: obsYear,
          };
        });
      }
    } catch (cacheError: any) {
      console.error('[ClimateService] Historical cache reading failed:', cacheError.message);
    }

    // 3. Cache miss: Fetch from live NASA POWER adapter
    try {
      console.log(`[ClimateService] Historical cache MISS/incomplete. Querying NASA POWER Adapter...`);
      const liveRecords = await NasaPowerService.fetchLiveHistorical(roundedLat, roundedLng);

      // Persist records in Supabase cache
      try {
        console.log(`[ClimateService] Writing historical records to Supabase...`);
        for (const rec of liveRecords) {
          rec.location = locationContext;

          // Prevent duplicates by checking if record exists at the exact location, observed_at, and source
          const { data: existingObs } = await supabase
            .from('climate_observations')
            .select('id')
            .eq('location_id', locationId)
            .eq('observed_at', rec.observedAt)
            .eq('source', 'NASA POWER')
            .maybeSingle();

          if (!existingObs) {
            const { error: insertErr } = await supabase
              .from('climate_observations')
              .insert({
                location_id: locationId,
                observed_at: rec.observedAt,
                temperature: rec.temperature,
                source: 'NASA POWER',
                metadata: {
                  source_name: 'NASA POWER',
                  data_type: 'historical',
                  precipitation: rec.precipitation,
                  retrieved_at: rec.retrievedAt,
                }
              });

            if (insertErr) {
              console.error(`[ClimateService] Cache insert error for year ${rec.year}:`, insertErr.message);
            }
          }
        }
        console.log('[ClimateService] Database cache write complete.');
      } catch (dbWriteErr: any) {
        console.error('[ClimateService] Caching historical records failed:', dbWriteErr.message);
      }

      return liveRecords.map(rec => ({
        ...rec,
        location: locationContext
      }));
    } catch (apiError: any) {
      console.error('[ClimateService] NASA POWER adapter fetch failed:', apiError.message);
    }

    // 4. Fallback: Return whatever incomplete cached records are in the DB
    try {
      console.log(`[ClimateService] Running historical fallback strategy...`);
      const { data: cachedObs } = await supabase
        .from('climate_observations')
        .select('*')
        .eq('location_id', locationId)
        .eq('source', 'NASA POWER')
        .order('observed_at', { ascending: true });

      if (cachedObs && cachedObs.length > 0) {
        console.log(`[ClimateService] Historical Fallback: returning ${cachedObs.length} years from DB.`);
        return cachedObs.map((obs) => {
          const obsYear = new Date(obs.observed_at).getUTCFullYear();
          return {
            location: locationContext,
            latitude: roundedLat,
            longitude: roundedLng,
            observedAt: obs.observed_at,
            temperature: obs.temperature !== null ? Number(obs.temperature) : null,
            feelsLike: obs.metadata?.feels_like !== undefined ? Number(obs.metadata.feels_like) : null,
            humidity: obs.metadata?.humidity !== undefined ? Number(obs.metadata.humidity) : null,
            pressure: obs.metadata?.pressure !== undefined ? Number(obs.metadata.pressure) : null,
            precipitation: obs.metadata?.precipitation !== undefined ? Number(obs.metadata.precipitation) : null,
            wind: null,
            source: 'NASA POWER',
            dataType: 'historical',
            retrievedAt: obs.metadata?.retrieved_at || obs.created_at || new Date().toISOString(),
            // Backward compatibility
            year: obsYear,
          };
        });
      }
    } catch (fallbackError: any) {
      console.error('[ClimateService] Historical fallback DB fetch failed:', fallbackError.message);
    }

    // If absolutely no cache and adapter failed, throw HTTP 503
    const unavailableErr: any = new Error('Historical climate data is temporarily unavailable.');
    unavailableErr.statusCode = 503;
    unavailableErr.code = 'CLIMATE_DATA_UNAVAILABLE';
    throw unavailableErr;
  }
}
