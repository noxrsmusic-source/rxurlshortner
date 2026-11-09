import { test } from 'node:test';
import assert from 'node:assert/strict';
import './setup.js';
import { db } from '../config/firebase.js';
import { clearFirestore, clearAuth, createTestUser, createTestLink, seedSettings } from './helpers.js';
import { startJourney, continueJourney } from '../services/journey.service.js';

const fakeReq = (ip = '1.1.1.1') => ({ ip, socket: { remoteAddress: ip }, headers: { 'user-agent': 'test', 'accept-language': 'en' } });

async function completeFlow(userUid, shortCode, pages, req = fakeReq()) {
  await createTestLink(userUid, { shortCode, flowPageCount: pages });
  const start = await startJourney({ shortCode, req });
  let { journeyId, token, totalSteps } = start;
  let lastResult = null;
  for (let i = 0; i < totalSteps; i++) {
    lastResult = await continueJourney({ journeyId, token });
    if (!lastResult.done) token = lastResult.token;
  }
  return lastResult;
}

test('Journey: 1-page flow completes', async () => {
  await clearFirestore(); await clearAuth(); await seedSettings();
  const u = await createTestUser();
  const r = await completeFlow(u.uid, 'one1', 1);
  assert.equal(r.done, true);
  assert.equal(r.duplicate, false);
});

test('Journey: 2-page flow completes', async () => {
  await clearFirestore(); await clearAuth(); await seedSettings();
  const u = await createTestUser();
  const r = await completeFlow(u.uid, 'two2', 2);
  assert.equal(r.done, true);
});

test('Journey: 3-page flow completes', async () => {
  await clearFirestore(); await clearAuth(); await seedSettings();
  const u = await createTestUser();
  const r = await completeFlow(u.uid, 'three3', 3);
  assert.equal(r.done, true);
});

test('Journey: 4-page flow completes', async () => {
  await clearFirestore(); await clearAuth(); await seedSettings();
  const u = await createTestUser();
  const r = await completeFlow(u.uid, 'four4', 4);
  assert.equal(r.done, true);
});

test('Journey: skipping pages throws (invalid token rotation)', async () => {
  await clearFirestore(); await clearAuth(); await seedSettings();
  const u = await createTestUser();
  await createTestLink(u.uid, { shortCode: 'skip1', flowPageCount: 3 });
  const start = await startJourney({ shortCode: 'skip1', req: fakeReq() });
  // Try to continue twice with the same (original) token — should fail on the 2nd
  await continueJourney({ journeyId: start.journeyId, token: start.token });
  await assert.rejects(
    () => continueJourney({ journeyId: start.journeyId, token: start.token }),
    /Invalid journey token/
  );
});

test('Journey: 6h cooldown blocks duplicate valid click', async () => {
  await clearFirestore(); await clearAuth(); await seedSettings();
  const u = await createTestUser();
  const r1 = await completeFlow(u.uid, 'dup', 1);
  assert.equal(r1.duplicate, false);
  // Second visit by same visitor fingerprint (same IP/UA) within cooldown window
  const r2 = await completeFlow(u.uid, 'dup', 1);
  assert.equal(r2.duplicate, true);
  // Only 1 valid clickRecord, 1 duplicate
  const clicks = await db.collection('clickRecords').get();
  const valid = clicks.docs.filter(d => d.data().validationStatus === 'valid');
  const dup = clicks.docs.filter(d => d.data().validationStatus === 'duplicate');
  assert.equal(valid.length, 1);
  assert.equal(dup.length, 1);
});

test('Journey: expired journey cannot be continued', async () => {
  await clearFirestore(); await clearAuth(); await seedSettings();
  const u = await createTestUser();
  await createTestLink(u.uid, { shortCode: 'exp', flowPageCount: 2 });
  const start = await startJourney({ shortCode: 'exp', req: fakeReq() });
  // Force-expire the journey
  await db.collection('journeys').doc(start.journeyId).update({ expiresAt: new Date(Date.now() - 1000) });
  await assert.rejects(
    () => continueJourney({ journeyId: start.journeyId, token: start.token }),
    /expired/
  );
});

test('Journey: disabled flow rejects new journeys', async () => {
  await clearFirestore(); await clearAuth();
  await seedSettings({ enabledFlows: { 1: true, 2: true, 3: true, 4: false } });
  const u = await createTestUser();
  await createTestLink(u.uid, { shortCode: 'dis', flowPageCount: 4 });
  await assert.rejects(
    () => startJourney({ shortCode: 'dis', req: fakeReq() }),
    /temporarily disabled/
  );
});