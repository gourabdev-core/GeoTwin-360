import axios from 'axios';
import { supabase, isPrivileged } from '../config/supabase.js';
import { env } from '../config/env.js';

export interface LocationSearchResult {
  id?: string;
  name: string;
  city?: string;
  region?: string;
  state?: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  displayName?: string;
}

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

const COUNTRY_CODES: Record<string, string> = {
  AF: "Afghanistan", AX: "Aland Islands", AL: "Albania", DZ: "Algeria", AS: "American Samoa", AD: "Andorra", AO: "Angola", AI: "Anguilla", AQ: "Antarctica", AG: "Antigua and Barbuda",
  AR: "Argentina", AM: "Armenia", AW: "Aruba", AU: "Australia", AT: "Austria", AZ: "Azerbaijan", BS: "Bahamas", BH: "Bahrain", BD: "Bangladesh", BB: "Barbados",
  BY: "Belarus", BE: "Belgium", BZ: "Belize", BJ: "Benin", BM: "Bermuda", BT: "Bhutan", BO: "Bolivia", BQ: "Bonaire, Sint Eustatius and Saba", BA: "Bosnia and Herzegovina", BW: "Botswana",
  BV: "Bouvet Island", BR: "Brazil", IO: "British Indian Ocean Territory", BN: "Brunei Darussalam", BG: "Bulgaria", BF: "Burkina Faso", BI: "Burundi", CV: "Cabo Verde", KH: "Cambodia", CM: "Cameroon",
  CA: "Canada", KY: "Cayman Islands", CF: "Central African Republic", TD: "Chad", CL: "Chile", CN: "China", CX: "Christmas Island", CC: "Cocos (Keeling) Islands", CO: "Colombia", KM: "Comoros",
  CD: "Congo (Democratic Republic of the)", CG: "Congo (Republic of the)", CK: "Cook Islands", CR: "Costa Rica", CI: "Cote d'Ivoire", HR: "Croatia", CU: "Cuba", CW: "Curacao", CY: "Cyprus", CZ: "Czechia",
  DK: "Denmark", DJ: "Djibouti", DM: "Dominica", DO: "Dominican Republic", EC: "Ecuador", EG: "Egypt", SV: "El Salvador", GQ: "Equatorial Guinea", ER: "Eritrea", EE: "Estonia",
  SZ: "Eswatini", ET: "Ethiopia", FK: "Falkland Islands", FO: "Faroe Islands", FJ: "Fiji", FI: "Finland", FR: "France", GF: "French Guiana", PF: "French Polynesia", TF: "French Southern Territories",
  GA: "Gabon", GM: "Gambia", GE: "Georgia", DE: "Germany", GH: "Ghana", GI: "Gibraltar", GR: "Greece", GL: "Greenland", GD: "Grenada", GP: "Guadeloupe",
  GU: "Guam", GT: "Guatemala", GG: "Guernsey", GN: "Guinea", GW: "Guinea-Bissau", GY: "Guyana", HT: "Haiti", HM: "Heard Island and McDonald Islands", VA: "Holy See", HN: "Honduras",
  HK: "Hong Kong", HU: "Hungary", IS: "Iceland", IN: "India", ID: "Indonesia", IR: "Iran", IQ: "Iraq", IE: "Ireland", IM: "Isle of Man", IL: "Israel",
  IT: "Italy", JM: "Jamaica", JP: "Japan", JE: "Jersey", JO: "Jordan", KZ: "Kazakhstan", KE: "Kenya", KI: "Kiribati", KP: "Korea (Democratic People's Republic of)", KR: "Korea (Republic of)",
  KW: "Kuwait", KG: "Kyrgyzstan", LA: "Lao People's Democratic Republic", LV: "Latvia", LB: "Lebanon", LS: "Lesotho", LR: "Liberia", LY: "Libya", LI: "Liechtenstein", LT: "Lithuania",
  LU: "Luxembourg", MO: "Macao", MG: "Madagascar", MW: "Malawi", MY: "Malaysia", MV: "Maldives", ML: "Mali", MT: "Malta", MH: "Marshall Islands", MQ: "Martinique",
  MR: "Mauritania", MU: "Mauritius", YT: "Mayotte", MX: "Mexico", FM: "Micronesia", MD: "Moldova", MC: "Monaco", MN: "Mongolia", ME: "Montenegro", MS: "Montserrat",
  MA: "Morocco", MZ: "Mozambique", MM: "Myanmar", NA: "Namibia", NR: "Nauru", NP: "Nepal", NL: "Netherlands", NC: "New Caledonia", NZ: "New Zealand", NI: "Nicaragua",
  NE: "Niger", NG: "Nigeria", NU: "Niue", NF: "Norfolk Island", MP: "Northern Mariana Islands", NO: "Norway", OM: "Oman", PK: "Pakistan", PW: "Palau", PS: "Palestine, State of",
  PA: "Panama", PG: "Papua New Guinea", PY: "Paraguay", PE: "Peru", PH: "Philippines", PN: "Pitcairn", PL: "Poland", PT: "Portugal", PR: "Puerto Rico", QA: "Qatar",
  RE: "Reunion", RO: "Romania", RU: "Russian Federation", RW: "Rwanda", BL: "Saint Barthelemy", SH: "Saint Helena, Ascension and Tristan da Cunha", KN: "Saint Kitts and Nevis", LC: "Saint Lucia", MF: "Saint Martin", PM: "Saint Pierre and Miquelon",
  VC: "Saint Vincent and the Grenadines", WS: "Samoa", SM: "San Marino", ST: "Sao Tome and Principe", SA: "Saudi Arabia", SN: "Senegal", RS: "Serbia", SC: "Seychelles", SL: "Sierra Leone", SG: "Singapore",
  SX: "Sint Maarten", SK: "Slovakia", SI: "Slovenia", SB: "Solomon Islands", SO: "Somalia", ZA: "South Africa", GS: "South Georgia and the South Sandwich Islands", SS: "South Sudan", ES: "Spain", LK: "Sri Lanka",
  SD: "Sudan", SR: "Suriname", SJ: "Svalbard and Jan Mayen", SE: "Sweden", CH: "Switzerland", SY: "Syrian Arab Republic", TW: "Taiwan", TJ: "Tajikistan", TZ: "Tanzania", TH: "Thailand",
  TL: "Timor-Leste", TG: "Togo", TK: "Tokelau", TO: "Tonga", TT: "Trinidad and Tobago", TN: "Tunisia", TR: "Turkey", TM: "Turkmenistan", TC: "Turks and Caicos Islands", TV: "Tuvalu",
  UG: "Uganda", UA: "Ukraine", AE: "United Arab Emirates", GB: "United Kingdom", US: "United States", UM: "United States Minor Outlying Islands", UY: "Uruguay", UZ: "Uzbekistan", VU: "Vanuatu", VE: "Venezuela",
  VN: "Viet Nam", VG: "Virgin Islands (British)", VI: "Virgin Islands (U.S.)", WF: "Wallis and Futuna", EH: "Western Sahara", YE: "Yemen", ZM: "Zambia", ZW: "Zimbabwe"
};

const getCountryName = (code: string): string => {
  if (!code) return 'Unknown';
  return COUNTRY_CODES[code.toUpperCase()] || code;
};

export class LocationService {
  private static searchCache = new Map<string, { data: LocationSearchResult[]; timestamp: number }>();
  private static reverseCache = new Map<string, { data: LocationSearchResult; timestamp: number }>();
  private static locationByIdCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly SEARCH_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  private static readonly LOCATION_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Search for locations using OpenWeather Geocoding API with in-memory caching
   */
  static async searchLocations(query: string, limit = 5): Promise<LocationSearchResult[]> {
    if (!query || query.trim().length < 2) {
      const err: AppError = new Error('Search query must be at least 2 characters long.');
      err.statusCode = 400;
      err.code = 'INVALID_QUERY';
      throw err;
    }

    const trimmedQuery = query.trim();
    const cacheKey = `${trimmedQuery.toLowerCase()}__${limit}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.SEARCH_CACHE_TTL_MS) {
      return cached.data;
    }

    if (query.length > 100) {
      const err: AppError = new Error('Search query exceeds maximum length of 100 characters.');
      err.statusCode = 400;
      err.code = 'INVALID_QUERY';
      throw err;
    }

    if (!env.OPENWEATHER_API_KEY) {
      const err: AppError = new Error('Geocoding service is temporarily unconfigured.');
      err.statusCode = 503;
      err.code = 'PROVIDER_UNCONFIGURED';
      throw err;
    }

    try {
      const response = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
        params: {
          q: query.trim(),
          limit,
          appid: env.OPENWEATHER_API_KEY,
        },
        timeout: 5000,
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format from geocoding provider.');
      }

      const results = response.data.map((item: any) => {
        const countryName = getCountryName(item.country);
        const stateName = item.state || undefined;
        const displayName = [item.name, stateName, countryName].filter(Boolean).join(', ');
        const lat = item.lat !== undefined && item.lat !== null ? parseFloat(Number(item.lat).toFixed(6)) : 0;
        const lng = item.lon !== undefined && item.lon !== null ? parseFloat(Number(item.lon).toFixed(6)) : 0;
        const id = `loc-${lat.toFixed(4)}-${lng.toFixed(4)}`;
        const resObj: LocationSearchResult = {
          id,
          name: item.name || 'Unknown',
          city: item.name || 'Unknown',
          region: stateName,
          state: stateName,
          country: countryName,
          countryCode: item.country || '',
          latitude: lat,
          longitude: lng,
          displayName,
        };
        // Pre-seed locationById and reverse caches to avoid duplicate roundtrips
        this.locationByIdCache.set(id, { data: resObj, timestamp: Date.now() });
        this.reverseCache.set(`${lat.toFixed(4)}_${lng.toFixed(4)}`, { data: resObj, timestamp: Date.now() });
        return resObj;
      });

      this.searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
      return results;
    } catch (error: any) {
      console.error('[LocationService] OpenWeather Geocoding API failure:', error.message);
      const err: AppError = new Error('Location search is temporarily unavailable.');
      err.statusCode = error.response?.status || 502;
      err.code = 'PROVIDER_FAILURE';
      throw err;
    }
  }

  /**
   * Resolve coordinates using OpenWeather Reverse Geocoding API with caching
   */
  static async reverseGeocode(lat: number, lng: number): Promise<LocationSearchResult> {
    if (isNaN(lat) || lat < -90 || lat > 90) {
      const err: AppError = new Error('Latitude must be a valid number between -90 and 90.');
      err.statusCode = 400;
      err.code = 'INVALID_COORDINATES';
      throw err;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      const err: AppError = new Error('Longitude must be a valid number between -180 and 180.');
      err.statusCode = 400;
      err.code = 'INVALID_COORDINATES';
      throw err;
    }

    const revKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const cached = this.reverseCache.get(revKey);
    if (cached && Date.now() - cached.timestamp < this.LOCATION_CACHE_TTL_MS) {
      return cached.data;
    }

    if (!env.OPENWEATHER_API_KEY) {
      const err: AppError = new Error('Geocoding service is temporarily unconfigured.');
      err.statusCode = 503;
      err.code = 'PROVIDER_UNCONFIGURED';
      throw err;
    }

    try {
      const response = await axios.get('https://api.openweathermap.org/geo/1.0/reverse', {
        params: {
          lat,
          lon: lng,
          limit: 1,
          appid: env.OPENWEATHER_API_KEY,
        },
        timeout: 5000,
      });

      if (!Array.isArray(response.data) || response.data.length === 0) {
        const err: AppError = new Error('No location found at these coordinates.');
        err.statusCode = 442;
        err.code = 'LOCATION_NOT_FOUND';
        throw err;
      }

      const item = response.data[0];
      if (!item) {
        const err: AppError = new Error('No location found at these coordinates.');
        err.statusCode = 442;
        err.code = 'LOCATION_NOT_FOUND';
        throw err;
      }

      const countryName = getCountryName(item.country);
      const stateName = item.state || undefined;
      const displayName = [item.name, stateName, countryName].filter(Boolean).join(', ');
      const parsedLat = parseFloat(lat.toFixed(6));
      const parsedLng = parseFloat(lng.toFixed(6));
      const id = `loc-${parsedLat.toFixed(4)}-${parsedLng.toFixed(4)}`;

      const result: LocationSearchResult = {
        id,
        name: item.name || 'Unknown',
        city: item.name || 'Unknown',
        region: stateName,
        state: stateName,
        country: countryName,
        countryCode: item.country || '',
        latitude: parsedLat,
        longitude: parsedLng,
        displayName,
      };

      this.reverseCache.set(revKey, { data: result, timestamp: Date.now() });
      this.locationByIdCache.set(id, { data: result, timestamp: Date.now() });
      return result;
    } catch (error: any) {
      console.error('[LocationService] OpenWeather Reverse Geocoding API failure:', error.message);
      if (error.code === 'LOCATION_NOT_FOUND') throw error;
      const err: AppError = new Error('Location lookup is temporarily unavailable.');
      err.statusCode = error.response?.status || 502;
      err.code = 'PROVIDER_FAILURE';
      throw err;
    }
  }

  /**
   * Get an existing location from the database or create it if it doesn't exist.
   * Prevents duplicates by querying coordinates.
   */
  static async getOrCreateLocation(data: Omit<LocationSearchResult, 'id'>): Promise<any> {
    const lat = parseFloat(data.latitude.toFixed(6));
    const lng = parseFloat(data.longitude.toFixed(6));

    // Validate inputs before DB execution
    if (!data.name || data.name.trim().length === 0) {
      const err: AppError = new Error('Location name is required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_FAILED';
      throw err;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      const err: AppError = new Error('Invalid coordinate values.');
      err.statusCode = 400;
      err.code = 'VALIDATION_FAILED';
      throw err;
    }

    try {
      // 1. Check if location already exists in database
      const { data: existing, error: selectError } = await supabase
        .from('locations')
        .select('*')
        .eq('latitude', lat)
        .eq('longitude', lng)
        .maybeSingle();

      if (selectError) {
        if (selectError.code === 'PGRST205' || selectError.message?.includes('schema cache')) {
          console.warn('[LocationService] public.locations table is missing from schema cache. Using fallback entity.');
          return {
            id: `loc-${lat.toFixed(4)}-${lng.toFixed(4)}`,
            name: data.name,
            city: data.city || data.name,
            region: data.region || null,
            country: data.country,
            country_code: data.countryCode || null,
            latitude: lat,
            longitude: lng,
            timezone: data.timezone || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        throw selectError;
      }

      if (existing) {
        this.locationByIdCache.set(existing.id, { data: existing, timestamp: Date.now() });
        return existing;
      }

      // 2. Insert new location record if not found
      const { data: inserted, error: insertError } = await supabase
        .from('locations')
        .insert({
          name: data.name,
          city: data.city || data.name,
          region: data.region || null,
          country: data.country,
          country_code: data.countryCode || null,
          latitude: lat,
          longitude: lng,
          timezone: data.timezone || null,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === 'PGRST205' || insertError.message?.includes('schema cache')) {
          const fallbackEntity = {
            id: `loc-${lat.toFixed(4)}-${lng.toFixed(4)}`,
            name: data.name,
            city: data.city || data.name,
            region: data.region || null,
            country: data.country,
            country_code: data.countryCode || null,
            latitude: lat,
            longitude: lng,
            timezone: data.timezone || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          this.locationByIdCache.set(fallbackEntity.id, { data: fallbackEntity, timestamp: Date.now() });
          return fallbackEntity;
        }
        console.error('[LocationService] Supabase INSERT failed:', insertError.message, `(code: ${insertError.code}, privileged: ${isPrivileged})`);
        const err: AppError = new Error('Location persistence is temporarily unavailable.');
        err.statusCode = 503;
        err.code = 'PERSISTENCE_UNAVAILABLE';
        throw err;
      }

      this.locationByIdCache.set(inserted.id, { data: inserted, timestamp: Date.now() });
      return inserted;
    } catch (error: any) {
      if (error.code === 'PERSISTENCE_UNAVAILABLE') throw error;
      console.error('[LocationService] Supabase DB integration failure:', error.message);
      // Fallback entity if DB fails
      const fallbackEntity = {
        id: `loc-${lat.toFixed(4)}-${lng.toFixed(4)}`,
        name: data.name,
        city: data.city || data.name,
        region: data.region || null,
        country: data.country,
        country_code: data.countryCode || null,
        latitude: lat,
        longitude: lng,
        timezone: data.timezone || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.locationByIdCache.set(fallbackEntity.id, { data: fallbackEntity, timestamp: Date.now() });
      return fallbackEntity;
    }
  }

  /**
   * Retrieve a saved location record by its UUID or synthetic ID with in-memory caching
   */
  static async getLocationById(id: string): Promise<any> {
    if (!id) {
      const err: AppError = new Error('Location ID is required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_FAILED';
      throw err;
    }

    const cached = this.locationByIdCache.get(id);
    if (cached && Date.now() - cached.timestamp < this.LOCATION_CACHE_TTL_MS) {
      return cached.data;
    }

    const locMatch = id.match(/^loc[-_](-?\d+(?:\.\d+)?)[-_](-?\d+(?:\.\d+)?)$/);
    if (locMatch) {
      const lat = parseFloat(locMatch[1]);
      const lng = parseFloat(locMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        let rev: any = null;
        try {
          rev = await this.reverseGeocode(lat, lng);
        } catch {
          // Keep coordinate representation
        }
        const stateName = rev?.state || rev?.region || null;
        const syntheticObj = {
          id,
          name: rev?.name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          city: rev?.city || rev?.name || 'Selected Location',
          region: stateName,
          state: stateName,
          country: rev?.country || 'Unknown',
          country_code: rev?.countryCode || null,
          latitude: lat,
          longitude: lng,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.locationByIdCache.set(id, { data: syntheticObj, timestamp: Date.now() });
        return syntheticObj;
      }
    }

    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        // Check if ID contains coordinates in any format
        const genericMatch = id.match(/(-?\d+\.\d+)[^\d-]+(-?\d+\.\d+)/);
        if (genericMatch) {
          const lat = parseFloat(genericMatch[1]);
          const lng = parseFloat(genericMatch[2]);
          if (!isNaN(lat) && !isNaN(lng)) {
            let rev: any = null;
            try {
              rev = await this.reverseGeocode(lat, lng);
            } catch {}
            const stateName = rev?.state || rev?.region || null;
            const genericObj = {
              id,
              name: rev?.name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
              city: rev?.city || rev?.name || 'Selected Location',
              region: stateName,
              state: stateName,
              country: rev?.country || 'Unknown',
              country_code: rev?.countryCode || null,
              latitude: lat,
              longitude: lng,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            this.locationByIdCache.set(id, { data: genericObj, timestamp: Date.now() });
            return genericObj;
          }
        }

        const err: AppError = new Error('Location could not be found.');
        err.statusCode = 404;
        err.code = 'LOCATION_NOT_FOUND';
        throw err;
      }

      this.locationByIdCache.set(id, { data, timestamp: Date.now() });
      return data;
    } catch (error: any) {
      console.error('[LocationService] Supabase DB fetch failure:', error.message);
      if (error.code === 'LOCATION_NOT_FOUND') throw error;
      const err: AppError = new Error('Location fetch is temporarily unavailable.');
      err.statusCode = 500;
      err.code = 'DATABASE_FAILURE';
      throw err;
    }
  }
}
