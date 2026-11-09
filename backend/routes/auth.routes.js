import { Router } from 'express';
import { db, FieldValue } from '../config/firebase.js';
import { authenticate } from '../middleware/authenticate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { generateShortCode } from '../utils/ids.js';

const router = Router();

router.post('/profile/init', authenticate, async (req, res, next) => {
  try {
    const uid = req.auth.uid;
    const userRef = db.collection('users').doc(uid);

    const referralCode = String(req.body?.referralCode || '').trim();
    let referredBy = null;

    // Read outside transaction to avoid mixing db and tx reads
    if (referralCode) {
      const rSnap = await db.collection('users').where('referralCode', '==', referralCode).limit(1).get();
      const candidateUid = rSnap.empty ? null : rSnap.docs[0].id;
      if (candidateUid && candidateUid !== uid) referredBy = candidateUid;
    }

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (snap.exists) return { created: false, user: snap.data() };

      const doc = {
        uid,
        name: req.auth.token.name || req.body?.name || '',
        email: req.auth.token.email || '',
        role: 'user',
        accountStatus: 'active',
        emailVerified: req.auth.token.email_verified || false,
        referralCode: generateShortCode(8).toUpperCase(),
        referredBy,
        pendingBalanceMicro: 0,
        availableBalanceMicro: 0,
        withdrawnMicro: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
      tx.set(userRef, doc);
      return { created: true, user: doc };
    });

    res.json(result);
  } catch (err) { next(err); }
});

router.get('/me', authenticate, (req, res, next) => {
  if (!req.auth.user) {
    return next(new HttpError(403, 'User profile not initialized — call /api/auth/profile/init'));
  }
  res.json({ user: req.auth.user });
});

export default router;