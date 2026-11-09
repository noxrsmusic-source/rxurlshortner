import { Router } from 'express';
import { z } from 'zod';
import { db, FieldValue } from '../config/firebase.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { checkAccountStatus } from '../middleware/checkAccountStatus.js';
import { HttpError } from '../middleware/errorHandler.js';
import { markPaid } from '../services/withdrawal.service.js';

const router = Router();
router.use(authenticate, checkAccountStatus, requireAdmin);

// ── Overview ────────────────────────────────────────────────
router.get('/overview', async (_req, res, next) => {
  try {
    const [users, links, clicks, withdrawals] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('shortLinks').count().get(),
      db.collection('clickRecords').where('validationStatus', '==', 'valid').count().get(),
      db.collection('withdrawalRequests').where('status', '==', 'pending').get()
    ]);
    res.json({
      totalUsers: users.data().count,
      totalLinks: links.data().count,
      validClicks: clicks.data().count,
      pendingWithdrawals: withdrawals.size
    });
  } catch (err) { next(err); }
});

// ── Users ───────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(limit).get();
    res.json({ users: snap.docs.map(d => d.data()) });
  } catch (err) { next(err); }
});

router.patch('/users/:uid/status', async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['active', 'suspended']) }).parse(req.body);
    await db.collection('users').doc(req.params.uid).update({
      accountStatus: status,
      updatedAt: FieldValue.serverTimestamp()
    });
    await db.collection('adminLogs').add({
      adminUid: req.auth.uid,
      action: `user.${status === 'suspended' ? 'suspend' : 'reactivate'}`,
      targetId: req.params.uid,
      createdAt: FieldValue.serverTimestamp()
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', err.errors));
    next(err);
  }
});

// ── Links ───────────────────────────────────────────────────
router.get('/links', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const snap = await db.collection('shortLinks').orderBy('createdAt', 'desc').limit(limit).get();
    res.json({ links: snap.docs.map(d => d.data()) });
  } catch (err) { next(err); }
});

router.patch('/links/:linkId/status', async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['active', 'paused', 'disabled']) }).parse(req.body);
    await db.collection('shortLinks').doc(req.params.linkId).update({
      status, updatedAt: FieldValue.serverTimestamp()
    });
    await db.collection('adminLogs').add({
      adminUid: req.auth.uid, action: 'link.status', targetId: req.params.linkId,
      metadata: { status }, createdAt: FieldValue.serverTimestamp()
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', err.errors));
    next(err);
  }
});

// ── Settings ────────────────────────────────────────────────
router.get('/settings', async (_req, res, next) => {
  try {
    const snap = await db.collection('settings').doc('global').get();
    res.json({ settings: snap.exists ? snap.data() : null });
  } catch (err) { next(err); }
});

router.patch('/settings', async (req, res, next) => {
  try {
    const schema = z.object({
      flowRates: z.record(z.string(), z.number().int().nonnegative()).optional(),
      defaultRateMicro: z.number().int().nonnegative().optional(),
      countryRates: z.any().optional(),
      publisherSharePercent: z.number().min(0).max(100).optional(),
      referralPercent: z.number().min(0).max(100).optional(),
      minWithdrawalMicro: z.number().int().nonnegative().optional(),
      currency: z.string().min(1).max(8).optional(),
      enabledFlows: z.object({
        1: z.boolean(), 2: z.boolean(), 3: z.boolean(), 4: z.boolean()
      }).optional()
    });
    const patch = schema.parse(req.body);
    await db.collection('settings').doc('global').set(
      { ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true }
    );
    await db.collection('adminLogs').add({
      adminUid: req.auth.uid, action: 'settings.update',
      metadata: Object.keys(patch), createdAt: FieldValue.serverTimestamp()
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', err.errors));
    next(err);
  }
});

// ── Withdrawals ─────────────────────────────────────────────
router.get('/withdrawals', async (req, res, next) => {
  try {
    const q = req.query.status
      ? db.collection('withdrawalRequests').where('status', '==', req.query.status)
      : db.collection('withdrawalRequests');
    const snap = await q.orderBy('requestedAt', 'desc').limit(200).get();
    res.json({ withdrawals: snap.docs.map(d => d.data()) });
  } catch (err) { next(err); }
});

router.patch('/withdrawals/:id', async (req, res, next) => {
  try {
    const { action, reason, transactionReference } = z.object({
      action: z.enum(['approve', 'reject', 'processing', 'paid']),
      reason: z.string().max(500).optional(),
      transactionReference: z.string().max(200).optional()
    }).parse(req.body);

    const id = req.params.id;

    if (action === 'paid') {
      await markPaid({ requestId: id, adminUid: req.auth.uid, transactionReference });
    } else {
      const map = { approve: 'approved', reject: 'rejected', processing: 'processing' };
      await db.collection('withdrawalRequests').doc(id).update({
        status: map[action],
        adminNote: reason || null,
        processedAt: FieldValue.serverTimestamp(),
        processedBy: req.auth.uid
      });
    }
    await db.collection('adminLogs').add({
      adminUid: req.auth.uid, action: `withdrawal.${action}`,
      targetId: id, metadata: { reason }, createdAt: FieldValue.serverTimestamp()
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', err.errors));
    next(err);
  }
});

// ── Ad placements ───────────────────────────────────────────
router.get('/ad-placements', async (_req, res, next) => {
  try {
    const snap = await db.collection('adPlacements').get();
    res.json({ placements: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) { next(err); }
});

router.put('/ad-placements/:page', async (req, res, next) => {
  try {
    const page = String(req.params.page);
    if (!['1', '2', '3', '4'].includes(page)) throw new HttpError(400, 'Page must be 1-4');
    const body = z.object({
      html: z.string().max(20_000),
      enabled: z.boolean(),
      network: z.string().max(80).optional(),
      notes: z.string().max(500).optional()
    }).parse(req.body);
    await db.collection('adPlacements').doc(`page${page}`).set({
      ...body, updatedAt: FieldValue.serverTimestamp(), updatedBy: req.auth.uid
    }, { merge: true });
    await db.collection('adminLogs').add({
      adminUid: req.auth.uid, action: `adpage.update`, targetId: `page${page}`,
      createdAt: FieldValue.serverTimestamp()
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', err.errors));
    next(err);
  }
});

// ── Logs ────────────────────────────────────────────────────
router.get('/logs', async (_req, res, next) => {
  try {
    const snap = await db.collection('adminLogs').orderBy('createdAt', 'desc').limit(200).get();
    res.json({ logs: snap.docs.map(d => d.data()) });
  } catch (err) { next(err); }
});

export default router;