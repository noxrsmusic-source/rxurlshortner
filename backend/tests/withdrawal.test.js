import { test } from 'node:test';
import assert from 'node:assert/strict';
import './setup.js';
import { db } from '../config/firebase.js';
import { clearFirestore, clearAuth, createTestUser, seedSettings } from './helpers.js';
import { markPaid } from '../services/withdrawal.service.js';

test('Withdrawal: markPaid is idempotent', async () => {
  await clearFirestore(); await clearAuth(); await seedSettings();
  const user = await createTestUser();
  // Give user $10
  await db.collection('users').doc(user.uid).update({ availableBalanceMicro: 10_000_000 });

  const reqRef = db.collection('withdrawalRequests').doc();
  await reqRef.set({
    requestId: reqRef.id, ownerUid: user.uid, amountMicro: 5_000_000, currency: 'USD',
    paymentMethod: 'paypal', paymentDetails: 'x@y.com', status: 'approved',
    requestedAt: new Date()
  });

  const r1 = await markPaid({ requestId: reqRef.id, adminUid: 'admin-1' });
  assert.equal(r1.ok, true);

  const r2 = await markPaid({ requestId: reqRef.id, adminUid: 'admin-1' });
  assert.equal(r2.alreadyPaid, true);

  const u = (await db.collection('users').doc(user.uid).get()).data();
  // Should only be deducted once (10 - 5 = 5)
  assert.equal(u.availableBalanceMicro, 5_000_000);
  assert.equal(u.withdrawnMicro, 5_000_000);
});

test('Withdrawal: insufficient balance rejected', async () => {
  await clearFirestore(); await clearAuth(); await seedSettings();
  const user = await createTestUser();
  // Balance = 0
  const reqRef = db.collection('withdrawalRequests').doc();
  await reqRef.set({
    requestId: reqRef.id, ownerUid: user.uid, amountMicro: 5_000_000, currency: 'USD',
    paymentMethod: 'paypal', paymentDetails: 'x@y.com', status: 'approved',
    requestedAt: new Date()
  });
  await assert.rejects(() => markPaid({ requestId: reqRef.id, adminUid: 'a' }), /Insufficient/);
});