import dotenv from 'dotenv';
dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing required env: ${name}`);
  return String(v).trim();
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: Number(process.env.PORT || 8080),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:8080',
  corsOrigins: (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean),
  projectId: required('FIREBASE_PROJECT_ID'),
  clientEmail: required('FIREBASE_CLIENT_EMAIL'),
  privateKey: required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  sessionSecret: required('SESSION_SECRET'),
  ipHashSecret: required('IP_HASH_SECRET')
};