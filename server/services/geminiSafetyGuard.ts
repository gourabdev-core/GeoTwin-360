/**
 * GeoTwin 360 - Gemini Safety Guard
 *
 * Permanent, zero-accidental-quota pre-network safety gate.
 * Enforces clear separation between:
 *
 * 1. TEST_MODE (Automated Testing / CI)
 *    -> NEVER call real Gemini
 *    -> ALWAYS use mock Gemini
 *    -> REAL GEMINI REQUESTS = 0
 *
 * 2. LOCAL_APP_MODE (Localhost Website / Real Application)
 *    -> MUST use the REAL Gemini API
 *    -> Normal AI Advisor usage works out-of-the-box
 *    -> Uses server-side GEMINI_API_KEY (never exposed to frontend)
 *    -> Does NOT require LIVE_GEMINI_TEST=true
 *
 * 3. LIVE_TEST_MODE (Explicit Live Test)
 *    -> Only when explicitly authorized ("ALLOW LIVE GEMINI TEST")
 *    -> Maximum 1 real Gemini request
 *    -> No retry, no second request
 *    -> Auto-disabled immediately upon permit acquisition
 */

import { env } from '../config/env.js';

export type GeminiOperationalMode = 'TEST_MODE' | 'LOCAL_APP_MODE' | 'LIVE_TEST_MODE';

export class GeminiSafetyGuard {
  // Session/process-level consumption guard for explicit live tests
  private static liveGeminiTestConsumed = false;

  // Real API request counter for auditing verification
  private static realApiCallsCount = 0;

  // Optional manual mode override (for unit test isolation)
  private static explicitModeOverride: GeminiOperationalMode | null = null;

  /**
   * Evaluates whether explicit live Gemini testing is currently enabled in the environment.
   * Default is unconditionally false.
   */
  public static isLiveTestConfigured(): boolean {
    return process.env.LIVE_GEMINI_TEST === 'true' || env.LIVE_GEMINI_TEST === true;
  }

  /**
   * Checks whether a live Gemini test permit is currently available.
   * Returns true ONLY if LIVE_GEMINI_TEST is true AND the single request has NOT yet been consumed.
   */
  public static isLiveTestPermitted(): boolean {
    return this.isLiveTestConfigured() && !this.liveGeminiTestConsumed;
  }

  /**
   * Determines the active operational mode:
   *
   * - LIVE_TEST_MODE: Explicit authorization ("ALLOW LIVE GEMINI TEST" / LIVE_GEMINI_TEST=true)
   *                   allows exactly 1 real Gemini request with no retries.
   * - TEST_MODE: Automated tests (NODE_ENV=test or GEOTWIN_MODE=test) always use mock Gemini.
   * - LOCAL_APP_MODE: Normal running application (localhost website development or production)
   *                   uses the real Gemini API via server-side credentials.
   */
  public static getOperationalMode(): GeminiOperationalMode {
    if (this.explicitModeOverride) {
      return this.explicitModeOverride;
    }

    // 1. Explicit live test authorization takes highest precedence if configured and unconsumed
    if (this.isLiveTestPermitted()) {
      return 'LIVE_TEST_MODE';
    }

    // 2. Automated testing or CI environment
    if (process.env.NODE_ENV === 'test' || process.env.GEOTWIN_MODE === 'test') {
      return 'TEST_MODE';
    }

    // 3. Normal running application on localhost (development) or production
    return 'LOCAL_APP_MODE';
  }

  /**
   * Atomically acquires the single live request permit BEFORE network I/O starts.
   *
   * If already consumed or not configured: returns false (BLOCKED).
   * If available: marks consumed FIRST so concurrent requests are instantly blocked,
   * then auto-disables the environment flag and returns true.
   *
   * This guarantees:
   * REAL REQUESTS TO GOOGLE = 1
   * SECOND / CONCURRENT REQUESTS = BLOCKED
   */
  public static acquireLiveRequestPermit(): boolean {
    if (!this.isLiveTestPermitted()) {
      return false;
    }

    // Set consumed state FIRST before any network I/O begins
    this.liveGeminiTestConsumed = true;

    // Immediately disable live mode in environment for defense-in-depth
    process.env.LIVE_GEMINI_TEST = 'false';
    if (env && typeof (env as any).LIVE_GEMINI_TEST === 'boolean') {
      (env as any).LIVE_GEMINI_TEST = false;
    }

    console.warn(
      '[GeminiSafetyGuard] LIVE TEST PERMIT ACQUIRED. Exactly ONE real Gemini request is permitted. Auto-disabling live mode.'
    );

    return true;
  }

  /**
   * Authorizes an explicit live test (equivalent to "ALLOW LIVE GEMINI TEST").
   * Resets the consumption flag and sets LIVE_GEMINI_TEST=true for exactly 1 request.
   */
  public static authorizeLiveTest(): void {
    this.liveGeminiTestConsumed = false;
    process.env.LIVE_GEMINI_TEST = 'true';
    if (env && typeof (env as any).LIVE_GEMINI_TEST === 'boolean') {
      (env as any).LIVE_GEMINI_TEST = true;
    }
    console.warn('[GeminiSafetyGuard] EXPLICIT LIVE GEMINI TEST AUTHORIZED: exactly 1 real request permitted.');
  }

  /**
   * Audits and increments the count of actual real network calls made to Google GenAI.
   * Must ONLY be called immediately before real network invocation.
   */
  public static recordRealApiCall(): void {
    this.realApiCallsCount++;
    console.warn(`[GeminiSafetyGuard] REAL GEMINI API CALL EXECUTED (Total real calls: ${this.realApiCallsCount})`);
  }

  /**
   * Returns total count of real network calls executed against Google GenAI during this process.
   */
  public static getRealApiCallsCount(): number {
    return this.realApiCallsCount;
  }

  /**
   * Indicates whether the single live request permit has already been consumed.
   */
  public static hasConsumedPermit(): boolean {
    return this.liveGeminiTestConsumed;
  }

  /**
   * Explicitly sets the mode override (strictly for testing).
   */
  public static setExplicitMode(mode: GeminiOperationalMode | null): void {
    this.explicitModeOverride = mode;
  }

  /**
   * Manually resets the consumption flag and overrides (strictly for unit test verification).
   */
  public static resetForTesting(): void {
    this.liveGeminiTestConsumed = false;
    this.explicitModeOverride = null;
  }

  /**
   * Resets the real API call counter (strictly for test isolation).
   */
  public static resetRealCallCountForTesting(): void {
    this.realApiCallsCount = 0;
  }
}
