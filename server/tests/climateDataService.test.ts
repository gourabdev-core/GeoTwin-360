import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ClimateDataService, ClimateIndicatorType } from '../services/climateDataService.js';
import { PredictionService } from '../services/predictionService.js';

describe('GeoTwin 360 - Climate Data System Correction Test Suite', () => {
  const indicators: ClimateIndicatorType[] = [
    'temperature',
    'precipitation',
    'sea_level',
    'sea_ice',
    'extreme_heat',
  ];

  it('should provide complete valid datasets for all 5 climate indicators', async () => {
    for (const ind of indicators) {
      const dataset = await ClimateDataService.getIndicatorTimeline(ind);
      assert.ok(dataset, `Dataset for ${ind} should exist`);
      assert.strictEqual(dataset.indicator, ind);
      assert.ok(dataset.unit, `Unit for ${ind} must be non-empty`);
      assert.ok(dataset.source, `Source for ${ind} must be non-empty`);
      assert.ok(dataset.baseline, `Baseline for ${ind} must be non-empty`);
      assert.ok(Array.isArray(dataset.timeline), `Timeline for ${ind} must be an array`);
      assert.ok(dataset.timeline.length > 0, `Timeline for ${ind} must not be empty`);
      assert.ok(Array.isArray(dataset.projections), `Projections for ${ind} must be an array`);
      assert.ok(dataset.projections.length === 4, `Projections for ${ind} should have 4 milestone years (2030, 2035, 2040, 2050)`);
    }
  });

  it('should strictly separate 2025 observed, 2026 YTD, and future projections with complete metadata', async () => {
    for (const ind of indicators) {
      const dataset = await ClimateDataService.getIndicatorTimeline(ind);

      // Check every timeline and projection point has required internal fields
      for (const pt of dataset.combinedTimeline) {
        assert.ok(typeof pt.year === 'number', `Year must be numeric for ${ind}`);
        assert.ok(pt.unit, `Unit must be present for year ${pt.year} in ${ind}`);
        assert.strictEqual(pt.indicator, ind, `Indicator must match ${ind}`);
        assert.ok(pt.status, `Status must be present for year ${pt.year} in ${ind}`);
        assert.ok(pt.source, `Source must be present for year ${pt.year} in ${ind}`);
        assert.ok(pt.methodology, `Methodology must be present for year ${pt.year} in ${ind}`);
        assert.ok(pt.scenario, `Scenario must be present for year ${pt.year} in ${ind}`);

        // Never represent future projected values as NASA observations
        if (pt.year > 2026) {
          assert.ok(
            !pt.source.toLowerCase().includes('nasa observation') &&
            !pt.source.toLowerCase().includes('gistemp') &&
            !pt.source.toLowerCase().includes('nsidc sea ice index'),
            `Future year ${pt.year} source must NOT be labeled as a NASA observation (${pt.source})`
          );
          assert.ok(
            pt.status === 'PROJECTED' || pt.status === 'MODELLED',
            `Future year ${pt.year} status must be PROJECTED or MODELLED, got ${pt.status}`
          );
          assert.ok(
            pt.methodology.includes('MODELED') || pt.methodology.includes('EXTRAPOLATION'),
            `Future year ${pt.year} methodology must disclose modeling/extrapolation`
          );
        }
      }

      // Check 2025 observed point
      const pt2025 = dataset.timeline.find(p => p.year === 2025);
      assert.ok(pt2025, `2025 record must exist for ${ind}`);
      assert.strictEqual(pt2025.status, 'OBSERVED', `2025 status must be "OBSERVED" for ${ind}`);
      assert.ok(typeof pt2025.value === 'number', `2025 value must be numeric for ${ind}`);
      assert.ok(!isNaN(pt2025.value), `2025 value must not be NaN for ${ind}`);
      assert.ok(pt2025.methodology, `2025 methodology must be present for ${ind}`);

      // Check 2026 Year-to-Date point (never completed annual)
      const pt2026 = dataset.timeline.find(p => p.year === 2026);
      assert.ok(pt2026, `2026 record must exist for ${ind}`);
      assert.strictEqual(pt2026.status, 'CURRENT/YTD', `2026 status must be "CURRENT/YTD" for ${ind}`);
      assert.ok(typeof pt2026.value === 'number', `2026 value must be numeric for ${ind}`);
      assert.ok(!isNaN(pt2026.value), `2026 value must not be NaN for ${ind}`);
      assert.ok(pt2026.methodology, `2026 methodology must be present for ${ind}`);

      // Check milestone years: 2015, 2020, 2025, 2026, 2030, 2035, 2040, 2050
      const benchmarkYears = [2015, 2020, 2025, 2026, 2030, 2035, 2040, 2050];
      for (const bYear of benchmarkYears) {
        const found = dataset.combinedTimeline.find(p => p.year === bYear);
        assert.ok(found, `Benchmark year ${bYear} must exist in combined timeline for ${ind}`);
        assert.ok(typeof found.value === 'number', `Benchmark year ${bYear} must have numeric value`);
        assert.ok(!isNaN(found.value!), `Benchmark year ${bYear} value must not be NaN`);
      }
    }
  });

  it('should demonstrate location sensitivity between Katwa and London', async () => {
    const katwaLocId = 'loc-23.6500-88.1300';
    const londonLocId = 'loc-51.5074--0.1278';

    // 1. Precipitation comparison
    const katwaPrecip = await ClimateDataService.getIndicatorTimeline('precipitation', katwaLocId);
    const londonPrecip = await ClimateDataService.getIndicatorTimeline('precipitation', londonLocId);

    const katwaPrecip2025 = katwaPrecip.timeline.find(p => p.year === 2025)?.value;
    const londonPrecip2025 = londonPrecip.timeline.find(p => p.year === 2025)?.value;

    assert.ok(katwaPrecip2025 !== null && londonPrecip2025 !== null);
    assert.notStrictEqual(katwaPrecip2025, londonPrecip2025, 'Katwa and London precipitation should differ');

    // 2. Extreme Heat comparison
    const katwaHeat = await ClimateDataService.getIndicatorTimeline('extreme_heat', katwaLocId);
    const londonHeat = await ClimateDataService.getIndicatorTimeline('extreme_heat', londonLocId);

    const katwaHeat2025 = katwaHeat.timeline.find(p => p.year === 2025)?.value;
    const londonHeat2025 = londonHeat.timeline.find(p => p.year === 2025)?.value;

    assert.ok(katwaHeat2025 !== null && londonHeat2025 !== null);
    assert.ok(
      (katwaHeat2025 ?? 0) > (londonHeat2025 ?? 0),
      `Katwa tropical extreme heat (${katwaHeat2025}) should exceed London (${londonHeat2025})`
    );
  });

  it('should modulate future projections across different scenarios', async () => {
    const defaultData = await ClimateDataService.getIndicatorTimeline('temperature', undefined, 'default');
    const resilienceData = await ClimateDataService.getIndicatorTimeline('temperature', undefined, 'resilience');
    const acceleratedData = await ClimateDataService.getIndicatorTimeline('temperature', undefined, 'accelerated');

    const def2050 = defaultData.projections.find(p => p.year === 2050)?.projectedValue ?? 0;
    const res2050 = resilienceData.projections.find(p => p.year === 2050)?.projectedValue ?? 0;
    const acc2050 = acceleratedData.projections.find(p => p.year === 2050)?.projectedValue ?? 0;

    assert.ok(
      res2050 < def2050,
      `Resilience scenario 2050 (${res2050}) must be lower than Baseline (${def2050})`
    );
    assert.ok(
      acc2050 > def2050,
      `Accelerated scenario 2050 (${acc2050}) must be higher than Baseline (${def2050})`
    );
  });

  it('should verify PredictionService uses 2015-2025 baseline and 2026-forward projections', async () => {
    const katwaLocId = 'loc-23.6500-88.1300';
    const projections = await PredictionService.getProjections(katwaLocId, 'default');

    assert.strictEqual(projections.length, 4);
    assert.deepStrictEqual(
      projections.map(p => p.targetYear),
      [2030, 2035, 2040, 2050]
    );

    for (const p of projections) {
      assert.strictEqual(p.baselinePeriod, '2015-2025');
      assert.ok(typeof p.temperature === 'number');
      assert.ok(!isNaN(p.temperature));
    }

    const analysis = await PredictionService.getClimateAnalysis(katwaLocId, 2035, 'default', false);
    assert.strictEqual(analysis.targetYear, 2035);
    assert.strictEqual(analysis.observedBaseline.period, '2015-2025');
    assert.ok(analysis.indicators.temperatureTrend.value > 0);
    assert.ok(analysis.indicators.precipitationTrend.value > 0);
    assert.ok(analysis.indicators.heatRisk.score > 0);
    assert.ok(analysis.indicators.overallRisk.score > 0);
  });

  it('should support multiple global locations with honest local vs global scopes', async () => {
    const locations = [
      { id: 'loc-23.6500-88.1300', name: 'Katwa' },
      { id: 'loc-51.5074--0.1278', name: 'London' },
      { id: 'loc-40.7128--74.0060', name: 'New York' },
      { id: 'loc-35.6762-139.6503', name: 'Tokyo' },
    ];

    for (const loc of locations) {
      const precip = await ClimateDataService.getIndicatorTimeline('precipitation', loc.id);
      assert.strictEqual(precip.scope, 'local');
      assert.ok(precip.timeline.length >= 12);
      assert.ok(precip.projections.length === 4);

      // Sea level must honestly disclose global oceanic scope
      const seaLevel = await ClimateDataService.getIndicatorTimeline('sea_level', loc.id);
      assert.strictEqual(seaLevel.scope, 'global');
      assert.ok(seaLevel.disclaimer.includes('Inland locations have no direct local sea level coastline'));
    }
  });
});
