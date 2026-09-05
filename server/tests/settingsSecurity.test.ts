process.env.NODE_ENV = 'test';
import assert from 'assert';
import express from 'express';
import axios from 'axios';
import profileRouter from '../api/profile.js';
import fs from 'fs';
import path from 'path';

async function runSettingsSecurityTests() {
  console.log('[Test Suite] Starting Settings & User Preferences Security Tests...');

  const app = express();
  app.use(express.json());
  app.use('/api/v1/profile', profileRouter);

  const port = 3062;
  const server = app.listen(port);
  const client = axios.create({
    baseURL: `http://localhost:${port}/api/v1/profile`,
    validateStatus: () => true, // Inspect status codes directly
  });

  const USER_A_ID = '11111111-1111-1111-1111-111111111111';
  const USER_B_ID = '22222222-2222-2222-2222-222222222222';
  const TOKEN_A = `Bearer test-token-${USER_A_ID}`;
  const TOKEN_B = `Bearer test-token-${USER_B_ID}`;

  try {
    // -----------------------------------------------------------------------
    // Test 1: Unauthenticated requests are blocked
    // -----------------------------------------------------------------------
    console.log('[Test 1] Verifying unauthenticated requests are blocked (401)...');

    const resGetUnauth = await client.get('/');
    assert.strictEqual(resGetUnauth.status, 401, 'GET /profile without token must return 401');

    const resPatchUnauth = await client.patch('/', {
      full_name: 'Hacker',
    });
    assert.strictEqual(resPatchUnauth.status, 401, 'PATCH /profile without token must return 401');

    console.log('- Unauthenticated requests correctly rejected with 401.');
    console.log('[Test 1] PASSED.');

    // -----------------------------------------------------------------------
    // Test 2: Authenticated user can fetch their profile
    // -----------------------------------------------------------------------
    console.log('[Test 2] Verifying authenticated profile retrieval...');

    const resGetA = await client.get('/', {
      headers: { Authorization: TOKEN_A },
    });
    assert.strictEqual(resGetA.status, 200, 'GET /profile must return 200');
    assert.strictEqual(resGetA.data.status, 'success');
    assert.strictEqual(resGetA.data.data.id, USER_A_ID);
    assert.ok(resGetA.data.data.preferences, 'Profile must have default preferences');

    console.log('- User A profile retrieved successfully with default preferences.');
    console.log('[Test 2] PASSED.');

    // -----------------------------------------------------------------------
    // Test 3: Authenticated user can update profile details
    // -----------------------------------------------------------------------
    console.log('[Test 3] Verifying user can update name, role, and organization...');

    const resPatchA = await client.patch(
      '/',
      {
        full_name: 'Dr. Aris Thorne',
        role: 'Climate Risk Analyst',
        organization: 'Kolkata Resilience Office',
      },
      {
        headers: { Authorization: TOKEN_A },
      }
    );

    assert.strictEqual(resPatchA.status, 200, 'PATCH /profile must return 200');
    assert.strictEqual(resPatchA.data.data.full_name, 'Dr. Aris Thorne');
    assert.strictEqual(resPatchA.data.data.role, 'Climate Risk Analyst');
    assert.strictEqual(resPatchA.data.data.organization, 'Kolkata Resilience Office');

    const resPatchRole = await client.patch(
      '/',
      { role: 'Environmental Researcher' },
      { headers: { Authorization: TOKEN_A } }
    );
    assert.strictEqual(resPatchRole.status, 200, 'PATCH role must return 200');
    assert.strictEqual(resPatchRole.data.data.role, 'Environmental Researcher');

    console.log('- Profile details and specialized roles updated and verified.');
    console.log('[Test 3] PASSED.');

    // -----------------------------------------------------------------------
    // Test 4: Authenticated user can update application preferences
    // -----------------------------------------------------------------------
    console.log('[Test 4] Verifying preferences update (unit, year, scenario)...');

    const resPrefsA = await client.patch(
      '/',
      {
        preferences: {
          temperatureUnit: 'fahrenheit',
          defaultTargetYear: 2040,
          defaultScenario: 'resilience',
          defaultLocationId: 'loc-22.5726-88.3639',
          defaultLocationName: 'Kolkata, West Bengal, India',
        },
      },
      {
        headers: { Authorization: TOKEN_A },
      }
    );

    assert.strictEqual(resPrefsA.status, 200, 'PATCH preferences must return 200');
    assert.strictEqual(resPrefsA.data.data.preferences.temperatureUnit, 'fahrenheit');
    assert.strictEqual(resPrefsA.data.data.preferences.defaultTargetYear, 2040);
    assert.strictEqual(resPrefsA.data.data.preferences.defaultScenario, 'resilience');

    console.log('- Preferences updated successfully.');
    console.log('[Test 4] PASSED.');

    // -----------------------------------------------------------------------
    // Test 5: Validation rules reject invalid inputs
    // -----------------------------------------------------------------------
    console.log('[Test 5] Verifying validation rules reject invalid inputs (400)...');

    // Empty name
    const resEmptyName = await client.patch(
      '/',
      { full_name: '   ' },
      { headers: { Authorization: TOKEN_A } }
    );
    assert.strictEqual(resEmptyName.status, 400, 'Empty name must return 400');

    // Invalid target year
    const resBadYear = await client.patch(
      '/',
      { preferences: { defaultTargetYear: 2099 } },
      { headers: { Authorization: TOKEN_A } }
    );
    assert.strictEqual(resBadYear.status, 400, 'Invalid year 2099 must return 400');

    // Invalid temperature unit
    const resBadUnit = await client.patch(
      '/',
      { preferences: { temperatureUnit: 'kelvin' } },
      { headers: { Authorization: TOKEN_A } }
    );
    assert.strictEqual(resBadUnit.status, 400, 'Invalid unit "kelvin" must return 400');

    // Invalid scenario
    const resBadScenario = await client.patch(
      '/',
      { preferences: { defaultScenario: 'unknown-scenario' } },
      { headers: { Authorization: TOKEN_A } }
    );
    assert.strictEqual(resBadScenario.status, 400, 'Invalid scenario must return 400');

    console.log('- Validation rules enforced correctly.');
    console.log('[Test 5] PASSED.');

    // -----------------------------------------------------------------------
    // Test 6: Multi-tenant isolation (User B isolated from User A)
    // -----------------------------------------------------------------------
    console.log('[Test 6] Verifying multi-tenant isolation between User A and User B...');

    const resGetB = await client.get('/', {
      headers: { Authorization: TOKEN_B },
    });

    assert.strictEqual(resGetB.status, 200);
    assert.strictEqual(resGetB.data.data.id, USER_B_ID);
    assert.notStrictEqual(resGetB.data.data.full_name, 'Dr. Aris Thorne');
    assert.strictEqual(resGetB.data.data.preferences.temperatureUnit, 'celsius', 'User B must have default celsius');

    console.log('- Multi-tenant isolation verified: User B cannot see User A data.');
    console.log('[Test 6] PASSED.');

    // -----------------------------------------------------------------------
    // Test 7: Verify migration definition
    // -----------------------------------------------------------------------
    console.log('[Test 7] Verifying Supabase migration SQL definition...');

    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20260905000001_user_preferences.sql'
    );
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(migrationSql.includes('ADD COLUMN IF NOT EXISTS preferences JSONB'), 'Migration must add preferences JSONB');

    console.log('- Migration SQL syntax verified.');
    console.log('[Test 7] PASSED.');

    console.log('\n[Test Suite] ALL 7 SETTINGS & PREFERENCES SECURITY TESTS PASSED.');
  } finally {
    server.close();
  }
}

runSettingsSecurityTests().catch((err) => {
  console.error('[Settings Security Tests] FATAL FAILURE:', err);
  process.exit(1);
});
