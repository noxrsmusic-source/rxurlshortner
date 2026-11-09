import { db, FieldValue } from '../backend/config/firebase.js';

const TIER_1 = ['us','gb','ca','au','de','no','se','ch','nl','dk','fi','be','at','nz'];
const TIER_2 = ['ae','sa','qa','kw','fr','it','es','pt','jp','kr','sg','hk','ie','il','pl','cz','gr'];
const TIER_3 = ['in','br','mx','id','ph','vn','pk','bd','eg','ng','za','ke','ma','tr','ar','co','cl','pe','th','my','lk','np'];

const micro = (dollars) => Math.round(dollars * 1_000_000);

const countryRates = {};
for (const c of TIER_1) countryRates[c] = { default: micro(5) };
for (const c of TIER_2) countryRates[c] = { default: micro(3) };
for (const c of TIER_3) countryRates[c] = { default: micro(2) };

const settings = {
  flowRates: { 1: micro(1.5), 2: micro(2.5), 3: micro(3.5), 4: micro(5.0) },
  defaultRateMicro: micro(1),
  countryRates,
  publisherSharePercent: 99,
  referralPercent: 10,
  minWithdrawalMicro: micro(5),
  currency: 'USD',
  enabledFlows: { 1: true, 2: true, 3: true, 4: true },
  cooldownHours: 6,
  journeyTtlMinutes: 15,
  updatedAt: FieldValue.serverTimestamp()
};

await db.collection('settings').doc('global').set(settings, { merge: true });
console.log('✅ Settings seeded.');
process.exit(0);