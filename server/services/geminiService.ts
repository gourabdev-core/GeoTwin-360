import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import crypto from 'crypto';

export type GeminiErrorCode =
  | 'GEMINI_DAILY_QUOTA_EXCEEDED'
  | 'GEMINI_RATE_LIMIT_EXCEEDED'
  | 'GEMINI_INVALID_KEY'
  | 'GEMINI_PERMISSION_DENIED'
  | 'GEMINI_MODEL_NOT_FOUND'
  | 'GEMINI_SERVER_ERROR'
  | 'GEMINI_TIMEOUT'
  | 'GEMINI_NOT_CONFIGURED'
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
   * Calculates milliseconds until midnight UTC (standard Google quota reset window).
   */
  private static getMillisecondsUntilMidnightUTC(): number {
    const now = new Date();
    const nextMidnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 5, 0
    ));
    const diff = nextMidnight.getTime() - now.getTime();
    // At least 1 hour, at most 24 hours
    return Math.max(3600 * 1000, Math.min(24 * 3600 * 1000, diff));
  }

  /**
   * Classifies an external error from the Google GenAI SDK into a structured GeoTwin error.
   */
  public static classifyError(err: any): GeminiAppError {
    const rawMsg = String(err?.message || err || '');
    const status = err?.status || err?.statusCode || 500;
    const msgLower = rawMsg.toLowerCase();

    // 1. Daily Quota Exhaustion (429 with daily metrics or resource exhausted)
    const isDailyQuota =
      status === 429 && (
        msgLower.includes('generaterequestsperday') ||
        msgLower.includes('free_tier_requests') ||
        msgLower.includes('limit: 20') ||
        msgLower.includes('exceeded your current quota') ||
        msgLower.includes('perday') ||
        msgLower.includes('daily') ||
        rawMsg.includes('GenerateRequestsPerDayPerProjectPerModel-FreeTier')
      );

    if (isDailyQuota || msgLower.includes('generaterequestsperday')) {
      const retryAfterMs = this.getMillisecondsUntilMidnightUTC();
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      
      // Engage circuit breaker
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

    // 3. Invalid API Key (401)
    if (status === 401 || msgLower.includes('api key not valid') || msgLower.includes('unauthenticated')) {
      return new GeminiAppError(
        'GEMINI_INVALID_KEY',
        'Gemini API authentication failed.',
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

    // 6. Timeout
    if (msgLower.includes('timeout') || msgLower.includes('timed out')) {
      return new GeminiAppError(
        'GEMINI_TIMEOUT',
        'Gemini request timed out.',
        504,
        false
      );
    }

    // 7. Server failure (500 / 503)
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
      model = 'gemini-3.6-flash',
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
      console.log(`[GeminiService] Request started [${shortKey}]: purpose="${purpose}", model="${model}"`);

      let lastError: any = null;
      const effectiveRetries = maxRetries;

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
          const classified = this.classifyError(err);
          lastError = classified;

          // NEVER retry daily quota, invalid key, or permission denied
          if (classified.isDailyQuota || classified.code === 'GEMINI_INVALID_KEY' || classified.code === 'GEMINI_PERMISSION_DENIED') {
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
