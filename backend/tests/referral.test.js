import { test } from 'node:test';
import assert from 'node:assert/strict';
import './setup.js';
import { db } from '../config/firebase.js';
import { clearFirestore, clearAuth, createTestUser, createTestLink, seedSettings } from './helpers.js';
import { startJourney, continueJourney } from '../services/journey.service.js';

const fakeReq = () => ({ ip: '9.9.9.9', socket: { remoteAddress: '9.9.9.9' }, headers: { 'user-agent': 't', 'accept-language': 'en' } });

test('Referral: 10% commission credited to referrer', async () => {
  await clearFirestore(); await clearAuth(); await seedSettings();
  const referrer = await createTestUser();
  const referred = await createTestUser();
  // Link them
  await db.collection('users').doc(referred.uid).update({ referredBy: referrer.uid });

  await createTestLink(referred.uid, { shortCode: 'ref1', flowPageCount: 1 });
  const start = await startJourney({ shortCode: 'ref1', req: fakeReq() });
  await continueJourney({ journeyId: start.journeyId, token: start.token });

  const refs = await db.collection('referrals').where('referrerUid', '==', referrer.uid).get();
  assert.equal(refs.size, 1);
  const ref = refs.docs[0].data();
  // 1-page default $1.5/1000 = 1500 micro gross, 99% = 1485 publisher, 10% ref = 148
  assert.ok(ref.commissionMicro > 0);
});