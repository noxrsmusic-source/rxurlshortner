// scripts/fix-env.mjs
// Usage: node scripts/fix-env.mjs "C:\path\to\service-account.json"
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Usage: node scripts/fix-env.mjs <service-account.json>');
  process.exit(1);
}

const absPath = path.resolve(jsonPath);
if (!fs.existsSync(absPath)) {
  console.error(`❌ File not found: ${absPath}`);
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(absPath, 'utf8'));

if (!json.project_id || !json.client_email || !json.private_key) {
  console.error('❌ JSON missing project_id, client_email, or private_key');
  process.exit(1);
}

// Convert real newlines in the PEM to literal \n for dotenv
const privateKey = json.private_key.replace(/\r\n/g, '\n').replace(/\n/g, '\\n');

// Sanity checks
if (privateKey.length < 500) {
  console.error(`❌ Private key too short: ${privateKey.length} chars — was the JSON cut off?`);
  process.exit(1);
}
if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
  console.error('❌ Private key does not start with -----BEGIN PRIVATE KEY-----');
  process.exit(1);
}
if (!privateKey.endsWith('-----END PRIVATE KEY-----\\n')) {
  console.error('❌ Private key does not end with -----END PRIVATE KEY-----\\n');
  process.exit(1);
}

const hexSecret = () => crypto.randomBytes(32).toString('hex');

const env = `# ── Firebase Admin SDK ───────────────────────────────────────
FIREBASE_PROJECT_ID=${json.project_id}
FIREBASE_CLIENT_EMAIL=${json.client_email}
FIREBASE_PRIVATE_KEY="${privateKey}"

# ── Server ──────────────────────────────────────────────────
PORT=8080
NODE_ENV=development
PUBLIC_BASE_URL=http://localhost:8080
CORS_ORIGIN=http://localhost:8080

# ── Secrets (auto-generated, 64 hex chars each) ─────────────
SESSION_SECRET=${hexSecret()}
IP_HASH_SECRET=${hexSecret()}

# ── Admin bootstrap ─────────────────────────────────────────
BOOTSTRAP_ADMIN_EMAIL=
`;

fs.writeFileSync('.env', env, 'utf8');

console.log('✅ .env written successfully');
console.log(`   Project:  ${json.project_id}`);
console.log(`   Email:    ${json.client_email}`);
console.log(`   Key:      ${privateKey.length} chars (valid PEM)`);
console.log('');
console.log('   Next steps:');
console.log('   1. Edit .env → set BOOTSTRAP_ADMIN_EMAIL=your-admin-email');
console.log('   2. Run: npm run seed');