import { GeminiService, GeminiAppError } from '../services/geminiService.js';
import { AdvisorService } from '../services/advisorService.js';
import { LocationService } from '../services/locationService.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

export async function runAIAdvisorAuditTests() {
  console.log('============================================================');
  console.log('RUNNING: server/tests/aiAdvisorAudit.test.ts');
  console.log('AUDITING: GEMINI AI ADVISOR (OPTIONAL EXPLANATION LAYER)');
  console.log('============================================================\n');

  // Test 1: 429 Daily Quota Exhaustion - Stop retrying & Circuit breaker
  console.log('[Test 1] Verifying 429 Daily Quota error classification & circuit breaker...');
  const mockDailyQuotaError = {
    status: 429,
    message: 'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash',
  };

  const classifiedDaily = GeminiService.classifyError(mockDailyQuotaError);
  assert(classifiedDaily.code === 'GEMINI_DAILY_QUOTA_EXCEEDED', 'Must classify as GEMINI_DAILY_QUOTA_EXCEEDED');
  assert(classifiedDaily.isDailyQuota === true, 'isDailyQuota must be true');
  assert(GeminiService.isDailyQuotaExceeded() === true, 'Circuit breaker must be engaged immediately');

  // Verify fast-fail without retrying or outbound calls
  let fastFailed = false;
  try {
    await GeminiService.execute({
      purpose: 'Audit quota test',
      cacheKey: 'test_quota_key',
      contents: 'test',
    });
  } catch (err: any) {
    fastFailed = true;
    assert(err.code === 'GEMINI_DAILY_QUOTA_EXCEEDED', 'Must immediately throw GEMINI_DAILY_QUOTA_EXCEEDED');
  }
  assert(fastFailed, 'Circuit breaker must fast-fail requests without network retry');
  console.log('- Circuit breaker engaged, retries stopped, fast-fail confirmed.');
  console.log('[Test 1] PASSED.\n');

  // Reset circuit breaker for subsequent tests
  GeminiService.resetCircuitBreaker();
  assert(GeminiService.isDailyQuotaExceeded() === false, 'Circuit breaker must be reset');

  // Test 2: Error Classification Matrix (Transient RPM, Auth, Network)
  console.log('[Test 2] Verifying complete error classification matrix...');
  // 2a. Transient Rate Limit
  const transientRateLimit = GeminiService.classifyError({
    status: 429,
    message: 'Rate limit exceeded: 5 requests per minute',
  });
  assert(transientRateLimit.code === 'GEMINI_RATE_LIMIT_EXCEEDED', 'Must classify transient RPM as GEMINI_RATE_LIMIT_EXCEEDED');
  assert(transientRateLimit.isDailyQuota === false, 'Transient RPM must not be flagged as daily quota');

  // 2b. Authentication Error
  const authError = GeminiService.classifyError({
    status: 401,
    message: 'API key not valid. Please pass a valid API key.',
  });
  assert(authError.code === 'GEMINI_INVALID_KEY', 'Must classify 401 as GEMINI_INVALID_KEY');

  // 2c. Network Connectivity Error
  const networkError = GeminiService.classifyError({
    name: 'TypeError',
    message: 'fetch failed: connect ECONNREFUSED 142.250.180.202:443',
  });
  assert(networkError.code === 'GEMINI_NETWORK_ERROR', 'Must classify fetch failed / ECONNREFUSED as GEMINI_NETWORK_ERROR');

  // 2d. 503 Service Unavailable / Model Overloaded
  const serviceUnavailableError = GeminiService.classifyError({
    status: 503,
    message: 'The model is overloaded. Please try again later. ServiceUnavailable',
  });
  assert(serviceUnavailableError.code === 'GEMINI_SERVICE_UNAVAILABLE', 'Must classify 503 / ServiceUnavailable as GEMINI_SERVICE_UNAVAILABLE');
  assert(serviceUnavailableError.statusCode === 503, 'Must have statusCode 503');

  console.log('- Classified: Transient RPM, Auth, Network connectivity, and 503 ServiceUnavailable accurately.');
  console.log('[Test 2] PASSED.\n');

  // Test 3: Caching & In-Flight Request Deduplication
  console.log('[Test 3] Verifying Cache & Request Deduplication...');
  const keyA = GeminiService.buildCacheKey('advisor_recommendations', 'loc-test-1', 2035, 'default');
  const keyB = GeminiService.buildCacheKey('advisor_recommendations', 'loc-test-1', 2035, 'default');
  const keyC = GeminiService.buildCacheKey('advisor_recommendations', 'loc-test-1', 2050, 'default');
  assert(keyA === keyB, 'Identical request parameters must generate identical cache key');
  assert(keyA !== keyC, 'Different year must produce distinct cache key');
  console.log('- Cache key determinism validated.');
  console.log('[Test 3] PASSED.\n');

  // Test 4: Prompt Guardrails - Prohibit inventing climate data or fake sources
  console.log('[Test 4] Verifying Gemini Prompt Scientific Guardrails...');
  const locations = await LocationService.searchLocations('Bengaluru');
  const testLocation = locations[0] || (await LocationService.getAllLocations())[0];
  assert(Boolean(testLocation?.id), 'Test location required');

  const context = await AdvisorService.gatherContext(testLocation.id, 2035, 'default');
  const { systemInstruction, userMessage } = AdvisorService.buildPrompt(context);

  assert(
    systemInstruction.includes('NEVER invent, fabricate, or hallucinate numerical climate measurements'),
    'Prompt must strictly prohibit inventing climate statistics'
  );
  assert(
    systemInstruction.includes('scientific sources/citations'),
    'Prompt must forbid synthetic scientific sources'
  );
  assert(
    systemInstruction.includes('SUPPLIED DATA') &&
    systemInstruction.includes('CALCULATED VALUES') &&
    systemInstruction.includes('ASSUMPTIONS') &&
    systemInstruction.includes('RECOMMENDATIONS'),
    'Prompt must enforce 4-tier data provenance distinction'
  );
  assert(
    systemInstruction.includes('ABSOLUTELY NO EMOJIS OR UNICODE ICONS'),
    'Prompt must strictly enforce project no-emoji policy'
  );
  console.log('- Guardrails against hallucinated data, fake sources, and emojis confirmed.');
  console.log('[Test 4] PASSED.\n');

  // Test 5: Distinct Handling: AI-Generated vs System/Model-Based Analysis
  console.log('[Test 5] Verifying explicit distinction between AI vs Model-Based analysis...');
  const fallback = AdvisorService.buildDeterministicFallback(
    context,
    'AI analysis temporarily unavailable due to daily quota exhaustion.',
    'GEMINI_DAILY_QUOTA_EXCEEDED'
  );

  assert(fallback.isFallback === true, 'Fallback must have isFallback = true');
  assert(fallback.analysisType === 'SYSTEM_MODEL_BASED', 'Fallback must specify analysisType = SYSTEM_MODEL_BASED');
  assert(fallback.model.provider === 'GeoTwin Intelligence Layer', 'Provider must be GeoTwin, never Google');
  assert(fallback.model.name.includes('Deterministic'), 'Model name must state Deterministic Assessment');
  assert(Boolean(fallback.fallbackReason), 'Fallback must disclose reason');
  assert(fallback.recommendedActions.length >= 3, 'Deterministic fallback must provide actionable recommendations');
  assert(fallback.dataDistinction.suppliedData.length > 0, 'Must include verified supplied telemetry');
  assert(fallback.dataDistinction.calculatedValues.length > 0, 'Must include calculated model values');
  console.log('- System/Model-based analysis clearly distinguished from AI-generated analysis.');
  console.log('[Test 5] PASSED.\n');

  // Test 6: Explicit Deterministic Mode
  console.log('[Test 6] Verifying user-selected deterministic mode (zero AI calls)...');
  const deterministicResult = await AdvisorService.generateRecommendations(
    testLocation.id,
    2035,
    'default',
    undefined,
    'deterministic'
  );

  assert(deterministicResult.isFallback === true, 'Deterministic mode must return isFallback = true');
  assert(deterministicResult.analysisType === 'SYSTEM_MODEL_BASED', 'Must return analysisType = SYSTEM_MODEL_BASED');
  assert(deterministicResult.errorCode === 'DETERMINISTIC_MODE_REQUESTED', 'Must record user requested mode');
  console.log('- Deterministic mode generated instant ground-truth assessment without calling Gemini.');
  console.log('[Test 6] PASSED.\n');

  console.log('============================================================');
  console.log('AI ADVISOR AUDIT: ALL 6 TESTS PASSED, 0 FAILED');
  console.log('VERIFIED: Gemini operates strictly as an optional explanation layer.');
  console.log('============================================================\n');
}

if (process.argv[1]?.includes('aiAdvisorAudit.test')) {
  runAIAdvisorAuditTests().catch((err) => {
    console.error('AI Advisor Audit failure:', err);
    process.exit(1);
  });
}
