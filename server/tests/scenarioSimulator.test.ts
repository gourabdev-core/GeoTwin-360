import assert from 'assert';
import { SimulationService, SCENARIO_NAMES } from '../services/simulationService.js';
import { LocationService } from '../services/locationService.js';
import { supabase } from '../config/supabase.js';

async function runScenarioSimulatorTests() {
  console.log('============================================================');
  console.log('STARTING: Scenario Simulator Unit & Integration Tests');
  console.log('============================================================');

  // Synthetic location for offline-resilient deterministic testing
  // Synthetic coordinates for Kolkata (22.5726, 88.3638)
  const kolkataLocId = 'loc-22.5726-88.3638';
  // Synthetic coordinates for London (51.5074, -0.1278)
  const londonLocId = 'loc-51.5074--0.1278';

  try {
    // -------------------------------------------------------------
    // Test 1: Determinism (Same inputs -> Exactly same outputs)
    // -------------------------------------------------------------
    console.log('\n[Test 1] Verifying simulation determinism (same inputs -> same outputs)...');
    const inputLoc = kolkataLocId;
    const inputYear = 2035;
    const inputScenario = 'resilience';
    const inputInterventions = ['plant-trees', 'rainwater-harvesting', 'cool-roof-initiative'];

    const run1 = await SimulationService.runSimulation(inputLoc, inputYear, inputInterventions, inputScenario);
    const run2 = await SimulationService.runSimulation(inputLoc, inputYear, inputInterventions, inputScenario);

    assert.strictEqual(run1.targetYear, run2.targetYear);
    assert.strictEqual(run1.scenario, run2.scenario);
    assert.strictEqual(run1.baseline.temperature, run2.baseline.temperature);
    assert.strictEqual(run1.baseline.precipitation, run2.baseline.precipitation);
    assert.strictEqual(run1.baseline.heatRisk.score, run2.baseline.heatRisk.score);
    assert.strictEqual(run1.baseline.floodRisk, run2.baseline.floodRisk);
    assert.strictEqual(run1.baseline.waterStress.percentage, run2.baseline.waterStress.percentage);
    assert.strictEqual(run1.baseline.overallRiskScore, run2.baseline.overallRiskScore);

    assert.strictEqual(run1.afterSimulation.temperature, run2.afterSimulation.temperature);
    assert.strictEqual(run1.afterSimulation.precipitation, run2.afterSimulation.precipitation);
    assert.strictEqual(run1.afterSimulation.overallRiskScore, run2.afterSimulation.overallRiskScore);

    assert.strictEqual(run1.impact.temperature, run2.impact.temperature);
    assert.strictEqual(run1.impact.precipitation, run2.impact.precipitation);
    assert.strictEqual(run1.impact.heatRisk.deltaScore, run2.impact.heatRisk.deltaScore);
    assert.strictEqual(run1.impact.floodRisk.deltaScore, run2.impact.floodRisk.deltaScore);
    assert.strictEqual(run1.impact.waterStress.deltaPercentage, run2.impact.waterStress.deltaPercentage);
    assert.strictEqual(run1.impact.overallRiskScore.change, run2.impact.overallRiskScore.change);

    assert.strictEqual(run1.sustainabilityScore.before, run2.sustainabilityScore.before);
    assert.strictEqual(run1.sustainabilityScore.after, run2.sustainabilityScore.after);
    assert.strictEqual(run1.sustainabilityScore.improvement, run2.sustainabilityScore.improvement);

    console.log('[PASS] Run 1 and Run 2 outputs match 100% deterministically.');
    console.log('[Test 1] PASSED.');

    // -------------------------------------------------------------
    // Test 2: Support for existing years (2030, 2035, 2040, 2050)
    // -------------------------------------------------------------
    console.log('\n[Test 2] Verifying support for years: 2030, 2035, 2040, 2050...');
    const supportedYears = [2030, 2035, 2040, 2050];
    let prevTemp = 0;

    for (const yr of supportedYears) {
      const res = await SimulationService.runSimulation(kolkataLocId, yr, ['plant-trees'], 'default');
      assert.strictEqual(res.targetYear, yr);
      assert.ok(typeof res.baseline.temperature === 'number');
      assert.ok(res.baseline.temperature > 0);
      assert.ok(res.afterSimulation.temperature !== null);
      assert.strictEqual(res.impact.temperature, -0.5);

      // Verify future warming trend progression
      if (prevTemp > 0) {
        assert.ok(
          (res.baseline.temperature ?? 0) >= prevTemp,
          `Year ${yr} temperature should reflect progressive warming trend.`
        );
      }
      prevTemp = res.baseline.temperature ?? 0;
      console.log(`  [PASS] Year ${yr}: Baseline Temp = ${res.baseline.temperature}°C, Simulated = ${res.afterSimulation.temperature}°C`);
    }
    console.log('[Test 2] PASSED.');

    // -------------------------------------------------------------
    // Test 3: Structured Scenarios (Baseline, Resilience, Accelerated)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Verifying structured scenario models...');
    const baseRun = await SimulationService.runSimulation(kolkataLocId, 2035, [], 'default');
    const resRun = await SimulationService.runSimulation(kolkataLocId, 2035, [], 'resilience');
    const accRun = await SimulationService.runSimulation(kolkataLocId, 2035, [], 'accelerated');

    assert.strictEqual(baseRun.scenario, 'default');
    assert.strictEqual(resRun.scenario, 'resilience');
    assert.strictEqual(accRun.scenario, 'accelerated');

    assert.strictEqual(baseRun.scenarioName, 'Baseline Scenario');
    assert.strictEqual(resRun.scenarioName, 'Resilience Plan 2035');
    assert.strictEqual(accRun.scenarioName, 'Accelerated Emissions');

    // Resilience scenario should have lower baseline temperature and lower or equal risk
    assert.ok(
      (resRun.baseline.temperature ?? 0) <= (baseRun.baseline.temperature ?? 0),
      'Resilience scenario baseline temperature should be <= Baseline'
    );

    // Accelerated scenario should have higher baseline temperature and higher overall risk
    assert.ok(
      (accRun.baseline.temperature ?? 0) >= (baseRun.baseline.temperature ?? 0),
      'Accelerated scenario baseline temperature should be >= Baseline'
    );
    assert.ok(
      accRun.baseline.overallRiskScore >= resRun.baseline.overallRiskScore,
      'Accelerated overall risk score should be >= Resilience'
    );

    console.log(`  [PASS] Baseline (${baseRun.scenarioName}): Temp ${baseRun.baseline.temperature}°C, Risk ${baseRun.baseline.overallRiskScore}/100`);
    console.log(`  [PASS] Resilience (${resRun.scenarioName}): Temp ${resRun.baseline.temperature}°C, Risk ${resRun.baseline.overallRiskScore}/100`);
    console.log(`  [PASS] Accelerated (${accRun.scenarioName}): Temp ${accRun.baseline.temperature}°C, Risk ${accRun.baseline.overallRiskScore}/100`);
    console.log('[Test 3] PASSED.');

    // -------------------------------------------------------------
    // Test 4: Structured Outputs Presence & Integrity
    // -------------------------------------------------------------
    console.log('\n[Test 4] Verifying all required structured outputs...');
    const simFull = await SimulationService.runSimulation(kolkataLocId, 2035, [
      'plant-trees',
      'rainwater-harvesting',
      'cool-roof-initiative',
    ], 'default');

    // 1. Temperature impact
    assert.ok(typeof simFull.impact.temperature === 'number');
    assert.strictEqual(simFull.impact.temperature, -1.3); // -0.5 (trees) + -0.8 (cool roof)

    // 2. Precipitation impact
    assert.ok(typeof simFull.impact.precipitation === 'number');
    assert.strictEqual(simFull.impact.precipitation, 20); // 5 (trees) + 15 (rainwater)

    // 3. Heat risk
    assert.ok(simFull.baseline.heatRisk.score !== null);
    assert.ok(simFull.afterSimulation.heatRisk.score !== null);
    assert.ok(simFull.impact.heatRisk.deltaScore <= 0); // Cooling reduces heat risk

    // 4. Flood risk
    assert.ok(simFull.baseline.floodRisk !== 'UNAVAILABLE');
    assert.ok(simFull.afterSimulation.floodRisk !== 'UNAVAILABLE');
    assert.ok(simFull.impact.floodRisk.deltaScore <= 0); // Trees and rainwater reduce flood risk

    // 5. Water stress
    assert.ok(simFull.baseline.waterStress.percentage !== null);
    assert.ok(simFull.afterSimulation.waterStress.percentage !== null);
    assert.ok(simFull.impact.waterStress.deltaPercentage < 0); // Reduced water stress

    // 6. Overall risk score
    assert.ok(typeof simFull.baseline.overallRiskScore === 'number');
    assert.ok(typeof simFull.afterSimulation.overallRiskScore === 'number');
    assert.ok(simFull.impact.overallRiskScore.change <= 0); // Risk decreased

    // 7. Sustainability score
    assert.ok(simFull.sustainabilityScore.improvement > 0);
    assert.strictEqual(
      simFull.sustainabilityScore.after - simFull.sustainabilityScore.before,
      simFull.sustainabilityScore.improvement
    );

    console.log(`  [PASS] Temperature impact: ${simFull.impact.temperature}°C`);
    console.log(`  [PASS] Precipitation impact: +${simFull.impact.precipitation} mm`);
    console.log(`  [PASS] Heat risk delta: ${simFull.impact.heatRisk.deltaScore}`);
    console.log(`  [PASS] Flood risk delta: ${simFull.impact.floodRisk.deltaScore}`);
    console.log(`  [PASS] Water stress delta: ${simFull.impact.waterStress.deltaPercentage}%`);
    console.log(`  [PASS] Overall risk change: ${simFull.impact.overallRiskScore.change} pts (${simFull.impact.overallRiskScore.before} -> ${simFull.impact.overallRiskScore.after})`);
    console.log(`  [PASS] Sustainability score improvement: +${simFull.sustainabilityScore.improvement}`);
    console.log('[Test 4] PASSED.');

    // -------------------------------------------------------------
    // Test 5: Scientific Transparency & Forecast Disclaimers
    // -------------------------------------------------------------
    console.log('\n[Test 5] Verifying provenance metadata and forecast disclaimers...');
    assert.strictEqual(simFull.provenance.isOfficialForecast, false);
    assert.ok(simFull.provenance.disclaimer.includes('Not an official scientific'));
    assert.ok(simFull.provenance.engineVersion.length > 0);
    assert.strictEqual(simFull.provenance.modelType, 'DETERMINISTIC_SCENARIO_SIMULATION');
    console.log(`  [PASS] Provenance disclaimer: "${simFull.provenance.disclaimer}"`);
    console.log('[Test 5] PASSED.');

    // -------------------------------------------------------------
    // Test 6: Location Switching Sensitivity
    // -------------------------------------------------------------
    console.log('\n[Test 6] Verifying calculations adapt to location changes (Kolkata vs London)...');
    const kolkataRun = await SimulationService.runSimulation(kolkataLocId, 2035, ['plant-trees'], 'default');
    const londonRun = await SimulationService.runSimulation(londonLocId, 2035, ['plant-trees'], 'default');

    assert.notStrictEqual(kolkataRun.baseline.temperature, londonRun.baseline.temperature);
    assert.notStrictEqual(kolkataRun.baseline.precipitation, londonRun.baseline.precipitation);
    assert.notStrictEqual(kolkataRun.baseline.overallRiskScore, londonRun.baseline.overallRiskScore);

    console.log(`  [PASS] Kolkata Baseline: ${kolkataRun.baseline.temperature}°C, ${kolkataRun.baseline.precipitation} mm, Risk: ${kolkataRun.baseline.overallRiskScore}`);
    console.log(`  [PASS] London Baseline:  ${londonRun.baseline.temperature}°C, ${londonRun.baseline.precipitation} mm, Risk: ${londonRun.baseline.overallRiskScore}`);
    console.log('[Test 6] PASSED.');

    // -------------------------------------------------------------
    // Test 7: Error handling & Invalid Inputs
    // -------------------------------------------------------------
    console.log('\n[Test 7] Verifying error handling on invalid location...');
    await assert.rejects(
      async () => {
        await SimulationService.runSimulation('invalid-nonexistent-location-xyz', 2035, []);
      },
      (err: any) => {
        assert.strictEqual(err.code, 'LOCATION_NOT_FOUND');
        return true;
      }
    );
    console.log('  [PASS] Throws LOCATION_NOT_FOUND for invalid location ID.');
    console.log('[Test 7] PASSED.');

    console.log('\n============================================================');
    console.log('ALL SCENARIO SIMULATOR UNIT TESTS PASSED SUCCESSFULLY!');
    console.log('============================================================\n');

  } catch (err) {
    console.error('\n[TEST FAILED] Scenario Simulator test encountered an error:', err);
    process.exit(1);
  }
}

runScenarioSimulatorTests();
