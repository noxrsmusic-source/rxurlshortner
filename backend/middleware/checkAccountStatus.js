import { HttpError } from './errorHandler.js';

export function checkAccountStatus(req, _res, next) {
  const user = req.auth?.user;
  if (!user) return next(new HttpError(403, 'User profile not initialized'));
  if (user.accountStatus === 'suspended') return next(new HttpError(403, 'Account suspended'));
  next();
}