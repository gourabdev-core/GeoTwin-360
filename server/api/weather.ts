import { Router, Request, Response, NextFunction } from 'express';
import { ClimateService } from '../services/climateService.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const { lat, lng } = req.query;

  try {
    if (!lat || !lng) {
      const err: any = new Error('Query parameters "lat" and "lng" are required.');
      err.statusCode = 400;
      err.code = 'INVALID_COORDINATES';
      throw err;
    }

    const parsedLat = parseFloat(lat as string);
    const parsedLng = parseFloat(lng as string);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      const err: any = new Error('Coordinates must be valid numbers.');
      err.statusCode = 400;
      err.code = 'INVALID_COORDINATES';
      throw err;
    }

    const data = await ClimateService.getCurrentClimate(parsedLat, parsedLng);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export default router;
