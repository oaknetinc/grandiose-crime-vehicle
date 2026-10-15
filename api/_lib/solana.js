'use strict';
// Live token balance via public Solana JSON-RPC (publicnode first, then mainnet-beta). Cached ~30s per instance.
const RPCS = ['https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com'];
const rpcList = () => (process.env.SOLANA_RPC_URL ? [process.env.SOLANA_RPC_URL, ...RPCS] : RPCS);

async function rpc(method, params) {
  let last;
  for (const url of rpcList()) {
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
      clearTimeout(t);
      if (!r.ok) throw new Error('rpc http ' + r.status);
      const j = await r.json();
      if (j.error) throw new Error('rpc ' + (j.error.message || j.error.code));
      return j.result;
    } catch (e) { last = e; }
  }
  throw last || new Error('rpc failed');
}

const cache = new Map();
async function cached(key, ttl, fn, fresh) {
  const c = cache.get(key);
  if (!fresh && c && Date.now() - c.at < ttl) return c.v;
  const v = await fn();
  cache.set(key, { at: Date.now(), v });
  if (cache.size > 3000) cache.delete(cache.keys().next().value);
  return v;
}

// Sum of the wallet's balances for `mint` (works for Token and Token-2022 mints). Number of whole tokens.
const balanceOf = (wallet, mint, fresh) => cached('b|' + wallet + mint, 30000, async () => {
  const r = await rpc('getTokenAccountsByOwner', [wallet, { mint }, { encoding: 'jsonParsed' }]);
  return (r.value || []).reduce((s, a) => s + (Number(a.account?.data?.parsed?.info?.tokenAmount?.uiAmountString) || 0), 0);
}, fresh);
const supplyOf = (mint) => cached('s|' + mint, 300000, async () => {
  const r = await rpc('getTokenSupply', [mint]);
  return Number(r.value?.uiAmountString) || 0;
});

module.exports = { balanceOf, supplyOf };
