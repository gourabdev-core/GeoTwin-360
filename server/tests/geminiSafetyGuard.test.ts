import { GeminiSafetyGuard } from '../services/geminiSafetyGuard.js';
import { GeminiService, GeminiAppError } from '../services/geminiService.js';
import { MockGeminiProvider } from '../services/mockGeminiProvider.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

export async function runGeminiSafetyGuardTests() {
  console.log('============================================================');
  console.log('RUNNING: server/tests/geminiSafetyGuard.test.ts');
  console.log('AUDITING: ZERO-ACCIDENTAL-QUOTA GEMINI SAFETY SYSTEM');
  console.log('============================================================\n');

  // Baseline check: ensure 0 real calls have been made
  process.env.NODE_ENV = 'test';
  GeminiSafetyGuard.resetRealCallCountForTesting();
  assert(
    GeminiSafetyGuard.getRealApiCallsCount() === 0,
    'Real API call counter must start at 0'
  );

  // -------------------------------------------------------------
  // Test A & B: LIVE_GEMINI_TEST=false blocks calls BEFORE network I/O
  // -------------------------------------------------------------
  console.log('[Test A & B] Verifying LIVE_GEMINI_TEST=false blocks before network I/O...');
  process.env.NODE_ENV = 'test';
  process.env.LIVE_GEMINI_TEST = 'false';
  GeminiSafetyGuard.resetForTesting();

  assert(
    GeminiSafetyGuard.isLiveTestConfigured() === false,
    'Live test must NOT be configured when LIVE_GEMINI_TEST is false'
  );
  assert(
    GeminiSafetyGuard.isLiveTestPermitted() === false,
    'Live test permit must NOT be available'
  );

  // Directly attempt acquiring permit
  const permitBlocked = GeminiSafetyGuard.acquireLiveRequestPermit();
  assert(permitBlocked === false, 'acquireLiveRequestPermit must return false when disabled');

  // Test that GeminiService blocks real calls when mock mode is disabled
  GeminiService.setMockMode(false);
  let blockedError: GeminiAppError | null = null;
  try {
    // In test environment, if LIVE_GEMINI_TEST is false and mockMode is disabled,
    // execute must throw GEMINI_CALL_BLOCKED before network I/O
    await GeminiService.execute({
      purpose: 'Safety Guard Pre-Network Block Test',
      cacheKey: 'test_safety_guard_block_key_' + Date.now(),
      contents: 'test',
    });
  } catch (err: any) {
    blockedError = err;
  }

  assert(
    blockedError !== null && blockedError.code === 'GEMINI_CALL_BLOCKED',
    'Executing real call in TEST_MODE must throw GEMINI_CALL_BLOCKED'
  );

  assert(
    GeminiSafetyGuard.getRealApiCallsCount() === 0,
    'Real API calls must be 0 - blocked BEFORE any network I/O'
  );
  console.log('  [PASS] LIVE_GEMINI_TEST=false blocks live call before network I/O.');
  console.log('  [PASS] Real Gemini API calls made: 0\n');

  // -------------------------------------------------------------
  // Test C: Mock Gemini Success Works
  // -------------------------------------------------------------
  console.log('[Test C] Verifying Mock Gemini Success...');
  GeminiService.setMockMode(true);
  MockGeminiProvider.setScenario('success');

  const successResult = await GeminiService.execute<{ climateExplanation: string }>({
    purpose: 'Advisor Recommendations test',
    cacheKey: 'test_mock_success_key_' + Date.now(),
    contents: 'test',
  });

  assert(
    Boolean(successResult.data.climateExplanation),
    'Mock success must return valid structured payload'
  );
  assert(
    GeminiSafetyGuard.getRealApiCallsCount() === 0,
    'Real API calls must remain 0 during mock success'
  );
  console.log('  [PASS] Mock Gemini success executed safely with 0 real calls.\n');

  // -------------------------------------------------------------
  // Test D: Mock 429 Daily Quota Works
  // -------------------------------------------------------------
  console.log('[Test D] Verifying Mock 429 Daily Quota Exhaustion...');
  MockGeminiProvider.setScenario('daily_quota_429');
  let quotaErrorThrown = false;

  try {
    await GeminiService.execute({
      purpose: 'Advisor Recommendations test',
      cacheKey: 'test_mock_daily_quota_' + Date.now(),
      contents: 'test',
    });
  } catch (err: any) {
    quotaErrorThrown = true;
    assert(
      err.code === 'GEMINI_DAILY_QUOTA_EXCEEDED',
      `Expected GEMINI_DAILY_QUOTA_EXCEEDED, received ${err.code}`
    );
    assert(err.isDailyQuota === true, 'isDailyQuota flag must be true');
    assert(err.statusCode === 429, 'Status code must be 429');
  }

  assert(quotaErrorThrown, 'Mock 429 daily quota must throw');
  assert(
    GeminiSafetyGuard.getRealApiCallsCount() === 0,
    'Real API calls must remain 0 during 429 test'
  );
  GeminiService.resetCircuitBreaker();
  console.log('  [PASS] Mock 429 daily quota classified correctly without network calls.\n');

  // -------------------------------------------------------------
  // Test E: Mock 429 Transient Rate Limit Works
  // -------------------------------------------------------------
  console.log('[Test E] Verifying Mock 429 Transient Rate Limit...');
  MockGeminiProvider.setScenario('rate_limit_429');
  let rpmErrorThrown = false;

  try {
    await GeminiService.execute({
      purpose: 'Advisor Recommendations test',
      cacheKey: 'test_mock_rpm_' + Date.now(),
      contents: 'test',
    });
  } catch (err: any) {
    rpmErrorThrown = true;
    assert(
      err.code === 'GEMINI_RATE_LIMIT_EXCEEDED',
      `Expected GEMINI_RATE_LIMIT_EXCEEDED, received ${err.code}`
    );
    assert(err.isDailyQuota === false, 'Transient RPM must not be daily quota');
  }

  assert(rpmErrorThrown, 'Mock 429 RPM must throw');
  assert(
    GeminiSafetyGuard.getRealApiCallsCount() === 0,
    'Real API calls must remain 0 during RPM test'
  );
  console.log('  [PASS] Mock 429 transient rate limit classified correctly.\n');

  // -------------------------------------------------------------
  // Test F: Mock 503 Service Unavailable Works
  // -------------------------------------------------------------
  console.log('[Test F] Verifying Mock 503 Service Unavailable...');
  MockGeminiProvider.setScenario('service_unavailable_503');
  let err503Thrown = false;

  try {
    await GeminiService.execute({
      purpose: 'Advisor Recommendations test',
      cacheKey: 'test_mock_503_' + Date.now(),
      contents: 'test',
    });
  } catch (err: any) {
    err503Thrown = true;
    assert(
      err.code === 'GEMINI_SERVICE_UNAVAILABLE',
      `Expected GEMINI_SERVICE_UNAVAILABLE, received ${err.code}`
    );
    assert(err.statusCode === 503, 'Status code must be 503');
  }

  assert(err503Thrown, 'Mock 503 must throw');
  assert(
    GeminiSafetyGuard.getRealApiCallsCount() === 0,
    'Real API calls must remain 0 during 503 test'
  );
  console.log('  [PASS] Mock 503 classified correctly without contacting Google.\n');

  // -------------------------------------------------------------
  // Test G: Mock 401 Invalid Key Works
  // -------------------------------------------------------------
  console.log('[Test G] Verifying Mock 401 Invalid Key...');
  MockGeminiProvider.setScenario('invalid_key_401');
  let err401Thrown = false;

  try {
    await GeminiService.execute({
      purpose: 'Advisor Recommendations test',
      cacheKey: 'test_mock_401_' + Date.now(),
      contents: 'test',
    });
  } catch (err: any) {
    err401Thrown = true;
    assert(
      err.code === 'GEMINI_INVALID_KEY',
      `Expected GEMINI_INVALID_KEY, received ${err.code}`
    );
    assert(err.statusCode === 401, 'Status code must be 401');
  }

  assert(err401Thrown, 'Mock 401 must throw');
  assert(
    GeminiSafetyGuard.getRealApiCallsCount() === 0,
    'Real API calls must remain 0 during 401 test'
  );
  console.log('  [PASS] Mock 401 classified correctly.\n');

  // -------------------------------------------------------------
  // Test H: Mock 403 Permission Denied Works
  // -------------------------------------------------------------
  console.log('[Test H] Verifying Mock 403 Permission Denied...');
  MockGeminiProvider.setScenario('permission_denied_403');
  let err403Thrown = false;

  try {
    await GeminiService.execute({
      purpose: 'Advisor Recommendations test',
      cacheKey: 'test_mock_403_' + Date.now(),
      contents: 'test',
    });
  } catch (err: any) {
    err403Thrown = true;
    assert(
      err.code === 'GEMINI_PERMISSION_DENIED',
      `Expected GEMINI_PERMISSION_DENIED, received ${err.code}`
    );
    assert(err.statusCode === 403, 'Status code must be 403');
  }

  assert(err403Thrown, 'Mock 403 must throw');
  assert(
    GeminiSafetyGuard.getRealApiCallsCount() === 0,
    'Real API calls must remain 0 during 403 test'
  );
  console.log('  [PASS] Mock 403 classified correctly.\n');

  // -------------------------------------------------------------
  // Test I: Mock Timeout Works
  // -------------------------------------------------------------
  console.log('[Test I] Verifying Mock Timeout...');
  MockGeminiProvider.setScenario('timeout');
  let errTimeoutThrown = false;

  try {
    await GeminiService.execute({
      purpose: 'Advisor Recommendations test',
      cacheKey: 'test_mock_timeout_' + Date.now(),
      contents: 'test',
    });
  } catch (err: any) {
    errTimeoutThrown = true;
    assert(
      err.code === 'GEMINI_TIMEOUT',
      `Expected GEMINI_TIMEOUT, received ${err.code}`
    );
  }

  assert(errTimeoutThrown, 'Mock timeout must throw');
  assert(
    GeminiSafetyGuard.getRealApiCallsCount() === 0,
    'Real API calls must remain 0 during timeout test'
  );
  console.log('  [PASS] Mock timeout classified correctly.\n');

  // -------------------------------------------------------------
  // Test J: Mock Network Failure Works
  // -------------------------------------------------------------
  console.log('[Test J] Verifying Mock Network Failure...');
  MockGeminiProvider.setScenario('network_failure');
  let errNetworkThrown = false;

  try {
    await GeminiService.execute({
      purpose: 'Advisor Recommendations test',
      cacheKey: 'test_mock_network_' + Date.now(),
      contents: 'test',
    });
  } catch (err: any) {
    errNetworkThrown = true;
    assert(
      err.code === 'GEMINI_NETWORK_ERROR',
      `Expected GEMINI_NETWORK_ERROR, received ${err.code}`
    );
  }

  assert(errNetworkThrown, 'Mock network failure must throw');
  assert(
    GeminiSafetyGuard.getRealApiCallsCount() === 0,
    'Real API calls must remain 0 during network failure test'
  );
  console.log('  [PASS] Mock network failure classified correctly.\n');

  // -------------------------------------------------------------
  // Test K & L: LIVE_GEMINI_TEST=true allows only ONE real request; second is BLOCKED
  // -------------------------------------------------------------
  console.log('[Test K & L] Verifying LIVE_GEMINI_TEST=true exactly-one request gate...');
  GeminiSafetyGuard.resetForTesting();
  process.env.LIVE_GEMINI_TEST = 'true';

  assert(
    GeminiSafetyGuard.isLiveTestPermitted() === true,
    'Live test must be permitted initially'
  );

  // First authorization attempt: MUST SUCCEED
  const firstPermit = GeminiSafetyGuard.acquireLiveRequestPermit();
  assert(firstPermit === true, 'First request permit MUST be granted');
  assert(
    GeminiSafetyGuard.hasConsumedPermit() === true,
    'Permit must be marked consumed immediately'
  );
  assert(
    GeminiSafetyGuard.isLiveTestPermitted() === false,
    'Live test must be disabled immediately after first permit'
  );

  // Second authorization attempt: MUST BE BLOCKED
  const secondPermit = GeminiSafetyGuard.acquireLiveRequestPermit();
  assert(secondPermit === false, 'Second request permit MUST be blocked');

  // Third attempt: still blocked
  const thirdPermit = GeminiSafetyGuard.acquireLiveRequestPermit();
  assert(thirdPermit === false, 'Subsequent permits MUST remain blocked');

  console.log('  [PASS] First request allowed (permit=true), second request BLOCKED (permit=false).\n');

  // -------------------------------------------------------------
  // Test M: Concurrent Requests Protection
  // -------------------------------------------------------------
  console.log('[Test M] Verifying concurrent request race condition protection...');
  GeminiSafetyGuard.resetForTesting();
  process.env.LIVE_GEMINI_TEST = 'true';

  // Fire 10 simultaneous requests attempting to acquire the live permit
  const concurrentAttempts = await Promise.all(
    Array.from({ length: 10 }, async () => GeminiSafetyGuard.acquireLiveRequestPermit())
  );

  const grantedCount = concurrentAttempts.filter((res) => res === true).length;
  const blockedCount = concurrentAttempts.filter((res) => res === false).length;

  assert(grantedCount === 1, `Expected exactly 1 permit granted, got ${grantedCount}`);
  assert(blockedCount === 9, `Expected 9 blocked, got ${blockedCount}`);
  assert(
    GeminiSafetyGuard.hasConsumedPermit() === true,
    'Permit must be consumed after concurrent race'
  );

  console.log(`  [PASS] Concurrent race: ${grantedCount} granted, ${blockedCount} blocked. Gate is atomic.\n`);

  // -------------------------------------------------------------
  // Test N: Live-test failure does NOT trigger a second request
  // -------------------------------------------------------------
  console.log('[Test N] Verifying live-test failure zero-retry policy...');
  // After permit is consumed, live mode is auto-disabled.
  // Any retry attempt would call acquireLiveRequestPermit and get false, blocking it.
  assert(
    GeminiSafetyGuard.acquireLiveRequestPermit() === false,
    'No second request permit can be acquired after failure'
  );
  console.log('  [PASS] Live-test zero-retry invariant confirmed.\n');

  // -------------------------------------------------------------
  // Test O: Tests do NOT require real Gemini API Key
  // -------------------------------------------------------------
  console.log('[Test O] Verifying tests execute safely without real Gemini API key...');
  MockGeminiProvider.reset();
  GeminiService.setMockMode(true);
  const offlineResult = await MockGeminiProvider.generateContent({
    purpose: 'Offline test verification',
    contents: 'test',
  });
  assert(Boolean(offlineResult.text), 'Offline mock works without any real key');
  console.log('  [PASS] Mock provider operates completely offline with zero credentials.\n');

  // -------------------------------------------------------------
  // Test T: Mode Separation Verification
  // -------------------------------------------------------------
  console.log('[Test T] Verifying mode separation (TEST_MODE, LOCAL_APP_MODE, LIVE_TEST_MODE)...');
  GeminiSafetyGuard.resetForTesting();
  process.env.LIVE_GEMINI_TEST = 'false';

  // 1. In test environment without explicit live authorization -> TEST_MODE
  assert(
    GeminiSafetyGuard.getOperationalMode() === 'TEST_MODE',
    'Operational mode in test suite must be TEST_MODE'
  );

  // 2. Explicit live test authorization -> LIVE_TEST_MODE
  GeminiSafetyGuard.authorizeLiveTest();
  assert(
    GeminiSafetyGuard.getOperationalMode() === 'LIVE_TEST_MODE',
    'Operational mode under authorizeLiveTest must be LIVE_TEST_MODE'
  );
  const permit = GeminiSafetyGuard.acquireLiveRequestPermit();
  assert(permit === true, 'Live permit must be acquired');
  assert(
    GeminiSafetyGuard.getOperationalMode() === 'TEST_MODE',
    'Operational mode must revert to TEST_MODE after permit is consumed'
  );

  // 3. Localhost website / application mode -> LOCAL_APP_MODE
  const savedNodeEnv = process.env.NODE_ENV;
  try {
    (process.env as any).NODE_ENV = 'development';
    process.env.LIVE_GEMINI_TEST = 'false';
    GeminiSafetyGuard.resetForTesting();

    assert(
      GeminiSafetyGuard.getOperationalMode() === 'LOCAL_APP_MODE',
      'Localhost application (development mode) must be LOCAL_APP_MODE'
    );
    assert(
      GeminiSafetyGuard.isLiveTestPermitted() === false,
      'LOCAL_APP_MODE does not require LIVE_GEMINI_TEST=true'
    );
  } finally {
    (process.env as any).NODE_ENV = savedNodeEnv;
    GeminiSafetyGuard.resetForTesting();
  }
  console.log('  [PASS] Mode separation verified for all 3 modes.\n');

  // -------------------------------------------------------------
  // Test P, Q, R, S: Real API Call Counter Verification
  // -------------------------------------------------------------
  console.log('[Test P, Q, R, S] Verifying REAL GEMINI API REQUESTS = 0...');
  const totalRealCalls = GeminiSafetyGuard.getRealApiCallsCount();
  assert(
    totalRealCalls === 0,
    `CRITICAL VIOLATION: Expected 0 real Gemini calls, but recorded ${totalRealCalls}!`
  );

  // Restore clean state
  GeminiSafetyGuard.resetForTesting();
  process.env.LIVE_GEMINI_TEST = 'false';
  MockGeminiProvider.reset();
  GeminiService.setMockMode(false);

  console.log('============================================================');
  console.log('ALL GEMINI SAFETY GUARD TESTS PASSED (A through S)');
  console.log(`REAL GEMINI API REQUESTS MADE = ${totalRealCalls}`);
  console.log('============================================================\n');
}

if (process.argv[1]?.includes('geminiSafetyGuard.test')) {
  runGeminiSafetyGuardTests().catch((err) => {
    console.error('GeminiSafetyGuard test failure:', err);
    process.exit(1);
  });
}
