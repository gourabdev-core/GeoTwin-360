import { GeminiService, GeminiAppError } from '../services/geminiService.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

export async function runGeminiServiceTests() {
  console.log('============================================================');
  console.log('RUNNING: server/tests/geminiService.test.ts');
  console.log('============================================================');

  // Test 1: Error classification for 429 Daily Quota Exhaustion
  console.log('[Test 1] Verifying error classification for 429 Daily Quota...');
  const mockDailyQuotaError = {
    status: 429,
    message: 'You exceeded your current quota, please check your plan and billing details. Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash',
  };

  const classifiedDaily = GeminiService.classifyError(mockDailyQuotaError);
  assert(classifiedDaily.code === 'GEMINI_DAILY_QUOTA_EXCEEDED', 'Must classify as GEMINI_DAILY_QUOTA_EXCEEDED');
  assert(classifiedDaily.isDailyQuota === true, 'isDailyQuota must be true');
  assert(typeof classifiedDaily.retryAfter === 'number' && classifiedDaily.retryAfter > 0, 'retryAfter must be positive number');
  assert(GeminiService.isDailyQuotaExceeded() === true, 'Circuit breaker must be engaged after daily quota error');
  console.log(`- Classified as: ${classifiedDaily.code} (isDailyQuota=${classifiedDaily.isDailyQuota}, retryAfter=${classifiedDaily.retryAfter}s)`);
  console.log(`- Circuit breaker active: ${GeminiService.isDailyQuotaExceeded()}`);
  console.log('[Test 1] PASSED.\n');

  // Test 2: Circuit Breaker Fast-Fails Outbound Requests
  console.log('[Test 2] Verifying Circuit Breaker fast-fails without network calls...');
  let circuitBreakerTriggered = false;
  try {
    await GeminiService.execute({
      purpose: 'Circuit breaker test',
      cacheKey: 'test_circuit_breaker_key',
      contents: 'test',
    });
  } catch (err: any) {
    circuitBreakerTriggered = true;
    assert(err.code === 'GEMINI_DAILY_QUOTA_EXCEEDED', 'Must throw GEMINI_DAILY_QUOTA_EXCEEDED');
    assert(err.isDailyQuota === true, 'Must indicate daily quota');
  }
  assert(circuitBreakerTriggered, 'Circuit breaker must prevent execution');
  console.log('- Fast-fail verified without calling Google API.');
  console.log('[Test 2] PASSED.\n');

  // Reset circuit breaker for subsequent tests
  GeminiService.resetCircuitBreaker();
  assert(GeminiService.isDailyQuotaExceeded() === false, 'Circuit breaker must be reset');

  // Test 3: Error classification for transient errors & service unavailable
  console.log('[Test 3] Verifying transient and service unavailable error classification...');
  const mockRpmError = {
    status: 429,
    message: 'Resource has been exhausted (e.g. check quota) - Rate limit exceeded: 5 requests per minute',
  };
  const classifiedRpm = GeminiService.classifyError(mockRpmError);
  assert(classifiedRpm.code === 'GEMINI_RATE_LIMIT_EXCEEDED', 'Must classify transient rate limit as GEMINI_RATE_LIMIT_EXCEEDED');
  assert(classifiedRpm.isDailyQuota === false, 'Transient RPM must NOT be daily quota');

  const mock503Error = { status: 503, message: 'The model is overloaded. Please try again later.' };
  const classified503 = GeminiService.classifyError(mock503Error);
  assert(classified503.code === 'GEMINI_SERVICE_UNAVAILABLE', 'Must classify 503 as GEMINI_SERVICE_UNAVAILABLE');
  assert(classified503.statusCode === 503, 'Must retain statusCode 503');
  assert(classified503.isDailyQuota === false, '503 must not be daily quota');

  const mockServiceUnavailableObj = { name: 'ServiceUnavailable', message: 'Service Unavailable' };
  const classifiedUnavailable = GeminiService.classifyError(mockServiceUnavailableObj);
  assert(classifiedUnavailable.code === 'GEMINI_SERVICE_UNAVAILABLE', 'Must classify ServiceUnavailable name as GEMINI_SERVICE_UNAVAILABLE');

  const mock401Error = { status: 401, message: 'API key not valid. Please pass a valid API key.' };
  const classified401 = GeminiService.classifyError(mock401Error);
  assert(classified401.code === 'GEMINI_INVALID_KEY', 'Must classify 401 as GEMINI_INVALID_KEY');

  const mock403Error = { status: 403, message: 'The caller does not have permission' };
  const classified403 = GeminiService.classifyError(mock403Error);
  assert(classified403.code === 'GEMINI_PERMISSION_DENIED', 'Must classify 403 as GEMINI_PERMISSION_DENIED');
  console.log('- Transient RPM, 503 ServiceUnavailable, 401, and 403 correctly distinguished.');
  console.log('[Test 3] PASSED.\n');

  // Test 4: Cache Key Generation Determinism
  console.log('[Test 4] Verifying Cache Key generation...');
  const key1 = GeminiService.buildCacheKey('advisor', 'loc-1', 2035, 'default', { sim: 'abc' });
  const key2 = GeminiService.buildCacheKey('advisor', 'loc-1', 2035, 'default', { sim: 'abc' });
  const key3 = GeminiService.buildCacheKey('advisor', 'loc-1', 2035, 'resilience', { sim: 'abc' });

  assert(key1 === key2, 'Identical inputs must produce identical cache key');
  assert(key1 !== key3, 'Different scenarios must produce different cache keys');
  console.log(`- Deterministic SHA-256 Key 1: ${key1.substring(0, 16)}...`);
  console.log(`- Deterministic SHA-256 Key 3: ${key3.substring(0, 16)}...`);
  console.log('[Test 4] PASSED.\n');

  // Test 5: Daily Quota Circuit Breaker Pacific Midnight Reset
  console.log('[Test 5] Verifying Daily Quota resets according to Pacific Time (PT)...');
  const msPacific = GeminiService.getMillisecondsUntilMidnightPacific();
  assert(typeof msPacific === 'number' && msPacific > 0, 'Pacific midnight diff must be positive number');
  assert(msPacific <= 86400 * 1000 + 10000, 'Pacific midnight diff must be <= 24h + buffer');
  console.log(`- Time until next midnight Pacific: ${Math.round(msPacific / 1000)}s (~${(msPacific / 3600000).toFixed(2)}h)`);

  // Verify retry-after extraction from provider error message
  const errWithRetry = { message: 'Quota exceeded. Please retry in 45s.' };
  const extracted = GeminiService.extractRetryAfterMs(errWithRetry);
  assert(extracted === 45000, 'Must correctly extract 45s retry delay from provider message');
  console.log('- Retry delay extraction from provider response verified: 45000ms.');
  console.log('[Test 5] PASSED.\n');

  console.log('============================================================');
  console.log('GEMINI SERVICE TESTS SUMMARY: ALL 5 PASSED, 0 FAILED');
  console.log('============================================================\n');
}

if (process.argv[1]?.includes('geminiService.test')) {
  runGeminiServiceTests().catch((err) => {
    console.error('GeminiService test failure:', err);
    process.exit(1);
  });
}
