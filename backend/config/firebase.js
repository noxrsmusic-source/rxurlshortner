import admin from 'firebase-admin';
import { env } from './environment.js';

const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

if (!admin.apps.length) {
  if (usingEmulator) {
    admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'test-project' });
  } else {
    
    // 🔥 SMART FIX: Ye check karega ki key Base64 hai ya normal
    const isBase64 = !env.privateKey.startsWith('-----BEGIN');
    const formattedPrivateKey = isBase64 
      ? Buffer.from(env.privateKey, 'base64').toString('utf8') 
      : env.privateKey;

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.projectId,
        clientEmail: env.clientEmail,
        privateKey: formattedPrivateKey
      })
    });
  }
}

export const auth = admin.auth();
export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export { admin };