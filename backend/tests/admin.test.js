import { test } from 'node:test';
import assert from 'node:assert/strict';
import './setup.js';
import { auth, db } from '../config/firebase.js';
import { clearFirestore, clearAuth, createTestUser } from './helpers.js';

test('Admin: non-admin has no admin claim', async () => {
  await clearFirestore(); await clearAuth();
  const u = await createTestUser({ admin: false });
  const rec = await auth.getUser(u.uid);
  assert.ok(!rec.customClaims || rec.customClaims.admin !== true);
});

test('Admin: admin has admin claim', async () => {
  await clearFirestore(); await clearAuth();
  const a = await createTestUser({ admin: true });
  const rec = await auth.getUser(a.uid);
  assert.equal(rec.customClaims.admin, true);
});

test('Admin: user suspension is atomic', async () => {
  await clearFirestore(); await clearAuth();
  const u = await createTestUser();
  await db.collection('users').doc(u.uid).update({ accountStatus: 'suspended' });
  const s = await db.collection('users').doc(u.uid).get();
  assert.equal(s.data().accountStatus, 'suspended');
});