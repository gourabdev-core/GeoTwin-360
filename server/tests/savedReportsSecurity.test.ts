process.env.NODE_ENV = 'test';
import assert from 'assert';
import express from 'express';
import axios from 'axios';
import reportsRouter from '../api/reports.js';
import fs from 'fs';
import path from 'path';

async function runSavedReportsSecurityTests() {
  console.log('[Test Suite] Starting Saved Reports Supabase RLS & Security Tests...');

  const app = express();
  app.use(express.json());
  app.use('/api/v1/reports', reportsRouter);

  const port = 3060;
  const server = app.listen(port);
  const client = axios.create({
    baseURL: `http://localhost:${port}/api/v1/reports`,
    validateStatus: () => true, // Don't throw on 4xx/5xx to inspect status codes
  });

  const USER_A_ID = '11111111-1111-1111-1111-111111111111';
  const USER_B_ID = '22222222-2222-2222-2222-222222222222';
  const TOKEN_A = `Bearer test-token-${USER_A_ID}`;
  const TOKEN_B = `Bearer test-token-${USER_B_ID}`;

  let reportAId: string | null = null;
  let reportBId: string | null = null;

  try {
    // -----------------------------------------------------------------------
    // Test 1: Unauthenticated requests are rejected with 401 UNAUTHORIZED
    // -----------------------------------------------------------------------
    console.log('[Test 1] Verifying that unauthenticated requests are blocked...');

    const resGetUnauth = await client.get('/saved');
    assert.strictEqual(resGetUnauth.status, 401, 'GET /saved without auth must return 401');

    const resPostUnauth = await client.post('/saved', {
      title: 'Hacked Report',
    });
    assert.strictEqual(resPostUnauth.status, 401, 'POST /saved without auth must return 401');

    const resPatchUnauth = await client.patch('/saved/some-id', {
      title: 'Renamed Hack',
    });
    assert.strictEqual(resPatchUnauth.status, 401, 'PATCH /saved/:id without auth must return 401');

    const resDeleteUnauth = await client.delete('/saved/some-id');
    assert.strictEqual(resDeleteUnauth.status, 401, 'DELETE /saved/:id without auth must return 401');

    console.log('- Unauthenticated requests correctly rejected with 401 UNAUTHORIZED.');
    console.log('[Test 1] PASSED.');

    // -----------------------------------------------------------------------
    // Test 2: Spoofed user_id in payload is strictly ignored
    // -----------------------------------------------------------------------
    console.log('[Test 2] Verifying server enforces authenticated identity (anti-spoofing)...');

    const resSpoofed = await client.post(
      '/saved',
      {
        user_id: '99999999-9999-9999-9999-999999999999', // Maliciously spoofed foreign user_id
        userId: '88888888-8888-8888-8888-888888888888',
        title: 'User A Climate Intelligence Report',
        metadata: {
          locationName: 'Kolkata',
          country: 'India',
          coordinates: { latitude: 22.5726, longitude: 88.3639 },
          targetYear: 2035,
          scenario: 'Baseline Scenario',
          climateIndicators: { temperature: 32.5, airQualityIndex: 110 },
          riskResults: { heatRiskLevel: 'HIGH', floodRiskLevel: 'MODERATE' },
        },
      },
      { headers: { Authorization: TOKEN_A } }
    );

    assert.strictEqual(resSpoofed.status, 201, 'POST /saved should succeed for User A');
    assert.ok(resSpoofed.data.data.id, 'Created report must have an ID');
    assert.strictEqual(
      resSpoofed.data.data.user_id,
      USER_A_ID,
      'Created report user_id must match authenticated User A identity, NOT the spoofed payload ID.'
    );
    reportAId = resSpoofed.data.data.id;
    console.log(`- Report created with ID ${reportAId}. User ID derived strictly as ${USER_A_ID}.`);
    console.log('[Test 2] PASSED.');

    // -----------------------------------------------------------------------
    // Test 3: User B creates their own report
    // -----------------------------------------------------------------------
    console.log('[Test 3] User B creates their own private report...');

    const resUserB = await client.post(
      '/saved',
      {
        title: 'User B Tokyo Climate Plan',
        metadata: {
          locationName: 'Tokyo',
          country: 'Japan',
          coordinates: { latitude: 35.6762, longitude: 139.6503 },
          targetYear: 2040,
          scenario: 'Resilience Plan 2035',
          climateIndicators: { temperature: 26.0, airQualityIndex: 45 },
          riskResults: { heatRiskLevel: 'MODERATE', floodRiskLevel: 'LOW' },
        },
      },
      { headers: { Authorization: TOKEN_B } }
    );

    assert.strictEqual(resUserB.status, 201, 'POST /saved should succeed for User B');
    assert.strictEqual(resUserB.data.data.user_id, USER_B_ID, 'Report user_id must match User B');
    reportBId = resUserB.data.data.id;
    console.log(`- User B Report created with ID ${reportBId}.`);
    console.log('[Test 3] PASSED.');

    // -----------------------------------------------------------------------
    // Test 4: List isolation — User B cannot see User A's reports
    // -----------------------------------------------------------------------
    console.log("[Test 4] Verifying list isolation: User B cannot see User A's reports...");

    const resListB = await client.get('/saved', {
      headers: { Authorization: TOKEN_B },
    });

    assert.strictEqual(resListB.status, 200);
    const reportsForB = resListB.data.data;
    const bReportIds = reportsForB.map((r: any) => r.id);

    assert.ok(bReportIds.includes(reportBId), "User B must see their own report");
    assert.ok(!bReportIds.includes(reportAId), "User B must NOT see User A's report in the list");
    console.log(`- User B list contains only their ${reportsForB.length} report(s). User A's report is hidden.`);
    console.log('[Test 4] PASSED.');

    // -----------------------------------------------------------------------
    // Test 5: Single GET isolation — User B cannot retrieve User A's report
    // -----------------------------------------------------------------------
    console.log("[Test 5] Verifying single fetch isolation: User B cannot read User A's report by ID...");

    const resGetAByB = await client.get(`/saved/${reportAId}`, {
      headers: { Authorization: TOKEN_B },
    });

    assert.strictEqual(
      resGetAByB.status,
      404,
      "Attempt by User B to get User A's report must return 404 NOT FOUND"
    );
    assert.strictEqual(resGetAByB.data.error.code, 'REPORT_NOT_FOUND');
    console.log("- User B access denied to User A's report (404 NOT FOUND).");
    console.log('[Test 5] PASSED.');

    // -----------------------------------------------------------------------
    // Test 6: Mutation isolation — User B cannot rename User A's report
    // -----------------------------------------------------------------------
    console.log("[Test 6] Verifying mutation isolation: User B cannot rename User A's report...");

    const resRenameAByB = await client.patch(
      `/saved/${reportAId}`,
      { title: 'Malicious Rename' },
      { headers: { Authorization: TOKEN_B } }
    );

    assert.strictEqual(
      resRenameAByB.status,
      404,
      "Attempt by User B to rename User A's report must return 404 NOT FOUND"
    );
    console.log("- User B rename attempt rejected with 404.");
    console.log('[Test 6] PASSED.');

    // -----------------------------------------------------------------------
    // Test 7: Deletion isolation — User B cannot delete User A's report
    // -----------------------------------------------------------------------
    console.log("[Test 7] Verifying deletion isolation: User B cannot delete User A's report...");

    const resDeleteAByB = await client.delete(`/saved/${reportAId}`, {
      headers: { Authorization: TOKEN_B },
    });

    assert.strictEqual(
      resDeleteAByB.status,
      404,
      "Attempt by User B to delete User A's report must return 404 NOT FOUND"
    );
    console.log("- User B deletion attempt rejected with 404.");
    console.log('[Test 7] PASSED.');

    // -----------------------------------------------------------------------
    // Test 8: Authorized mutations — User A can rename and delete their report
    // -----------------------------------------------------------------------
    console.log('[Test 8] Verifying User A can rename and delete their own report...');

    // Rename
    const newTitle = 'Updated Kolkata Resilience Report 2035';
    const resRenameA = await client.patch(
      `/saved/${reportAId}`,
      { title: newTitle },
      { headers: { Authorization: TOKEN_A } }
    );
    assert.strictEqual(resRenameA.status, 200, 'User A should successfully rename their own report');
    assert.strictEqual(resRenameA.data.data.title, newTitle);
    console.log(`- Successfully renamed report to "${newTitle}".`);

    // Delete
    const resDeleteA = await client.delete(`/saved/${reportAId}`, {
      headers: { Authorization: TOKEN_A },
    });
    assert.strictEqual(resDeleteA.status, 200, 'User A should successfully delete their own report');
    console.log('- Successfully deleted report.');

    // Verify report is gone
    const resGetDeleted = await client.get(`/saved/${reportAId}`, {
      headers: { Authorization: TOKEN_A },
    });
    assert.strictEqual(resGetDeleted.status, 404, 'Subsequent fetch of deleted report must return 404');
    console.log('- Verified report is removed from database.');
    console.log('[Test 8] PASSED.');

    // -----------------------------------------------------------------------
    // Test 9: Supabase Schema Migration & RLS Policy File Verification
    // -----------------------------------------------------------------------
    console.log('[Test 9] Verifying Supabase RLS policies in migration definition...');

    const migrationPath = path.resolve('supabase', 'migrations', '20260905000000_profiles_and_saved_reports.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist.');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(migrationSql.includes('ENABLE ROW LEVEL SECURITY'), 'RLS must be enabled on saved_reports');
    assert.ok(migrationSql.includes('auth.uid() = user_id'), 'Policies must enforce auth.uid() = user_id');
    assert.ok(migrationSql.includes('Users can view their own saved reports'), 'SELECT policy must exist');
    assert.ok(migrationSql.includes('Users can insert their own saved reports'), 'INSERT policy must exist');
    assert.ok(migrationSql.includes('Users can update their own saved reports'), 'UPDATE policy must exist');
    assert.ok(migrationSql.includes('Users can delete their own saved reports'), 'DELETE policy must exist');

    console.log('- Verified all 4 RLS CRUD policies for saved_reports in migration definition.');
    console.log('[Test 9] PASSED.');

    console.log('\n[Test Suite] ALL 9 SAVED REPORTS SECURITY TESTS PASSED SUCCESSFULLY.');
  } catch (err: any) {
    console.error('\n[Test Suite] SAVED REPORTS SECURITY TEST FAILED:', err.message || err);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
    process.exitCode = 1;
  } finally {
    server.close();
    console.log('Test server closed.');
  }
}

runSavedReportsSecurityTests();
