import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler.js';
import { startJourney, continueJourney, getJourneyStatus } from '../services/journey.service.js';

const router = Router();

router.post('/start', async (req, res, next) => {
  try {
    const { shortCode } = z.object({ shortCode: z.string().min(1).max(32) }).parse(req.body);
    res.json(await startJourney({ shortCode, req }));
  } catch (err) {
    if (err instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', err.errors));
    next(err);
  }
});

router.post('/continue', async (req, res, next) => {
  try {
    const { journeyId, token } = z.object({ journeyId: z.string(), token: z.string() }).parse(req.body);
    res.json(await continueJourney({ journeyId, token }));
  } catch (err) {
    if (err instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', err.errors));
    next(err);
  }
});

router.get('/:journeyId/status', async (req, res, next) => {
  try { res.json(await getJourneyStatus(req.params.journeyId)); }
  catch (err) { next(err); }
});

export default router;