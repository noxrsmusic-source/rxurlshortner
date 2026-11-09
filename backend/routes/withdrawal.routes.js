import { Router } from 'express';
import { z } from 'zod';
import { db, FieldValue } from '../config/firebase.js';
import { authenticate } from '../middleware/authenticate.js';
import { checkAccountStatus } from '../middleware/checkAccountStatus.js';
import { HttpError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, checkAccountStatus);

router.get('/', async (req, res, next) => {
  try {
    const snap = await db.collection('withdrawalRequests')
      .where('ownerUid', '==', req.auth.uid)
      .orderBy('requestedAt', 'desc').limit(100).get();
    res.json({ withdrawals: snap.docs.map(d => d.data()) });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = z.object({
      amountMicro: z.number().int().positive(),
      paymentMethod: z.enum(['upi', 'paypal', 'usdt', 'bank']),
      paymentDetails: z.string().min(3).max(200)
    }).parse(req.body);

    const settings = (await db.collection('settings').doc('global').get()).data() || {};
    const minMicro = settings.minWithdrawalMicro ?? 5_000_000;
    if (data.amountMicro < minMicro) throw new HttpError(400, `Minimum withdrawal is ${minMicro / 1_000_000} USD`);

    const user = req.auth.user;
    if ((user.availableBalanceMicro || 0) < data.amountMicro) {
      throw new HttpError(400, 'Insufficient available balance');
    }

    const ref = db.collection('withdrawalRequests').doc();
    await db.runTransaction(async (tx) => {
      // Re-read user inside tx for atomicity
      const userRef = db.collection('users').doc(req.auth.uid);
      const uSnap = await tx.get(userRef);
      if ((uSnap.data().availableBalanceMicro || 0) < data.amountMicro) {
        throw new HttpError(400, 'Insufficient available balance');
      }
      tx.update(userRef, {
        availableBalanceMicro: FieldValue.increment(-data.amountMicro),
        updatedAt: FieldValue.serverTimestamp()
      });
      tx.set(ref, {
        requestId: ref.id, ownerUid: req.auth.uid,
        amountMicro: data.amountMicro, currency: settings.currency || 'USD',
        paymentMethod: data.paymentMethod,
        paymentDetails: data.paymentDetails, // note: consider encrypting / tokenizing at scale
        status: 'pending',
        requestedAt: FieldValue.serverTimestamp()
      });
      const txDoc = db.collection('transactions').doc();
      tx.set(txDoc, {
        transactionId: txDoc.id, ownerUid: req.auth.uid,
        type: 'withdrawal_reserved',
        amountMicro: -data.amountMicro,
        referenceId: ref.id,
        createdAt: FieldValue.serverTimestamp()
      });
    });
    res.json({ ok: true, requestId: ref.id });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', err.errors));
    next(err);
  }
});

export default router;