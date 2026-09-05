import assert from 'assert';
import { LocationService } from '../services/locationService.js';
import { env } from '../config/env.js';

async function testLocationSearchFlow() {
  console.log('[Test Suite] Starting GeoTwin 360 Location Search Flow Verification...');

  try {
    // 1. Verify search query "Katwa, West Bengal"
    console.log('[Test 1] Searching for "Katwa, West Bengal"...');
    if (!env.OPENWEATHER_API_KEY) {
      console.log('[WARNING] OPENWEATHER_API_KEY missing. Skipping live geocoding.');
      return;
    }

    const suggestions = await LocationService.searchLocations('Katwa, West Bengal', 5);
    assert.ok(Array.isArray(suggestions), 'Suggestions should be an array');
    assert.ok(suggestions.length > 0, 'Should find at least 1 result for "Katwa, West Bengal"');
    console.log(`- Found ${suggestions.length} location suggestions.`);

    // 2. Select the top result matching Katwa in West Bengal, India
    const katwaResult = suggestions.find(
      (item) => item.name === 'Katwa' && (item.region === 'West Bengal' || item.countryCode === 'IN')
    );

    assert.ok(katwaResult, 'Should find Katwa in West Bengal, India');
    console.log(`- Selected location: ${katwaResult.name}, ${katwaResult.region}, ${katwaResult.country}`);

    // 3. Verify latitude and longitude
    console.log('[Test 2] Verifying latitude and longitude for Katwa, West Bengal...');
    console.log(`- Latitude: ${katwaResult.latitude}, Longitude: ${katwaResult.longitude}`);
    assert.ok(
      Math.abs(katwaResult.latitude - 23.644) < 0.1,
      `Latitude (${katwaResult.latitude}) should be approximately 23.644°N`
    );
    assert.ok(
      Math.abs(katwaResult.longitude - 88.128) < 0.1,
      `Longitude (${katwaResult.longitude}) should be approximately 88.128°E`
    );
    console.log('- Coordinates verified successfully.');

    // 4. Verify location model creation and persistence
    console.log('[Test 3] Verifying location entity creation / model structure...');
    const locationEntity = await LocationService.getOrCreateLocation({
      name: katwaResult.name,
      city: katwaResult.city || katwaResult.name,
      region: katwaResult.region,
      country: katwaResult.country,
      countryCode: katwaResult.countryCode,
      latitude: katwaResult.latitude,
      longitude: katwaResult.longitude,
    });

    assert.ok(locationEntity.id, 'Location entity must have an ID');
    assert.strictEqual(locationEntity.name, 'Katwa');
    assert.strictEqual(locationEntity.country, 'India');
    assert.strictEqual(locationEntity.latitude, katwaResult.latitude);
    assert.strictEqual(locationEntity.longitude, katwaResult.longitude);
    console.log(`- Location entity verified with ID: ${locationEntity.id}`);

    // 5. Verify reverse geocoding from the coordinates
    console.log('[Test 4] Verifying reverse geocoding from coordinates...');
    const rev = await LocationService.reverseGeocode(katwaResult.latitude, katwaResult.longitude);
    assert.ok(rev.name.includes('Katwa'), 'Reverse geocoded place should contain Katwa');
    assert.strictEqual(rev.countryCode, 'IN');
    console.log(`- Reverse geocoded successfully: ${rev.name}, ${rev.country}`);

    console.log('\n[Result] All Location Search Flow tests passed successfully!');
  } catch (err: any) {
    console.error('\n[Failure] Location Search Flow test failed:', err);
    process.exit(1);
  }
}

testLocationSearchFlow();
