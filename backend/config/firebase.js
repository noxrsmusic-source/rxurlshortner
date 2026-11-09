import admin from 'firebase-admin';
import { env } from './environment.js';

const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

if (!admin.apps.length) {
  if (usingEmulator) {
    admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'test-project' });
  } else {
    
    // SMART KEY FORMATTER
    let key = env.privateKey;
    
    // 1. Agar galti se quotes lag gaye hain to hatao
    if (key.startsWith('"') && key.endsWith('"')) {
      key = key.slice(1, -1);
    }

    // 2. Agar Base64 format me hai to decode karo
    if (!key.startsWith('-----BEGIN')) {
      key = Buffer.from(key, 'base64').toString('utf8');
    }

    // 3. Agar Vercel ne \n ko text bana diya hai to asli line break me badlo
    key = key.replace(/\\n/g, '\n');

    // 4. End me ek line break ensure karo
    if (!key.endsWith('\n')) {
      key += '\n';
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.projectId,
        clientEmail: env.clientEmail,
        privateKey: key
      })
    });
  }
}

export const auth = admin.auth();
export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export { admin };
