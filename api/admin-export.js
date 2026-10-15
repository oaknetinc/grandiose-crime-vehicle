'use strict';
// Protected export for the snapshot: Authorization: Bearer <ADMIN_TOKEN>. ?format=csv for CSV, ?live=0 to skip live balances.
const U = require('./_lib/util');
const S = require('./_lib/store');
const { balanceOf } = require('./_lib/solana');
const { identity } = require('./_lib/card');

module.exports = async (req, res) => {
  try {
    const want = (process.env.ADMIN_TOKEN || '').trim();
    const got = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (U.limited(req, 'admin', 20, 60000)) return U.send(res, 429, { error: 'slow_down' });
    if (!want || want.length < 24 || !got || !U.safeEq(got, want)) return U.send(res, 401, { error: 'unauthorized' });
    if (req.method !== 'GET') return U.send(res, 405, { error: 'method_not_allowed' });

    const q = req.query || {}, mint = U.tokenMint(), live = q.live !== '0' && !!mint;
    const rows = await S.allWallets();
    for (let i = 0; i < rows.length; i += 8) {
      await Promise.all(rows.slice(i, i + 8).map(async r => {
        r.balance = typeof r.lastBalance === 'number' ? r.lastBalance : null; r.live = false;
        if (live) { try { r.balance = await balanceOf(r.wallet, mint); r.live = true; } catch {} }
        r.tier = !mint ? 'pending' : (r.balance > 0 ? (r.psn ? 'priority' : 'holder') : 'inactive');
        r.alias = identity(r.wallet, r.spot).alias;
      }));
    }
    const order = { priority: 0, holder: 1, inactive: 2, pending: 3 };
    rows.sort((a, b) => (order[a.tier] - order[b.tier]) || ((b.balance || 0) - (a.balance || 0)) || (a.spot - b.spot));
    const list = rows.map((r, i) => ({ order: i + 1, tier: r.tier, wallet: r.wallet, alias: r.alias, spot: r.spot, balance: r.balance, balanceIsLive: r.live, psn: r.psn, email: r.email, x: r.x, code: r.code, createdAt: r.createdAt }));
    if (q.format === 'csv') {
      const esc = (v) => { v = v == null ? '' : String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      const cols = Object.keys(list[0] || { order: 1, tier: 1, wallet: 1, alias: 1, spot: 1, balance: 1, balanceIsLive: 1, psn: 1, email: 1, x: 1, code: 1, createdAt: 1 });
      res.statusCode = 200; res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
      return res.end([cols.join(','), ...list.map(r => cols.map(c => esc(r[c])).join(','))].join('\n'));
    }
    return U.send(res, 200, { total: list.length, cap: U.CAP, tokenLive: !!mint, live, list });
  } catch (e) {
    console.error('[admin-export]', e && e.name, String(e && e.message).slice(0, 200));
    return U.send(res, 500, { error: 'export failed' });
  }
};
