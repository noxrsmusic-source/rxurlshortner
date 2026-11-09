import { db, FieldValue } from '../config/firebase.js';
import { HttpError } from '../middleware/errorHandler.js';

export async function markPaid({ requestId, adminUid, transactionReference }) {
  const reqRef = db.collection('withdrawalRequests').doc(requestId);

  return db.runTransaction(async (tx) => {
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists) throw new HttpError(404, 'Withdrawal not found');
    const req = reqSnap.data();

    // Idempotency: already paid → no-op
    if (req.status === 'paid') return { ok: true, alreadyPaid: true };
    if (!['pending', 'approved', 'processing'].includes(req.status)) {
      throw new HttpError(400, `Cannot pay a withdrawal in status "${req.status}"`);
    }

    const userRef = db.collection('users').doc(req.ownerUid);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpError(404, 'User not found');
    if ((userSnap.data().availableBalanceMicro || 0) < req.amountMicro) {
      throw new HttpError(400, 'Insufficient available balance');
    }

    tx.update(userRef, {
      withdrawnMicro: FieldValue.increment(req.amountMicro),
     updatedAt: FieldValue.serverTimestamp()
    });
    tx.update(reqRef, {
      status: 'paid',
      transactionReference: transactionReference || null,
      processedAt: FieldValue.serverTimestamp(),
      processedBy: adminUid
    });

    const txDoc = db.collection('transactions').doc();
    tx.set(txDoc, {
      transactionId: txDoc.id,
      ownerUid: req.ownerUid,
      type: 'withdrawal_paid',
      amountMicro: -req.amountMicro,
      currency: req.currency,
      referenceId: requestId,
      adminUid,
      createdAt: FieldValue.serverTimestamp()
    });

    return { ok: true };
  });
}