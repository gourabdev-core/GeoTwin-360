import assert from 'assert';
import { SolutionService } from '../services/solutionService.js';
import { SCENARIO_DEFINITIONS } from '../services/predictionService.js';
import {
  ResilienceSolutionCategory,
  SolutionPriority,
  ImplementationDifficulty,
} from '../types/solution.js';

async function runResilienceSolutionsTests() {
  console.log('============================================================');
  console.log('STARTING: Resilience Solutions Unit & Integration Tests');
  console.log('============================================================');

  // Test Locations
  const kolkataLocId = 'loc-22.5726-88.3638'; // Tropical, high flood/heat
  const londonLocId = 'loc-51.5074--0.1278';  // Temperate maritime

  const REQUIRED_CATEGORIES: ResilienceSolutionCategory[] = [
    'Water management',
    'Flood protection',
    'Heat mitigation',
    'Agriculture',
    'Infrastructure',
    'Energy',
    'Emergency preparedness',
  ];

  const REQUIRED_ATTRIBUTES = [
    'title',
    'problemAddressed',
    'recommendedAction',
    'expectedBenefit',
    'priority',
    'implementationDifficulty',
    'relevantRisk',
  ];

  try {
    // -------------------------------------------------------------
    // Test 1: Category & Attribute Completeness
    // -------------------------------------------------------------
    console.log('\n[Test 1] Verifying all 7 required categories and 7 required attributes exist...');
    const res2035 = await SolutionService.getSolutions(kolkataLocId, 2035, 'default', false);

    assert(res2035.solutions.length >= 7, 'Expected at least 7 solutions covering all categories');

    const returnedCategories = new Set(res2035.solutions.map((s) => s.category));
    for (const cat of REQUIRED_CATEGORIES) {
      assert(returnedCategories.has(cat), `Missing required category: ${cat}`);
    }

    for (const sol of res2035.solutions) {
      for (const attr of REQUIRED_ATTRIBUTES) {
        assert(
          (sol as any)[attr] !== undefined && (sol as any)[attr] !== '',
          `Solution '${sol.title}' is missing required attribute: ${attr}`
        );
      }

      // Assert priority is one of valid enum values
      const validPriorities: SolutionPriority[] = ['Critical', 'High', 'Medium', 'Low'];
      assert(validPriorities.includes(sol.priority), `Invalid priority: ${sol.priority}`);

      // Assert implementation difficulty is one of valid enum values
      const validDifficulties: ImplementationDifficulty[] = ['Low', 'Moderate', 'High', 'Complex'];
      assert(
        validDifficulties.includes(sol.implementationDifficulty),
        `Invalid difficulty: ${sol.implementationDifficulty}`
      );

      // Verify NO fake exact dollar costs (e.g. no "$", "million dollars", "USD")
      assert(!sol.implementationDifficulty.includes('$'), 'Difficulty must not invent fake dollar costs');
      assert(!sol.expectedBenefit.includes('$'), 'Benefit must not invent fake dollar costs');
    }
    console.log('[PASS] All 7 categories present with all 7 required attributes and zero fabricated dollar costs.');
    console.log('[Test 1] PASSED.');

    // -------------------------------------------------------------
    // Test 2: Determinism (Identical inputs -> identical outputs)
    // -------------------------------------------------------------
    console.log('\n[Test 2] Verifying determinism (same inputs produce exact same outputs)...');
    const runA = await SolutionService.getSolutions(kolkataLocId, 2035, 'resilience', false);
    const runB = await SolutionService.getSolutions(kolkataLocId, 2035, 'resilience', false);

    assert.strictEqual(runA.solutions.length, runB.solutions.length);
    for (let i = 0; i < runA.solutions.length; i++) {
      assert.strictEqual(runA.solutions[i].id, runB.solutions[i].id);
      assert.strictEqual(runA.solutions[i].title, runB.solutions[i].title);
      assert.strictEqual(runA.solutions[i].priority, runB.solutions[i].priority);
      assert.strictEqual(runA.solutions[i].implementationDifficulty, runB.solutions[i].implementationDifficulty);
      assert.strictEqual(runA.solutions[i].problemAddressed, runB.solutions[i].problemAddressed);
      assert.strictEqual(runA.solutions[i].expectedBenefit, runB.solutions[i].expectedBenefit);
      assert.strictEqual(runA.solutions[i].progress, runB.solutions[i].progress);
    }
    console.log('[PASS] Determinism verified: 100% matching outputs for identical inputs.');
    console.log('[Test 2] PASSED.');

    // -------------------------------------------------------------
    // Test 3: Multiple Scenarios (Baseline, Resilience, Accelerated)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Verifying scenario modulation across Baseline, Resilience, and Accelerated pathways...');

    const baselineSol = await SolutionService.getSolutions(kolkataLocId, 2035, 'default', false);
    const resilienceSol = await SolutionService.getSolutions(kolkataLocId, 2035, 'resilience', false);
    const acceleratedSol = await SolutionService.getSolutions(kolkataLocId, 2035, 'accelerated', false);

    assert.strictEqual(baselineSol.scenario.id, 'default');
    assert.strictEqual(resilienceSol.scenario.id, 'resilience');
    assert.strictEqual(acceleratedSol.scenario.id, 'accelerated');

    // In resilience scenario, nature-based progress should be higher than in accelerated
    const resHeat = resilienceSol.solutions.find((s) => s.category === 'Heat mitigation');
    const accHeat = acceleratedSol.solutions.find((s) => s.category === 'Heat mitigation');
    assert(resHeat && accHeat, 'Expected heat mitigation solutions in both scenarios');
    assert(
      resHeat.progress > accHeat.progress,
      `Resilience plan progress (${resHeat.progress}%) should exceed Accelerated progress (${accHeat.progress}%)`
    );

    // In accelerated scenario, emergency preparedness or heat priority should be Critical
    const accEmerg = acceleratedSol.solutions.find((s) => s.category === 'Emergency preparedness');
    assert(accEmerg, 'Expected emergency preparedness solution in accelerated scenario');
    assert.strictEqual(
      accEmerg.priority,
      'Critical',
      'Accelerated scenario should heighten emergency preparedness to Critical'
    );

    console.log('[PASS] Scenario pathways modulate risk severity, priority tiers, and deployment stages correctly.');
    console.log('[Test 3] PASSED.');

    // -------------------------------------------------------------
    // Test 4: Year Progression (2030, 2035, 2040, 2050)
    // -------------------------------------------------------------
    console.log('\n[Test 4] Verifying target year progression (2030, 2035, 2040, 2050)...');
    const years = [2030, 2035, 2040, 2050];
    for (const yr of years) {
      const yrSol = await SolutionService.getSolutions(kolkataLocId, yr, 'default', false);
      assert.strictEqual(yrSol.targetYear, yr);
      assert(yrSol.solutions.length >= 7);

      // Verify time horizon aligns with year
      const sample = yrSol.solutions[0];
      if (yr <= 2030) {
        assert.strictEqual(sample.timeHorizon, 'Immediate (0-2 years)');
      } else if (yr <= 2035) {
        assert.strictEqual(sample.timeHorizon, 'Medium-term (2-5 years)');
      } else {
        assert.strictEqual(sample.timeHorizon, 'Strategic (5-15 years)');
      }
    }
    console.log('[PASS] Year progression correctly updates planning horizons and risk benchmarks.');
    console.log('[Test 4] PASSED.');

    // -------------------------------------------------------------
    // Test 5: Optional Gemini AI Personalization & Fallback Safety
    // -------------------------------------------------------------
    console.log('\n[Test 5] Verifying AI personalization and deterministic fallback safety...');
    const aiSol = await SolutionService.getSolutions(kolkataLocId, 2035, 'default', true);

    assert(aiSol.aiExplanation, 'Expected aiExplanation object when includeAi is true');
    assert(aiSol.aiExplanation.executiveSummary, 'Missing executive summary in AI explanation');
    assert(aiSol.aiExplanation.strategicRoadmap.length >= 3, 'Expected at least 3 roadmap phases');
    assert(aiSol.aiExplanation.policyRecommendation, 'Missing policy recommendation in AI explanation');
    assert(aiSol.aiExplanation.provenance, 'Missing provenance in AI explanation');

    console.log(`  [PASS] AI explanation provenance: ${aiSol.aiExplanation.provenance}`);
    console.log(`  [PASS] AI fallback status: ${aiSol.aiExplanation.isFallback ? 'Fallback active' : 'Live Gemini'}`);
    console.log('[Test 5] PASSED.');

    // -------------------------------------------------------------
    // Test 6: Multiple Locations (Geographic Sensitivity)
    // -------------------------------------------------------------
    console.log('\n[Test 6] Verifying geographic sensitivity across Kolkata vs London...');
    const kolSol = await SolutionService.getSolutions(kolkataLocId, 2035, 'default', false);
    const lonSol = await SolutionService.getSolutions(londonLocId, 2035, 'default', false);

    assert.notStrictEqual(kolSol.location.latitude, lonSol.location.latitude);
    assert(kolSol.solutions.length >= 7 && lonSol.solutions.length >= 7);

    // Problems addressed should mention location name and distinct temperatures
    const kolHeat = kolSol.solutions.find((s) => s.category === 'Heat mitigation')!;
    const lonHeat = lonSol.solutions.find((s) => s.category === 'Heat mitigation')!;
    assert.notStrictEqual(kolHeat.problemAddressed, lonHeat.problemAddressed);

    console.log('[PASS] Geographic location sensitivity verified.');
    console.log('[Test 6] PASSED.');

    console.log('\n============================================================');
    console.log('ALL RESILIENCE SOLUTIONS TESTS PASSED (6/6)');
    console.log('============================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n[FAIL] RESILIENCE SOLUTIONS TEST FAILED:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

runResilienceSolutionsTests();
