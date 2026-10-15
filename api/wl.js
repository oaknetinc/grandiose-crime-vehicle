'use strict';
const U = require('./_lib/util');
const S = require('./_lib/store');
const { buildCard } = require('./_lib/card');
const { balanceOf } = require('./_lib/solana');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      if (U.limited(req, 'wl-get', 120, 60000)) return U.send(res, 429, { error: 'slow_down' });
      const claimed = Math.min(await S.countSlots(false), U.CAP);
      return U.send(res, 200, { open: true, claimed, cap: U.CAP, tokenLive: !!U.tokenMint() });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return U.send(res, 405, { error: 'method_not_allowed' }); }

    if (!U.sameOrigin(req)) return U.send(res, 403, { error: 'forbidden' });
    if (U.limited(req, 'wl-post', 8, 10 * 60000)) return U.send(res, 429, { error: 'Too many attempts. Try again in a few minutes.' });

    let b; try { b = await U.readBody(req); } catch { return U.send(res, 400, { error: 'Bad request body.' }); }
    if (!b || typeof b !== 'object') return U.send(res, 400, { error: 'Bad request body.' });
    // Honeypot: real people never fill the hidden "website" field. Pretend success so bots learn nothing.
    if (b.website) return U.send(res, 200, { ok: true });

    const wallet = U.clean(b.wallet, 64), psn = U.clean(b.psn ?? b.psn_id, 32), email = U.clean(b.email, 254);
    const x = U.clean(b.x ?? b.x_handle, 20).replace(/^@/, ''), code = U.clean(b.code ?? b.verify_code, 16);
    const errors = {};
    if (!U.B58.test(wallet)) errors.wallet = 'That isn\'t a valid Solana address.';
    if (psn && !U.PSN.test(psn)) errors.psn = 'PSN IDs are 3-16 characters: letters, numbers, - or _, starting with a letter.';
    if (email && !U.EMAIL.test(email)) errors.email = 'That email doesn\'t look right.';
    if (x && !U.XH.test(x)) errors.x = 'X handles are up to 15 letters, numbers or _.';
    if (code && !U.CODE.test(code)) errors.code = 'Bad verification code.';
    if (b.hype !== true && b.ps5_or_hyped !== true) errors.hype = 'Tick the honor-system box.';
    if (Object.keys(errors).length) return U.send(res, 400, { error: Object.values(errors)[0], errors });

    const existing = await S.getWallet(wallet);
    if (existing) { const card = await buildCard(existing); return U.send(res, 200, { ok: true, existing: true, spot: card.spot, card }); }

    // New signups must hold $GCV right now (checked server-side against the public wallet balance).
    const mint = U.tokenMint();
    if (!mint) return U.send(res, 422, { code: 'token_not_live', tokenLive: false, error: 'Signups need a wallet holding $GCV, and the token isn\'t live yet. Nothing was saved. Check back at launch.' });
    let bal;
    try { bal = await balanceOf(wallet, mint, true); }
    catch { return U.send(res, 503, { code: 'rpc_unavailable', error: 'Couldn\'t check that wallet\'s balance on Solana just now. Nothing was saved. Please try again in a moment.' }); }
    if (!(bal > 0)) return U.send(res, 422, { code: 'no_balance', tokenLive: true, error: 'Signups need a wallet holding $GCV, and this wallet holds none. Nothing was saved. Buy some $GCV, then come back.' });

    const r = await S.createSignup({
      wallet, psn: psn || null, email: email || null, x: x || null, code: code || null,
      createdAt: new Date().toISOString(), lastBalance: bal, trend: 'flat', trendDelta: 0, trendAt: new Date().toISOString(),
    });
    if (r.full) return U.send(res, 409, { error: 'All 2026 spots are claimed.', full: true, claimed: U.CAP });
    const card = await buildCard(r.rec);
    return U.send(res, 200, { ok: true, existing: !r.created, spot: card.spot, claimed: Math.min(await S.countSlots(false), U.CAP), card });
  } catch (e) {
    console.error('[wl]', e && e.name, String(e && e.message).slice(0, 200));
    return U.send(res, 500, { error: 'Something went wrong on our side. Please try again.' });
  }
};
