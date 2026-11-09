import { Router } from 'express';
import { db } from '../config/firebase.js';

const router = Router();

// Matched as the last route — only for short-code-shaped paths.
router.get('/:shortCode([A-Za-z0-9_-]{3,24})', async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const snap = await db.collection('shortLinks').where('shortCode', '==', shortCode).limit(1).get();
    if (snap.empty) return res.status(404).send('Short link not found');
    if (snap.docs[0].data().status !== 'active') return res.status(410).send('This link is not active');
    res.redirect(`/redirect.html?c=${encodeURIComponent(shortCode)}`);
  } catch (err) { next(err); }
});

export default router;