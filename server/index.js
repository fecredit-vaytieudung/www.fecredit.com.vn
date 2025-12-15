const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const morgan = require('morgan');
const crypto = require('crypto');
const path = require('path');
const { handleErrorReport, getReportStats } = require('./api/ekyc-error-report');

const app = express();
const CSRF_TOKEN_EXPIRY_MS = 30 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');

if (!process.env.CSRF_SECRET) {
  const msg = 'CSRF_SECRET is not set; using ephemeral secret (development only).';
  if (isProduction) {
    throw new Error(msg);
  }
  console.warn(msg);
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

function verifyCsrfToken(req, res, next) {
  const token =
    req.headers['x-csrf-token'] ||
    req.body?._token ||
    req.body?.csrfToken;

  if (!token || typeof token !== 'string') {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }

  const [nonce, expiryStr, signature] = token.split(':');
  if (!nonce || !expiryStr || !signature) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }

  const payload = `${nonce}:${expiryStr}`;
  const expectedSignature = crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
  const signaturesMatch =
    signature.length === expectedSignature.length &&
    crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));

  const expiry = Number(expiryStr);
  if (!signaturesMatch || Number.isNaN(expiry) || Date.now() > expiry) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }

  return next();
}

function issueCsrfToken() {
  const nonce = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + CSRF_TOKEN_EXPIRY_MS;
  const payload = `${nonce}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
  return `${payload}:${signature}`;
}

app.get('/api/csrf-token', (_req, res) => {
  const token = issueCsrfToken();
  res.json({ token });
});

app.post('/api/ekyc/error-report', verifyCsrfToken, handleErrorReport);
app.get('/api/ekyc/stats', getReportStats);

const staticDir = path.join(__dirname, '..', 'dist');
app.use(express.static(staticDir));

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
