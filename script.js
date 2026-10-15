/* Grandiose Crime Vehicle — script.js (no deps) */

/* ===== CONFIG: fill these in at launch. Everything else reads from here. ===== */
const TOKEN_CA = '';        // pump.fun mint / contract address of $GCV (leave '' until launch)
const CREATOR_WALLET = '';  // creator (dev) wallet that earns pump.fun creator fees ('' = read it from the token's bonding curve)
const WL_ENDPOINT = '';     // whitelist backend URL. GET -> {"claimed": <int>}, POST <- signup JSON. '' = signups not open
// Public Solana JSON-RPC nodes, tried in order. api.mainnet-beta.solana.com is rate-limited and often answers
// browser requests with 403, so it's the fallback here. For launch, put a keyed, domain-locked RPC
// (Helius, QuickNode, Triton…) first in this list.
const SOLANA_RPC = ['https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com'];
// NFT collection preview: number of face-down tiles (change to 4000 if the collection size changes)
const NFT_TILES = 2026;
// Preview portrait pool in img/web/pfp/pfp_01.webp … (preview art only, faces repeat)
const PFP_POOL = 12;
(() => {
  document.documentElement.classList.add('js');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Toast
  const toast = $('#toast'); let tt;
  const say = (msg) => { toast.textContent = msg; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 2400); };

  // Placeholder links
  $$('a[data-placeholder]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); say(`🚧 ${a.dataset.placeholder}: coming soon`);
  }));

  // Copy CA
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const v = $(b.dataset.copy).textContent.trim();
    if (/coming soon/i.test(v)) return say('CA: coming soon. Watch official socials, beware of fakes!');
    try { await navigator.clipboard.writeText(v); say('Copied ✔'); } catch { say(v); }
  }));

  // Nav: scrolled state, mobile toggle, active link
  const nav = $('.nav'), toggle = $('.nav__toggle'), links = $('#nav-links');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const setMenu = (open) => { links.classList.toggle('open', open); toggle.setAttribute('aria-expanded', open); toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
  toggle.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  $$('a', links).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  const navMap = new Map($$('a[href^="#"]', links).map(a => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { navMap.forEach(a => a.classList.remove('is-active')); navMap.get(en.target.id)?.classList.add('is-active'); }
  }), { rootMargin: '-45% 0px -50% 0px' });
  navMap.forEach((_, id) => { const s = document.getElementById(id); s && spy.observe(s); });

  // Reveal on scroll
  const rev = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); rev.unobserve(en.target); } }), { threshold: .15 });
  $$('.reveal').forEach(el => rev.observe(el));

  // Pro-rata demo
  const holders = $$('.holder');
  const inA = $('#in-amount'), inT = $('#in-time'), you = $('#holder-you');
  const calc = () => {
    you.dataset.amount = inA.value; you.dataset.time = inT.value;
    $('#out-amount').textContent = inA.value; $('#out-time').textContent = inT.value;
    $('#you-label').textContent = `${inA.value} bag${inA.value > 1 ? 's' : ''} × ${inT.value} month${inT.value > 1 ? 's' : ''}`;
    const w = holders.map(h => h.dataset.amount * h.dataset.time);
    const total = w.reduce((a, b) => a + b, 0), max = Math.max(...w);
    holders.forEach((h, i) => {
      $('.holder__bar span', h).style.setProperty('--w', (w[i] / max * 100).toFixed(1) + '%');
      $('.holder__share', h).textContent = Math.round(w[i] / total * 100) + '%';
    });
  };
  [inA, inT].forEach(i => i.addEventListener('input', calc)); calc();

  // Card tilt
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && !reduce) $$('.card').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--ry', ((x - .5) * 14).toFixed(2) + 'deg');
      c.style.setProperty('--rx', ((.5 - y) * 12).toFixed(2) + 'deg');
      c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
    });
    c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
  });

  // Lightbox
  const cards = $$('[data-lb]'), lb = $('#lightbox'), img = $('#lb-img');
  let idx = 0, opener = null;
  const show = (i) => {
    idx = (i + cards.length) % cards.length; const c = cards[idx], d = c.dataset;
    const srcOf = (el) => el.dataset.src || `img/web/${el.dataset.img}-1280.webp`;
    img.src = srcOf(c); img.alt = ($('img', c) || $('#crew img'))?.alt || d.name;
    $('#lb-name').textContent = d.name; $('#lb-role').innerHTML = d.role; $('#lb-blurb').textContent = d.blurb;
    // preload neighbour
    new Image().src = srcOf(cards[(idx + 1) % cards.length]);
  };
  cards.forEach((c, i) => c.addEventListener('click', () => {
    opener = c; show(i);
    if (lb.showModal) lb.showModal(); else lb.setAttribute('open', '');
  }));
  const close = () => { lb.open && lb.close(); };
  lb.addEventListener('close', () => opener?.focus());
  $('.lb-close').addEventListener('click', close);
  $('.lb-prev').addEventListener('click', () => show(idx - 1));
  $('.lb-next').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
  let sx = null;
  lb.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
  lb.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null; });


  // ===== Art backgrounds: lazy-load + parallax =====
  const bgW = () => (innerWidth * (devicePixelRatio || 1) > 1200 ? 1920 : 960);
  const sbgs = $$('.sbg[data-bg]');
  const loadBg = (el) => {
    if (el.dataset.loaded) return; el.dataset.loaded = '1';
    const url = `img/web/bg-${el.dataset.bg}-${bgW()}.webp`, im = new Image();
    im.onload = () => { el.style.backgroundImage = `url(${url})`; el.classList.add('is-loaded'); };
    im.src = url;
  };
  if ('IntersectionObserver' in window) {
    const bgIO = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { loadBg(en.target); bgIO.unobserve(en.target); } }), { rootMargin: '600px 0px' });
    sbgs.forEach(el => bgIO.observe(el));
  } else sbgs.forEach(loadBg);

  const parallaxOK = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches && !reduce;
  if (parallaxOK) {
    const layers = [...sbgs, $('.hero__bg')].filter(Boolean), vis = new Set();
    const pIO = new IntersectionObserver(es => es.forEach(en => en.isIntersecting ? vis.add(en.target) : vis.delete(en.target)));
    layers.forEach(l => pIO.observe(l.parentElement));
    let ticking = false;
    const frame = () => {
      ticking = false; const vh = innerHeight;
      layers.forEach(l => {
        const sec = l.parentElement; if (!vis.has(sec)) return;
        const r = sec.getBoundingClientRect(), prog = (r.top + r.height / 2 - vh / 2) / (vh + r.height); // -0.5 .. 0.5
        const y = (prog * r.height * 0.22).toFixed(1), flip = l.classList.contains('sbg--flip') ? ' scaleX(-1)' : '';
        l.style.transform = `translate3d(0,${y}px,0)${flip}`;
      });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    addEventListener('resize', frame); frame();
  }

  // ===== Box click effects (ripple + per-box flourish) =====
  if (!reduce) document.addEventListener('pointerdown', e => {
    const box = e.target.closest('.bx'); if (!box || e.target.closest('input,textarea,select,label,a,button:not(.bx)')) return;
    const r = box.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2, rp = document.createElement('span');
    rp.className = 'ripple'; rp.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    box.append(rp); rp.addEventListener('animationend', () => rp.remove());
    if (box.tagName !== 'FORM' && box.tagName !== 'FIELDSET') {
      box.classList.remove('is-clicked'); void box.offsetWidth; box.classList.add('is-clicked');
      clearTimeout(box._ck); box._ck = setTimeout(() => box.classList.remove('is-clicked'), 1600);
    }
  });

  // ===== NFT collection preview =====
  const grid = $('#nft-grid');
  if (grid) {
    const CHUNK = 240, KEY = 'gcv-nft-revealed';
    const hash = (n) => { let h = (n * 2654435761) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b) >>> 0; h ^= h >>> 16; return h >>> 0; };
    const rarity = (n) => { const v = hash(n + 7) % 100; return v < 4 ? 'legendary' : v < 22 ? 'rare' : 'common'; }; // illustrative labels only
    const pfpOf = (n) => `img/web/pfp/pfp_${String(hash(n) % PFP_POOL + 1).padStart(2, '0')}.webp`;
    const label = { common: 'Common', rare: 'Rare', legendary: 'Legendary' };
    let revealed = new Set();
    try { revealed = new Set((JSON.parse(localStorage.getItem(KEY)) || []).filter(n => Number.isInteger(n) && n >= 1 && n <= NFT_TILES)); } catch {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...revealed])); } catch {} };
    const countEl = $('#nft-revealed'), shownEl = $('#nft-shown'), moreBtn = $('#nft-more');
    $('#nft-total').textContent = NFT_TILES.toLocaleString('en-US');
    let rendered = 0;
    const updCount = () => { countEl.textContent = revealed.size.toLocaleString('en-US'); };
    const fillBack = (t, n) => {
      const b = $('.nft__b', t); if (b.firstChild) return;
      const im = document.createElement('img'); im.src = pfpOf(n); im.alt = ''; im.width = 256; im.height = 256; im.decoding = 'async';
      const i = document.createElement('i'); i.textContent = label[t.dataset.r];
      b.append(im, i);
    };
    const renderMore = () => {
      if (rendered >= NFT_TILES) return;
      const end = Math.min(rendered + CHUNK, NFT_TILES), frag = document.createDocumentFragment();
      for (let n = rendered + 1; n <= end; n++) {
        const t = document.createElement('button'), r = rarity(n), up = revealed.has(n);
        t.type = 'button'; t.className = 'nft' + (up ? ' is-up' : ''); t.dataset.n = n; t.dataset.r = r; t.setAttribute('role', 'listitem');
        t.setAttribute('aria-label', up ? `GCV #${n}, ${label[r]} preview, revealed. Open preview` : `GCV #${n}, face down. Flip to reveal`);
        t.innerHTML = `<span class="nft__in"><span class="nft__f" style="--h:${hash(n * 31) % 360}"><span>GCV #${n}</span></span><span class="nft__b"></span></span>`;
        if (up) fillBack(t, n);
        frag.append(t);
      }
      grid.append(frag); rendered = end;
      shownEl.textContent = `Showing ${rendered.toLocaleString('en-US')} of ${NFT_TILES.toLocaleString('en-US')} tiles`;
      moreBtn.hidden = rendered >= NFT_TILES;
    };
    renderMore(); updCount();
    moreBtn.addEventListener('click', renderMore);
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { if (es[0].isIntersecting) renderMore(); }, { root: $('#nft-scroll'), rootMargin: '400px 0px' }).observe($('#nft-sentinel'));

    // modal
    const nm = $('#nft-modal'), nmImg = $('#nm-img'), nmBadge = $('#nm-badge'), nmTitle = $('#nm-title');
    let cur = 1, nmOpener = null;
    const tileOf = (n) => grid.querySelector(`.nft[data-n="${n}"]`);
    const flip = (t) => {
      const n = +t.dataset.n; if (revealed.has(n)) return false;
      fillBack(t, n); t.classList.add('is-up'); revealed.add(n); save(); updCount();
      t.setAttribute('aria-label', `GCV #${n}, ${label[t.dataset.r]} preview, revealed. Open preview`); return true;
    };
    const openModal = (n) => {
      cur = n; const r = rarity(n);
      nmImg.src = pfpOf(n); nmImg.alt = `Preview portrait for GCV #${n}: a character in the GCV art style. Preview art only.`;
      nmTitle.textContent = `GCV #${n}`; nmBadge.textContent = `${label[r]} (illustrative)`; nmBadge.dataset.r = r;
      $('.nft-modal__card').style.setProperty('--rc', r === 'legendary' ? '#ffd166' : r === 'rare' ? '#4cc9ff' : '#c9b8e6');
      if (!nm.open) { nm.showModal ? nm.showModal() : nm.setAttribute('open', ''); }
    };
    grid.addEventListener('click', e => {
      const t = e.target.closest('.nft'); if (!t) return;
      nmOpener = t; const n = +t.dataset.n;
      if (flip(t)) setTimeout(() => openModal(n), reduce ? 0 : 650); else openModal(n);
    });
    const step = (d) => {
      let n = cur + d; if (n < 1) n = NFT_TILES; if (n > NFT_TILES) n = 1;
      while (n > rendered) renderMore();
      const t = tileOf(n); if (t) { flip(t); nmOpener = t; } openModal(n);
    };
    $('#nm-prev').addEventListener('click', () => step(-1));
    $('#nm-next').addEventListener('click', () => step(1));
    $('#nm-close').addEventListener('click', () => nm.close());
    nm.addEventListener('click', e => { if (e.target === nm) nm.close(); });
    nm.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
    nm.addEventListener('close', () => { if (nmOpener && document.contains(nmOpener)) nmOpener.focus({ preventScroll: true }); });

    $('#nft-random').addEventListener('click', () => {
      const hidden = $$('.nft:not(.is-up)', grid); if (!hidden.length) { if (rendered < NFT_TILES) renderMore(); return say('All visible tiles are revealed. Load more!'); }
      const t = hidden[Math.floor(Math.random() * hidden.length)];
      t.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      nmOpener = t; flip(t); setTimeout(() => openModal(+t.dataset.n), reduce ? 0 : 800);
    });
    $('#nft-reset').addEventListener('click', () => {
      revealed.clear(); save(); updCount();
      $$('.nft.is-up', grid).forEach(t => { t.classList.remove('is-up'); t.setAttribute('aria-label', `GCV #${t.dataset.n}, face down. Flip to reveal`); });
      say('All tiles flipped back');
    });
  }

  // ===== Solana helpers (base58, PDA derivation, JSON-RPC) =====
  const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const b58decode = (str) => {
    let n = 0n;
    for (const c of str) { const i = B58.indexOf(c); if (i < 0) throw new Error('Not base58'); n = n * 58n + BigInt(i); }
    const out = [];
    while (n > 0n) { out.unshift(Number(n & 255n)); n >>= 8n; }
    for (const c of str) { if (c !== '1') break; out.unshift(0); }
    return Uint8Array.from(out);
  };
  const b58encode = (bytes) => {
    let n = 0n, s = '';
    for (const b of bytes) n = (n << 8n) + BigInt(b);
    while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
    for (const b of bytes) { if (b !== 0) break; s = '1' + s; }
    return s;
  };
  const isAddress = (s) => { if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return false; try { return b58decode(s).length === 32; } catch { return false; } };

  // ed25519 "is this 32-byte value a curve point?" (same rule as Solana's PDA check, via BigInt)
  const P = 2n ** 255n - 19n;
  const modp = (a) => ((a % P) + P) % P;
  const powp = (b, e) => { let r = 1n; b = modp(b); while (e > 0n) { if (e & 1n) r = r * b % P; b = b * b % P; e >>= 1n; } return r; };
  const D = modp(-121665n * powp(121666n, P - 2n));
  const onCurve = (bytes) => {
    let y = 0n;
    for (let i = 31; i >= 0; i--) y = (y << 8n) + BigInt(i === 31 ? bytes[i] & 0x7f : bytes[i]);
    y = modp(y);
    const y2 = y * y % P, u = modp(y2 - 1n), v = modp(D * y2 + 1n);
    const x2 = u * powp(v, P - 2n) % P;
    return x2 === 0n || powp(x2, (P - 1n) / 2n) === 1n; // x² must be a square mod p
  };
  const enc = new TextEncoder();
  const findPda = async (seeds, programId) => {
    if (!crypto.subtle) throw new Error('This browser blocks crypto here (needs HTTPS)');
    const prog = b58decode(programId), tail = enc.encode('ProgramDerivedAddress');
    for (let bump = 255; bump >= 0; bump--) {
      const parts = [...seeds, Uint8Array.of(bump), prog, tail];
      const buf = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
      parts.reduce((o, p) => (buf.set(p, o), o + p.length), 0);
      const h = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
      if (!onCurve(h)) return b58encode(h);
    }
    throw new Error('No PDA found');
  };
  const u64 = (b, o) => b.slice(o, o + 8).reduceRight((a, x) => (a << 8n) + BigInt(x), 0n);
  const b64bytes = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  let rpcIdx = 0;
  const rpc = async (method, params) => {
    let lastErr;
    for (let k = 0; k < SOLANA_RPC.length; k++) {
      const i = (rpcIdx + k) % SOLANA_RPC.length, ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 12000);
      try {
        const r = await fetch(SOLANA_RPC[i], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: ctrl.signal });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.error) throw new Error(j.error?.message || `HTTP ${r.status}`);
        rpcIdx = i; return j.result;
      } catch (e) { lastErr = e.name === 'AbortError' ? new Error('RPC timed out') : e; } finally { clearTimeout(to); }
    }
    throw lastErr;
  };

  // ===== Fee Tracker =====
  // What a browser CAN read reliably: the creator wallet's SOL balance, and the *current* balance of pump.fun's
  // creator-fee vaults (= unclaimed fees): the Pump program PDA ["creator-vault", creator] (bonding-curve fees, SOL)
  // and the PumpSwap PDA ["creator_vault", creator] -> its wrapped-SOL token account (post-graduation fees).
  // What it CANNOT read reliably: all-time *claimed* fees. That needs the full history of collectCreatorFee /
  // collect_coin_creator_fee txs (an indexer, a small backend, or a pump.fun API). Also not covered here: coins
  // quoted in a token other than SOL, and fee-sharing setups, where the curve's "creator" is a sharing-config
  // account rather than a wallet. If pump.fun changes its account layout, re-check against pump-fun/pump-public-docs.
  const PUMP = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', PUMP_AMM = 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA';
  const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', TOKEN22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
  const ATA = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', WSOL = 'So11111111111111111111111111111111111111112', NULL_KEY = '11111111111111111111111111111111';
  const BC_DISC = [23, 183, 248, 55, 96, 216, 172, 96]; // BondingCurve account discriminator (pump IDL)
  const REFRESH_MS = 30000;
  const ft = $('#ft');
  if (ft) {
    const ftStatus = $('#ft-status'), pillText = $('#ft-pill-text'), addrs = $('#ft-addrs');
    const ftForm = $('#ft-form'), ftInput = $('#ft-input'), ftErr = $('#ft-input-err'), ftReset = $('#ft-reset');
    const setVal = (k, v) => { const el = $(`[data-ft="${k}"]`, ft); if (el) el.textContent = v; };
    const sol = (lamports) => (Number(lamports) / 1e9).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    const short = (a) => `${a.slice(0, 4)}…${a.slice(-4)}`;
    const setAddr = (k, a) => {
      const dd = $(`[data-ft-addr="${k}"]`, ft); dd.textContent = '';
      if (!a) { dd.textContent = '—'; return; }
      const link = document.createElement('a');
      link.href = `https://solscan.io/account/${a}`; link.target = '_blank'; link.rel = 'noopener'; link.textContent = short(a); link.title = a;
      dd.append(link);
    };
    const setState = (state, pill, msg) => { ft.dataset.state = state; pillText.textContent = pill; if (msg != null) ftStatus.textContent = msg; };
    const clearVals = () => { ['unclaimed', 'curve', 'amm', 'wallet', 'claimed', 'phase'].forEach(k => setVal(k, '—')); setAddr('mint'); setAddr('creator'); };

    let target = null, preview = false, timer = null, busy = false, hasData = false, nextAt = 0;
    const configured = () => (TOKEN_CA || CREATOR_WALLET) ? { ca: TOKEN_CA, wallet: CREATOR_WALLET } : null;

    // Work out mint + creator for whatever was given (a CA, a wallet, or both)
    const resolve = async ({ ca, wallet }) => {
      let mint = '', creator = wallet || '', phase = '—', note = '';
      let addr = ca || wallet;
      if (!ca && wallet) { // a pasted address might be a mint: check who owns it
        const info = await rpc('getAccountInfo', [wallet, { encoding: 'base64', dataSlice: { offset: 0, length: 0 } }]);
        if (info?.value && [TOKEN, TOKEN22].includes(info.value.owner)) { addr = wallet; creator = ''; ca = wallet; }
      }
      if (ca) {
        mint = ca;
        const bc = await findPda([enc.encode('bonding-curve'), b58decode(mint)], PUMP);
        const info = await rpc('getAccountInfo', [bc, { encoding: 'base64' }]);
        const data = info?.value?.owner === PUMP ? b64bytes(info.value.data[0]) : null;
        if (!data || data.length < 81 || BC_DISC.some((b, i) => data[i] !== b)) {
          if (!creator) throw new Error(`No pump.fun bonding curve found for ${short(addr)}. Is it a pump.fun token?`);
          note = ' No pump.fun bonding curve found for that CA.';
        } else {
          const curveCreator = b58encode(data.slice(49, 81));
          phase = data[48] ? 'Graduated (PumpSwap)' : 'Bonding curve';
          if (data.length >= 115) {
            const qm = b58encode(data.slice(83, 115));
            if (qm !== NULL_KEY && qm !== WSOL) note += ' Heads-up: this coin is not quoted in SOL, so SOL vault figures may not tell the full story.';
          }
          if (creator && creator !== curveCreator) note += ` The on-chain creator (${short(curveCreator)}) differs from the configured wallet; vaults are read for the on-chain creator.`;
          return { mint, creator: creator || curveCreator, vaultKey: curveCreator, phase, note };
        }
      }
      return { mint, creator, vaultKey: creator, phase, note };
    };

    let rentMin = null;
    const load = async () => {
      if (!target || busy) return;
      busy = true;
      if (!hasData) setState('loading', 'Reading chain…', 'Reading Solana…');
      try {
        const r = await resolve(target);
        const curveVault = await findPda([enc.encode('creator-vault'), b58decode(r.vaultKey)], PUMP);
        const ammAuth = await findPda([enc.encode('creator_vault'), b58decode(r.vaultKey)], PUMP_AMM);
        const ammAta = await findPda([b58decode(ammAuth), b58decode(TOKEN), b58decode(WSOL)], ATA);
        const curveAta = await findPda([b58decode(curveVault), b58decode(TOKEN), b58decode(WSOL)], ATA); // newer curves may hold WSOL here
        if (rentMin == null) rentMin = await rpc('getMinimumBalanceForRentExemption', [0]);
        const res = await rpc('getMultipleAccounts', [[r.creator, curveVault, ammAta, curveAta], { encoding: 'base64' }]);
        const [w, cv, aa, ca] = res.value;
        const tokenAmt = (acc) => acc && acc.owner === TOKEN ? u64(b64bytes(acc.data[0]), 64) : 0n;
        const curveFees = (cv ? BigInt(Math.max(0, cv.lamports - rentMin)) : 0n) + tokenAmt(ca); // rent deposit isn't a fee
        const ammFees = tokenAmt(aa);
        setVal('wallet', sol(w ? w.lamports : 0)); setVal('curve', sol(curveFees)); setVal('amm', sol(ammFees));
        setVal('unclaimed', sol(curveFees + ammFees)); setVal('claimed', '—'); setVal('phase', r.phase);
        setAddr('mint', r.mint); setAddr('creator', r.creator); addrs.hidden = false;
        hasData = true; nextAt = Date.now() + REFRESH_MS;
        const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setState('live', preview ? 'Live · preview' : 'Live', `Updated ${t}. Refreshes every 30 s.${preview ? ' Preview only: this address is not the official $GCV contract.' : ''}${r.note}`);
      } catch (e) {
        console.warn('[GCV fee tracker]', e);
        setState('error', 'Can\'t read chain', hasData
          ? `Couldn't refresh (${e.message}). Showing the last figures read; retrying in 30 s.`
          : `Couldn't read the chain: ${e.message}. Retrying in 30 s.`);
        if (!hasData) clearVals();
      } finally { busy = false; }
    };
    const start = (t, isPreview) => {
      clearInterval(timer); target = t; preview = isPreview; hasData = false; clearVals(); addrs.hidden = true;
      ftReset.hidden = !isPreview;
      if (!target) { setState('empty', 'Waiting for contract address', 'No contract address yet. Figures show dashes until the coin is live, or paste an address below to preview.'); return; }
      load();
      timer = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden && target && hasData && Date.now() > nextAt) load(); });

    ftForm.addEventListener('submit', e => {
      e.preventDefault();
      const v = ftInput.value.trim();
      if (!isAddress(v)) {
        ftInput.setAttribute('aria-invalid', 'true'); ftErr.textContent = 'That doesn\'t look like a Solana address (32–44 base58 characters).'; ftInput.focus(); return;
      }
      ftInput.removeAttribute('aria-invalid'); ftErr.textContent = '';
      start({ ca: '', wallet: v }, true); // resolve() detects whether it's a mint or a wallet
    });
    ftReset.addEventListener('click', () => { ftInput.value = ''; start(configured(), false); ftInput.focus(); });
    start(configured(), false);
  }

  // ===== Whitelist =====
  const WL_CAP = 2026, WL_FLAG = 'gcv-wl-submitted', WL_CODE = 'gcv-wl-code';
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }, del: (k) => { try { localStorage.removeItem(k); } catch {} } };
  const wl = $('#wl-form');
  if (wl) {
    // Counter: only ever shows a real number from WL_ENDPOINT, otherwise "— / 2026"
    const claimedEl = $('#wl-claimed'), bar = $('#wl-bar'), countNote = $('#wl-count-note');
    if (WL_ENDPOINT) {
      fetch(WL_ENDPOINT, { headers: { Accept: 'application/json' } })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then(j => {
          const n = Number(j.claimed ?? j.count);
          if (!Number.isInteger(n) || n < 0) throw new Error('bad count');
          const c = Math.min(n, WL_CAP);
          claimedEl.textContent = c.toLocaleString('en-US');
          $('span', bar).style.setProperty('--w', (c / WL_CAP * 100).toFixed(2) + '%');
          bar.setAttribute('aria-valuenow', c); bar.setAttribute('aria-valuetext', `${c} of ${WL_CAP} claimed`);
          countNote.textContent = c >= WL_CAP ? 'All spots are claimed.' : 'Live count from the whitelist backend.';
        })
        .catch(e => { console.warn('[GCV whitelist count]', e); countNote.textContent = 'Couldn\'t load the live count right now.'; });
    }

    // Optional ownership code
    const gen = $('#wl-gen'), codeEl = $('#wl-code'), codeCopy = $('#wl-code-copy'), xField = $('#wl-x-field');
    const showCode = (c) => { codeEl.textContent = c; codeEl.hidden = codeCopy.hidden = xField.hidden = false; gen.textContent = 'New code'; };
    const saved = store.get(WL_CODE); if (saved) showCode(saved);
    gen.addEventListener('click', () => {
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(6)); // no 0/O/1/I mix-ups
      const c = 'GCV-' + [...r].map(x => A[x % A.length]).join('');
      store.set(WL_CODE, c); showCode(c); say(`Your code: ${c}`);
    });

    // Validation
    const f = { wallet: $('#wl-wallet'), psn: $('#wl-psn'), email: $('#wl-email'), x: $('#wl-x'), hype: $('#wl-hype') };
    const rules = {
      wallet: v => !v ? 'Enter your Solana wallet address.' : !isAddress(v) ? 'That isn\'t a valid Solana address (32–44 base58 characters, no 0, O, I or l).' : '',
      psn: v => !v ? 'Enter your PSN ID.' : !/^[A-Za-z][A-Za-z0-9_-]{2,15}$/.test(v) ? 'PSN IDs are 3–16 characters: letters, numbers, - or _, and start with a letter.' : '',
      email: v => v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'That email doesn\'t look right. Fix it or leave it empty.' : '',
      x: v => v && !/^@?[A-Za-z0-9_]{1,15}$/.test(v) ? 'X handles are up to 15 letters, numbers or _.' : '',
      hype: (_, el) => el.checked ? '' : 'Tick the box to confirm. It\'s the honor system.',
    };
    const check = (k) => {
      const el = f[k], msg = rules[k](el.type === 'checkbox' ? '' : el.value.trim(), el);
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      $(`#wl-${k}-err`).textContent = msg; return msg;
    };
    Object.keys(f).forEach(k => f[k].addEventListener(f[k].type === 'checkbox' ? 'change' : 'blur', () => { if (f[k].value.trim() || f[k].hasAttribute('aria-invalid')) check(k); }));

    const errBox = $('#wl-errors'), result = $('#wl-result'), submit = $('#wl-submit');
    const setResult = (cls, msg) => { result.className = `wl-form__result ${cls}`; result.textContent = msg; };
    const lock = (on) => { [...wl.elements].forEach(el => { if (el.id !== 'wl-gen' && el.id !== 'wl-code-copy') el.disabled = on; }); };
    const done = () => {
      const s = store.get(WL_FLAG); if (!s) return;
      lock(true); submit.textContent = 'You\'re on the list';
      setResult('is-ok', 'You\'re on the list from this browser. ');
      const again = document.createElement('button'); again.type = 'button'; again.textContent = 'Sign up a different wallet';
      again.addEventListener('click', () => { store.del(WL_FLAG); lock(false); submit.textContent = 'Claim my spot'; setResult('', ''); f.wallet.focus(); });
      result.append(again);
    };
    done();

    let sending = false;
    wl.addEventListener('submit', async e => {
      e.preventDefault();
      if (sending || store.get(WL_FLAG)) return;
      const errs = Object.keys(f).map(k => [k, check(k)]).filter(([, m]) => m);
      errBox.innerHTML = '';
      if (errs.length) {
        const ul = document.createElement('ul');
        errs.forEach(([k, m]) => { const li = document.createElement('li'), a = document.createElement('a'); a.href = `#wl-${k}`; a.textContent = m; a.addEventListener('click', ev => { ev.preventDefault(); f[k].focus(); }); li.append(a); ul.append(li); });
        errBox.append(`Please fix ${errs.length} thing${errs.length > 1 ? 's' : ''}:`, ul); errBox.hidden = false; errBox.focus();
        setResult('', ''); return;
      }
      errBox.hidden = true;
      if (!WL_ENDPOINT) { setResult('is-info', 'Signups open soon. Your details look good, but nothing was sent or saved. Check back when signups go live.'); return; }

      sending = true; submit.disabled = true; wl.setAttribute('aria-busy', 'true'); submit.textContent = 'Sending…'; setResult('', '');
      const code = store.get(WL_CODE);
      const body = {
        wallet: f.wallet.value.trim(), psn_id: f.psn.value.trim(), email: f.email.value.trim() || null,
        ps5_or_hyped: f.hype.checked, verify_code: code || null, x_handle: code ? (f.x.value.trim().replace(/^@/, '') || null) : null,
        source: 'gcv-site', submitted_at: new Date().toISOString(),
      };
      try {
        const r = await fetch(WL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || j.message || `HTTP ${r.status}`); }
        store.set(WL_FLAG, JSON.stringify({ wallet: body.wallet, at: body.submitted_at })); // the backend must still dedupe by wallet
        done(); say('You\'re on the list ✔');
      } catch (err) {
        console.warn('[GCV whitelist]', err);
        setResult('is-err', `Couldn't send that (${err.message}). Please try again in a moment.`);
        submit.disabled = false; submit.textContent = 'Claim my spot';
      } finally { sending = false; wl.removeAttribute('aria-busy'); }
    });
  }

  $('#year').textContent = new Date().getFullYear();
})();
