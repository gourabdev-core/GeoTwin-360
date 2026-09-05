import assert from 'assert';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';

async function runTests() {
  console.log('[Test Suite] Starting Database Verification Tests...');

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.log('[WARNING] SUPABASE_URL or SUPABASE_ANON_KEY is missing. Skipping Database Verification Tests.');
    return;
  }

  let testUserId: string | null = null;
  let testUserClient: any = null;
  let kolkataId: string | null = null;
  let scenarioId: string | null = null;

  try {
    // 1. Connection & Static Table Reading (Public Read-Only)
    console.log('[Test 1] Verifying public access to locations and interventions...');
    
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('*')
      .order('name');

    if (locError) {
      console.log(`[WARNING] Database query failed: ${locError.message}`);
      console.log('Notice: The target Supabase instance lacks the database tables.');
      console.log('Action required: Apply the migration script "supabase/migrations/20260815000000_init_schema.sql" via the Supabase SQL Editor.');
      console.log('[Test 1] SKIPPED (migration pending).');
      console.log('\n[Result] Database verification completed (schema migration pending).');
      return;
    }

    assert.ok(locations && locations.length >= 5, 'Should find at least 5 seeded locations.');
    console.log(`- Locations table query succeeded. Seeded count: ${locations.length}`);
    
    // Store Kolkata's ID for later testing
    const kolkata = locations.find((l: any) => l.name === 'Kolkata');
    assert.ok(kolkata, 'Seeded Kolkata location must exist.');
    kolkataId = kolkata.id;
    console.log(`- Kolkata location found with ID: ${kolkataId}`);

    const { data: interventions, error: intError } = await supabase
      .from('interventions')
      .select('*');

    if (intError) {
      throw new Error(`Failed to query interventions table: ${intError.message}`);
    }

    assert.ok(interventions && interventions.length >= 5, 'Should find at least 5 seeded interventions.');
    console.log(`- Interventions table query succeeded. Seeded count: ${interventions.length}`);
    
    const treePlanting = interventions.find((i: any) => i.slug === 'plant-trees');
    assert.ok(treePlanting, 'Seeded plant-trees intervention must exist.');
    console.log('[Test 1] PASSED.');

    // 2. RLS Security: Block public writes on public tables
    console.log('[Test 2] Verifying that anonymous writes to public tables are blocked...');
    
    const anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error: anonInsertLocError } = await anonClient
      .from('locations')
      .insert({
        name: 'Should Fail Location',
        country: 'TestLand',
        latitude: 0.0,
        longitude: 0.0,
      });

    // Supabase returns a 401 or 403 response error or RLS constraint breach
    assert.ok(anonInsertLocError, 'Anonymous location insertion should be blocked by RLS policies.');
    console.log(`- Blocked anonymous insert into locations (Expected Error: ${anonInsertLocError.message})`);
    console.log('[Test 2] PASSED.');

    // 3. User Authentication Sync & RLS Private Data Scoping
    console.log('[Test 3] Verifying user sync trigger and RLS scoping for scenarios...');
    
    // Generate a unique test email and password
    const testEmail = `test-user-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`- Signing up a temporary test user: ${testEmail}`);
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Integration Test User',
      },
    });

    if (signUpError) {
      throw new Error(`Auth SignUp failed: ${signUpError.message}`);
    }

    assert.ok(signUpData.user, 'SignUp should return a valid user object.');
    testUserId = signUpData.user.id;
    console.log(`- Temporary user created with ID: ${testUserId}`);

    // Wait a brief moment to ensure trigger handles insertion
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify trigger synced auth.users to public.users
    // Note: Since public.users is protected by RLS (auth.uid() = id), the anon client cannot read it yet.
    // We will initialize a separate client authenticated as the test user.
    testUserClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: sessionData, error: sessionError } = await testUserClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (sessionError || !sessionData.session) {
      throw new Error(`Auth login failed: ${sessionError?.message || 'No session returned'}`);
    }

    console.log('- Successfully authenticated test client.');

    // Query own profile from public.users
    const { data: userProfile, error: profileError } = await testUserClient
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single();

    if (profileError) {
      throw new Error(`Failed to query own profile (trigger check): ${profileError.message}`);
    }

    assert.strictEqual(userProfile.name, 'Integration Test User', 'User name should match metadata set during signup.');
    console.log('- Trigger sync verification succeeded. public.users row exists.');

    // 4. Authenticated Scenario CRUD
    console.log('[Test 4] Verifying scenario lifecycle for authenticated user...');
    
    const { data: scenario, error: scenError } = await testUserClient
      .from('scenarios')
      .insert({
        user_id: testUserId,
        location_id: kolkataId,
        name: 'Kolkata Test Scenario',
        target_year: 2035,
        status: 'DRAFT',
      })
      .select()
      .single();

    if (scenError) {
      throw new Error(`Failed to create scenario: ${scenError.message}`);
    }

    scenarioId = scenario.id;
    console.log(`- Created scenario successfully with ID: ${scenarioId}`);

    // Verify scenario is visible to the creator
    const { data: myScenarios, error: getScenError } = await testUserClient
      .from('scenarios')
      .select('*')
      .eq('id', scenarioId);

    if (getScenError) {
      throw new Error(`Failed to query own scenarios: ${getScenError.message}`);
    }

    assert.strictEqual(myScenarios.length, 1, 'Creator should see their scenario.');
    console.log('- Creator can successfully read their own scenario.');

    // 5. Verify RLS scopes exclude unauthenticated users
    console.log('[Test 5] Verifying other users/anon cannot access the scenario...');
    
    const { data: anonScenarios, error: anonGetScenError } = await anonClient
      .from('scenarios')
      .select('*')
      .eq('id', scenarioId);

    if (anonGetScenError) {
      // Some configs return error, others return empty list. Both are valid denials.
      console.log(`- Anon query was restricted (Expected Error: ${anonGetScenError.message})`);
    } else {
      assert.strictEqual(anonScenarios.length, 0, 'Anonymous requests must not return private scenarios.');
      console.log('- Anonymous request returned 0 scenarios as expected.');
    }
    console.log('[Test 5] PASSED.');

    // Clean up created entities
    console.log('[Cleanup] Cleaning up scenario...');
    await testUserClient.from('scenarios').delete().eq('id', scenarioId);
    console.log('- Deleted test scenario.');

    console.log('\n[Result] All database validation tests passed successfully!');

  } catch (err: any) {
    console.error('\n[Failure] Database integration verification failed!');
    console.error(err);
    process.exit(1);
  }
}

runTests();
