import assert from 'assert';
import { NasaGistempService } from '../services/nasaGistempService.js';

async function runTests() {
  console.log('[Test Suite] Starting NASA GISTEMP v4 Climate Timeline Tests...');

  try {
    // 1. Test CSV Parsing logic
    console.log('[Test 1] Verifying CSV parser with sample NASA GISTEMP LOTI format...');
    const sampleCsv = `Land-Ocean: Global Means
Year,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec,J-D,D-N,DJF,MAM,JJA,SON
2024,1.25,1.44,1.39,1.31,1.16,1.23,1.20,1.30,1.21,1.35,1.30,1.27,1.28,1.29,1.35,1.29,1.24,1.29
2025,1.38,1.26,1.37,1.24,1.08,1.07,1.02,1.18,1.25,1.19,1.21,1.06,1.19,1.21,1.30,1.23,1.09,1.22
2026,1.08,1.24,1.32,1.17,1.13,1.18,1.23,***,***,***,***,***,***,***,1.13,1.21,***,***`;

    const parsed = NasaGistempService.parseGistempCsv(sampleCsv);
    assert.strictEqual(parsed.length, 3, 'Expected 3 records parsed for 2024, 2025, 2026');

    const p2024 = parsed.find(p => p.year === 2024);
    assert.ok(p2024, '2024 should be present');
    assert.strictEqual(p2024.status, 'OBSERVED', '2024 must have status OBSERVED');
    assert.strictEqual(p2024.value, 1.28, '2024 value should match J-D 1.28');
    assert.strictEqual(p2024.source, 'NASA GISTEMP v4');
    assert.ok(p2024.methodology, '2024 must have methodology');

    const p2025 = parsed.find(p => p.year === 2025);
    assert.ok(p2025, '2025 should be present');
    assert.strictEqual(p2025.status, 'OBSERVED', '2025 must have status OBSERVED');
    assert.strictEqual(p2025.value, 1.19, '2025 value should match J-D 1.19');
    assert.strictEqual(p2025.source, 'NASA GISTEMP v4');
    assert.ok(p2025.methodology, '2025 must have methodology');

    const p2026 = parsed.find(p => p.year === 2026);
    assert.ok(p2026, '2026 should be present');
    assert.strictEqual(p2026.status, 'CURRENT/YTD', '2026 must be CURRENT/YTD, NOT OBSERVED');
    assert.notStrictEqual(p2026.status, 'OBSERVED', '2026 must not be marked as a completed annual observation');
    assert.strictEqual(p2026.value, 1.19, '2026 YTD average of 7 months should be 1.19');
    assert.ok(p2026.note?.includes('not yet complete') || p2026.note?.includes('Year-to-date'), '2026 should have incomplete year note');
    console.log('- CSV parsing and status categorization tests passed.');

    // 2. Test live/cached dataset retrieval
    console.log('[Test 2] Testing NasaGistempService.getHistoricalTimeline()...');
    const dataset = await NasaGistempService.getHistoricalTimeline();
    assert.ok(dataset, 'Dataset should not be null');
    assert.strictEqual(dataset.source, 'NASA GISTEMP v4');
    assert.strictEqual(dataset.baseline, '1951–1980 NASA Baseline');
    assert.ok(Array.isArray(dataset.timeline), 'Timeline should be an array');
    assert.ok(dataset.timeline.length >= 12, 'Timeline should contain at least 12 records (2015 to 2026)');

    // Verify all required years: 2015 to 2026
    const expectedYears = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
    for (const yr of expectedYears) {
      const point = dataset.timeline.find(p => p.year === yr);
      assert.ok(point, `Year ${yr} must appear in the NASA GISTEMP timeline`);
      assert.ok(typeof point.value === 'number', `Year ${yr} value must be a valid number`);
      assert.ok(point.source === 'NASA GISTEMP v4', `Year ${yr} source must be NASA GISTEMP v4`);
      assert.ok(point.baseline === '1951–1980 NASA Baseline', `Year ${yr} baseline must be 1951–1980 NASA Baseline`);
      assert.ok(point.methodology, `Year ${yr} must have methodology`);

      if (yr <= 2025) {
        assert.strictEqual(point.status, 'OBSERVED', `Year ${yr} must have status 'OBSERVED'`);
      } else if (yr === 2026) {
        assert.strictEqual(point.status, 'CURRENT/YTD', 'Year 2026 must have status "CURRENT/YTD"');
        assert.notStrictEqual(point.status, 'OBSERVED', 'Year 2026 must NOT be labeled observed annual');
      }
    }

    // Verify 2025 specific value
    const pt2025 = dataset.timeline.find(p => p.year === 2025);
    assert.strictEqual(pt2025?.value, 1.19, '2025 NASA GISTEMP observed anomaly must be 1.19°C');
    assert.strictEqual(pt2025?.status, 'OBSERVED', '2025 must be OBSERVED');

    // Verify 2026 specific status
    const pt2026 = dataset.timeline.find(p => p.year === 2026);
    assert.strictEqual(pt2026?.status, 'CURRENT/YTD', '2026 must be CURRENT/YTD');
    assert.ok(pt2026?.note, '2026 should have explicit notation regarding incomplete annual data');

    console.log(`- Successfully verified timeline years 2015–2026. 2025 value: +${pt2025?.value}°C (Observed), 2026: +${pt2026?.value}°C (YTD Incomplete).`);
    console.log('[Test 2] PASSED.');

    console.log('\n[Result] All NASA GISTEMP v4 Climate Timeline tests passed successfully!');
  } catch (err: any) {
    console.error('\n[Failure] NASA GISTEMP v4 tests failed:', err.message);
    process.exit(1);
  }
}

runTests();
