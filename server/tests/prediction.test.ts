import assert from 'assert';
import { supabase } from '../config/supabase.js';
import { PredictionService } from '../services/predictionService.js';
import { LocationService } from '../services/locationService.js';

async function runTests() {
  console.log('[Test Suite] Starting Prediction Engine Verification Tests...');

  let locationId = '';

  try {
    // 1. Resolve test location (any seeded location)
    console.log('[Test 1] Resolving seeded location...');
    const { data: locations, error: locErr } = await supabase
      .from('locations')
      .select('*')
      .order('name')
      .limit(1);

    if (locErr || !locations || locations.length === 0) {
      console.log('[WARNING] public.locations table is missing or empty. Skipping Prediction DB tests.');
      console.log('[Test 1] SKIPPED (migration pending).');
      console.log('\n[Result] Prediction Engine tests finished (DB migration pending).');
      return;
    }

    const locData = locations[0];
    locationId = locData.id;
    console.log(`- Found location: ${locData.name} (ID: ${locationId})`);
    console.log('[Test 1] PASSED.');

    // 2. Clear cached projections for the location to guarantee cache miss
    console.log(`- Cleaning up existing cached projections for location ID: ${locationId}...`);
    await supabase
      .from('climate_projections')
      .delete()
      .eq('location_id', locationId)
      .eq('model_name', 'Linear Regression');

    // 3. Generate predictions (Cache Miss)
    console.log('[Test 2] Generating future projections (Cache Miss)...');
    const projections = await PredictionService.getProjections(locationId);

    assert.strictEqual(projections.length, 4, 'Should generate projections for exactly 4 target years.');
    const years = [2030, 2035, 2040, 2050];
    
    for (const year of years) {
      const proj = projections.find(p => p.targetYear === year);
      assert.ok(proj, `Projection for year ${year} must exist.`);
      assert.strictEqual(proj.locationId, locationId);
      assert.strictEqual(typeof proj.temperature, 'number', 'Temperature projection must be a number.');
      assert.ok(proj.confidence !== null, 'Confidence score must not be null.');
      assert.strictEqual(typeof proj.confidence, 'number', 'Confidence must be a number.');
      assert.ok(proj.modelMethod.includes('Linear Regression'));
      assert.strictEqual(proj.baselinePeriod, '2015-2025');
      assert.ok(proj.sourceData.includes('NASA POWER'));
    }
    console.log('[Test 2] PASSED.');

    // 4. Verify DB persistence and caching
    console.log('[Test 3] Verifying database caching of projections...');
    const { data: dbRecords } = await supabase
      .from('climate_projections')
      .select('*')
      .eq('location_id', locationId)
      .eq('model_name', 'Linear Regression');

    assert.ok(dbRecords && dbRecords.length === 4, 'Exactly 4 projections should be persisted in DB.');
    console.log(`- Successfully verified 4 rows persisted in climate_projections.`);
    console.log('[Test 3] PASSED.');

    // 5. Subsequent call (Cache Hit)
    console.log('[Test 4] Requesting projections again (Cache Hit)...');
    const projectionsCached = await PredictionService.getProjections(locationId);
    assert.strictEqual(projectionsCached.length, 4);
    for (const year of years) {
      const p1 = projections.find(p => p.targetYear === year);
      const p2 = projectionsCached.find(p => p.targetYear === year);
      assert.strictEqual(p1?.temperature, p2?.temperature, 'Temperature must match cache.');
      assert.strictEqual(p1?.precipitation, p2?.precipitation, 'Precipitation must match cache.');
      assert.strictEqual(p1?.confidence, p2?.confidence, 'Confidence must match cache.');
    }
    console.log('[Test 4] PASSED.');

    // 6. Test retrieval of a single year
    console.log('[Test 5] Fetching projection for a single year (2035)...');
    const singleProj = await PredictionService.getProjectionForYear(locationId, 2035);
    assert.ok(singleProj);
    assert.strictEqual(singleProj.targetYear, 2035);
    assert.strictEqual(singleProj.temperature, projections.find(p => p.targetYear === 2035)?.temperature);
    console.log('[Test 5] PASSED.');

    // 7. Verify unsupported years return null
    console.log('[Test 6] Verifying unsupported year returns null...');
    const invalidYearProj = await PredictionService.getProjectionForYear(locationId, 2026);
    assert.strictEqual(invalidYearProj, null);
    console.log('[Test 6] PASSED.');

    console.log('\n[Result] All Prediction Engine Integration tests completed successfully!');

  } catch (err: any) {
    console.error('\n[Failure] Prediction Engine integration verification failed!');
    console.error(err);
    process.exit(1);
  } finally {
    if (locationId) {
      console.log('[Cleanup] Cleaning up generated test projections...');
      await supabase
        .from('climate_projections')
        .delete()
        .eq('location_id', locationId)
        .eq('model_name', 'Linear Regression');
      console.log('- Test projections cleaned up.');
    }
  }
}

runTests();
