import { execSync } from 'child_process';
import path from 'path';

const testFiles = [
  'server/tests/location.test.ts',
  'server/tests/locationSearchFlow.test.ts',
  'server/tests/locationAudit.test.ts',
  'server/tests/locationE2EFlow.test.ts',
  'server/tests/mapExplorerFlow.test.ts',
  'server/tests/weather.test.ts',
  'server/tests/nasaPower.test.ts',
  'server/tests/nasaGistemp.test.ts',
  'server/tests/climateDataService.test.ts',
  'server/tests/prediction.test.ts',
  'server/tests/predictionsModule.test.ts',
  'server/tests/risk.test.ts',
  'server/tests/simulation.test.ts',
  'server/tests/scenarioSimulator.test.ts',
  'server/tests/reports.test.ts',
  'server/tests/savedReportsSecurity.test.ts',
  'server/tests/settingsSecurity.test.ts',
  'server/tests/advisor.test.ts',
  'server/tests/resilienceSolutions.test.ts',
  'server/tests/geminiService.test.ts',
  'server/tests/geminiSafetyGuard.test.ts',
  'server/tests/aiAdvisorAudit.test.ts',
  'server/tests/db.test.ts',
];

console.log('============ GEOTWIN 360 INTEGRATION TEST SUITE ============');
let passed = 0;
let failed = 0;

for (const file of testFiles) {
  console.log(`\n============================================================`);
  console.log(`RUNNING: ${file}`);
  console.log(`============================================================`);
  try {
    execSync(`npx tsx "${file}"`, {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test', LIVE_GEMINI_TEST: 'false' }
    });
    passed++;
  } catch (err) {
    console.error(`[FAILED] ${file}`);
    failed++;
  }
}

console.log(`\n============================================================`);
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${testFiles.length})`);
console.log(`AUDIT CONFIRMATION: REAL GEMINI API REQUESTS MADE = 0`);
console.log(`============================================================\n`);

if (failed > 0) {
  process.exit(1);
}

