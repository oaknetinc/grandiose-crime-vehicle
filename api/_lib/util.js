'use strict';
// Shared helpers for the GCV whitelist API. No secrets are ever logged.
const crypto = require('crypto');

const CAP = 2026;
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const PSN = /^[A-Za-z][A-Za-z0-9_-]{2,15}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const XH = /^[A-Za-z0-9_]{1,15}$/;
const CODE = /^GCV-[A-Z2-9]{6}$/;

const tokenMint = () => {
  const v = (process.env.TOKEN_CA || '').trim();
  return B58.test(v) ? v : '';
};
const prefix = () => (process.env.WL_PREFIX || 'wl').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'wl';

// Strip control chars / angle brackets; collapse whitespace; hard length cap.
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>"'`\\]/g, '').trim().slice(0, max);

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

// Best-effort per-instance rate limit (serverless instances are not shared, so this only blunts bursts).
const hits = new Map();
function limited(req, bucket, max, windowMs) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim().slice(0, 64);
  const key = bucket + '|' + ip, now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
  return arr.length > max;
}

// Reject cross-site browser POSTs (Origin present but not our own host).
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const safeEq = (a, b) => {
  const x = Buffer.from(sha(a)), y = Buffer.from(sha(b));
  return crypto.timingSafeEqual(x, y);
};

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let raw = typeof req.body === 'string' ? req.body : '';
  if (!raw) {
    const chunks = []; let n = 0;
    for await (const c of req) { n += c.length; if (n > 20000) throw new Error('too_large'); chunks.push(c); }
    raw = Buffer.concat(chunks).toString('utf8');
  }
  if (raw.length > 20000) throw new Error('too_large');
  return raw ? JSON.parse(raw) : {};
}

module.exports = { CAP, B58, PSN, EMAIL, XH, CODE, tokenMint, prefix, clean, send, limited, sameOrigin, sha, safeEq, readBody };
