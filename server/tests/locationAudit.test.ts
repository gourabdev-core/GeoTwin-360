import assert from 'assert';
import { LocationService } from '../services/locationService.js';
import { env } from '../config/env.js';

async function runLocationAudit() {
  console.log('=== GeoTwin 360 Professional Location System Audit ===\n');

  if (!env.OPENWEATHER_API_KEY) {
    console.error('ERROR: OPENWEATHER_API_KEY is not configured in .env');
    process.exit(1);
  }

  // Test Case 1: Katwa, West Bengal, India (Requirement 13 & 15)
  console.log('[Audit 1] Verifying Katwa, West Bengal, India...');
  const katwaResults = await LocationService.searchLocations('Katwa, West Bengal', 5);
  assert.ok(Array.isArray(katwaResults) && katwaResults.length > 0, 'Katwa search must return real results');
  const katwa = katwaResults.find(r => r.name.toLowerCase().includes('katwa') && (r.countryCode === 'IN' || r.country === 'India'));
  assert.ok(katwa, 'Katwa in India must be present in search results');
  
  console.log('  Found:', {
    name: katwa.name,
    city: katwa.city,
    state: katwa.state || katwa.region,
    country: katwa.country,
    countryCode: katwa.countryCode,
    latitude: katwa.latitude,
    longitude: katwa.longitude,
  });

  // Verify Katwa coordinates (~23.644° N, ~88.128° E)
  assert.ok(Math.abs(katwa.latitude - 23.644) < 0.05, `Katwa latitude ${katwa.latitude} should be near 23.644`);
  assert.ok(Math.abs(katwa.longitude - 88.128) < 0.05, `Katwa longitude ${katwa.longitude} should be near 88.128`);
  assert.strictEqual(katwa.country, 'India');
  assert.strictEqual(katwa.countryCode, 'IN');
  console.log('  -> Katwa verification: PASSED\n');

  // Test Case 2: Tokyo, Japan (Requirement 14 & 15)
  console.log('[Audit 2] Verifying Tokyo, Japan...');
  const tokyoResults = await LocationService.searchLocations('Tokyo', 5);
  assert.ok(Array.isArray(tokyoResults) && tokyoResults.length > 0, 'Tokyo search must return real results');
  const tokyo = tokyoResults.find(r => r.name.toLowerCase() === 'tokyo' && (r.countryCode === 'JP' || r.country === 'Japan'));
  assert.ok(tokyo, 'Tokyo, Japan must be present in search results');

  console.log('  Found:', {
    name: tokyo.name,
    city: tokyo.city,
    state: tokyo.state || tokyo.region,
    country: tokyo.country,
    countryCode: tokyo.countryCode,
    latitude: tokyo.latitude,
    longitude: tokyo.longitude,
  });

  // Verify Tokyo coordinates (~35.68° N, ~139.69° E)
  assert.ok(Math.abs(tokyo.latitude - 35.68) < 0.1, `Tokyo latitude ${tokyo.latitude} should be near 35.68`);
  assert.ok(Math.abs(tokyo.longitude - 139.69) < 0.1, `Tokyo longitude ${tokyo.longitude} should be near 139.69`);
  assert.strictEqual(tokyo.country, 'Japan');
  assert.strictEqual(tokyo.countryCode, 'JP');
  console.log('  -> Tokyo verification: PASSED\n');

  // Test Case 3: London, United Kingdom (Requirement 14 & 15, negative longitude test)
  console.log('[Audit 3] Verifying London, United Kingdom (Western Hemisphere longitude)...');
  const londonResults = await LocationService.searchLocations('London', 5);
  assert.ok(Array.isArray(londonResults) && londonResults.length > 0, 'London search must return real results');
  const london = londonResults.find(r => r.name.toLowerCase() === 'london' && (r.countryCode === 'GB' || r.country === 'United Kingdom'));
  assert.ok(london, 'London, United Kingdom must be present in search results');

  console.log('  Found:', {
    name: london.name,
    city: london.city,
    state: london.state || london.region,
    country: london.country,
    countryCode: london.countryCode,
    latitude: london.latitude,
    longitude: london.longitude,
  });

  // Verify London coordinates (~51.507° N, ~-0.127° W)
  assert.ok(Math.abs(london.latitude - 51.507) < 0.05, `London latitude ${london.latitude} should be near 51.507`);
  assert.ok(Math.abs(london.longitude - (-0.127)) < 0.05, `London longitude ${london.longitude} should be near -0.127`);
  assert.strictEqual(london.country, 'United Kingdom');
  assert.strictEqual(london.countryCode, 'GB');
  console.log('  -> London verification: PASSED\n');

  // Test Case 4: Reverse geocode on Katwa coordinates
  console.log('[Audit 4] Reverse geocoding Katwa coordinates...');
  const katwaRev = await LocationService.reverseGeocode(katwa.latitude, katwa.longitude);
  assert.ok(katwaRev.name.includes('Katwa'), 'Reverse geocoding must identify Katwa');
  assert.strictEqual(katwaRev.countryCode, 'IN');
  console.log('  Reverse geocoded to:', katwaRev.displayName);
  console.log('  -> Reverse geocoding: PASSED\n');

  // Test Case 5: Synthetic ID resolution in getLocationById (including negative longitude)
  console.log('[Audit 5] Synthetic ID resolution with negative longitude (London)...');
  const syntheticLondonId = `loc-${london.latitude.toFixed(4)}-${london.longitude.toFixed(4)}`;
  console.log('  Resolving ID:', syntheticLondonId);
  const resolvedLondon = await LocationService.getLocationById(syntheticLondonId);
  assert.ok(resolvedLondon, 'Must resolve synthetic ID');
  assert.ok(Math.abs(resolvedLondon.latitude - london.latitude) < 0.001);
  assert.ok(Math.abs(resolvedLondon.longitude - london.longitude) < 0.001);
  console.log('  Resolved location:', resolvedLondon.name, resolvedLondon.country);
  console.log('  -> Synthetic ID resolution: PASSED\n');

  console.log('=== All Location Audit Tests Completed Successfully ===');
}

runLocationAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
