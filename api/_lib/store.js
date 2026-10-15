'use strict';
// Persistence on Vercel Blob (private store). Keys:
//   <prefix>/w/<wallet>.json   one record per wallet (atomic dedupe: created with allowOverwrite:false)
//   <prefix>/s/<0001..2026>.json  one slot per spot (atomic cap: created with allowOverwrite:false)
const { put, get, list, del } = require('@vercel/blob');
const { prefix, CAP } = require('./util');

const opt = { access: 'private' };
const wKey = (w) => `${prefix()}/w/${w}.json`;
const sKey = (n) => `${prefix()}/s/${String(n).padStart(4, '0')}.json`;

async function readJSON(path) {
  const r = await get(path, { ...opt, useCache: false });
  if (!r || r.statusCode !== 200) return null;
  const txt = await new Response(r.stream).text();
  return { data: JSON.parse(txt), etag: r.blob.etag };
}
const writeJSON = (path, data, overwrite) =>
  put(path, JSON.stringify(data), { ...opt, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: !!overwrite, cacheControlMaxAge: 60 });
const exists = (e) => /already exists|precondition|conflict/i.test(String(e && e.message));

async function listAll(pfx, onPage) {
  let cursor, out = [];
  do {
    const r = await list({ prefix: pfx, cursor, limit: 1000 });
    out = out.concat(onPage ? onPage(r.blobs) : r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}

let countCache = { at: 0, n: 0 };
async function countSlots(fresh) {
  if (!fresh && Date.now() - countCache.at < 10000) return countCache.n;
  const n = (await listAll(`${prefix()}/s/`, b => b.map(x => x.pathname))).length;
  countCache = { at: Date.now(), n }; return n;
}

const getWallet = async (w) => { const r = await readJSON(wKey(w)); return r ? r.data : null; };
const saveWallet = (rec) => writeJSON(wKey(rec.wallet), rec, true);

// Claim a spot atomically. Returns spot number or 0 when the cap is reached.
async function claimSpot(wallet) {
  let n = (await countSlots(true)) + 1;
  for (let tries = 0; n <= CAP && tries < 60; tries++, n++) {
    try { await writeJSON(sKey(n), { wallet, at: Date.now() }, false); countCache.at = 0; return n; }
    catch (e) { if (!exists(e)) throw e; }
  }
  return n > CAP ? 0 : -1; // -1 = contention, caller retries
}

// Create the wallet record first (dedupe), then claim a spot. Returns {rec, created, full}.
async function createSignup(rec) {
  try { await writeJSON(wKey(rec.wallet), { ...rec, spot: 0 }, false); }
  catch (e) { if (exists(e)) return { rec: await getWallet(rec.wallet), created: false }; throw e; }
  let spot = 0;
  for (let i = 0; i < 3 && spot <= 0; i++) { spot = await claimSpot(rec.wallet); if (spot === 0) break; }
  if (spot <= 0) { await del(wKey(rec.wallet)).catch(() => {}); return { full: true }; }
  rec = { ...rec, spot };
  await saveWallet(rec);
  return { rec, created: true };
}

// Self-heal a record that was created but never got a spot (e.g. a function crashed midway).
async function ensureSpot(rec) {
  if (rec.spot > 0) return rec;
  const spot = await claimSpot(rec.wallet);
  if (spot > 0) { rec = { ...rec, spot }; await saveWallet(rec); }
  return rec;
}

async function allWallets() {
  const blobs = await listAll(`${prefix()}/w/`);
  const out = [];
  for (let i = 0; i < blobs.length; i += 20) {
    const rows = await Promise.all(blobs.slice(i, i + 20).map(b => readJSON(b.pathname).then(r => r && r.data).catch(() => null)));
    rows.forEach(r => r && out.push(r));
  }
  return out;
}

module.exports = { getWallet, saveWallet, createSignup, ensureSpot, countSlots, allWallets, readJSON, writeJSON, listAll };
