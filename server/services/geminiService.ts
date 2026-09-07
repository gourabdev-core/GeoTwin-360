import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import crypto from 'crypto';
import { GeminiSafetyGuard } from './geminiSafetyGuard.js';
import { MockGeminiProvider } from './mockGeminiProvider.js';

export type GeminiErrorCode =
  | 'GEMINI_DAILY_QUOTA_EXCEEDED'
  | 'GEMINI_RATE_LIMIT_EXCEEDED'
  | 'GEMINI_SERVICE_UNAVAILABLE'
  | 'GEMINI_INVALID_KEY'
  | 'GEMINI_PERMISSION_DENIED'
  | 'GEMINI_MODEL_NOT_FOUND'
  | 'GEMINI_SERVER_ERROR'
  | 'GEMINI_TIMEOUT'
  | 'GEMINI_NETWORK_ERROR'
  | 'GEMINI_NOT_CONFIGURED'
  | 'GEMINI_CALL_BLOCKED'
  | 'GEMINI_UNKNOWN_ERROR';

export class GeminiAppError extends Error {
  code: GeminiErrorCode;
  statusCode: number;
  retryAfter?: number;
  isDailyQuota: boolean;

  constructor(code: GeminiErrorCode, message: string, statusCode = 500, isDailyQuota = false, retryAfter?: number) {
    super(message);
    this.name = 'GeminiAppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isDailyQuota = isDailyQuota;
    this.retryAfter = retryAfter;
  }
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface GeminiRequestOptions<T> {
  purpose: string;
  cacheKey: string;
  model?: string;
  systemInstruction?: string;
  contents: any;
  responseMimeType?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  parser?: (rawText: string) => T;
}

export class GeminiService {
  private static client: GoogleGenAI | null = null;
  private static cache = new Map<string, CacheEntry<any>>();
  private static inFlightRequests = new Map<string, Promise<any>>();
  
  // Circuit breaker state for 429 Daily Quota exhaustion
  private static circuitBreakerActive = false;
  private static circuitBreakerResetAt = 0;
  private static readonly DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private static readonly DEFAULT_TIMEOUT_MS = 15 * 1000; // 15 seconds

  // Mock mode state for isolated offline testing (null = auto-detect based on mode)
  private static mockModeEnabled: boolean | null = null;

  /**
   * Sets mock mode explicitly (e.g. for offline development or testing).
   */
  public static setMockMode(enabled: boolean | null): void {
    this.mockModeEnabled = enabled;
  }

  /**
   * Resets mock mode to automatic mode-based detection.
   */
  public static resetMockMode(): void {
    this.mockModeEnabled = null;
  }

  /**
   * Checks whether mock mode is currently enabled.
   */
  public static isMockMode(): boolean {
    if (this.mockModeEnabled !== null) {
      return this.mockModeEnabled;
    }
    return GeminiSafetyGuard.getOperationalMode() === 'TEST_MODE';
  }


  /**
   * Lazily initializes and returns the shared Google GenAI client.
   */
  private static getClient(): GoogleGenAI {
    if (!env.GEMINI_API_KEY) {
      throw new GeminiAppError(
        'GEMINI_NOT_CONFIGURED',
        'Gemini API key is not configured on the server.',
        503,
        false
      );
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
    return this.client;
  }

  /**
   * Checks whether the circuit breaker is currently active due to daily quota exhaustion.
   */
  public static isDailyQuotaExceeded(): boolean {
    if (!this.circuitBreakerActive) {
      return false;
    }
    if (Date.now() >= this.circuitBreakerResetAt) {
      // Circuit breaker cooldown expired; reset state
      this.circuitBreakerActive = false;
      this.circuitBreakerResetAt = 0;
      console.log('[GeminiService] Daily quota circuit breaker cooldown expired. Re-enabling requests.');
      return false;
    }
    return true;
  }

  /**
   * Manually reset the circuit breaker (e.g. in tests or when quota resets).
   */
  public static resetCircuitBreaker(): void {
    this.circuitBreakerActive = false;
    this.circuitBreakerResetAt = 0;
  }

  /**
   * Clear the in-memory cache (e.g. for testing).
   */
  public static clearCache(): void {
    this.cache.clear();
    this.inFlightRequests.clear();
  }

  /**
   * Calculates milliseconds until midnight Pacific Time (America/Los_Angeles).
   * Google Gemini Requests Per Day (RPD) quota resets at midnight Pacific Time,
   * NOT at midnight UTC.
   */
  public static getMillisecondsUntilMidnightPacific(now = new Date()): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(now).map((p) => [p.type, parseInt(p.value, 10)])
    );
    const hour = parts.hour % 24;
    const minute = parts.minute || 0;
    const second = parts.second || 0;
    const secondsPassedToday = hour * 3600 + minute * 60 + second;
    const secondsInDay = 86400;
    // Buffer with 5 seconds to ensure we land just past midnight Pacific
    const secondsRemaining = Math.max(60, (secondsInDay - secondsPassedToday) + 5);
    return secondsRemaining * 1000;
  }

  /**
   * Attempts to extract retry information from the error if provided by Google GenAI.
   */
  public static extractRetryAfterMs(err: any): number | null {
    if (!err) return null;
    if (typeof err?.retryAfter === 'number' && err.retryAfter > 0) {
      return err.retryAfter > 10000 ? err.retryAfter : err.retryAfter * 1000;
    }
    const headerVal = err?.response?.headers?.['retry-after'] || err?.headers?.get?.('retry-after');
    if (headerVal) {
      const parsedSec = parseFloat(headerVal);
      if (!isNaN(parsedSec) && parsedSec > 0) {
        return Math.ceil(parsedSec * 1000);
      }
    }
    const details = err?.errorDetails || err?.details || err?.response?.data?.error?.details;
    if (Array.isArray(details)) {
      for (const item of details) {
        if (item?.['@type']?.includes('RetryInfo') && item?.retryDelay) {
          const delayStr = String(item.retryDelay);
          const match = delayStr.match(/([0-9.]+)s/);
          if (match) {
            return Math.ceil(parseFloat(match[1]) * 1000);
          }
        }
      }
    }
    const rawMsg = String(err?.message || err || '');
    const regexMatch = rawMsg.match(/(?:retry (?:in|after)|reset in)\s+([0-9.]+)\s*(s|m|h|seconds|minutes)?/i);
    if (regexMatch) {
      const val = parseFloat(regexMatch[1]);
      const unit = (regexMatch[2] || 's').toLowerCase();
      const mult = unit.startsWith('m') ? 60 : unit.startsWith('h') ? 3600 : 1;
      return Math.ceil(val * mult * 1000);
    }
    return null;
  }

  /**
   * Classifies an external error from the Google GenAI SDK into a structured GeoTwin error.
   */
  public static classifyError(err: any): GeminiAppError {
    const rawMsg = String(err?.message || err || '');
    const status = err?.status || err?.statusCode || (typeof err?.code === 'number' ? err.code : 500);
    const msgLower = rawMsg.toLowerCase();
    const statusStr = String(err?.status || err?.error?.status || '').toUpperCase();
    const nameStr = String(err?.name || '');

    // 0. Blocked by Zero-Quota Pre-Network Safety Guard
    if (
      err?.code === 'GEMINI_CALL_BLOCKED' ||
      rawMsg.includes('REAL GEMINI API CALL BLOCKED') ||
      rawMsg.includes('LIVE_GEMINI_TEST is disabled') ||
      rawMsg.includes('Automated tests')
    ) {
      return new GeminiAppError(
        'GEMINI_CALL_BLOCKED',
        'REAL GEMINI API CALL BLOCKED — Automated tests (TEST_MODE) cannot make outbound requests.',
        403,
        false
      );
    }

    // 1. Daily Quota Exhaustion (429 / RESOURCE_EXHAUSTED with daily metrics)
    const isDailyQuota =
      (status === 429 || statusStr === 'RESOURCE_EXHAUSTED') && (
        msgLower.includes('generaterequestsperday') ||
        msgLower.includes('free_tier_requests') ||
        msgLower.includes('limit: 20') ||
        msgLower.includes('exceeded your current quota') ||
        msgLower.includes('perday') ||
        msgLower.includes('daily') ||
        rawMsg.includes('GenerateRequestsPerDayPerProjectPerModel-FreeTier')
      );

    if (isDailyQuota || msgLower.includes('generaterequestsperday')) {
      const retryAfterMs = this.extractRetryAfterMs(err) ?? this.getMillisecondsUntilMidnightPacific();
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      
      // Engage circuit breaker until Pacific midnight or specified retry delay
      this.circuitBreakerActive = true;
      this.circuitBreakerResetAt = Date.now() + retryAfterMs;

      return new GeminiAppError(
        'GEMINI_DAILY_QUOTA_EXCEEDED',
        'AI analysis is temporarily unavailable because the Gemini daily quota has been reached. Core GeoTwin features remain available.',
        429,
        true,
        retryAfterSec
      );
    }

    // 2. Transient RPM Rate Limit (429 without daily quota limit)
    if (status === 429 || msgLower.includes('rate limit') || msgLower.includes('resource_exhausted')) {
      return new GeminiAppError(
        'GEMINI_RATE_LIMIT_EXCEEDED',
        'AI rate limit temporarily reached. Please retry in a few moments.',
        429,
        false,
        10
      );
    }

    // 3. Invalid API Key / Authentication (401 / 403 api_key_invalid)
    if (
      status === 401 ||
      msgLower.includes('api key not valid') ||
      msgLower.includes('api_key_invalid') ||
      msgLower.includes('invalid api key') ||
      msgLower.includes('unauthenticated')
    ) {
      return new GeminiAppError(
        'GEMINI_INVALID_KEY',
        'Gemini API authentication failed. GEMINI_API_KEY is invalid or missing.',
        401,
        false
      );
    }

    // 4. Permission / Billing issue (403)
    if (status === 403 || msgLower.includes('permission_denied') || msgLower.includes('billing')) {
      return new GeminiAppError(
        'GEMINI_PERMISSION_DENIED',
        'Gemini access denied or project billing required.',
        403,
        false
      );
    }

    // 5. Model Not Found (404)
    if (status === 404 || msgLower.includes('model not found')) {
      return new GeminiAppError(
        'GEMINI_MODEL_NOT_FOUND',
        'The requested Gemini model version is not available.',
        404,
        false
      );
    }

    // 6. Network connectivity failure
    if (
      msgLower.includes('fetch failed') ||
      msgLower.includes('econnrefused') ||
      msgLower.includes('enotfound') ||
      msgLower.includes('etimedout') ||
      msgLower.includes('network') ||
      msgLower.includes('socket') ||
      (err?.name === 'TypeError' && msgLower.includes('fetch'))
    ) {
      return new GeminiAppError(
        'GEMINI_NETWORK_ERROR',
        'AI service is temporarily unreachable due to network connectivity. Core GeoTwin features remain operational.',
        503,
        false
      );
    }

    // 7. Timeout (504)
    if (msgLower.includes('timeout') || msgLower.includes('timed out')) {
      return new GeminiAppError(
        'GEMINI_TIMEOUT',
        'Gemini request timed out.',
        504,
        false
      );
    }

    // 8. Service Unavailable (503 / UNAVAILABLE / ServiceUnavailable / Model Overloaded)
    if (
      status === 503 ||
      statusStr === 'UNAVAILABLE' ||
      nameStr === 'ServiceUnavailable' ||
      msgLower.includes('serviceunavailable') ||
      msgLower.includes('service unavailable') ||
      msgLower.includes('unavailable') ||
      msgLower.includes('model is overloaded') ||
      msgLower.includes('overloaded')
    ) {
      return new GeminiAppError(
        'GEMINI_SERVICE_UNAVAILABLE',
        'Gemini AI reasoning service is temporarily unavailable. Core GeoTwin features remain fully operational.',
        503,
        false
      );
    }

    // 9. Generic Server failure (500 / 502 / 504)
    if (status >= 500 && status < 600) {
      return new GeminiAppError(
        'GEMINI_SERVER_ERROR',
        'Gemini server temporarily unavailable.',
        status,
        false
      );
    }

    return new GeminiAppError(
      'GEMINI_UNKNOWN_ERROR',
      'AI service encountered an unexpected error.',
      status,
      false
    );
  }

  /**
   * Helper to build a deterministic SHA-256 cache key from input metadata.
   */
  public static buildCacheKey(
    purpose: string,
    locationId: string,
    year: number,
    scenario: string,
    extraData?: any
  ): string {
    const raw = JSON.stringify({
      purpose,
      locationId,
      year,
      scenario,
      extra: extraData || null,
    });
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Central entry point for executing Gemini AI requests.
   * 
   * Provides:
   * - Cache lookup
   * - In-flight request deduplication
   * - Circuit-breaking on daily quota errors
   * - Exponential backoff on transient errors
   * - Structured non-secret logging
   */
  public static async execute<T>(options: GeminiRequestOptions<T>): Promise<{
    data: T;
    isCached: boolean;
  }> {
    const {
      purpose,
      cacheKey,
      model = process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      systemInstruction,
      contents,
      responseMimeType = 'application/json',
      temperature = 0.2,
      maxOutputTokens = 4096,
      timeoutMs = this.DEFAULT_TIMEOUT_MS,
      maxRetries = 1,
      parser,
    } = options;

    const shortKey = cacheKey.substring(0, 10);

    // 1. Check in-memory cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[GeminiService] Cache HIT [${shortKey}] for "${purpose}". Serving cached result.`);
      return { data: cached.data, isCached: true };
    }

    // 2. Check Daily Quota Circuit Breaker
    if (this.isDailyQuotaExceeded()) {
      const retryAfter = Math.ceil((this.circuitBreakerResetAt - Date.now()) / 1000);
      console.warn(`[GeminiService] Short-circuiting call for "${purpose}" [${shortKey}]: Daily quota circuit breaker ACTIVE (retryAfter: ${retryAfter}s).`);
      throw new GeminiAppError(
        'GEMINI_DAILY_QUOTA_EXCEEDED',
        'AI analysis is temporarily unavailable because the Gemini daily quota has been reached. Core GeoTwin features remain available.',
        429,
        true,
        retryAfter
      );
    }

    // 3. Request Deduplication: if an identical request is already running, wait for it
    const existingPromise = this.inFlightRequests.get(cacheKey);
    if (existingPromise) {
      console.log(`[GeminiService] Deduplication attached to in-flight request [${shortKey}] for "${purpose}".`);
      const result = await existingPromise;
      return { data: result, isCached: true };
    }

    // 4. Execute with retry & timeout
    const executionPromise = (async () => {
      const startTime = Date.now();
      const mode = GeminiSafetyGuard.getOperationalMode();
      console.log(`[GeminiService] Request started [${shortKey}]: purpose="${purpose}", model="${model}" (Mode: ${mode})`);

      // A. Mock Provider Execution
      // If mockModeEnabled is explicitly configured, honor it.
      // Otherwise: in TEST_MODE auto-default to mock, in LOCAL_APP_MODE / LIVE_TEST_MODE auto-default to false.
      const useMock = this.mockModeEnabled !== null
        ? this.mockModeEnabled
        : mode === 'TEST_MODE';

      if (useMock) {
        const scenario = MockGeminiProvider.getScenario();
        console.log(`[GeminiService] Mock provider handling request [${shortKey}] for "${purpose}" (scenario: ${scenario}, mode: ${mode}).`);

        try {
          const response = await MockGeminiProvider.generateContent({
            purpose,
            model,
            contents,
            systemInstruction,
            responseMimeType,
          });

          const text = response.text || '';
          if (!text.trim()) {
            throw new Error('Gemini returned an empty response text.');
          }

          let parsedData: T;
          if (parser) {
            parsedData = parser(text);
          } else if (responseMimeType === 'application/json') {
            const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            parsedData = JSON.parse(jsonMatch ? jsonMatch[0] : text);
          } else {
            parsedData = text as unknown as T;
          }

          this.cache.set(cacheKey, {
            data: parsedData,
            expiresAt: Date.now() + this.DEFAULT_CACHE_TTL_MS,
          });

          return parsedData;
        } catch (err: any) {
          const classified = this.classifyError(err);
          throw classified;
        }
      }

      // B. HARD PRE-NETWORK SAFETY GUARD for Real Google Gemini Calls
      // Enforce zero real Gemini requests in TEST_MODE
      if (mode === 'TEST_MODE') {
        console.warn(`[GeminiService] REAL GEMINI API CALL BLOCKED — Automated tests (TEST_MODE) cannot make outbound requests.`);
        throw new GeminiAppError(
          'GEMINI_CALL_BLOCKED',
          'REAL GEMINI API CALL BLOCKED — Automated tests (TEST_MODE) cannot make outbound requests.',
          403,
          false
        );
      }

      // In LIVE_TEST_MODE: exactly 1 real request permitted via atomic permit
      if (mode === 'LIVE_TEST_MODE') {
        const permitAcquired = GeminiSafetyGuard.acquireLiveRequestPermit();
        if (!permitAcquired) {
          console.warn(`[GeminiService] REAL GEMINI API CALL BLOCKED — Live test permit already consumed or disabled.`);
          throw new GeminiAppError(
            'GEMINI_CALL_BLOCKED',
            'REAL GEMINI API CALL BLOCKED — LIVE_GEMINI_TEST is disabled or already consumed.',
            403,
            false
          );
        }
      }

      // In LIVE_TEST_MODE, retries are STRICTLY PROHIBITED (exactly 1 real request, no retries on failure)
      // In LOCAL_APP_MODE (localhost website) or production, standard retries are enabled
      const effectiveRetries = mode === 'LIVE_TEST_MODE' ? 0 : maxRetries;

      let lastError: any = null;

      for (let attempt = 0; attempt <= effectiveRetries; attempt++) {
        try {
          if (attempt > 0) {
            // Exponential backoff with jitter: 1000ms * 2^(attempt-1) + jitter
            const backoff = 1000 * Math.pow(2, attempt - 1) + Math.random() * 400;
            console.log(`[GeminiService] Retrying [${shortKey}] attempt ${attempt}/${effectiveRetries} after ${Math.round(backoff)}ms backoff...`);
            await new Promise((resolve) => setTimeout(resolve, backoff));
          }

          const client = this.getClient();

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Gemini API call timed out after ${timeoutMs}ms`));
            }, timeoutMs);
          });

          // Audit record: register outbound real network call to Google
          GeminiSafetyGuard.recordRealApiCall();

          const apiCallPromise = client.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction,
              responseMimeType,
              temperature,
              maxOutputTokens,
            },
          });

          const response = await Promise.race([apiCallPromise, timeoutPromise]);
          const duration = Date.now() - startTime;
          const text = response.text || '';

          if (!text.trim()) {
            throw new Error('Gemini returned an empty response text.');
          }

          let parsedData: T;
          if (parser) {
            parsedData = parser(text);
          } else if (responseMimeType === 'application/json') {
            const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            parsedData = JSON.parse(jsonMatch ? jsonMatch[0] : text);
          } else {
            parsedData = text as unknown as T;
          }

          // Cache successful response
          this.cache.set(cacheKey, {
            data: parsedData,
            expiresAt: Date.now() + this.DEFAULT_CACHE_TTL_MS,
          });

          console.log(`[GeminiService] Request completed [${shortKey}]: purpose="${purpose}", duration=${duration}ms`);
          return parsedData;
        } catch (err: any) {
          // Requirement 3: Capture and log the RAW Gemini response for failed requests in development
          if (process.env.NODE_ENV !== 'production') {
            const rawStatus = err?.status || err?.statusCode || (typeof err?.code === 'number' ? err.code : null);
            const rawCode = err?.code || err?.error?.code || null;
            const rawStatusText = err?.statusText || err?.error?.status || (typeof err?.status === 'string' ? err.status : null);
            const rawMessage = err?.message || err?.error?.message || String(err);
            const retryInfoMs = this.extractRetryAfterMs(err);

            console.error('[GeminiService:RAW_ERROR]', {
              httpStatus: rawStatus,
              geminiErrorCode: rawCode,
              geminiStatus: rawStatusText,
              geminiMessage: rawMessage,
              retryInfo: retryInfoMs !== null ? `${Math.ceil(retryInfoMs / 1000)}s (${retryInfoMs}ms)` : null,
            });
          }

          const classified = this.classifyError(err);
          lastError = classified;

          // NEVER retry daily quota, blocked call, invalid key, permission denied, unconfigured key, or live test mode
          if (
            classified.isDailyQuota ||
            classified.code === 'GEMINI_CALL_BLOCKED' ||
            classified.code === 'GEMINI_INVALID_KEY' ||
            classified.code === 'GEMINI_PERMISSION_DENIED' ||
            classified.code === 'GEMINI_NOT_CONFIGURED' ||
            mode === 'LIVE_TEST_MODE'
          ) {
            const duration = Date.now() - startTime;
            console.warn(`[GeminiService] Request failed (NON-RETRYABLE) [${shortKey}]: purpose="${purpose}", code="${classified.code}", duration=${duration}ms`);
            throw classified;
          }

          if (attempt === effectiveRetries) {
            const duration = Date.now() - startTime;
            console.warn(`[GeminiService] Request failed after ${attempt} retries [${shortKey}]: purpose="${purpose}", code="${classified.code}", duration=${duration}ms`);
            throw classified;
          }
        }
      }

      throw lastError || new GeminiAppError('GEMINI_UNKNOWN_ERROR', 'Unknown error during AI request execution.');
    })();

    this.inFlightRequests.set(cacheKey, executionPromise);

    try {
      const data = await executionPromise;
      return { data, isCached: false };
    } finally {
      this.inFlightRequests.delete(cacheKey);
    }
  }
}
