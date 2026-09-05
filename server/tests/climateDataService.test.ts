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

  it('should strictly separate 2025 observed, 2026 YTD, and future projections', async () => {
    for (const ind of indicators) {
      const dataset = await ClimateDataService.getIndicatorTimeline(ind);

      // Check 2025 observed point
      const pt2025 = dataset.timeline.find(p => p.year === 2025);
      assert.ok(pt2025, `2025 record must exist for ${ind}`);
      assert.strictEqual(pt2025.status, 'observed', `2025 status must be "observed" for ${ind}`);
      assert.ok(typeof pt2025.value === 'number', `2025 value must be numeric for ${ind}`);
      assert.ok(!isNaN(pt2025.value), `2025 value must not be NaN for ${ind}`);

      // Check 2026 Year-to-Date point (never completed annual)
      const pt2026 = dataset.timeline.find(p => p.year === 2026);
      assert.ok(pt2026, `2026 record must exist for ${ind}`);
      assert.strictEqual(pt2026.status, 'year_to_date', `2026 status must be "year_to_date" for ${ind}`);
      assert.ok(typeof pt2026.value === 'number', `2026 value must be numeric for ${ind}`);
      assert.ok(!isNaN(pt2026.value), `2026 value must not be NaN for ${ind}`);

      // Check Future projections (2030, 2035, 2040, 2050)
      for (const fYear of [2030, 2035, 2040, 2050]) {
        const projPt = dataset.projections.find(p => p.year === fYear);
        assert.ok(projPt, `${fYear} projection must exist for ${ind}`);
        assert.strictEqual(projPt.status, 'projected', `${fYear} status must be "projected" for ${ind}`);
        assert.ok(typeof projPt.projectedValue === 'number', `${fYear} projectedValue must be numeric for ${ind}`);
        assert.ok(!isNaN(projPt.projectedValue), `${fYear} projectedValue must not be NaN for ${ind}`);
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
});
