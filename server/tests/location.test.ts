import assert from 'assert';
import { LocationService } from '../services/locationService.js';
import { supabase, isPrivileged } from '../config/supabase.js';
import { env } from '../config/env.js';

async function runTests() {
  console.log('[Test Suite] Starting Location Service Tests...');

  let locationCreated = false;
  let testLocId: string | null = null;

  try {
    // 1. Input Validation Tests
    console.log('[Test 1] Verifying search input validations...');
    
    // Empty query
    await assert.rejects(
      async () => {
        await LocationService.searchLocations('');
      },
      (err: any) => {
        assert.strictEqual(err.code, 'INVALID_QUERY');
        assert.strictEqual(err.statusCode, 400);
        return true;
      },
      'Should reject empty search queries.'
    );

    // Too short query
    await assert.rejects(
      async () => {
        await LocationService.searchLocations('a');
      },
      (err: any) => {
        assert.strictEqual(err.code, 'INVALID_QUERY');
        assert.strictEqual(err.statusCode, 400);
        return true;
      },
      'Should reject queries shorter than 2 characters.'
    );

    // Too long query
    await assert.rejects(
      async () => {
        await LocationService.searchLocations('a'.repeat(101));
      },
      (err: any) => {
        assert.strictEqual(err.code, 'INVALID_QUERY');
        assert.strictEqual(err.statusCode, 400);
        return true;
      },
      'Should reject queries longer than 100 characters.'
    );

    console.log('- Input validations passed.');
    console.log('[Test 1] PASSED.');

    // 2. Real Geocoding Query Test
    console.log('[Test 2] Verifying geocoding results from OpenWeather...');
    if (!env.OPENWEATHER_API_KEY) {
      console.log('[WARNING] OPENWEATHER_API_KEY is missing. Skipping geocoding verification.');
      console.log('[Test 2] SKIPPED.');
    } else {
      const results = await LocationService.searchLocations('Kolkata');
      assert.ok(Array.isArray(results), 'Results must be an array.');
      assert.ok(results.length > 0, 'Should find at least 1 matching location.');
      
      const firstResult = results[0];
      assert.strictEqual(typeof firstResult.name, 'string', 'Name must be a string.');
      assert.strictEqual(typeof firstResult.country, 'string', 'Country name must be resolved.');
      assert.strictEqual(firstResult.countryCode, 'IN', 'Country code must be correctly extracted.');
      assert.ok(!isNaN(firstResult.latitude), 'Latitude must be numeric.');
      assert.ok(!isNaN(firstResult.longitude), 'Longitude must be numeric.');
      assert.ok(firstResult.latitude >= -90 && firstResult.latitude <= 90, 'Latitude must be within range.');
      assert.ok(firstResult.longitude >= -180 && firstResult.longitude <= 180, 'Longitude must be within range.');

      console.log(`- Geocoding results successfully resolved. Top result: ${firstResult.name} (${firstResult.latitude}, ${firstResult.longitude})`);
      console.log('[Test 2] PASSED.');
    }

    // 3. Real Reverse Geocoding Test
    console.log('[Test 3] Verifying reverse geocoding from OpenWeather...');
    if (!env.OPENWEATHER_API_KEY) {
      console.log('[WARNING] OPENWEATHER_API_KEY is missing. Skipping reverse geocoding verification.');
      console.log('[Test 3] SKIPPED.');
    } else {
      const revResult = await LocationService.reverseGeocode(22.57264, 88.36389);
      assert.strictEqual(typeof revResult.name, 'string', 'Name must be a string.');
      assert.strictEqual(revResult.countryCode, 'IN', 'Country code must be resolved.');
      
      console.log(`- Reverse geocoding successfully resolved. Resolved: ${revResult.name}, ${revResult.country}`);
      console.log('[Test 3] PASSED.');
    }

    // 4. Database Integration & Persistence (if tables exist)
    console.log('[Test 4] Verifying database persistence and duplicate handling...');
    
    // Check if public.locations table is accessible (migration applied)
    const { error: checkError } = await supabase.from('locations').select('id').limit(1);
    
    if (!isPrivileged) {
      console.log('[WARNING] SUPABASE_SERVICE_ROLE_KEY is not set. Skipping DB persistence tests (RLS blocks anon inserts).');
      console.log('[Test 4] SKIPPED (service role key required).');
    } else if (checkError && checkError.code === 'PGRST205') {
      console.log('[WARNING] public.locations table is not found in database. Skipping DB persistence tests.');
      console.log('[Test 4] SKIPPED (migration pending).');
    } else {
      // Test insert and check duplicates
      const testLoc = {
        name: 'Kolkata Test Location',
        city: 'Kolkata',
        region: 'West Bengal',
        country: 'India',
        countryCode: 'IN',
        latitude: 22.572645,
        longitude: 88.363892,
      };

      const record1 = await LocationService.getOrCreateLocation(testLoc);
      assert.ok(record1.id, 'Inserted record must have a database UUID.');
      testLocId = record1.id;
      locationCreated = true;
      console.log(`- Inserted new location with ID: ${testLocId}`);

      // Try inserting the same coordinates again (should return the same ID)
      const record2 = await LocationService.getOrCreateLocation({
        ...testLoc,
        name: 'Kolkata Duplicate Location Name',
      });
      assert.strictEqual(record2.id, testLocId, 'Duplicate coordinates must return the existing record ID.');
      console.log('- Duplicate detection verified. Returned existing ID.');

      // Test retrieving by ID
      const currentId = testLocId as string;
      const retrieved = await LocationService.getLocationById(currentId);
      assert.strictEqual(retrieved.name, 'Kolkata Test Location', 'Retrieved name must match.');
      console.log('- Location retrieval by ID succeeded.');

      console.log('[Test 4] PASSED.');
    }

    console.log('\n[Result] All Location Service tests completed successfully!');

  } catch (err: any) {
    console.error('\n[Failure] Location Service verification failed!');
    console.error(err);
    process.exit(1);
  } finally {
    if (locationCreated && testLocId !== null) {
      console.log('[Cleanup] Deleting test location...');
      await supabase.from('locations').delete().eq('id', testLocId);
      console.log('- Test location cleaned up.');
    }
  }
}

runTests();
