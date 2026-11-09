import { test } from 'node:test';
import assert from 'node:assert/strict';
import './setup.js';
import { db, FieldValue } from '../config/firebase.js';
import { clearFirestore, clearAuth, createTestUser, createTestLink, seedSettings } from './helpers.js';

test('Links: flow can change without changing shortCode', async () => {
  await clearFirestore(); await clearAuth(); await seedSettings();
  const user = await createTestUser();
  const link = await createTestLink(user.uid, { flowPageCount: 1 });
  const before = link.shortCode;

  await db.runTransaction(async (tx) => {
    const ref = db.collection('shortLinks').doc(link.linkId);
    tx.update(ref, { flowPageCount: 4, flowVersion: FieldValue.increment(1), updatedAt: new Date() });
  });

  const after = (await db.collection('shortLinks').doc(link.linkId).get()).data();
  assert.equal(after.flowPageCount, 4);
  assert.equal(after.flowVersion, 2);
  assert.equal(after.shortCode, before);
});

test('Links: paused links cannot start journeys', async () => {
  await clearFirestore(); await clearAuth(); await seedSettings();
  const user = await createTestUser();
  await createTestLink(user.uid, { status: 'paused', shortCode: 'paused1' });
  const { startJourney } = await import('../services/journey.service.js');
  await assert.rejects(
    () => startJourney({ shortCode: 'paused1', req: { ip: '1.1.1.1', headers: {} } }),
    /not active/
  );
});