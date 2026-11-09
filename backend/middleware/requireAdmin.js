import { HttpError } from './errorHandler.js';

export function requireAdmin(req, _res, next) {
  if (req.auth?.token?.admin === true) return next();
  next(new HttpError(403, 'Admin privileges required'));
}