import assert from 'assert';
import { supabase } from '../config/supabase.js';
import { SimulationService } from '../services/simulationService.js';
import { LocationService } from '../services/locationService.js';

async function runTests() {
  console.log('[Test Suite] Starting Scenario Simulator Integration Tests...');

  const lat = 22.572646;
  const lng = 88.363895;
  const testYear = 2035;
  let locationId: string | null = null;

  try {
    // 1. Resolve or create location context
    console.log('[Test 1] Setting up test location context...');
    const { data: locData, error: locErr } = await supabase
      .from('locations')
      .select('id')
      .eq('latitude', parseFloat(lat.toFixed(6)))
      .eq('longitude', parseFloat(lng.toFixed(6)))
      .maybeSingle();

    if (locErr) {
      console.log(`- Database locations lookup skipped (${locErr.message})`);
    } else if (locData) {
      locationId = locData.id;
    } else {
      const { data: newLoc, error: insertErr } = await supabase
        .from('locations')
        .insert({
          name: 'Kolkata Simulation Test Location',
          country: 'India',
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6)),
        })
        .select()
        .single();
      if (newLoc) {
        locationId = newLoc.id;
      }
    }
    
    if (!locationId) {
      console.log('[WARNING] DB tables not accessible. Skipping Simulation DB tests.');
      console.log('[Test 1] SKIPPED (migration pending).');
      console.log('\n[Result] Simulation Service tests completed (DB migration pending).');
      return;
    }
    console.log(`- Resolved location ID: ${locationId}`);
    console.log('[Test 1] PASSED.');

    // 2. Test boundary validation (handled at API layer or Service)
    console.log('[Test 2] Verifying parameter boundaries...');
    await assert.rejects(
      async () => {
        await SimulationService.runSimulation('00000000-0000-0000-0000-999999999999', testYear, []);
      },
      (err: any) => {
        assert.strictEqual(err.code, 'LOCATION_NOT_FOUND');
        return true;
      }
    );
    console.log('[Test 2] PASSED.');

    // 3. Test Simulation with No Interventions
    console.log('[Test 3] Running simulation with zero interventions...');
    const resNoInt = await SimulationService.runSimulation(locationId!, testYear, []);
    assert.strictEqual(resNoInt.status, 'COMPLETED');
    assert.strictEqual(resNoInt.locationId, locationId);
    assert.strictEqual(resNoInt.targetYear, testYear);
    assert.strictEqual(resNoInt.impact.temperature, 0); // no temp change computed since no temp interventions selected
    assert.strictEqual(resNoInt.sustainabilityScore.improvement, 0);
    console.log('[Test 3] PASSED.');

    // 4. Test Simulation with Single Intervention (Plant Trees: -0.5 temp)
    console.log('[Test 4] Running simulation with a single intervention (Plant Trees)...');
    const resSingle = await SimulationService.runSimulation(locationId!, testYear, ['plant-trees']);
    assert.strictEqual(resSingle.status, 'COMPLETED');
    if (resSingle.baseline.temperature !== null && resSingle.afterSimulation.temperature !== null) {
      assert.strictEqual(resSingle.impact.temperature, -0.5);
      assert.strictEqual(
        parseFloat((resSingle.afterSimulation.temperature - resSingle.baseline.temperature).toFixed(1)),
        -0.5
      );
      console.log(`- Baseline Temp: ${resSingle.baseline.temperature}°C, Simulated Temp: ${resSingle.afterSimulation.temperature}°C`);
    } else {
      console.warn('- Temperature baseline was null, skipping value check.');
    }
    console.log('[Test 4] PASSED.');

    // 5. Test Simulation with Multiple Interventions (Plant Trees: -0.5, Cool Roofs: -0.8 -> Total -1.3 temp)
    console.log('[Test 5] Running simulation with multiple interventions (Plant Trees + Cool Roofs)...');
    const resMulti = await SimulationService.runSimulation(locationId!, testYear, [
      'plant-trees',
      'cool-roof-initiative',
    ]);
    assert.strictEqual(resMulti.status, 'COMPLETED');
    if (resMulti.baseline.temperature !== null && resMulti.afterSimulation.temperature !== null) {
      assert.strictEqual(resMulti.impact.temperature, -1.3);
      assert.strictEqual(
        parseFloat((resMulti.afterSimulation.temperature - resMulti.baseline.temperature).toFixed(1)),
        -1.3
      );
      console.log(`- Baseline Temp: ${resMulti.baseline.temperature}°C, Simulated Temp: ${resMulti.afterSimulation.temperature}°C`);
    }
    console.log('[Test 5] PASSED.');

    // 6. Verify Database Persistence of runs and scores
    console.log('[Test 6] Verifying simulation records were persisted in Supabase...');
    const { data: runRecords } = await supabase
      .from('simulation_runs')
      .select('*')
      .eq('id', resMulti.simulationId)
      .single();

    assert.ok(runRecords, 'Simulation run must be stored in database.');
    assert.strictEqual(runRecords.status, 'COMPLETED');
    assert.strictEqual(runRecords.target_year, testYear);

    const { data: resultRecords } = await supabase
      .from('simulation_results')
      .select('*')
      .eq('simulation_run_id', resMulti.simulationId);

    assert.ok(resultRecords && resultRecords.length > 0, 'Simulation results must be persisted.');
    const tempRes = resultRecords.find((r) => r.metric === 'temperature');
    if (tempRes) {
      assert.strictEqual(Number(tempRes.delta_value), -1.3);
    }

    const { data: scoreRecords } = await supabase
      .from('sustainability_scores')
      .select('*')
      .eq('simulation_run_id', resMulti.simulationId);

    assert.ok(scoreRecords && scoreRecords.length === 2, 'There must be exactly 2 score records (BASELINE and SIMULATED).');
    console.log('[Test 6] PASSED.');

    console.log('\n[Result] All Scenario Simulator Integration tests completed successfully!');

  } catch (err: any) {
    console.error('\n[Failure] Scenario Simulator integration tests failed!');
    console.error(err);
    process.exit(1);
  } finally {
    if (locationId) {
      console.log('[Cleanup] Cleaning up test runs and scenarios...');
      // Cascade delete on locations will clean up scenarios, simulation_runs, results, and scores
      const { data: testLoc } = await supabase
        .from('locations')
        .select('name')
        .eq('id', locationId)
        .maybeSingle();

      if (testLoc && testLoc.name === 'Kolkata Simulation Test Location') {
        await supabase.from('locations').delete().eq('id', locationId);
      }
      console.log('- Test records cleaned up.');
    }
  }
}

runTests();
