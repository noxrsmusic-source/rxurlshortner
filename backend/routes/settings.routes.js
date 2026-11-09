import { Router } from 'express';
import { db } from '../config/firebase.js';

const router = Router();

router.get('/settings', async (_req, res, next) => {
  try {
    const snap = await db.collection('settings').doc('global').get();
    if (!snap.exists) return res.json({ settings: null });
    const s = snap.data();
    // Only expose fields safe for public consumption.
    res.json({
      settings: {
        flowRates: s.flowRates || {},
        defaultRateMicro: s.defaultRateMicro ?? 1_000_000,
        countryRates: s.countryRates || {},
        publisherSharePercent: s.publisherSharePercent ?? 99,
        referralPercent: s.referralPercent ?? 10,
        minWithdrawalMicro: s.minWithdrawalMicro ?? 5_000_000,
        currency: s.currency || 'USD',
        enabledFlows: s.enabledFlows || { 1: true, 2: true, 3: true, 4: true }
      }
    });
  } catch (err) { next(err); }
});

export default router;

router.get('/ad-placements/:page', async (req, res, next) => {
  try {
    const page = String(req.params.page);
    if (!['1', '2', '3', '4'].includes(page)) return res.json({ enabled: false, html: '' });
    const snap = await db.collection('adPlacements').doc(`page${page}`).get();
    if (!snap.exists) return res.json({ enabled: false, html: '' });
    const d = snap.data();
    res.json({ enabled: !!d.enabled, html: d.enabled ? (d.html || '') : '' });
  } catch (err) { next(err); }
});