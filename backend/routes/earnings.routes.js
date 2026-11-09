import { Router } from 'express';
import { db } from '../config/firebase.js';
import { authenticate } from '../middleware/authenticate.js';
import { HttpError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate);

router.get('/summary', async (req, res, next) => {
  try {
    const user = req.auth.user;
    res.json({
      pendingBalanceMicro: user.pendingBalanceMicro || 0,
      availableBalanceMicro: user.availableBalanceMicro || 0,
      withdrawnMicro: user.withdrawnMicro || 0,
      currency: 'USD'
    });
  } catch (err) { next(err); }
});

router.get('/history', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const snap = await db.collection('earnings')
      .where('ownerUid', '==', req.auth.uid)
      .orderBy('createdAt', 'desc').limit(limit).get();
    res.json({ earnings: snap.docs.map(d => d.data()) });
  } catch (err) { next(err); }
});

export default router;