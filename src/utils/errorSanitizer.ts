/**
 * GeoTwin 360 - Error Sanitizer & User-Friendly Message Normalizer
 *
 * Ensures no internal database schemas, credentials, API keys,
 * or stack traces are ever exposed to the user or rendered in the UI.
 */

export interface NormalizedErrorState {
  code: string;
  message: string;
  category: 'NETWORK' | 'AUTH' | 'RATE_LIMIT' | 'LOCATION' | 'DATABASE' | 'AI' | 'WEATHER' | 'GENERIC';
  isRecoverable: boolean;
}

/**
 * Strips sensitive strings such as API keys, tokens, Supabase URLs,
 * and database connection strings from any raw string or error.
 */
export function stripSensitiveInformation(input: unknown): string {
  if (!input) return '';
  let str = typeof input === 'string' ? input : (input as any)?.message || String(input);

  // Strip potential API keys or long hex/base64 tokens
  str = str.replace(/([a-zA-Z0-9_-]{20,})/g, (match: string) => {
    // Keep standard UUIDs intact if needed, but mask long credentials
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match)) {
      return match;
    }
    if (match.length > 24) {
      return '[REDACTED_CREDENTIAL]';
    }
    return match;
  });

  // Strip database schema / Postgres internal phrases
  str = str.replace(/relation "[^"]+" does not exist/gi, 'Data table is currently unavailable');
  str = str.replace(/table 'public\.[^']+' in the schema cache/gi, 'Database synchronization is pending');
  str = str.replace(/password authentication failed/gi, 'Authentication failed');
  str = str.replace(/connect ECONNREFUSED/gi, 'Service connection unreachable');

  return str;
}

/**
 * Normalizes any error object into a predictable, user-friendly state.
 */
export function sanitizeErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
  if (!error) return fallbackMessage;

  const raw = typeof error === 'string' ? error : (error as any)?.message || (error as any)?.error?.message || '';
  const status = (error as any)?.status || (error as any)?.response?.status;
  const code = (error as any)?.code || (error as any)?.error?.code || '';

  const rawLower = raw.toLowerCase();

  // 0. Blocked by Zero-Quota Safety Guard
  if (code === 'GEMINI_CALL_BLOCKED' || rawLower.includes('real gemini api call blocked') || rawLower.includes('live_gemini_test is disabled')) {
    return 'Gemini live API requests are disabled by safety policy. Operating in deterministic assessment mode.';
  }

  // 1. Service Unavailable (HTTP 503 / ServiceUnavailable / UNAVAILABLE)
  if (
    code === 'GEMINI_SERVICE_UNAVAILABLE' ||
    code === 'GEMINI_SERVER_ERROR' ||
    code === 'ServiceUnavailable' ||
    code === 'UNAVAILABLE' ||
    status === 503 ||
    rawLower.includes('serviceunavailable') ||
    rawLower.includes('service unavailable') ||
    rawLower.includes('model is overloaded') ||
    rawLower.includes('overloaded')
  ) {
    if (code === 'BACKEND_UNAVAILABLE' || rawLower.includes('port 3001') || rawLower.includes('geotwin 360 backend')) {
      return 'GeoTwin 360 backend is temporarily unreachable on port 3001.';
    }
    return 'Gemini AI reasoning service is temporarily unavailable. Core GeoTwin features remain fully operational.';
  }

  // 2. Rate Limiting (HTTP 429 or quota exhaustion)
  if (
    code === 'GEMINI_DAILY_QUOTA_EXCEEDED' ||
    rawLower.includes('daily quota') ||
    rawLower.includes('exceeded your current quota') ||
    rawLower.includes('generaterequestsperday') ||
    rawLower.includes('free_tier_requests')
  ) {
    return 'AI analysis is temporarily unavailable because the Gemini daily quota has been reached. Core GeoTwin features remain available.';
  }

  if (
    status === 429 ||
    code === 'RATE_LIMIT_EXCEEDED' ||
    code === 'GEMINI_RATE_LIMIT_EXCEEDED' ||
    code === 'RESOURCE_EXHAUSTED' ||
    rawLower.includes('quota exceeded') ||
    rawLower.includes('rate limit') ||
    rawLower.includes('resource_exhausted')
  ) {
    return 'AI rate limit reached. Intelligent deterministic fallback model active.';
  }

  // 3. Network / Offline failures
  if (
    code === 'NETWORK_ERROR' ||
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    rawLower.includes('network error') ||
    rawLower.includes('internet connection') ||
    rawLower.includes('failed to fetch') ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  ) {
    return 'Network connection unavailable. Operating in offline/cached mode.';
  }

  // 4. Unauthorized / Session expired / Gemini API key
  if (
    code === 'GEMINI_INVALID_KEY' ||
    code === 'GEMINI_NOT_CONFIGURED' ||
    rawLower.includes('api key not valid') ||
    rawLower.includes('api_key_invalid')
  ) {
    return 'Gemini API authentication failed. GEMINI_API_KEY is invalid or missing on the server.';
  }

  if (
    code === 'GEMINI_PERMISSION_DENIED' ||
    (status === 403 && (rawLower.includes('gemini') || rawLower.includes('billing') || rawLower.includes('permission_denied')))
  ) {
    return 'Gemini API access denied or project billing required.';
  }

  if (status === 401 || status === 403 || code === 'UNAUTHORIZED' || rawLower.includes('unauthorized') || rawLower.includes('jwt expired')) {
    return 'Authentication required. Please sign in to perform this action.';
  }

  // 5. Invalid Location / Geocoding failure
  if (code === 'INVALID_LOCATION' || rawLower.includes('invalid coordinates') || rawLower.includes('location not found') || rawLower.includes('out of range')) {
    return 'Invalid location coordinates or name. Please select a valid city or address.';
  }

  // 6. Database schema / migration pending
  if (
    rawLower.includes('schema cache') ||
    (rawLower.includes('table') && rawLower.includes('not found')) ||
    (rawLower.includes('relation') && rawLower.includes('does not exist'))
  ) {
    return 'Cloud synchronization temporarily unavailable. Operating with local data.';
  }

  // 7. Weather service failure
  if (rawLower.includes('openweather') || rawLower.includes('weather data unavailable') || rawLower.includes('weather service')) {
    return 'Live weather feed currently unavailable. Historical climate observations remain active.';
  }

  // 8. General AI generation failure
  if (rawLower.includes('gemini') || rawLower.includes('genai') || rawLower.includes('generativelanguage') || rawLower.includes('model')) {
    return 'AI advisor is currently operating in deterministic ground-truth mode.';
  }

  // Fallback: Sanitized message
  const sanitized = stripSensitiveInformation(raw);
  if (sanitized && sanitized.length > 5 && !sanitized.includes('Object') && !sanitized.includes('Internal')) {
    return sanitized;
  }

  return fallbackMessage;
}
