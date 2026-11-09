export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const payload = { error: err.message || 'Internal error' };
  if (err.details) payload.details = err.details;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json(payload);
}

export function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' });
}