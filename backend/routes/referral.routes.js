import { Router } from 'express';
import { db } from '../config/firebase.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/summary', async (req, res, next) => {
  try {
    const user = req.auth.user;
    const snap = await db.collection('users').where('referredBy', '==', req.auth.uid).get();
    res.json({
      referralCode: user.referralCode,
      referralLink: `${process.env.PUBLIC_BASE_URL || ''}/?ref=${user.referralCode}`,
      totalReferrals: snap.size
    });
  } catch (err) { next(err); }
});

router.get('/history', async (req, res, next) => {
  try {
    const snap = await db.collection('referrals')
      .where('referrerUid', '==', req.auth.uid)
      .orderBy('createdAt', 'desc').limit(100).get();
    res.json({ referrals: snap.docs.map(d => d.data()) });
  } catch (err) { next(err); }
});

export default router;