import { db, FieldValue } from '../config/firebase.js';
import { env } from '../config/environment.js';
import { HttpError } from '../middleware/errorHandler.js';
import { newJourneyToken, hashVisitor, sha256 } from '../utils/ids.js';
import { computeEarnings } from './earnings.service.js';

const JOURNEY_TTL_MS = 15 * 60 * 1000;
const COOLDOWN_MS = 6 * 60 * 60 * 1000;

export async function startJourney({ shortCode, req }) {
  const linkSnap = await db.collection('shortLinks').where('shortCode', '==', shortCode).limit(1).get();
  if (linkSnap.empty) throw new HttpError(404, 'Short link not found');
  const linkDoc = linkSnap.docs[0];
  const link = linkDoc.data();

  if (link.status !== 'active') throw new HttpError(410, 'This link is not active');

  const ownerSnap = await db.collection('users').doc(link.ownerUid).get();
  if (!ownerSnap.exists) throw new HttpError(403, 'Link owner not active');
  if (ownerSnap.data().accountStatus === 'suspended') {
    throw new HttpError(403, 'This link is temporarily unavailable');
  }

  const settings = (await db.collection('settings').doc('global').get()).data() || {};
  const enabledFlows = settings.enabledFlows || { 1: true, 2: true, 3: true, 4: true };
  const flowPages = link.flowPageCount || 1;
  if (!enabledFlows[flowPages]) throw new HttpError(503, 'This flow is temporarily disabled');

  const journeyId = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  const token = newJourneyToken();
  const now = Date.now();

  await db.collection('journeys').doc(journeyId).set({
    journeyId,
    linkId: linkDoc.id,
    ownerUid: link.ownerUid,
    shortCode,
    destinationUrl: link.destinationUrl,
    totalSteps: flowPages,
    currentStep: 0,
    flowVersion: link.flowVersion || 1,
    flowSnapshot: { flowPageCount: flowPages },
    tokenHash: sha256(token),
    visitorHash: hashVisitor(req, env.ipHashSecret),
    status: 'started',
    createdAt: new Date(),
    expiresAt: new Date(now + JOURNEY_TTL_MS)
  });

  return { journeyId, token, totalSteps: flowPages, currentStep: 0 };
}

export async function continueJourney({ journeyId, token }) {
  return db.runTransaction(async (tx) => {
    // ── 1. SAARE READS PEHLE ──
    const jRef = db.collection('journeys').doc(journeyId);
    const jSnap = await tx.get(jRef);
    if (!jSnap.exists) throw new HttpError(404, 'Journey not found');
    const j = jSnap.data();

    if (j.status === 'completed') throw new HttpError(409, 'Journey already completed');
    if (j.status === 'expired' || j.expiresAt.toMillis() < Date.now()) {
      throw new HttpError(410, 'Journey expired');
    }
    if (j.tokenHash !== sha256(token)) throw new HttpError(403, 'Invalid journey token');

    const nextStep = j.currentStep + 1;
    const isFinal = nextStep >= j.totalSteps;
    const rotatedToken = newJourneyToken();

    if (!isFinal) {
      tx.update(jRef, {
        currentStep: nextStep,
        tokenHash: sha256(rotatedToken),
        status: 'in_progress',
        updatedAt: new Date()
      });
      return { done: false, nextStep, token: rotatedToken, totalSteps: j.totalSteps };
    }

    // Final step reads
    const settingsRef = db.collection('settings').doc('global');
    const settingsSnap = await tx.get(settingsRef);
    const settings = settingsSnap.exists ? settingsSnap.data() : {};

    const cooldownKey = `${j.visitorHash}_${j.linkId}`;
    const cdRef = db.collection('visitorCooldowns').doc(cooldownKey);
    const cdSnap = await tx.get(cdRef);

    const linkRef = db.collection('shortLinks').doc(j.linkId);
    const linkSnap = await tx.get(linkRef);
    if (!linkSnap.exists) throw new HttpError(410, 'Link deleted during journey');

    const userRef = db.collection('users').doc(j.ownerUid);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpError(410, 'Owner not found');
    const userData = userSnap.data();

    let referrerRef = null, referrerSnap = null;
    if (userData.referredBy) {
      referrerRef = db.collection('users').doc(userData.referredBy);
      referrerSnap = await tx.get(referrerRef);
    }

    // ── 2. AB SAARE WRITES KARO ──
    const now = Date.now();
    const isDuplicate = cdSnap.exists && (cdSnap.data().cooldownUntil?.toMillis?.() || 0) > now;

    tx.update(jRef, {
      currentStep: nextStep,
      status: 'completed',
      completedAt: new Date(),
      tokenHash: null
    });

    const clickRef = db.collection('clickRecords').doc();

    if (isDuplicate) {
      tx.set(clickRef, {
        clickId: clickRef.id, linkId: j.linkId, ownerUid: j.ownerUid,
        journeyId: j.journeyId, flowPageCount: j.totalSteps,
        validationStatus: 'duplicate',
        duplicateStatus: 'blocked_cooldown',
        earningsStatus: 'none',
        createdAt: new Date()
      });
      return { done: true, destinationUrl: j.destinationUrl, duplicate: true };
    }

    const earning = computeEarnings({
      settings,
      flowPageCount: j.totalSteps,
      country: j.country || null
    });

    tx.set(cdRef, {
      key: cooldownKey, visitorHash: j.visitorHash, linkId: j.linkId,
      cooldownUntil: new Date(now + COOLDOWN_MS), lastClickAt: new Date()
    });

    const earningRef = db.collection('earnings').doc();
    tx.set(earningRef, {
      earningId: earningRef.id, ownerUid: j.ownerUid, linkId: j.linkId, clickId: clickRef.id,
      grossMicro: earning.grossMicro,
      publisherAmountMicro: earning.publisherMicro,
      platformAmountMicro: earning.platformMicro,
      currency: earning.currency,
      calculationSource: earning.source,
      status: 'pending',
      createdAt: new Date()
    });

    tx.set(clickRef, {
      clickId: clickRef.id, linkId: j.linkId, ownerUid: j.ownerUid,
      journeyId: j.journeyId, flowPageCount: j.totalSteps,
      country: j.country || null,
      validationStatus: 'valid', duplicateStatus: 'none',
      earningsStatus: 'pending', earningId: earningRef.id,
      createdAt: new Date()
    });

    tx.update(linkRef, {
      totalValidClicks: FieldValue.increment(1),
      totalPendingEarningsMicro: FieldValue.increment(earning.publisherMicro),
      updatedAt: new Date()
    });

    tx.update(userRef, {
      pendingBalanceMicro: FieldValue.increment(earning.publisherMicro),
      availableBalanceMicro: FieldValue.increment(earning.publisherMicro),
      updatedAt: FieldValue.serverTimestamp()
    });

    const referralPercent = Number(settings.referralPercent ?? 10);
    if (referralPercent > 0 && referrerSnap?.exists && referrerRef.id !== j.ownerUid) {
      const commissionMicro = Math.floor((earning.publisherMicro * referralPercent) / 100);
      if (commissionMicro > 0) {
        tx.update(referrerRef, {
          pendingBalanceMicro: FieldValue.increment(commissionMicro),
          availableBalanceMicro: FieldValue.increment(commissionMicro),
          updatedAt: FieldValue.serverTimestamp()
        });
        const refDoc = db.collection('referrals').doc();
        tx.set(refDoc, {
          referralId: refDoc.id,
          referrerUid: referrerRef.id,
          referredUid: j.ownerUid,
          sourceClickId: clickRef.id,
          sourceEarningId: earningRef.id,
          commissionMicro,
          currency: earning.currency,
          createdAt: new Date()
        });
      }
    }

    return { done: true, destinationUrl: j.destinationUrl, duplicate: false };
  });
}

export async function getJourneyStatus(journeyId) {
  const snap = await db.collection('journeys').doc(journeyId).get();
  if (!snap.exists) throw new HttpError(404, 'Journey not found');
  const j = snap.data();
  return {
    status: j.status,
    currentStep: j.currentStep,
    totalSteps: j.totalSteps,
    expiresAt: j.expiresAt
  };
}