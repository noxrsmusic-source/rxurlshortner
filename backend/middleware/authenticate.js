import { auth, db } from '../config/firebase.js';
import { HttpError } from './errorHandler.js';

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Missing bearer token');

    const decoded = await auth.verifyIdToken(token);
    const userSnap = await db.collection('users').doc(decoded.uid).get();
    
    // CHANGE: Don't throw if profile doesn't exist yet. Let the route handle it.
    const user = userSnap.exists ? userSnap.data() : null;
    req.auth = { uid: decoded.uid, token: decoded, user };
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(new HttpError(401, 'Invalid or expired token'));
  }
}