import { Router } from 'express';
import locationsRouter from './locations.js';
import weatherRouter from './weather.js';
import climateRouter from './climate.js';
import predictionsRouter from './predictions.js';
import riskRouter from './risk.js';
import simulationRouter from './simulation.js';
import advisorRouter from './advisor.js';
import reportsRouter from './reports.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

router.use('/locations', locationsRouter);
router.use('/weather', weatherRouter);
router.use('/climate', climateRouter);
router.use('/predictions', predictionsRouter);
router.use('/risk', riskRouter);
router.use('/simulations', simulationRouter);
router.use('/ai', advisorRouter);
router.use('/reports', reportsRouter);

export default router;

