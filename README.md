# RX URL Shorter — Full-Stack

## Setup

### 1. Firebase project
1. Create a Firebase project → enable **Authentication** (Email/Password + Google).
2. Enable **Firestore** (production mode).
3. Project Settings → Service Accounts → **Generate new private key** → save as JSON.
4. From the JSON, copy `project_id`, `client_email`, `private_key` into `.env`.

### 2. Local setup
```bash
npm install
cp .env.example .env        # fill in Firebase creds + two 64-char secrets
npm run seed                # seeds settings/global
npm run bootstrap-admin     # creates first admin (see below)
npm start                   # http://localhost:8080