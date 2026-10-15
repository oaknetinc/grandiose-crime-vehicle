'use strict';
const U = require('./_lib/util');
const S = require('./_lib/store');
const { buildCard } = require('./_lib/card');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return U.send(res, 405, { error: 'method_not_allowed' }); }
    if (U.limited(req, 'card', 60, 60000)) return U.send(res, 429, { error: 'slow_down' });
    const wallet = U.clean(req.query && req.query.wallet, 64);
    if (!U.B58.test(wallet)) return U.send(res, 400, { error: 'Enter a valid Solana address.' });
    const rec = await S.getWallet(wallet);
    if (!rec) return U.send(res, 404, { error: 'not_found', message: 'No whitelist card for that wallet yet.' });
    return U.send(res, 200, { card: await buildCard(rec) });
  } catch (e) {
    console.error('[card]', e && e.name, String(e && e.message).slice(0, 200));
    return U.send(res, 500, { error: 'Something went wrong on our side.' });
  }
};
