import { Router, Request, Response, NextFunction } from 'express';
import { LocationService } from '../services/locationService.js';

const router = Router();

/**
 * GET /api/v1/locations/search?q={query}&limit={limit}
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  const { q, limit } = req.query;

  try {
    if (!q || typeof q !== 'string') {
      const err: any = new Error('Query parameter "q" is required and must be a string.');
      err.statusCode = 400;
      err.code = 'INVALID_QUERY';
      throw err;
    }

    const parsedLimit = limit ? parseInt(limit as string, 10) : 5;
    const finalLimit = isNaN(parsedLimit) ? 5 : Math.min(Math.max(parsedLimit, 1), 20);

    const data = await LocationService.searchLocations(q, finalLimit);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/locations/reverse?lat={lat}&lng={lng}
 */
router.get('/reverse', async (req: Request, res: Response, next: NextFunction) => {
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

    const data = await LocationService.reverseGeocode(parsedLat, parsedLng);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/locations
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const { name, city, region, country, countryCode, latitude, longitude, timezone } = req.body;

  try {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      const err: any = new Error('Field "name" is required and must be a non-empty string.');
      err.statusCode = 400;
      err.code = 'VALIDATION_FAILED';
      throw err;
    }

    if (!country || typeof country !== 'string' || country.trim() === '') {
      const err: any = new Error('Field "country" is required and must be a non-empty string.');
      err.statusCode = 400;
      err.code = 'VALIDATION_FAILED';
      throw err;
    }

    if (latitude === undefined || longitude === undefined) {
      const err: any = new Error('Fields "latitude" and "longitude" are required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_FAILED';
      throw err;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      const err: any = new Error('Latitude must be between -90 and 90. Longitude must be between -180 and 180.');
      err.statusCode = 400;
      err.code = 'VALIDATION_FAILED';
      throw err;
    }

    const data = await LocationService.getOrCreateLocation({
      name: name.trim(),
      city: city ? city.trim() : name.trim(),
      region: region ? region.trim() : undefined,
      country: country.trim(),
      countryCode: countryCode ? countryCode.trim() : '',
      latitude: lat,
      longitude: lng,
      timezone: timezone ? timezone.trim() : undefined,
    });

    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/locations/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const data = await LocationService.getLocationById(id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export default router;
