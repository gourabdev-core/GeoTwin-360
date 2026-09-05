import { AdvisorService } from '../services/advisorService.js';
import { LocationService } from '../services/locationService.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/u;

function checkForEmoji(text: string, path: string = '') {
  if (EMOJI_REGEX.test(text)) {
    throw new Error(`EMOJI POLICY VIOLATION at ${path}: Found emoji in text: "${text.substring(0, 50)}..."`);
  }
}

export async function runAdvisorTests() {
  console.log('============================================================');
  console.log('RUNNING: server/tests/advisor.test.ts');
  console.log('============================================================');

  const testLocationId = 'loc-22.5726-88.3638';
  const targetYear = 2035;
  const scenario = 'resilience';

  // Test 1: Gather Structured Context
  console.log('[Test 1] Gathering verified structured climate context for Kolkata...');
  const context = await AdvisorService.gatherContext(testLocationId, targetYear, scenario);

  assert(context.locationName.length > 0, 'Context must include locationName');
  assert(context.latitude !== 0 && context.longitude !== 0, 'Context must include coordinates');
  assert(context.targetYear === targetYear, 'Context must reflect targetYear');
  assert(context.scenario.id === 'resilience', 'Context must reflect selected scenario');
  assert(context.scenario.description.length > 0, 'Context must reflect scenario description');
  console.log(`- Resolved: ${context.locationName} (${context.latitude.toFixed(4)}, ${context.longitude.toFixed(4)})`);
  console.log(`- Scenario: ${context.scenario.name} (${context.scenario.tag})`);
  console.log(`- Live Weather Available: ${context.currentClimate !== null}`);
  console.log(`- Historical Observations Count: ${context.historicalData?.length ?? 0}`);
  console.log(`- Predictions Available: ${context.predictions !== null}`);
  console.log('[Test 1] PASSED.\n');

  // Test 2: Build Structured Prompt & Verify Scientific Distinctions + No Emojis
  console.log('[Test 2] Building prompt and verifying scientific distinction rules & no-emoji policy...');
  const { systemInstruction, userMessage } = AdvisorService.buildPrompt(context);

  assert(
    systemInstruction.includes('NEVER invent, fabricate, or hallucinate numerical climate measurements'),
    'Prompt must strictly forbid inventing climate numbers'
  );
  assert(
    systemInstruction.includes('SUPPLIED DATA') &&
    systemInstruction.includes('CALCULATED VALUES') &&
    systemInstruction.includes('ASSUMPTIONS') &&
    systemInstruction.includes('RECOMMENDATIONS'),
    'Prompt must explicitly require distinguishing supplied data, calculated values, assumptions, and recommendations'
  );
  assert(
    systemInstruction.includes('NO EMOJIS'),
    'Prompt must forbid emojis'
  );

  // Check for emojis in generated prompts
  checkForEmoji(systemInstruction, 'systemInstruction');
  checkForEmoji(userMessage, 'userMessage');

  // Check required output schema keys in prompt
  assert(userMessage.includes('climateExplanation'), 'Prompt must require climateExplanation');
  assert(userMessage.includes('mainRisks'), 'Prompt must require mainRisks');
  assert(userMessage.includes('riskSignificance'), 'Prompt must require riskSignificance');
  assert(userMessage.includes('recommendedActions'), 'Prompt must require recommendedActions');
  assert(userMessage.includes('shortTermRecommendations'), 'Prompt must require shortTermRecommendations');
  assert(userMessage.includes('longTermRecommendations'), 'Prompt must require longTermRecommendations');
  assert(userMessage.includes('confidenceLimitations'), 'Prompt must require confidenceLimitations');
  assert(userMessage.includes('dataDistinction'), 'Prompt must require dataDistinction');
  console.log('- Prompt enforces 7 required outputs, data distinction rules, and strict no-emoji policy.');
  console.log('[Test 2] PASSED.\n');

  // Test 3: Deterministic Fallback Engine
  console.log('[Test 3] Verifying deterministic decision-support fallback engine...');
  const fallback = AdvisorService.buildDeterministicFallback(
    context,
    'Simulated API unavailable for test verification.'
  );

  assert(fallback.isFallback === true, 'Fallback response must set isFallback: true');
  assert(fallback.climateExplanation.length > 20, 'Fallback climate explanation must be detailed');
  assert(fallback.mainRisks.length > 0, 'Fallback main risks must not be empty');
  assert(fallback.riskSignificance.length > 10, 'Fallback risk significance must not be empty');
  assert(fallback.recommendedActions.length >= 2, 'Fallback recommended actions must have at least 2 items');
  assert(fallback.shortTermRecommendations.length >= 1, 'Fallback must have short-term actions');
  assert(fallback.longTermRecommendations.length >= 1, 'Fallback must have long-term actions');
  assert(fallback.confidenceLimitations.length > 10, 'Fallback confidence statement must be present');
  assert(fallback.dataDistinction.suppliedData.length > 0, 'Fallback data distinction must include suppliedData');
  assert(fallback.dataDistinction.calculatedValues.length > 0, 'Fallback data distinction must include calculatedValues');

  // Verify backward-compatibility aliases
  assert(fallback.summary === fallback.climateExplanation, 'summary alias must match climateExplanation');
  assert(fallback.keyProblems.length === fallback.mainRisks.length, 'keyProblems alias must match mainRisks');
  assert(fallback.recommendations.length === fallback.recommendedActions.length, 'recommendations alias must match recommendedActions');

  // Verify no emojis in fallback
  checkForEmoji(fallback.climateExplanation, 'fallback.climateExplanation');
  checkForEmoji(fallback.riskSignificance, 'fallback.riskSignificance');
  checkForEmoji(fallback.confidenceLimitations, 'fallback.confidenceLimitations');
  for (const r of fallback.mainRisks) checkForEmoji(r, 'fallback.mainRisks');
  for (const a of fallback.recommendedActions) {
    checkForEmoji(a.title, 'action.title');
    checkForEmoji(a.reason, 'action.reason');
    checkForEmoji(a.expectedImpact, 'action.expectedImpact');
    checkForEmoji(a.nextStep, 'action.nextStep');
  }

  console.log(`- Fallback Explanation: ${fallback.climateExplanation.substring(0, 80)}...`);
  console.log(`- Fallback Actions Count: ${fallback.recommendedActions.length}`);
  console.log(`- Short-Term Actions: ${fallback.shortTermRecommendations.length}, Long-Term: ${fallback.longTermRecommendations.length}`);
  console.log('[Test 3] PASSED.\n');

  // Test 4: Complete End-to-End Recommendations Flow (with graceful fallback handling)
  console.log('[Test 4] Executing complete generateRecommendations flow...');
  const result = await AdvisorService.generateRecommendations(
    testLocationId,
    targetYear,
    scenario
  );

  assert(result !== null && typeof result === 'object', 'generateRecommendations must return a valid object');
  assert(typeof result.climateExplanation === 'string' && result.climateExplanation.length > 10, 'climateExplanation must be valid string');
  assert(Array.isArray(result.mainRisks) && result.mainRisks.length > 0, 'mainRisks must be non-empty array');
  assert(typeof result.riskSignificance === 'string' && result.riskSignificance.length > 10, 'riskSignificance must be valid string');
  assert(Array.isArray(result.recommendedActions) && result.recommendedActions.length > 0, 'recommendedActions must be non-empty array');
  assert(Array.isArray(result.shortTermRecommendations) && result.shortTermRecommendations.length > 0, 'shortTermRecommendations must be non-empty array');
  assert(Array.isArray(result.longTermRecommendations) && result.longTermRecommendations.length > 0, 'longTermRecommendations must be non-empty array');
  assert(typeof result.confidenceLimitations === 'string' && result.confidenceLimitations.length > 10, 'confidenceLimitations must be valid string');
  assert(typeof result.isFallback === 'boolean', 'isFallback flag must be a boolean');

  // Verify action properties
  for (const action of result.recommendedActions) {
    assert(action.title.length > 0, 'Action title must not be empty');
    assert(['HIGH', 'MEDIUM', 'LOW'].includes(action.priority), `Invalid action priority: ${action.priority}`);
    assert(action.reason.length > 0, 'Action reason must not be empty');
    assert(action.expectedImpact.length > 0, 'Action expectedImpact must not be empty');
    assert(action.nextStep.length > 0, 'Action nextStep must not be empty');
    checkForEmoji(action.title, 'action.title');
    checkForEmoji(action.reason, 'action.reason');
  }

  console.log(`- Generated successfully via ${result.model.provider} (${result.model.name})`);
  console.log(`- Mode: ${result.isFallback ? 'Fallback (Grounded Deterministic Mode)' : 'Live Gemini AI Reasoning'}`);
  console.log(`- Climate Explanation: ${result.climateExplanation.substring(0, 90)}...`);
  console.log(`- Primary Risks Count: ${result.mainRisks.length}`);
  console.log(`- Recommended Actions Count: ${result.recommendedActions.length}`);
  console.log(`- Model Info: ${JSON.stringify(result.model)}`);
  console.log('[Test 4] PASSED.\n');

  console.log('============================================================');
  console.log('ADVISOR TESTS SUMMARY: ALL 4 PASSED, 0 FAILED');
  console.log('============================================================\n');
}

if (process.argv[1]?.includes('advisor.test')) {
  runAdvisorTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Advisor test failure:', err);
      process.exit(1);
    });
}
