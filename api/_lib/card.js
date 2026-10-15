'use strict';
const { sha, tokenMint } = require('./util');
const { balanceOf, supplyOf } = require('./solana');
const { saveWallet, ensureSpot } = require('./store');

const TITLES = ['El', 'La', 'Don', 'Big', 'Lil', 'Senor', 'Capitan'];
const ADJ = ['Neon', 'Golden', 'Sunset', 'Chrome', 'Turbo', 'Velvet', 'Smooth', 'Loco', 'Electric', 'Midnight', 'Savage', 'Lucky', 'Crimson', 'Dusty', 'Flashy', 'Pink', 'Reckless', 'Slick', 'Wicked', 'Tropical'];
const NOUN = ['Bandido', 'Cobra', 'Lowrider', 'Gator', 'Mariachi', 'Outlaw', 'Drifter', 'Coyote', 'Flamingo', 'Hustler', 'Jefe', 'Getaway', 'Pelican', 'Vice', 'Cruiser', 'Matador', 'Bruja', 'Desperado', 'Racer', 'Sombrero'];

function identity(wallet, spot) {
  const h = sha('gcv|' + wallet);
  const n = (i) => parseInt(h.slice(i * 4, i * 4 + 4), 16);
  const alias = `${TITLES[n(0) % TITLES.length]} ${ADJ[n(1) % ADJ.length]} ${NOUN[n(2) % NOUN.length]} #${String(spot || 0).padStart(4, '0')}`;
  return { alias, avatarSeed: h.slice(0, 16) };
}
const rankOf = (share) => share >= 1 ? 'Kingpin' : share >= 0.25 ? 'Capo' : share >= 0.05 ? 'Lieutenant' : share >= 0.01 ? 'Soldier' : share > 0 ? 'Rookie' : 'No rank yet';

// Build the public card. Reads the live balance, updates the stored trend if it changed. Never includes email.
async function buildCard(rec) {
  rec = await ensureSpot(rec);
  const mint = tokenMint();
  const id = identity(rec.wallet, rec.spot);
  const card = {
    wallet: rec.wallet, alias: id.alias, avatarSeed: id.avatarSeed, spot: rec.spot || null,
    joinedAt: rec.createdAt, psn: rec.psn || null, tier: 'pending', balance: null, share: null, rank: null,
    trend: null, trendDelta: null, trendAt: rec.trendAt || null, stale: false, message: null, updatedAt: new Date().toISOString(),
  };
  if (!mint) { card.message = 'Token not live yet, so holdings can not be read yet.'; return card; }

  let bal = null;
  try { bal = await balanceOf(rec.wallet, mint); } catch (e) { /* fall back to the last stored balance */ }
  if (bal == null) {
    card.stale = true; bal = typeof rec.lastBalance === 'number' ? rec.lastBalance : null;
    card.message = 'Couldn\'t reach the Solana network just now. Showing the last known balance.';
  } else {
    const prev = rec.lastBalance;
    if (typeof prev !== 'number') { rec = { ...rec, lastBalance: bal, trend: 'flat', trendDelta: 0, trendAt: new Date().toISOString() }; await saveWallet(rec).catch(() => {}); }
    else if (Math.abs(bal - prev) > 1e-9) {
      rec = { ...rec, lastBalance: bal, trend: bal > prev ? 'up' : 'down', trendDelta: bal - prev, trendAt: new Date().toISOString() };
      await saveWallet(rec).catch(() => {});
    }
  }
  card.trend = rec.trend || null; card.trendDelta = rec.trendDelta ?? null; card.trendAt = rec.trendAt || null;
  card.balance = bal;
  if (bal == null) { card.tier = 'inactive'; return card; }
  card.tier = bal > 0 ? (rec.psn ? 'priority' : 'holder') : 'inactive';
  if (bal > 0) {
    try { const sup = await supplyOf(mint); if (sup > 0) card.share = Math.round(bal / sup * 1e6) / 1e4; } catch {}
    card.rank = card.share == null ? null : rankOf(card.share);
  } else { card.rank = 'No rank yet'; card.message = 'This wallet holds no $GCV right now, so the card is inactive. Your spot is kept and flagged. Hold $GCV again and it reactivates.'; }
  return card;
}

module.exports = { buildCard, identity };
