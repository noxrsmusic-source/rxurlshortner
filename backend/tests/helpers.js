import './setup.js';
import { auth, db } from '../config/firebase.js';

export async function clearFirestore() {
  const collections = ['users','shortLinks','journeys','clickRecords','visitorCooldowns','earnings','transactions','withdrawalRequests','referrals','settings','adPlacements','adminLogs'];
  for (const c of collections) {
    const snap = await db.collection(c).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function clearAuth() {
  const list = await auth.listUsers();
  await Promise.all(list.users.map(u => auth.deleteUser(u.uid)));
}

export async function createTestUser({ email, admin = false } = {}) {
  const u = await auth.createUser({ email: email || `t${Date.now()}${Math.random()}@test.com`, password: 'test123456' });
  if (admin) await auth.setCustomUserClaims(u.uid, { admin: true });
  await db.collection('users').doc(u.uid).set({
    uid: u.uid, name: 'Test User', email: u.email, role: admin ? 'admin' : 'user',
    accountStatus: 'active', emailVerified: true, referralCode: 'TEST' + u.uid.slice(0, 4),
    referredBy: null, pendingBalanceMicro: 0, availableBalanceMicro: 0, withdrawnMicro: 0,
    createdAt: new Date(), updatedAt: new Date()
  });
  return u;
}

export async function seedSettings(overrides = {}) {
  const defaults = {
    flowRates: { 1: 1_500_000, 2: 2_500_000, 3: 3_500_000, 4: 5_000_000 },
    defaultRateMicro: 1_000_000,
    countryRates: {
      us: { default: 5_000_000 }, in: { default: 2_000_000 }
    },
    publisherSharePercent: 99, referralPercent: 10, minWithdrawalMicro: 5_000_000,
    currency: 'USD', enabledFlows: { 1: true, 2: true, 3: true, 4: true },
    cooldownHours: 6, journeyTtlMinutes: 15
  };
  await db.collection('settings').doc('global').set({ ...defaults, ...overrides });
}

export async function createTestLink(ownerUid, overrides = {}) {
  const ref = db.collection('shortLinks').doc();
  await ref.set({
    linkId: ref.id, ownerUid, shortCode: 'test' + Math.random().toString(36).slice(2, 8),
    destinationUrl: 'https://example.com/dest', title: 'Test', flowPageCount: 1, flowVersion: 1,
    status: 'active', totalValidClicks: 0, totalPendingEarningsMicro: 0,
    createdAt: new Date(), updatedAt: new Date(), ...overrides
  });
  const doc = await ref.get();
  return doc.data();
}