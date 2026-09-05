import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { LocationService } from '../services/locationService.js';
import { ClimateService } from '../services/climateService.js';
import { PredictionService } from '../services/predictionService.js';
import { RiskService } from '../services/riskService.js';
import { SimulationService } from '../services/simulationService.js';
import { AdvisorService } from '../services/advisorService.js';
import { PDFService, PDFReportData } from '../services/pdfService.js';
import { requireAuth } from '../middleware/auth.js';
import { DatabaseSavedReport } from '../types/database.js';
import path from 'path';
import fs from 'fs';

const router = Router();
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// In-memory fallback cache for development/test environments when DB table is pending migration
const memorySavedReports = new Map<string, DatabaseSavedReport>();

/**
 * POST /api/v1/reports
 * Creates a climate report and compiles it as a downloadable PDF.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const { locationId, simulationId, targetYear, clientState } = req.body;

  try {
    // 1. Validation
    if (!locationId || typeof locationId !== 'string') {
      const err: any = new Error('Valid locationId is required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const resolvedYear = targetYear ? Number(targetYear) : 2035;
    if (isNaN(resolvedYear) || resolvedYear < 2000 || resolvedYear > 2100) {
      const err: any = new Error('Valid targetYear parameter is required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // 2. Resolve location with clientState fallback
    let location: any = null;
    try {
      location = await LocationService.getLocationById(locationId);
    } catch (e: any) {
      if (clientState && clientState.locationName) {
        location = {
          id: locationId,
          name: clientState.locationName,
          country: clientState.country || 'Unknown',
          latitude: clientState.latitude ?? 0,
          longitude: clientState.longitude ?? 0,
        };
      } else {
        throw e;
      }
    }

    if (!location) {
      if (clientState && clientState.locationName) {
        location = {
          id: locationId,
          name: clientState.locationName,
          country: clientState.country || 'Unknown',
          latitude: clientState.latitude ?? 0,
          longitude: clientState.longitude ?? 0,
        };
      } else {
        const err: any = new Error('Location not found.');
        err.statusCode = 404;
        err.code = 'LOCATION_NOT_FOUND';
        throw err;
      }
    }

    // 3. Resolve simulation run ID and scenario ID
    let finalSimulationRunId = simulationId;
    let finalScenarioId: string | null = null;
    let activeInterventions: string[] = [];

    if (finalSimulationRunId) {
      try {
        const { data: run } = await supabase
          .from('simulation_runs')
          .select('*')
          .eq('id', finalSimulationRunId)
          .maybeSingle();

        if (run) {
          finalScenarioId = run.scenario_id;
          activeInterventions = run.input_snapshot?.interventions || [];
        } else {
          finalSimulationRunId = undefined; // fallback if invalid simulationId
        }
      } catch (e) {
        finalSimulationRunId = undefined;
      }
    }

    // If no simulation was run or query failed, generate a baseline run automatically
    if (!finalSimulationRunId) {
      try {
        console.log(`[Reports API] Running baseline simulation for location ${locationId} in year ${resolvedYear}...`);
        const baselineSim = await SimulationService.runSimulation(locationId, resolvedYear, []);
        finalSimulationRunId = baselineSim.simulationId;

        const { data: run } = await supabase
          .from('simulation_runs')
          .select('*')
          .eq('id', finalSimulationRunId)
          .single();
        finalScenarioId = run?.scenario_id || null;
      } catch (simErr: any) {
        console.warn('[Reports API] Baseline simulation creation failed, using fallback scenario ID:', simErr.message);
        finalScenarioId = '00000000-0000-0000-0000-000000000000';
        finalSimulationRunId = crypto.randomUUID();
      }
    }

    // 4. Gather Climate Profile & Risks with clientState Fallbacks
    let currentClimate = null;
    try {
      const climate = await ClimateService.getCurrentClimate(location.latitude, location.longitude);
      currentClimate = {
        temperature: climate.temperature ?? null,
        humidity: climate.humidity ?? null,
        windSpeed: climate.windSpeed ?? climate.wind?.speed ?? null,
        description: climate.description ?? null,
        aqi: climate.aqi ?? null,
      };
    } catch (e: any) {
      console.warn('[Reports API] Current climate fetch failed:', e.message);
    }

    if (!currentClimate || (currentClimate.temperature === null && clientState?.currentTemperature !== undefined)) {
      currentClimate = {
        temperature: currentClimate?.temperature ?? clientState?.currentTemperature ?? null,
        humidity: currentClimate?.humidity ?? clientState?.currentHumidity ?? null,
        windSpeed: currentClimate?.windSpeed ?? clientState?.currentWindSpeed ?? null,
        description: currentClimate?.description ?? clientState?.currentDescription ?? null,
        aqi: currentClimate?.aqi ?? clientState?.currentAqi ?? null,
      };
    }

    let projections = null;
    try {
      const proj = await PredictionService.getProjectionForYear(locationId, resolvedYear);
      if (proj) {
        projections = {
          temperature: proj.temperature ?? null,
          precipitation: proj.precipitation ?? null,
          confidence: proj.confidence ?? null,
        };
      }
    } catch (e: any) {
      console.warn('[Reports API] Projections fetch failed:', e.message);
    }

    if (!projections || (projections.temperature === null && clientState?.projectedTemperature !== undefined)) {
      projections = {
        temperature: projections?.temperature ?? clientState?.projectedTemperature ?? null,
        precipitation: projections?.precipitation ?? clientState?.projectedPrecipitation ?? null,
        confidence: null,
      };
    }

    let risks: {
      heatScore: number | null;
      heatLevel: string;
      floodScore: number | null;
      floodLevel: string;
    } = { heatScore: null, heatLevel: 'UNAVAILABLE', floodScore: null, floodLevel: 'UNAVAILABLE' };
    
    try {
      const heatRisk = await RiskService.getRisk(locationId, 'temperature', resolvedYear);
      risks.heatScore = heatRisk.score;
      risks.heatLevel = heatRisk.level;
    } catch (e: any) {
      console.warn('[Reports API] Heat risk fetch failed:', e.message);
    }

    try {
      const floodRisk = await RiskService.getRisk(locationId, 'flood', resolvedYear);
      risks.floodScore = floodRisk.score;
      risks.floodLevel = floodRisk.level;
    } catch (e: any) {
      console.warn('[Reports API] Flood risk fetch failed:', e.message);
    }

    if (risks.heatLevel === 'UNAVAILABLE' && clientState?.heatRiskLevel) {
      risks.heatLevel = clientState.heatRiskLevel;
    }
    if (risks.floodLevel === 'UNAVAILABLE' && clientState?.floodRiskLevel) {
      risks.floodLevel = clientState.floodRiskLevel;
    }

    // 5. Gather simulation details & resilience score with fallbacks
    let beforeResilience = 0;
    let afterResilience = 0;
    let beforeTemp: number | null = null;
    let afterTemp: number | null = null;

    try {
      const { data: scores } = await supabase
        .from('sustainability_scores')
        .select('*')
        .eq('simulation_run_id', finalSimulationRunId);

      const beforeScore = scores?.find(s => s.score_type === 'BASELINE');
      const afterScore = scores?.find(s => s.score_type === 'SIMULATED');
      beforeResilience = beforeScore?.overall_score ?? 0;
      afterResilience = afterScore?.overall_score ?? beforeResilience;

      const { data: results } = await supabase
        .from('simulation_results')
        .select('*')
        .eq('simulation_run_id', finalSimulationRunId);
      
      const tempResult = results?.find(r => r.metric === 'temperature');
      beforeTemp = tempResult?.baseline_value ?? null;
      afterTemp = tempResult?.simulated_value ?? null;
    } catch (e: any) {
      console.warn('[Reports API] Simulation score fetch failed:', e.message);
    }

    if (beforeResilience === 0 && clientState?.sustainabilityScoreBefore !== undefined && clientState?.sustainabilityScoreBefore !== null) {
      beforeResilience = clientState.sustainabilityScoreBefore;
      afterResilience = clientState.sustainabilityScoreAfter ?? beforeResilience;
    }

    // 6. Call AI Advisor Service with fallback
    let aiAdvisor = null;
    try {
      const recommendations = await AdvisorService.generateRecommendations(locationId, resolvedYear, finalSimulationRunId);
      aiAdvisor = {
        summary: recommendations.summary,
        keyProblems: recommendations.keyProblems,
        recommendations: recommendations.recommendations,
      };
    } catch (e: any) {
      console.warn('[Reports API] AI recommendations generation failed, using structured fallback:', e.message);
    }

    if (!aiAdvisor) {
      aiAdvisor = {
        summary: `Climate resilience analysis and recommendations for ${location.name} in target year ${resolvedYear}.`,
        keyProblems: [
          `Observed and projected climate changes in ${location.name}.`,
          `Extreme heat and flood risk adaptation requirements for ${resolvedYear}.`,
        ],
        recommendations: [
          {
            title: 'Expand Urban Tree Canopy & Green Infrastructure',
            priority: 'HIGH' as const,
            reason: 'Reduces ambient temperatures and mitigates urban heat island risks.',
            targetRisks: ['HEAT', 'AIR_QUALITY'],
            expectedImpact: 'Lower surface temperatures and enhanced microclimate cooling.',
            nextStep: 'Prioritize native tree planting initiatives in high-density sectors.'
          },
          {
            title: 'Improve Sustainable Drainage Infrastructure',
            priority: 'MEDIUM' as const,
            reason: 'Enhances water retention capacity and mitigates localized flood vulnerability.',
            targetRisks: ['FLOOD', 'WATER'],
            expectedImpact: 'Increased storm runoff absorption and aquifer recharge.',
            nextStep: 'Deploy permeable pavements and urban rainwater retention basins.'
          }
        ]
      };
    }

    // Create unique ID for the report record
    const reportId = crypto.randomUUID();
    const reportsDir = path.resolve('reports');
    const pdfPath = path.join(reportsDir, `${reportId}.pdf`);

    const reportData: PDFReportData = {
      locationName: location.name,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      reportDate: new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
      targetYear: resolvedYear,
      currentClimate,
      projections,
      risks,
      simulation: {
        interventions: activeInterventions,
        beforeTemp,
        afterTemp,
        beforeFlood: risks.floodLevel,
        afterFlood: risks.floodLevel,
        beforeResilience,
        afterResilience,
        improvement: afterResilience - beforeResilience,
      },
      aiAdvisor,
    };

    // 7. Compile PDF
    await PDFService.generateReportPdf(reportData, pdfPath);

    // 8. Save report record in Database (catch error silently if offline)
    const downloadUrl = `/api/v1/reports/${reportId}/download`;
    try {
      await supabase
        .from('reports')
        .insert({
          id: reportId,
          user_id: SYSTEM_USER_ID,
          location_id: locationId,
          scenario_id: finalScenarioId,
          simulation_run_id: finalSimulationRunId,
          title: `Climate Action Report - ${location.name} (${resolvedYear})`,
          status: 'READY',
          file_url: downloadUrl,
          storage_key: `reports/${reportId}.pdf`,
          generated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
    } catch (dbErr: any) {
      console.warn('[Reports API] Supabase DB insert skipped in offline mode:', dbErr.message);
    }

    res.status(201).json({
      data: {
        reportId,
        status: 'READY',
        downloadUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/reports
 * Lists all generated reports.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*, locations(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// SAVED REPORTS (Authenticated User Scoped Endpoints)
// =========================================================================

/**
 * GET /api/v1/reports/saved
 * Retrieves all saved reports for the authenticated user.
 */
router.get('/saved', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.id;

  try {
    const { data, error } = await supabase
      .from('saved_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return res.json({ data });
    }
  } catch (err: any) {
    console.warn('[Reports API] DB saved_reports fetch error:', err.message);
  }

  // Fallback to in-memory store for dev/testing when DB table is pending
  const userReports = Array.from(memorySavedReports.values())
    .filter((r) => r.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({ data: userReports });
});

/**
 * POST /api/v1/reports/saved
 * Saves a climate report for the authenticated user.
 * Discards any user_id passed from the client and strictly enforces req.user.id.
 */
router.post('/saved', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.id;
  const { title, locationId, scenarioId, summary, fileUrl, metadata } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Report title is required and cannot be empty.',
      },
    });
  }

  const reportRecord: DatabaseSavedReport = {
    id: crypto.randomUUID(),
    user_id: userId,
    location_id: locationId || null,
    scenario_id: scenarioId || null,
    title: title.trim(),
    summary: summary || metadata?.aiSummary || null,
    status: 'READY',
    file_url: fileUrl || null,
    metadata: metadata || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('saved_reports')
      .insert(reportRecord)
      .select()
      .single();

    if (!error && data) {
      memorySavedReports.set(data.id, data as DatabaseSavedReport);
      return res.status(201).json({ data });
    }
  } catch (err: any) {
    console.warn('[Reports API] DB saved_reports insert skipped (fallback used):', err.message);
  }

  memorySavedReports.set(reportRecord.id, reportRecord);
  res.status(201).json({ data: reportRecord });
});

/**
 * GET /api/v1/reports/saved/:id
 * Retrieves a single saved report, strictly ensuring it belongs to the authenticated user.
 */
router.get('/saved/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.id;
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('saved_reports')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      return res.json({ data });
    }
  } catch (err: any) {
    console.warn('[Reports API] DB saved_reports single fetch error:', err.message);
  }

  const mem = memorySavedReports.get(id);
  if (mem && mem.user_id === userId) {
    return res.json({ data: mem });
  }

  res.status(404).json({
    error: {
      code: 'REPORT_NOT_FOUND',
      message: 'Report not found or you do not have permission to access it.',
    },
  });
});

/**
 * PATCH /api/v1/reports/saved/:id
 * Renames/updates a saved report, strictly ensuring it belongs to the authenticated user.
 */
router.patch('/saved/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { title } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A valid non-empty title is required for rename.',
      },
    });
  }

  const trimmedTitle = title.trim();
  let updatedRecord: DatabaseSavedReport | null = null;

  try {
    const { data, error } = await supabase
      .from('saved_reports')
      .update({ title: trimmedTitle, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (!error && data) {
      updatedRecord = data as DatabaseSavedReport;
      memorySavedReports.set(id, updatedRecord);
    }
  } catch (err: any) {
    console.warn('[Reports API] DB saved_reports rename error:', err.message);
  }

  if (!updatedRecord) {
    const mem = memorySavedReports.get(id);
    if (mem && mem.user_id === userId) {
      mem.title = trimmedTitle;
      mem.updated_at = new Date().toISOString();
      memorySavedReports.set(id, mem);
      updatedRecord = mem;
    }
  }

  if (!updatedRecord) {
    return res.status(404).json({
      error: {
        code: 'REPORT_NOT_FOUND',
        message: 'Report not found or you do not have permission to modify it.',
      },
    });
  }

  res.json({ data: updatedRecord });
});

/**
 * DELETE /api/v1/reports/saved/:id
 * Deletes a saved report, strictly ensuring it belongs to the authenticated user.
 */
router.delete('/saved/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.id;
  const { id } = req.params;
  let deleted = false;

  try {
    const { data, error } = await supabase
      .from('saved_reports')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (!error && data && data.length > 0) {
      deleted = true;
      memorySavedReports.delete(id);
    }
  } catch (err: any) {
    console.warn('[Reports API] DB saved_reports delete error:', err.message);
  }

  const mem = memorySavedReports.get(id);
  if (mem) {
    if (mem.user_id === userId) {
      memorySavedReports.delete(id);
      deleted = true;
    } else {
      return res.status(404).json({
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report not found or you do not have permission to delete it.',
        },
      });
    }
  }

  if (!deleted) {
    return res.status(404).json({
      error: {
        code: 'REPORT_NOT_FOUND',
        message: 'Report not found or you do not have permission to delete it.',
      },
    });
  }

  res.json({ success: true, message: 'Report deleted successfully.' });
});

/**
 * GET /api/v1/reports/:id
 * Fetches status of a specific report.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*, locations(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      const err: any = new Error('Report not found.');
      err.statusCode = 404;
      err.code = 'REPORT_NOT_FOUND';
      throw err;
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/reports/:id/download
 * Streams the generated PDF back to the client.
 */
router.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const filePath = path.resolve('reports', `${id}.pdf`);
    if (!fs.existsSync(filePath)) {
      const err: any = new Error('Report PDF file was not found on server.');
      err.statusCode = 404;
      err.code = 'REPORT_NOT_FOUND';
      throw err;
    }

    let locationName = 'Location';
    try {
      const { data: report } = await supabase
        .from('reports')
        .select('*, locations(name)')
        .eq('id', id)
        .maybeSingle();
      if (report && (report.locations as any)?.name) {
        locationName = (report.locations as any).name;
      }
    } catch (e) {}

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Climate_Report_${locationName.replace(/\s+/g, '_')}.pdf"`);

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

export default router;
