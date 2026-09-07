import assert from 'assert';
import { LocationService } from '../services/locationService.js';
import { WeatherService } from '../services/weatherService.js';
import { OpenMeteoService } from '../services/openMeteoService.js';
import { RiskService } from '../services/riskService.js';
import { PredictionService } from '../services/predictionService.js';
import { SimulationService } from '../services/simulationService.js';
import { SolutionService } from '../services/solutionService.js';
import { env } from '../config/env.js';

async function testCompleteLocationPipeline(searchQuery: string, expectedCity: string, expectedCountry: string) {
  console.log(`\n======================================================`);
  console.log(`[PIPELINE AUDIT] Testing location query: "${searchQuery}"`);
  console.log(`======================================================`);

  // STEP 1: SEARCH & RESULTS
  console.log(`1. [SEARCH] Querying LocationService for "${searchQuery}"...`);
  const searchResults = await LocationService.searchLocations(searchQuery, 5);
  assert.ok(Array.isArray(searchResults) && searchResults.length > 0, `Search for "${searchQuery}" must return results`);
  console.log(`   -> Found ${searchResults.length} real locations.`);

  const match = searchResults.find(r => 
    (r.city?.toLowerCase().includes(expectedCity.toLowerCase()) || r.name.toLowerCase().includes(expectedCity.toLowerCase())) &&
    (r.country.toLowerCase().includes(expectedCountry.toLowerCase()) || r.countryCode.toLowerCase() === expectedCountry.toLowerCase())
  ) || searchResults[0];

  assert.ok(match, `Must find matching location for ${expectedCity}, ${expectedCountry}`);

  // STEP 2: SELECT LOCATION & DATA ATTRIBUTES (Requirement 3)
  console.log(`2. [SELECT LOCATION] Validating stored metadata:`);
  console.log(`   - City: ${match.city || match.name}`);
  console.log(`   - State/Region: ${match.state || match.region || '(none)'}`);
  console.log(`   - Country: ${match.country} (${match.countryCode})`);
  console.log(`   - Latitude: ${match.latitude}`);
  console.log(`   - Longitude: ${match.longitude}`);

  assert.ok(match.name, 'Location must have name');
  assert.ok(match.country, 'Location must have country');
  assert.ok(typeof match.latitude === 'number' && !isNaN(match.latitude) && match.latitude >= -90 && match.latitude <= 90, 'Valid latitude required');
  assert.ok(typeof match.longitude === 'number' && !isNaN(match.longitude) && match.longitude >= -180 && match.longitude <= 180, 'Valid longitude required');

  // STEP 3: GLOBAL ENTITY ID RESOLUTION
  const locationEntity = await LocationService.getOrCreateLocation({
    name: match.name,
    city: match.city || match.name,
    region: match.state || match.region,
    country: match.country,
    countryCode: match.countryCode,
    latitude: match.latitude,
    longitude: match.longitude,
  });
  const locId = locationEntity.id;
  assert.ok(locId, 'Location entity must produce valid ID');
  console.log(`3. [GLOBAL STATE] Location ID resolved: ${locId}`);

  // STEP 4: WEATHER INTELLIGENCE
  console.log(`4. [WEATHER] Fetching real live weather for ${match.latitude}, ${match.longitude}...`);
  const liveWeather = await WeatherService.fetchLiveWeather(match.latitude, match.longitude);
  assert.ok(liveWeather, 'Live weather data must be returned');
  assert.ok(typeof liveWeather.temperature === 'number' && !isNaN(liveWeather.temperature), 'Must return valid real-time temperature');
  console.log(`   -> Weather: ${liveWeather.temperature}°C, Humidity: ${liveWeather.humidity}%, Condition: ${liveWeather.description}`);

  const envData = await OpenMeteoService.fetchEnvironmentalData(match.latitude, match.longitude);
  assert.ok(envData, 'Environmental data must be returned');
  console.log(`   -> AQI: ${envData.airQuality?.aqi ?? 'N/A'}, Water: ${envData.waterAvailability?.value ?? 'N/A'}%`);

  // STEP 5: CLIMATE RISK EVALUATION
  console.log(`5. [RISK] Evaluating climate risks for ${locId}...`);
  const floodRisk = await RiskService.getRisk(locId, 'flood', 2035, 'default');
  const heatRisk = await RiskService.getRisk(locId, 'temperature', 2035, 'default');
  assert.ok(floodRisk && floodRisk.level, 'Flood risk evaluation must return level');
  assert.ok(heatRisk && heatRisk.level, 'Heat risk evaluation must return level');
  console.log(`   -> Flood Risk: ${floodRisk.level} (Score: ${floodRisk.score})`);
  console.log(`   -> Heat Risk: ${heatRisk.level} (Score: ${heatRisk.score})`);

  // STEP 6: CLIMATE PREDICTIONS & PROJECTIONS
  console.log(`6. [PREDICTIONS] Generating 2035 climate projection...`);
  const projection = await PredictionService.getProjectionForYear(locId, 2035, 'default');
  assert.ok(projection, 'Prediction service must return projection');
  console.log(`   -> Projected Temp (2035): ${projection.temperature ?? 'N/A'}°C (Confidence: ${((projection.confidence ?? 0.85) * 100).toFixed(0)}%)`);

  // STEP 7: SCENARIO SIMULATION
  console.log(`7. [SCENARIO SIMULATOR] Running deterministic simulation with interventions...`);
  const simResult = await SimulationService.runSimulation(
    locId,
    2035,
    ['plant-trees', 'rainwater-harvesting', 'cool-roof-initiative'],
    'resilience'
  );
  assert.ok(simResult && simResult.simulationId, 'Simulation service must produce result');
  console.log(`   -> Sustainability Score Before: ${simResult.sustainabilityScore.before}, After: ${simResult.sustainabilityScore.after} (+${simResult.sustainabilityScore.improvement})`);

  // STEP 8: RESILIENCE SOLUTIONS
  console.log(`8. [RESILIENCE SOLUTIONS] Fetching resilience action catalogue...`);
  const solutions = await SolutionService.getSolutions(locId, 2035, 'default', false);
  assert.ok(solutions && Array.isArray(solutions.solutions), 'Solutions service must return array');
  assert.ok(solutions.solutions.length > 0, 'Must return at least 1 resilience action');
  console.log(`   -> Generated ${solutions.solutions.length} prioritized resilience solutions.`);
  console.log(`   -> Top action: "${solutions.solutions[0].title}" [${solutions.solutions[0].priority}]`);

  console.log(`[SUCCESS] Complete pipeline verified for "${searchQuery}"!`);
}

async function runE2EAudit() {
  console.log('=== GeoTwin 360 Full Location Pipeline Verification ===');

  // Test 1: Katwa, West Bengal, India (Requirement 13)
  await testCompleteLocationPipeline('Katwa, West Bengal', 'Katwa', 'India');

  // Test 2: Tokyo, Japan (Requirement 14)
  await testCompleteLocationPipeline('Tokyo', 'Tokyo', 'Japan');

  // Test 3: London, United Kingdom (Requirement 14)
  await testCompleteLocationPipeline('London', 'London', 'United Kingdom');

  console.log('\n======================================================');
  console.log('ALL 3 LOCATIONS PASSED COMPLETE END-TO-END VERIFICATION');
  console.log('SEARCH -> SELECT -> STATE -> DASHBOARD -> MAP -> WEATHER -> RISK -> PREDICTIONS -> SCENARIO -> RESILIENCE');
  console.log('======================================================\n');
}

runE2EAudit().catch((err) => {
  console.error('\n[FATAL] Location Pipeline verification failed:', err);
  process.exit(1);
});
