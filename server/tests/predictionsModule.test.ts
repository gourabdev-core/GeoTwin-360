process.env.NODE_ENV = 'test';
import { PredictionService, SCENARIO_DEFINITIONS } from '../services/predictionService.js';

async function runPredictionsModuleTests() {
  console.log('============================================================');
  console.log('RUNNING: server/tests/predictionsModule.test.ts');
  console.log('============================================================');
  console.log('[Test Suite] Starting Climate Predictions Module Integration Tests...');

  let passed = 0;
  let failed = 0;

  // Test 1: OLS Linear Regression Computation
  console.log('[Test 1] Testing OLS Linear Regression Mathematical Engine...');
  try {
    const points = [
      { x: 2015, y: 25.0 },
      { x: 2016, y: 25.1 },
      { x: 2017, y: 25.2 },
      { x: 2018, y: 25.3 },
      { x: 2019, y: 25.4 },
      { x: 2020, y: 25.5 },
      { x: 2021, y: 25.6 },
      { x: 2022, y: 25.7 },
      { x: 2023, y: 25.8 },
      { x: 2024, y: 25.9 },
    ];

    const result = PredictionService.computeRegression(points);
    if (!result) throw new Error('computeRegression returned null for valid points');

    if (Math.abs(result.slope - 0.1) > 0.001) {
      throw new Error(`Expected slope ~0.1, got ${result.slope}`);
    }
    if (Math.abs(result.rSquared - 1.0) > 0.001) {
      throw new Error(`Expected R-squared ~1.0, got ${result.rSquared}`);
    }

    // Insufficient data points test
    const insufficient = PredictionService.computeRegression([
      { x: 2020, y: 25.0 },
      { x: 2021, y: 25.5 },
    ]);
    if (insufficient !== null) throw new Error('Expected null for insufficient data points');

    console.log('- Slope: ' + result.slope.toFixed(4) + '°C/yr, R2: ' + result.rSquared.toFixed(4));
    console.log('[Test 1] PASSED.');
    passed++;
  } catch (err: any) {
    console.error('[Test 1] FAILED:', err.message);
    failed++;
  }

  // Test 2: Scenario Definitions Validation
  console.log('[Test 2] Verifying Scientific Scenario Definitions...');
  try {
    const requiredScenarios = ['default', 'resilience', 'accelerated'];
    for (const sc of requiredScenarios) {
      const def = SCENARIO_DEFINITIONS[sc as keyof typeof SCENARIO_DEFINITIONS];
      if (!def) throw new Error(`Missing scenario definition for ${sc}`);
      if (!def.name || !def.tag || !def.description || !def.radiativeForcing || !def.assumptions.length) {
        throw new Error(`Incomplete scenario metadata for ${sc}`);
      }
    }
    console.log('- Verified Baseline, Resilience Plan, and Accelerated Emissions pathways.');
    console.log('[Test 2] PASSED.');
    passed++;
  } catch (err: any) {
    console.error('[Test 2] FAILED:', err.message);
    failed++;
  }

  // Test 3: Multi-Year Projections & Scenario Sensitivity
  console.log('[Test 3] Verifying Year & Scenario Divergence for Kolkata...');
  const testLocationId = 'loc-22.5726-88.3638'; // Kolkata coordinates
  try {
    const baselineProjections = await PredictionService.getProjections(testLocationId, 'default');
    const resilienceProjections = await PredictionService.getProjections(testLocationId, 'resilience');
    const acceleratedProjections = await PredictionService.getProjections(testLocationId, 'accelerated');

    if (baselineProjections.length !== 4) {
      throw new Error(`Expected 4 target years, got ${baselineProjections.length}`);
    }

    const targetYears = [2030, 2035, 2040, 2050];
    for (const yr of targetYears) {
      const base = baselineProjections.find(p => p.targetYear === yr);
      const res = resilienceProjections.find(p => p.targetYear === yr);
      const acc = acceleratedProjections.find(p => p.targetYear === yr);

      if (!base?.temperature || !res?.temperature || !acc?.temperature) {
        throw new Error(`Missing temperature projection for year ${yr}`);
      }

      // Resilience should be cooler than Baseline
      if (res.temperature >= base.temperature) {
        throw new Error(`Resilience (${res.temperature}°C) was not cooler than Baseline (${base.temperature}°C) for ${yr}`);
      }

      // Accelerated should be warmer than Baseline
      if (acc.temperature <= base.temperature) {
        throw new Error(`Accelerated (${acc.temperature}°C) was not warmer than Baseline (${base.temperature}°C) for ${yr}`);
      }

      console.log(`- Year ${yr}: Resilience (${res.temperature}°C) < Baseline (${base.temperature}°C) < Accelerated (${acc.temperature}°C)`);
    }

    console.log('[Test 3] PASSED.');
    passed++;
  } catch (err: any) {
    console.error('[Test 3] FAILED:', err.message);
    failed++;
  }

  // Test 4: Full Climate Analysis Model & 6 Required Indicators
  console.log('[Test 4] Verifying Climate Analysis Model and 6 Core Indicators...');
  try {
    const analysis = await PredictionService.getClimateAnalysis(testLocationId, 2035, 'resilience');

    if (analysis.targetYear !== 2035) {
      throw new Error(`Expected targetYear 2035, got ${analysis.targetYear}`);
    }
    if (analysis.scenario.id !== 'resilience') {
      throw new Error(`Expected scenario resilience, got ${analysis.scenario.id}`);
    }

    const { indicators } = analysis;

    // Check all 6 indicators exist
    if (!indicators.temperatureTrend) throw new Error('Missing indicator: temperatureTrend');
    if (!indicators.precipitationTrend) throw new Error('Missing indicator: precipitationTrend');
    if (!indicators.heatRisk) throw new Error('Missing indicator: heatRisk');
    if (!indicators.floodRisk) throw new Error('Missing indicator: floodRisk');
    if (!indicators.droughtRisk) throw new Error('Missing indicator: droughtRisk');
    if (!indicators.overallRisk) throw new Error('Missing indicator: overallRisk');

    console.log('- 1. Temperature Trend: ' + indicators.temperatureTrend.value + indicators.temperatureTrend.unit + ' (Anomaly: ' + indicators.temperatureTrend.anomaly + '°C)');
    console.log('- 2. Precipitation Trend: ' + indicators.precipitationTrend.value + ' ' + indicators.precipitationTrend.unit + ' (' + indicators.precipitationTrend.changePercent + '%)');
    console.log('- 3. Heat Risk: ' + indicators.heatRisk.level + ' (Score: ' + indicators.heatRisk.score + ', Extreme Days: ' + indicators.heatRisk.extremeHeatDaysProjected + ')');
    console.log('- 4. Flood Risk: ' + indicators.floodRisk.level + ' (Score: ' + indicators.floodRisk.score + ', Retention: ' + indicators.floodRisk.retentionCapacityScore + ')');
    console.log('- 5. Drought Risk: ' + indicators.droughtRisk.level + ' (Stress: ' + indicators.droughtRisk.stressLevel + ')');
    console.log('- 6. Overall Climate Risk: ' + indicators.overallRisk.level + ' (Score: ' + indicators.overallRisk.score + '/100, Driver: ' + indicators.overallRisk.primaryDriver + ')');

    // Verify Data Provenance on indicators
    const allIndicators = [
      indicators.temperatureTrend,
      indicators.precipitationTrend,
      indicators.heatRisk,
      indicators.floodRisk,
      indicators.droughtRisk,
      indicators.overallRisk,
    ];

    for (const ind of allIndicators) {
      if (!ind.provenance || !ind.provenance.type || !ind.provenance.source) {
        throw new Error('Indicator missing valid data provenance metadata');
      }
    }

    // Verify AI interpretation layer
    if (!analysis.aiInterpretation.executiveSummary || !analysis.aiInterpretation.resilienceOpportunities.length) {
      throw new Error('Missing AI interpretation content');
    }
    if (analysis.aiInterpretation.provenance.type !== 'AI_INTERPRETATION') {
      throw new Error('AI interpretation missing AI_INTERPRETATION provenance tag');
    }

    // Verify Observed Baseline
    if (analysis.observedBaseline.dataPointsCount < 5) {
      throw new Error('Insufficient observed baseline data points');
    }
    if (analysis.observedBaseline.provenance.type !== 'REAL_EXTERNAL_DATA') {
      throw new Error('Observed baseline missing REAL_EXTERNAL_DATA provenance tag');
    }

    console.log('[Test 4] PASSED.');
    passed++;
  } catch (err: any) {
    console.error('[Test 4] FAILED:', err.message);
    failed++;
  }

  // Test 5: Year Selector Impact on Underlying Analysis (2030 vs 2050)
  console.log('[Test 5] Verifying Year Selector alters underlying analysis (2030 vs 2050)...');
  try {
    const analysis2030 = await PredictionService.getClimateAnalysis(testLocationId, 2030, 'default');
    const analysis2050 = await PredictionService.getClimateAnalysis(testLocationId, 2050, 'default');

    if (analysis2030.indicators.temperatureTrend.value >= analysis2050.indicators.temperatureTrend.value) {
      throw new Error('2050 temperature should be higher than 2030 on baseline trend');
    }

    if (analysis2030.indicators.heatRisk.score >= analysis2050.indicators.heatRisk.score) {
      throw new Error('2050 heat risk should be higher than 2030 on baseline trend');
    }

    console.log(`- 2030 Temp: ${analysis2030.indicators.temperatureTrend.value}°C -> 2050 Temp: ${analysis2050.indicators.temperatureTrend.value}°C`);
    console.log(`- 2030 Heat Score: ${analysis2030.indicators.heatRisk.score} -> 2050 Heat Score: ${analysis2050.indicators.heatRisk.score}`);
    console.log('[Test 5] PASSED.');
    passed++;
  } catch (err: any) {
    console.error('[Test 5] FAILED:', err.message);
    failed++;
  }

  console.log('============================================================');
  console.log(`PREDICTIONS MODULE SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPredictionsModuleTests().catch(err => {
  console.error('[Test Suite Error]:', err);
  process.exit(1);
});
