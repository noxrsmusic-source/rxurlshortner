import { test } from 'node:test';
import assert from 'node:assert/strict';
import './setup.js';
import { auth, db } from '../config/firebase.js';
import { clearFirestore, clearAuth, createTestUser } from './helpers.js';

test('Auth: profile initialization is idempotent', async () => {
  await clearFirestore(); await clearAuth();
  const user = await createTestUser();
  const snap = await db.collection('users').doc(user.uid).get();
  assert.equal(snap.exists, true);
  assert.equal(snap.data().role, 'user');
  assert.equal(snap.data().accountStatus, 'active');
  assert.ok(snap.data().referralCode);
});

test('Auth: admin custom claims can be set', async () => {
  await clearFirestore(); await clearAuth();
  const admin = await createTestUser({ admin: true });
  const tok = await auth.createCustomToken(admin.uid);
  const rec = await auth.getUser(admin.uid);
  assert.equal(rec.customClaims.admin, true);
});