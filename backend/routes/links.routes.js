import { Router } from 'express';
import { z } from 'zod';
import { db, FieldValue } from '../config/firebase.js';
import { authenticate } from '../middleware/authenticate.js';
import { checkAccountStatus } from '../middleware/checkAccountStatus.js';
import { HttpError } from '../middleware/errorHandler.js';
import { generateShortCode } from '../utils/ids.js';
import { destinationUrlSchema, flowPageCountSchema } from '../utils/validation.js';

const router = Router();
router.use(authenticate, checkAccountStatus);

const createSchema = z.object({
  destinationUrl: destinationUrlSchema,
  title: z.string().max(200).optional().default(''),
  flowPageCount: flowPageCountSchema,
  customAlias: z.string().regex(/^[a-zA-Z0-9_-]{3,24}$/).optional()
});

router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const settings = (await db.collection('settings').doc('global').get()).data() || {};
    const enabled = settings.enabledFlows || { 1: true, 2: true, 3: true, 4: true };
    if (!enabled[data.flowPageCount]) throw new HttpError(400, `Flow ${data.flowPageCount} is disabled`);

    let shortCode = data.customAlias;
    if (shortCode) {
      const dup = await db.collection('shortLinks').where('shortCode', '==', shortCode).limit(1).get();
      if (!dup.empty) throw new HttpError(409, 'Custom alias already taken');
    } else {
      for (let i = 0; i < 5; i++) {
        const candidate = generateShortCode(7);
        const dup = await db.collection('shortLinks').where('shortCode', '==', candidate).limit(1).get();
        if (dup.empty) { shortCode = candidate; break; }
      }
      if (!shortCode) throw new HttpError(500, 'Could not allocate short code');
    }

    const ref = db.collection('shortLinks').doc();
    const link = {
      linkId: ref.id, ownerUid: req.auth.uid, shortCode,
      destinationUrl: data.destinationUrl, title: data.title,
      flowPageCount: data.flowPageCount, flowVersion: 1,
      status: 'active', totalValidClicks: 0, totalPendingEarningsMicro: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    await ref.set(link);
    res.json({ link: { ...link, createdAt: new Date(), updatedAt: new Date() } });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', err.errors));
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const snap = await db.collection('shortLinks')
      .where('ownerUid', '==', req.auth.uid)
      .orderBy('createdAt', 'desc')
      .limit(limit).get();
    res.json({ links: snap.docs.map(d => d.data()) });
  } catch (err) { next(err); }
});

router.patch('/:linkId/flow', async (req, res, next) => {
  try {
    const { flowPageCount } = z.object({ flowPageCount: flowPageCountSchema }).parse(req.body);
    const settings = (await db.collection('settings').doc('global').get()).data() || {};
    const enabled = settings.enabledFlows || { 1: true, 2: true, 3: true, 4: true };
    if (!enabled[flowPageCount]) throw new HttpError(400, `Flow ${flowPageCount} is disabled`);

    const ref = db.collection('shortLinks').doc(req.params.linkId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError(404, 'Link not found');
      if (snap.data().ownerUid !== req.auth.uid) throw new HttpError(403, 'Forbidden');
      tx.update(ref, {
        flowPageCount,
        flowVersion: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', err.errors));
    next(err);
  }
});

router.patch('/:linkId/status', async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['active', 'paused']) }).parse(req.body);
    const ref = db.collection('shortLinks').doc(req.params.linkId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError(404, 'Link not found');
      if (snap.data().ownerUid !== req.auth.uid) throw new HttpError(403, 'Forbidden');
      tx.update(ref, { status, updatedAt: FieldValue.serverTimestamp() });
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', err.errors));
    next(err);
  }
});

router.delete('/:linkId', async (req, res, next) => {
  try {
    const ref = db.collection('shortLinks').doc(req.params.linkId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError(404, 'Link not found');
      if (snap.data().ownerUid !== req.auth.uid) throw new HttpError(403, 'Forbidden');
      tx.update(ref, { status: 'deleted', updatedAt: FieldValue.serverTimestamp() });
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;