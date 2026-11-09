import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/environment.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { publicLimiter, authLimiter, journeyLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/auth.routes.js';
import linksRoutes from './routes/links.routes.js';
import journeyRoutes from './routes/journey.routes.js';
import earningsRoutes from './routes/earnings.routes.js';
import referralRoutes from './routes/referral.routes.js';
import withdrawalRoutes from './routes/withdrawal.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import adminRoutes from './routes/admin.routes.js';
import redirectRoutes from './routes/redirect.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false, // TODO: tighten in prod; currently Tailwind CDN + ad snippets need inline
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: env.corsOrigins.length ? env.corsOrigins : true,
  credentials: true
}));
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser(env.sessionSecret));

// Static
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

// API
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/links', publicLimiter, linksRoutes);
app.use('/api/journey', journeyLimiter, journeyRoutes);
app.use('/api/earnings', publicLimiter, earningsRoutes);
app.use('/api/referrals', publicLimiter, referralRoutes);
app.use('/api/withdrawals', publicLimiter, withdrawalRoutes);
app.use('/api/public', settingsRoutes);
app.use('/api/admin', publicLimiter, adminRoutes);

// Short-code redirect — last
app.use('/', redirectRoutes);

app.use(notFound);
app.use(errorHandler);

// Agar local environment hai toh server start karo
if (process.env.NODE_ENV !== 'production') {
  app.listen(env.port, () => {
    console.log(`RX URL Shorter listening on :${env.port} (${env.nodeEnv})`);
  });
}

// Vercel ke liye app ko export karna zaroori hai
export default app;