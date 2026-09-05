import assert from 'assert';
import { supabase } from '../config/supabase.js';
import { SimulationService } from '../services/simulationService.js';
import express from 'express';
import reportsRouter from '../api/reports.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('[Test Suite] Starting Reports API & PDF Generation Integration Tests...');

  const app = express();
  app.use(express.json());
  app.use('/api/v1/reports', reportsRouter);
  
  const port = 3055;
  const server = app.listen(port);
  const client = axios.create({ baseURL: `http://localhost:${port}/api/v1/reports` });

  const lat = 22.572646;
  const lng = 88.363895;
  const testYear = 2035;
  let locationId: string | null = null;
  let reportsCreated: string[] = [];

  try {
    // 1. Resolve or create location context
    console.log('[Test 1] Setting up location context...');
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
          name: 'Kolkata Reports Test Location',
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
      console.log('[WARNING] DB tables not accessible. Skipping Reports DB tests.');
      console.log('[Test 1] SKIPPED (migration pending).');
      console.log('\n[Result] Reports API tests completed (DB migration pending).');
      server.close();
      return;
    }
    console.log(`- Resolved location ID: ${locationId}`);
    console.log('[Test 1] PASSED.');

    // 2. Test Report Generation WITHOUT Simulation (Baseline Report)
    console.log('[Test 2] Generating report without custom simulation (baseline)...');
    const resBaseline = await client.post('/', {
      locationId,
      targetYear: testYear,
    });
    
    assert.strictEqual(resBaseline.status, 201);
    assert.ok(resBaseline.data.data.reportId);
    assert.strictEqual(resBaseline.data.data.status, 'READY');
    assert.ok(resBaseline.data.data.downloadUrl);
    
    const reportIdBaseline = resBaseline.data.data.reportId;
    reportsCreated.push(reportIdBaseline);
    
    // Verify file exists on disk
    const pdfPathBaseline = path.resolve('reports', `${reportIdBaseline}.pdf`);
    assert.ok(fs.existsSync(pdfPathBaseline), 'Baseline report PDF was not written to disk.');
    console.log('[Test 2] PASSED.');

    // 3. Test Report Generation WITH Simulation
    console.log('[Test 3] Running simulation first...');
    const simResult = await SimulationService.runSimulation(locationId, testYear, ['plant-trees']);
    assert.ok(simResult.simulationId);
    console.log(`- Simulation ID: ${simResult.simulationId}`);

    console.log('Generating report with simulation...');
    const resSim = await client.post('/', {
      locationId,
      simulationId: simResult.simulationId,
      targetYear: testYear,
    });

    assert.strictEqual(resSim.status, 201);
    assert.ok(resSim.data.data.reportId);
    assert.strictEqual(resSim.data.data.status, 'READY');
    
    const reportIdSim = resSim.data.data.reportId;
    reportsCreated.push(reportIdSim);
    
    // Verify file exists on disk
    const pdfPathSim = path.resolve('reports', `${reportIdSim}.pdf`);
    assert.ok(fs.existsSync(pdfPathSim), 'Simulation report PDF was not written to disk.');
    console.log('[Test 3] PASSED.');

    // 4. Test Listing Reports
    console.log('[Test 4] Querying report list...');
    const resList = await client.get('/');
    assert.strictEqual(resList.status, 200);
    assert.ok(Array.isArray(resList.data.data));
    
    const ids = resList.data.data.map((r: any) => r.id);
    assert.ok(ids.includes(reportIdBaseline), 'Baseline report was missing from list.');
    assert.ok(ids.includes(reportIdSim), 'Simulation report was missing from list.');
    console.log('[Test 4] PASSED.');

    // 5. Test Download Stream
    console.log('[Test 5] Downloading PDF file...');
    const resDownload = await client.get(`/${reportIdSim}/download`, {
      responseType: 'arraybuffer',
    });
    
    assert.strictEqual(resDownload.status, 200);
    assert.strictEqual(resDownload.headers['content-type'], 'application/pdf');
    assert.ok(resDownload.data.length > 0, 'Downloaded PDF stream was empty.');
    console.log('[Test 5] PASSED.');

    console.log('\n[Test Suite] ALL TESTS PASSED SUCCESSFULLY.');
  } catch (error: any) {
    console.error('\n[Test Suite] TEST RUN FAILED WITH ERROR:', error.message || error);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exitCode = 1;
  } finally {
    // Cleanup generated PDF files from disk
    console.log('Cleaning up generated test PDF files...');
    for (const reportId of reportsCreated) {
      const pdfPath = path.resolve('reports', `${reportId}.pdf`);
      if (fs.existsSync(pdfPath)) {
        try {
          fs.unlinkSync(pdfPath);
        } catch (e) {}
      }
      // Remove DB records
      try {
        await supabase.from('reports').delete().eq('id', reportId);
      } catch (e) {}
    }

    server.close();
    console.log('Test server closed.');
  }
}

runTests();
