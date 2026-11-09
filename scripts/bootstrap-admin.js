// Usage: BOOTSTRAP_ADMIN_EMAIL=you@example.com node scripts/bootstrap-admin.js
// The user must already exist in Firebase Auth (sign up once through the landing page first).
import { auth, db } from '../backend/config/firebase.js';

const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
if (!email) { console.error('Set BOOTSTRAP_ADMIN_EMAIL'); process.exit(1); }

const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { admin: true });
await db.collection('users').doc(user.uid).set({ role: 'admin' }, { merge: true });

console.log(`✅ Promoted ${email} (${user.uid}) to admin.`);
console.log('   → Sign out and back in so the custom claim propagates.');
process.exit(0);