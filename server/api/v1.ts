import { Router } from 'express';
import locationsRouter from './locations.js';
import weatherRouter from './weather.js';
import climateRouter from './climate.js';
import predictionsRouter from './predictions.js';
import riskRouter from './risk.js';
import simulationRouter from './simulation.js';
import advisorRouter from './advisor.js';
import reportsRouter from './reports.js';
import solutionsRouter from './solutions.js';
import profileRouter from './profile.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'geotwin360-api',
    timestamp: new Date().toISOString(),
  });
});

router.use('/locations', locationsRouter);
router.use('/location', locationsRouter);
router.use('/weather', weatherRouter);
router.use('/climate', climateRouter);
router.use('/predictions', predictionsRouter);
router.use('/risk', riskRouter);
router.use('/simulations', simulationRouter);
router.use('/ai', advisorRouter);
router.use('/reports', reportsRouter);
router.use('/solutions', solutionsRouter);
router.use('/profile', profileRouter);

export default router;

