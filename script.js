/* Grandiose Crime Vehicle — script.js (no deps) */

/* ===== CONFIG: fill these in at launch. Everything else reads from here. ===== */
const TOKEN_CA = '';        // pump.fun mint / contract address of $GCV (leave '' until launch)
const CREATOR_WALLET = '';  // creator (dev) wallet that earns pump.fun creator fees ('' = read it from the token's bonding curve)
const WL_ENDPOINT = '/api/wl';      // whitelist backend (Vercel function). GET -> {open, claimed, cap}, POST <- signup JSON. '' = signups off
const WL_CARD_ENDPOINT = '/api/card'; // GET ?wallet=… -> {card}. The server reads TOKEN_CA from its own env, never from this file.
// Public Solana JSON-RPC nodes, tried in order. api.mainnet-beta.solana.com is rate-limited and often answers
// browser requests with 403, so it's the fallback here. For launch, put a keyed, domain-locked RPC
// (Helius, QuickNode, Triton…) first in this list.
const SOLANA_RPC = ['https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com'];
// NFT collection preview: number of face-down tiles (change to 4000 if the collection size changes)
const NFT_TILES = 2026;
// Preview portrait pool in img/web/pfp/pfp_01.webp … (preview art only, faces repeat)
const PFP_POOL = 12;
(() => {
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
  const spy = !('IntersectionObserver' in window) ? { observe() {} } : new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { navMap.forEach(a => a.classList.remove('is-active')); navMap.get(en.target.id)?.classList.add('is-active'); }
  }), { rootMargin: '-45% 0px -50% 0px' });
  navMap.forEach((_, id) => { const s = document.getElementById(id); s && spy.observe(s); });

  // Reveal on scroll: see the unified reveal controller further down

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
    const pIO = !('IntersectionObserver' in window) ? { observe() {} } : new IntersectionObserver(es => es.forEach(en => en.isIntersecting ? vis.add(en.target) : vis.delete(en.target)));
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


  // ===== Click-triggered character pop-ups =====
  const PAL = {
    skin: ['#c98a5e', '#8d5a3b', '#e0b08a', '#6b4128', '#f1c9a5', '#a86b45'],
    shirt: ['#2b0a5e', '#c2185b', '#0f766e', '#1d4ed8', '#7c2d12', '#111827', '#9333ea'],
    hat: ['#d9a441', '#1a1a1a', '#b5651d', '#e8c872', '#6b21a8', '#c0392b'],
    band: ['#ff2e93', '#18d6c8', '#ffd166', '#ff8a1f', '#4cc9ff'],
  };
  const pick = (arr, i) => arr[i % arr.length];
  const npc = (i, prop = 'none', o = {}) => {
    const skin = o.skin || pick(PAL.skin, i * 5 + 1), shirt = o.shirt || pick(PAL.shirt, i * 3 + 2), hat = o.hat || pick(PAL.hat, i * 7), band = pick(PAL.band, i * 2 + 1);
    const mask = o.mask ?? (i % 3 === 1), arm = (d) => `<path d="${d}" stroke="${shirt}" stroke-width="8" stroke-linecap="round" fill="none"/>`;
    const hand = (x, y) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${skin}"/>`;
    let p = '';
    if (prop === 'wheel') p = `${arm('M34 88 L40 104')}${arm('M66 88 L60 104')}<g class="p-wheel" style="transform-origin:50px 106px"><circle cx="50" cy="106" r="15" fill="none" stroke="#222" stroke-width="5"/><path d="M50 106V92M50 106l-12 7M50 106l12 7" stroke="#555" stroke-width="3"/><circle cx="50" cy="106" r="4" fill="#ffd166"/></g>${hand(40, 104)}${hand(60, 104)}`;
    else if (prop === 'card') p = `${arm('M34 88 L30 112')}${hand(30, 112)}<g class="p-raise" style="transform-origin:66px 88px">${arm('M66 88 L80 58')}<rect x="66" y="22" width="34" height="32" rx="4" fill="#fff" stroke="#222" stroke-width="2"/><text x="83" y="45" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="${(o.card || '').length > 2 ? 9 : 16}" fill="#1a0c36">${o.card || '10'}</text>${hand(80, 58)}</g>`;
    else if (prop === 'cash') p = `<g class="p-cheer">${arm('M34 88 L20 60')}${arm('M66 88 L80 60')}<rect x="6" y="46" width="26" height="13" rx="2" fill="#4caf6e" stroke="#1d6b3a" transform="rotate(-18 19 52)"/><rect x="68" y="46" width="26" height="13" rx="2" fill="#4caf6e" stroke="#1d6b3a" transform="rotate(18 81 52)"/>${hand(20, 60)}${hand(80, 60)}</g>`;
    else if (prop === 'hammer') p = `${arm('M34 88 L30 112')}${hand(30, 112)}<g class="p-swing" style="transform-origin:66px 88px">${arm('M66 88 L82 62')}<path d="M82 62 L90 32" stroke="#8a5a2b" stroke-width="4.5" stroke-linecap="round"/><rect x="79" y="22" width="22" height="11" rx="2" fill="#a7b4c6" stroke="#4b5563" transform="rotate(16 90 27)"/>${hand(82, 62)}</g>`;
    else if (prop === 'coin') p = `${arm('M34 88 L44 102')}${arm('M66 88 L56 102')}<circle cx="50" cy="102" r="10" fill="#ffd166" stroke="#a16207" stroke-width="2"/><text x="50" y="106.5" text-anchor="middle" font-size="12" font-weight="700" fill="#7c4a03">$</text>${hand(43, 102)}${hand(57, 102)}`;
    else if (prop === 'wave') p = `${arm('M34 88 L30 112')}${hand(30, 112)}<g class="p-raise" style="transform-origin:66px 88px">${arm('M66 88 L82 60')}${hand(82, 60)}</g>`;
    else p = `${arm('M34 88 L30 112')}${arm('M66 88 L70 112')}${hand(30, 112)}${hand(70, 112)}`;
    const eyes = mask ? `<rect x="32" y="49" width="36" height="9" rx="4.5" fill="#111"/><circle cx="43" cy="53.5" r="2" fill="#fff"/><circle cx="57" cy="53.5" r="2" fill="#fff"/>`
      : `<circle cx="44" cy="54" r="2.3" fill="#111"/><circle cx="56" cy="54" r="2.3" fill="#111"/>`;
    return `<svg class="npc" viewBox="0 0 100 130" aria-hidden="true"><path d="M26 130Q26 80 50 76Q74 80 74 130Z" fill="${shirt}"/><path d="M42 77L50 92L58 77Z" fill="${band}"/><circle cx="50" cy="56" r="17" fill="${skin}"/>${eyes}<path d="M40 63Q50 57 60 63Q55 66.5 50 63.5Q45 66.5 40 63Z" fill="#2a1a10"/><path d="M45 67.5Q50 71.5 55 67.5" stroke="#2a1a10" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="42" rx="46" ry="9.5" fill="${hat}"/><path d="M33 42Q34 15 50 13Q66 15 67 42Z" fill="${hat}"/><path d="M33.6 35Q50 30 66.4 35L66.8 39.5Q50 34.5 33.2 39.5Z" fill="${band}"/><ellipse cx="50" cy="42" rx="46" ry="9.5" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="1.6"/>${p}</svg>`;
  };
  const pfp = (n) => `img/web/pfp/pfp_${String(n).padStart(2, '0')}.webp`;
  // c = [kind, arg, bubble, bubbleSide]
  const ch = (html, d, bubble, cls = '', extra = '') => `<div class="ch ${cls}" style="--d:${d}ms"><span class="ch__in">${html}</span>${bubble ? `<span class="bubble ${bubble[1] || ''}">${bubble[0]}</span>` : ''}${extra}</div>`;
  const avatar = (n, d, bubble) => ch(`<img src="${pfp(n)}" alt="" width="128" height="128" decoding="async">`, d, bubble, 'ch--pfp');
  const sparks = '<span class="sparks">' + [-60, -30, 0, 30, 60].map(a => `<i style="--a:${a}deg"></i>`).join('') + '</span>';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const burst = (emo) => '<div class="fx-burst">' + Array.from({ length: 8 }, (_, k) => { const ang = k / 8 * Math.PI * 2; return `<i style="--k:${k};--bx:${Math.cos(ang) * 70}px;--by:${Math.sin(ang) * 55 - 20}px">${emo[k % emo.length]}</i>`; }).join('') + '</div>';
  const POPS = {
    hold: { line: 'Hands on the wheel!', ms: 7000, html: () =>
      `<div class="fx-coins"><div class="fx-coins__stack">${Array.from({ length: 10 }, (_, k) => `<i class="coin" style="--k:${k}"></i>`).join('')}</div><div class="fx-coins__num"><span data-tick="12">0</span><small>months held</small></div></div>
       <div class="pop__row">${[0, 1, 2, 3].map(i => ch(npc(i, 'wheel'), i * 110, i === 1 ? ['Hands on the wheel!', 'bubble--hi'] : i === 3 ? ["I'm not selling, I'm parking.", 'bubble--l'] : null)).join('')}</div>` },
    judge: { line: 'Order in the court!', ms: 7000, shake: 1050, html: () =>
      `<svg class="fx-gavel" viewBox="0 0 100 80" aria-hidden="true"><rect x="10" y="8" width="44" height="22" rx="5" fill="#8a5a2b" stroke="#3b2410" stroke-width="2" transform="rotate(-30 32 19)"/><path d="M38 28 L86 70" stroke="#5b3a1a" stroke-width="7" stroke-linecap="round"/><rect x="58" y="70" width="40" height="8" rx="3" fill="#3b2410"/></svg><span class="fx-bam">ORDER!</span>
       <div class="pop__row">${[['10', 'Graphics: chef\'s kiss.'], ['9'], ['7', 'Story? We\'ll see.'], ['??']].map(([c, b], i) => ch(npc(i + 4, 'card', { card: c }), i * 120, b ? [b, i === 2 ? 'bubble--hi' : ''] : null)).join('')}</div>` },
    endings: { line: 'Two endings. Tap one!', mini: true, ms: 5000, html: () =>
      `<div class="pop__row">${ch(npc(2, 'cash'), 0, ['👍 It slaps?', 'bubble--r'])}${ch(npc(5, 'hammer'), 140, ['👎 It flops?', 'bubble--l'], '', sparks)}</div>` },
    slaps: { line: 'It slaps! Make it rain.', ms: 7500, html: () => {
      const bills = Array.from({ length: 22 }, () => `<i class="bill" style="--x:${rnd(0, 92)}%;--y:${rnd(0, 300)}px;--r:${rnd(-40, 40)}deg;--t:${rnd(1.6, 2.8)}s;--dl:${rnd(0, 1.4)}s">$</i>`).join('');
      const conf = Array.from({ length: 26 }, (_, k) => `<i class="conf" style="--x:${rnd(0, 98)}%;--y:${rnd(0, 320)}px;--r:${rnd(0, 360)}deg;--t:${rnd(1.4, 2.4)}s;--dl:${rnd(0, 1.2)}s;--c:${pick(['#ff2e93', '#ffd166', '#18d6c8', '#ff8a1f', '#a66bff'], k)}"></i>`).join('');
      return `<div class="fx-rain">${bills}${conf}</div><div class="pop__row">${ch(npc(1, 'cash', { mask: true }), 0, ['We eatin\'!', 'bubble--r'])}${avatar(3, 150, ['Told you to hold.', 'bubble--hi'])}${ch(npc(6, 'cash'), 260)}${ch(npc(8, 'cash', { mask: true }), 360, ['Pro rata, baby!', 'bubble--l'])}</div>`;
    } },
    flops: { line: 'It flops? Hold my hammer.', ms: 7500, html: () =>
      `<div class="fx-blue"><svg viewBox="0 0 200 70" preserveAspectRatio="xMidYMid meet"><path d="M10 52 Q12 42 24 40 L60 38 L76 22 Q80 19 92 19 L126 19 Q136 19 144 30 L152 38 L182 40 Q192 42 192 52 L192 56 L10 56Z"/><path d="M40 56a10 10 0 1 0 0.1 0M160 56a10 10 0 1 0 0.1 0"/><path d="M82 24 L124 24 L136 36 L74 36Z"/></svg><span>GTA VI (but better) · draft v0.1</span></div>
       <div class="pop__row">${ch(npc(3, 'hammer'), 0, ['Hold my hammer.', 'bubble--r'], '', sparks)}${ch(npc(7, 'hammer', { mask: false }), 140, null, '', sparks)}${ch(npc(9, 'hammer'), 280, ['We build our own.', 'bubble--l bubble--hi'], '', sparks)}</div>` },
    lock: { line: 'Locked till VI.', mini: true, html: () => `${burst(['🔒', '✨'])}<div class="pop__row">${ch(npc(1, 'coin', { mask: true }), 0, ['Fees stay locked till VI. 🔒', 'bubble--r'])}${avatar(6, 150)}</div>` },
    math: { line: 'Bags times time.', mini: true, html: () => `<div class="pop__row">${ch(npc(4, 'card', { card: '×' }), 0, ['Bags × time. Simple math.', 'bubble--r'])}${ch(npc(10, 'card', { card: '%' }), 140)}</div>` },
    vault: { line: 'Still in the vault.', mini: true, html: () => `${burst(['💰', '✨', '🪙'])}<div class="pop__row">${ch(npc(2, 'cash', { mask: true }), 0, ['Still in the vault.', 'bubble--r'])}${ch(npc(11, 'wave'), 130)}</div>` },
    curve: { line: 'Pre-graduation fees.', mini: true, html: () => `<div class="pop__row">${ch(npc(5, 'card', { card: '📈' }), 0, ['Pre-grad fees live here.'])}</div>` },
    swap: { line: 'Swap swap.', mini: true, html: () => `<div class="pop__row">${ch(npc(6, 'coin'), 0, ['Wrapped and waiting.', 'bubble--r'])}${ch(npc(7, 'coin'), 120)}</div>` },
    wallet: { line: 'Not a fee figure, chief.', mini: true, html: () => `<div class="pop__row">${avatar(10, 0, ['Not a fee figure, chief.'])}</div>` },
    claims: { line: 'Needs an indexer, boss.', mini: true, html: () => `<div class="pop__row">${ch(npc(4, 'card', { card: '???', mask: true }), 0, ['Needs an indexer, boss.'])}</div>` },
    live: { line: "We're live!", mini: true, html: () => `${burst(['🎉', '⭐'])}<div class="pop__row">${ch(npc(0, 'wave'), 0, ["We're live!", 'bubble--r'])}${avatar(2, 140)}</div>` },
    crew: { line: 'Bring the whole crew.', mini: true, html: () => `<div class="pop__row">${[3, 5, 8].map((i, k) => ch(npc(i, 'wave'), k * 110, k === 1 ? ['Bring the whole crew!', 'bubble--hi'] : null)).join('')}</div>` },
    film: { line: 'Lights, camera, sombrero!', mini: true, html: () => `<div class="pop__row">${ch(npc(9, 'card', { card: 'ACTION' }), 0, ['Lights, camera, sombrero!'])}</div>` },
    fumble: { line: 'Only if they fumble.', mini: true, html: () => `<div class="pop__row">${ch(npc(12, 'hammer'), 0, ['Only if they fumble.', 'bubble--r'], '', sparks)}${avatar(7, 140)}</div>` },
    ticket: { line: '2026 spots. Do not be late.', mini: true, html: () => `${burst(['🎟️', '✨'])}<div class="pop__row">${ch(npc(3, 'card', { card: '2026' }), 0, ['Save me a spot!', 'bubble--r'])}${avatar(12, 140)}</div>` },
  };
  const popLive = $('#pop-live');
  let active = null;
  const dismiss = () => {
    if (!active) return; const a = active; active = null;
    clearTimeout(a.timer); a.trigger.classList.remove('is-popped'); a.el.classList.add('out');
    setTimeout(() => a.el.remove(), reduce ? 0 : 260);
  };
  const openPop = (trigger) => {
    const key = trigger.dataset.pop, cfg = POPS[key]; if (!cfg) return;
    dismiss();
    const anchor = trigger.dataset.popAnchor ? trigger.closest(trigger.dataset.popAnchor) : trigger;
    const r = anchor.getBoundingClientRect(), el = document.createElement('div');
    el.className = 'pop' + (cfg.mini ? ' pop--mini' : '') + ` pop--${key}`;
    el.style.cssText = `left:${r.left + scrollX}px;top:${r.top + scrollY}px;width:${r.width}px;height:${Math.max(r.height, cfg.mini ? 150 : 260)}px`;
    el.innerHTML = cfg.html() + '<button class="pop__close" type="button" aria-label="Close animation">✕</button>';
    document.body.append(el);
    trigger.classList.add('is-popped');
    popLive.textContent = cfg.line;
    active = { el, trigger, w: innerWidth, timer: setTimeout(dismiss, cfg.ms || 5000) };
    $('.pop__close', el).addEventListener('click', e => { e.stopPropagation(); dismiss(); trigger.focus({ preventScroll: true }); });
    // tickers (coin counter)
    $$('[data-tick]', el).forEach(t => {
      const end = +t.dataset.tick; if (reduce) { t.textContent = end; return; }
      let v = 0; const iv = setInterval(() => { v++; t.textContent = v; if (v >= end || !document.contains(t)) clearInterval(iv); }, 210);
    });
    if (cfg.shake && !reduce) setTimeout(() => { if (active?.el !== el) return; const m = $('#main'); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake'); setTimeout(() => m.classList.remove('shake'), 500); }, cfg.shake);
  };
  $$('[data-pop]').forEach(t => {
    const hint = document.createElement('span'); hint.className = 'tap-hint'; hint.setAttribute('aria-hidden', 'true');
    hint.textContent = t.classList.contains('ending') ? 'tap me ✦' : 'tap ✦'; t.append(hint);
  });
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-pop]');
    if (t && !e.target.closest('input,select,textarea,label,a,button,output')) {
      if (active && active.trigger === t) dismiss(); else openPop(t);
      return;
    }
    if (active && !e.target.closest('.pop')) dismiss();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && active) { const t = active.trigger; dismiss(); t.focus({ preventScroll: true }); return; }
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.matches?.('[data-pop]')) { e.preventDefault(); if (active && active.trigger === t) dismiss(); else openPop(t); }
  });
  addEventListener('resize', () => { if (active && Math.abs(innerWidth - active.w) > 40) dismiss(); });

  // ===== Scroll interactivity =====
  // Wanted-level meter + lowrider road (transform only)
  const fill = $('.hud__fill'), car = $('.hud__car'), stars = $$('.hud .star'), starFills = stars.map(s => $('b', s));
  let lastY = scrollY, lastLit = -1, hopT, hudTick = false;
  const hud = () => {
    hudTick = false;
    const max = document.documentElement.scrollHeight - innerHeight, p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    fill.style.transform = `scaleX(${p.toFixed(4)})`;
    car.style.transform = `translate3d(${(p * (innerWidth - car.offsetWidth)).toFixed(1)}px,0,0)`;
    if (scrollY !== lastY) {
      car.classList.toggle('rev', scrollY < lastY);
      if (!reduce) { car.classList.add('hop'); clearTimeout(hopT); hopT = setTimeout(() => car.classList.remove('hop'), 360); }
    }
    lastY = scrollY;
    const lv = p * 5; let lit = 0;
    starFills.forEach((b, i) => { const s = Math.min(1, Math.max(0, lv - i)); b.style.transform = `scale(${s.toFixed(3)})`; if (s >= 1) lit = i + 1; });
    if (lit > lastLit && lastLit >= 0 && lit > 0 && !reduce) { const st = stars[lit - 1]; st.classList.remove('lit'); void st.offsetWidth; st.classList.add('lit'); }
    lastLit = lit;
  };
  addEventListener('scroll', () => { if (!hudTick) { hudTick = true; requestAnimationFrame(hud); } }, { passive: true });
  addEventListener('resize', hud); hud();

  // Staggered reveals per section + heading entrances
  $$('.cast li, .nft-bar, .nft-scroll, .crew__cap, .footer__inner > *, .section .lede').forEach(el => el.classList.add('reveal'));
  $$('section').forEach(sec => {
    $$('.reveal', sec).forEach((el, i) => {
      el.style.setProperty('--i', Math.min(i, 7));
      if (!reduce) el.classList.add(el.matches('.cast li') ? 'rv-z' : el.matches('.phase, .stat') ? (i % 2 ? 'rv-r' : 'rv-l') : 'x');
    });
  });
  $$('.footer .reveal').forEach((el, i) => el.style.setProperty('--i', i));
  // Unified reveal controller with failsafes. Content must never stay hidden:
  //  1) IntersectionObserver (generous margin, threshold 0) reveals as things approach the viewport
  //  2) a scroll/resize catch-up pass reveals anything already above the viewport bottom (covers
  //     missed or throttled IO callbacks, anchor jumps, fast flings)
  //  3) no IO support, printing, or a 4 s timeout -> reveal everything (plus a CSS-only failsafe
  //     animation in style.css in case this script dies after adding .js)
  document.documentElement.classList.add('js'); // hides .reveal etc.; added only once the controller below is guaranteed to run
  const revealTargets = $$('.reveal, .section .h2, .crew .h2, .section .eyebrow, .crew .eyebrow');
  const showEl = (el) => { if (el.classList.contains('in')) return; el.classList.add('in'); setTimeout(() => el.classList.add('done'), 1500); };
  const revealAll = () => { revealTargets.forEach(showEl); document.documentElement.classList.add('revealed-all'); };
  let pending = revealTargets.slice();
  const catchUp = () => {
    const lim = innerHeight * 1.05;
    pending = pending.filter(el => { if (el.classList.contains('in')) return false; if (el.getBoundingClientRect().top < lim) { showEl(el); return false; } return true; });
  };
  if ('IntersectionObserver' in window) {
    const rio = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { showEl(en.target); rio.unobserve(en.target); } }), { rootMargin: '0px 0px 10% 0px', threshold: 0 });
    revealTargets.forEach(el => rio.observe(el));
    let cuTick = false;
    const onCU = () => { if (!cuTick && pending.length) { cuTick = true; requestAnimationFrame(() => { cuTick = false; catchUp(); }); } };
    addEventListener('scroll', onCU, { passive: true }); addEventListener('resize', onCU); addEventListener('hashchange', () => setTimeout(catchUp, 50));
    catchUp(); addEventListener('load', catchUp);
    setTimeout(revealAll, 4000);
  } else revealAll();
  addEventListener('beforeprint', revealAll);

  // Animated number counters
  const countIO = !('IntersectionObserver' in window) ? { observe() {}, unobserve() {} } : new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return; const el = en.target; countIO.unobserve(el);
    const end = +el.dataset.count, pad = +el.dataset.pad || 0, fmt = (v) => pad ? String(v).padStart(pad, '0') : v.toLocaleString('en-US');
    if (reduce) { el.textContent = fmt(end); return; }
    const t0 = performance.now(), dur = end > 100 ? 1400 : 900;
    const tick = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(end * e)); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), { threshold: .6 });
  const nftTotal = $('#nft-total'); if (nftTotal) nftTotal.dataset.count = NFT_TILES;
  $$('[data-count]').forEach(el => countIO.observe(el));

  // Floating sombreros / cash / coins with parallax (desktop only)
  if (parallaxOK) {
    const SOMB = '<svg viewBox="0 0 100 50"><ellipse cx="50" cy="38" rx="48" ry="10" fill="#ffd166"/><path d="M30 38Q32 6 50 4Q68 6 70 38Z" fill="#ffb81f"/><path d="M31 30Q50 24 69 30L69.6 35Q50 29 30.4 35Z" fill="#ff2e93"/></svg>';
    const BILL = '<svg viewBox="0 0 60 30"><rect x="1" y="1" width="58" height="28" rx="3" fill="#4caf6e" stroke="#1d6b3a" stroke-width="2"/><circle cx="30" cy="15" r="8" fill="none" stroke="#1d6b3a" stroke-width="2"/><text x="30" y="20" text-anchor="middle" font-size="13" font-weight="700" fill="#1d6b3a">$</text></svg>';
    const COIN = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#ffd166" stroke="#a16207" stroke-width="3"/><text x="20" y="26" text-anchor="middle" font-size="17" font-weight="700" fill="#7c4a03">$</text></svg>';
    const wrap = document.createElement('div'); wrap.className = 'floaters'; wrap.setAttribute('aria-hidden', 'true');
    const items = Array.from({ length: 12 }, (_, k) => {
      const f = document.createElement('div'), side = k % 2 ? rnd(88, 97) : rnd(0.5, 8);
      f.className = 'floater'; f.innerHTML = [SOMB, BILL, COIN][k % 3];
      f.style.cssText = `--x:${side}%;--s:${[54, 40, 28][k % 3] * rnd(.8, 1.25)}px;--t:${rnd(2.5, 5)}s`;
      wrap.append(f); return { f, base: rnd(0, 1), depth: rnd(.15, .55) };
    });
    document.body.append(wrap);
    let ft2 = false;
    const floatFrame = () => {
      ft2 = false; const span = innerHeight + 160;
      items.forEach(it => { let y = (it.base * span - scrollY * it.depth) % span; if (y < 0) y += span; it.f.style.transform = `translate3d(0,${(y - 80).toFixed(1)}px,0)`; });
    };
    addEventListener('scroll', () => { if (!ft2) { ft2 = true; requestAnimationFrame(floatFrame); } }, { passive: true });
    addEventListener('resize', floatFrame); floatFrame();
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
  const WL_CAP = 2026, WL_FLAG = 'gcv-wl-submitted', WL_CODE = 'gcv-wl-code', WL_WALLET = 'gcv-wl-wallet';
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }, del: (k) => { try { localStorage.removeItem(k); } catch {} } };
  const wl = $('#wl-form');
  if (wl) {
    const NS = 'http://www.w3.org/2000/svg';
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const TIER = {
      priority: { label: 'PRIORITY', stars: 5 }, holder: { label: 'HOLDER', stars: 3 },
      inactive: { label: 'INACTIVE', stars: 0 }, pending: { label: 'PENDING', stars: 1 },
    };
    const fmtNum = (n) => n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: n >= 100 ? 0 : 2 });
    const short = (w) => w.slice(0, 4) + '…' + w.slice(-4);

    // ---- Deterministic avatar (SVG built from the wallet hash seed; same wallet = same face) ----
    function avatarSVG(seed) {
      const b = (seed.match(/../g) || []).map(h => parseInt(h, 16)), pick = (a, i) => a[b[i % b.length] % a.length];
      const bg = pick([['#2b0a5e', '#ff2e93', '#ffd166'], ['#150a2b', '#c23cff', '#ff8a1f'], ['#4a1590', '#ff8a1f', '#ffe36e'], ['#0c0618', '#18d6c8', '#ff2e93'], ['#2b0a5e', '#4c8dff', '#ff8cc3'], ['#3a0a4a', '#ff4d4d', '#ffd166']], 0);
      const skin = pick(['#f2c9a0', '#e0a878', '#c68642', '#a0693a', '#7a4a2a', '#f5d6b8'], 1);
      const shirt = pick(['#ff2e93', '#18d6c8', '#ffd166', '#c23cff', '#ff8a1f', '#f6eefe'], 2);
      const hatC = pick(['#ffd166', '#ff2e93', '#f6eefe', '#18d6c8', '#c23cff', '#ff8a1f'], 5);
      const hair = pick(['#1a0f10', '#3b2417', '#0c0618', '#7a3b1a', '#ffd166', '#c23cff'], 6);
      const head = b[3] % 5, shades = b[4] & 1, stache = b[4] & 2, chain = b[7] & 1, id = 'a' + seed;
      let o = `<svg xmlns="${NS}" viewBox="0 0 120 120" role="img" aria-label="Generated crew avatar"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient></defs>`;
      o += `<rect width="120" height="120" fill="url(#${id})"/><circle cx="60" cy="70" r="30" fill="${bg[2]}" opacity=".85"/>`;
      o += `<g stroke="${bg[0]}" stroke-width="2" opacity=".5"><path d="M0 78h120M0 86h120M0 94h120"/></g>`;
      if (head === 4) o += `<circle cx="60" cy="40" r="28" fill="${hair}"/>`;
      o += `<path d="M12 120C14 92 36 84 60 84s46 8 48 36z" fill="${shirt}"/><path d="M46 84l14 14 14-14" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/>`;
      o += `<rect x="51" y="72" width="18" height="16" rx="6" fill="${skin}"/><rect x="51" y="72" width="18" height="6" fill="rgba(0,0,0,.18)"/>`;
      o += `<ellipse cx="38" cy="58" rx="4" ry="6" fill="${skin}"/><ellipse cx="82" cy="58" rx="4" ry="6" fill="${skin}"/><ellipse cx="60" cy="56" rx="22" ry="26" fill="${skin}"/>`;
      if (shades) o += `<rect x="38" y="50" width="20" height="10" rx="4" fill="#0c0618"/><rect x="62" y="50" width="20" height="10" rx="4" fill="#0c0618"/><rect x="57" y="53" width="6" height="2.5" fill="#0c0618"/><path d="M41 52l7 0" stroke="rgba(255,255,255,.55)" stroke-width="1.6"/><path d="M65 52l7 0" stroke="rgba(255,255,255,.55)" stroke-width="1.6"/>`;
      else o += `<circle cx="49" cy="54" r="4" fill="#fff"/><circle cx="71" cy="54" r="4" fill="#fff"/><circle cx="50" cy="55" r="2" fill="#150a2b"/><circle cx="72" cy="55" r="2" fill="#150a2b"/>`;
      o += `<path d="M58 60q2 6 4 6" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1.6" stroke-linecap="round"/>`;
      o += stache ? `<path d="M47 71q13-8 26 0q-13 5-26 0z" fill="#1a0f10"/>` : `<path d="M51 71q9 7 18 0" fill="none" stroke="#7a2a2a" stroke-width="2.4" stroke-linecap="round"/>`;
      if (head === 0) o += `<ellipse cx="60" cy="36" rx="54" ry="11" fill="${hatC}"/><path d="M38 36Q38 6 60 6t22 30z" fill="${hatC}"/><rect x="38" y="28" width="44" height="6" fill="${bg[1]}"/><ellipse cx="60" cy="38" rx="54" ry="11" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`;
      if (head === 1) o += `<path d="M38 46Q60 22 82 46L82 38Q60 14 38 38z" fill="${hatC}"/><circle cx="82" cy="44" r="5" fill="${hatC}"/><path d="M84 46l8 8M84 48l4 10" stroke="${hatC}" stroke-width="3" stroke-linecap="round"/><circle cx="52" cy="32" r="1.6" fill="rgba(0,0,0,.3)"/><circle cx="64" cy="29" r="1.6" fill="rgba(0,0,0,.3)"/>`;
      if (head === 2) o += `<path d="M37 52Q33 22 60 22t23 30Q76 36 60 36T37 52z" fill="${hair}"/>`;
      if (head === 3) o += `<path d="M54 34L55 6h10l1 28z" fill="${hatC}"/><path d="M40 44Q42 32 54 32M80 44Q78 32 66 32" fill="none" stroke="${hair}" stroke-width="4"/>`;
      if (head === 4) o += `<path d="M38 48Q40 34 60 34t22 14Q72 40 60 40T38 48z" fill="${hair}"/>`;
      if (chain) o += `<path d="M44 90Q60 108 76 90" fill="none" stroke="#ffd166" stroke-width="3"/><circle cx="60" cy="102" r="4" fill="#ffd166"/>`;
      return o + '</svg>';
    }

    // ---- Card (DOM) ----
    const slot = $('#wl-card-slot'), emptyMsg = $('#wl-card-empty');
    let shown = null, shownKey = '';
    const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : 'off'}">★</span>`).join('');
    function cardHTML(c) {
      const t = TIER[c.tier] || TIER.pending, arrow = c.trend === 'up' ? '▲' : c.trend === 'down' ? '▼' : '▬';
      const trendTxt = c.trend === 'up' ? `up ${fmtNum(c.trendDelta)}` : c.trend === 'down' ? `down ${fmtNum(Math.abs(c.trendDelta))}` : 'no change';
      const joined = c.joinedAt ? new Date(c.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
      return `<div class="gcard__top"><span class="gcard__brand">GCV · CREW ID</span><span class="gcard__tier">${t.label}</span></div>
        <div class="gcard__avatar">${avatarSVG(c.avatarSeed)}</div>
        <h4 class="gcard__alias">${esc(c.alias)}</h4>
        <div class="gcard__stars" role="img" aria-label="Wanted level ${t.stars} of 5">${stars(t.stars)}</div>
        <dl class="gcard__stats">
          <div><dt>Spot</dt><dd>#${esc(String(c.spot || 0).padStart(4, '0'))} / ${WL_CAP}</dd></div>
          <div><dt>Rank</dt><dd>${esc(c.rank || '—')}</dd></div>
          <div class="wide"><dt>$GCV balance</dt><dd>${esc(fmtNum(c.balance))}${c.balance != null ? `<span class="gcard__trend ${esc(c.trend || 'flat')}" title="Change since the last balance change we saw"><span aria-hidden="true">${arrow}</span> ${esc(trendTxt)}</span>` : ''}</dd></div>
          <div><dt>Share of supply</dt><dd>${c.share == null ? '—' : esc(c.share) + '%'}</dd></div>
          <div><dt>PSN ID</dt><dd>${c.psn ? esc(c.psn) : 'none'}</dd></div>
          <div class="wide"><dt>Joined</dt><dd>${esc(joined)}</dd></div>
        </dl>
        <p class="gcard__msg">${esc(c.message || '')}</p>
        <div class="gcard__foot"><span class="gcard__wallet" title="Wallet">${esc(short(c.wallet))}</span>
          <span class="gcard__btns"><button class="btn btn--small btn--ghost" type="button" data-act="dl">Download card</button><button class="btn btn--small btn--ghost" type="button" data-act="forget">Hide</button></span></div>
        <p class="gcard__upd" data-upd>Live balance. Updates itself every minute.</p>`;
    }
    function showCard(c, animate) {
      const key = JSON.stringify({ ...c, updatedAt: 0 });
      shown = c;
      if (key === shownKey && slot.querySelector('.gcard')) { return; }
      const first = !slot.querySelector('.gcard') || slot.querySelector('.gcard').dataset.w !== c.wallet;
      shownKey = key; emptyMsg.hidden = true;
      let el = slot.querySelector('.gcard');
      if (!el) { el = document.createElement('article'); slot.append(el); }
      el.className = `gcard gcard--${c.tier}` + ((animate || first) && !reduce ? ' is-in' : '');
      el.dataset.w = c.wallet;
      el.setAttribute('aria-label', `Crew card for ${c.alias}, tier ${(TIER[c.tier] || TIER.pending).label}`);
      el.innerHTML = cardHTML(c);
      el.tabIndex = -1;
    }
    function clearCard() { const el = slot.querySelector('.gcard'); if (el) el.remove(); shown = null; shownKey = ''; emptyMsg.hidden = false; }

    // ---- Download card as PNG (SVG -> canvas) ----
    function cardSVG(c) {
      const t = TIER[c.tier] || TIER.pending, W = 600, H = 860, col = { priority: ['#ffd166', '#ff2e93'], holder: ['#18d6c8', '#4c8dff'], inactive: ['#6c5a8c', '#3b2d57'], pending: ['#ff8a1f', '#c23cff'] }[c.tier] || ['#ff8a1f', '#c23cff'];
      const av = avatarSVG(c.avatarSeed).replace('<svg ', '<svg x="140" y="120" width="320" height="320" ');
      const st = Array.from({ length: 5 }, (_, i) => `<text x="${220 + i * 40}" y="522" font-size="34" fill="${i < t.stars ? '#ffd166' : '#ffffff33'}" text-anchor="middle">★</text>`).join('');
      const rows = [['SPOT', `#${String(c.spot || 0).padStart(4, '0')} / ${WL_CAP}`], ['RANK', c.rank || '—'], ['$GCV BALANCE', fmtNum(c.balance) + (c.trend === 'up' ? '  ▲' : c.trend === 'down' ? '  ▼' : '')], ['PSN ID', c.psn || 'none']];
      const r = rows.map(([k, v], i) => `<text x="70" y="${590 + i * 44}" font-size="16" letter-spacing="3" fill="#b9a8d6" font-family="Arial,sans-serif" font-weight="700">${esc(k)}</text><text x="530" y="${590 + i * 44}" font-size="24" fill="#f6eefe" text-anchor="end" font-family="Arial,sans-serif" font-weight="700">${esc(v)}</text>`).join('');
      return `<svg xmlns="${NS}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="bd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${col[0]}"/><stop offset="1" stop-color="${col[1]}"/></linearGradient><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0e55"/><stop offset="1" stop-color="#0c0618"/></linearGradient><clipPath id="cp"><circle cx="300" cy="280" r="160"/></clipPath></defs>
        <rect width="${W}" height="${H}" rx="36" fill="url(#bd)"/><rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="30" fill="url(#bg)"/>
        <text x="50" y="68" font-size="26" fill="${col[0]}" font-family="Impact,'Arial Black',sans-serif" letter-spacing="2">GCV · CREW ID</text>
        <rect x="400" y="38" width="150" height="40" rx="20" fill="url(#bd)"/><text x="475" y="65" font-size="18" fill="#0c0618" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" letter-spacing="3">${t.label}</text>
        <g clip-path="url(#cp)">${av}</g><circle cx="300" cy="280" r="160" fill="none" stroke="${col[0]}" stroke-width="8"/>
        <text x="300" y="486" font-size="${c.alias.length > 26 ? 27 : 32}" fill="#f6eefe" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif">${esc(c.alias.toUpperCase())}</text>${st}${r}
        <text x="70" y="810" font-size="15" fill="#b9a8d6" font-family="monospace">${esc(short(c.wallet))}</text><text x="530" y="810" font-size="15" fill="#b9a8d6" text-anchor="end" font-family="Arial,sans-serif">grandoisecrimevehicle.fun</text></svg>`;
    }
    function downloadCard(c) {
      const url = URL.createObjectURL(new Blob([cardSVG(c)], { type: 'image/svg+xml;charset=utf-8' })), img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 1720;
        cv.getContext('2d').drawImage(img, 0, 0, 1200, 1720); URL.revokeObjectURL(url);
        cv.toBlob(bl => {
          if (!bl) return say('Couldn\'t build the PNG on this browser.');
          const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = `gcv-crew-card-${String(c.spot || 0).padStart(4, '0')}.png`;
          document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); say('Card saved ✔');
        }, 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); say('Couldn\'t build the PNG on this browser.'); };
      img.src = url;
    }
    slot.addEventListener('click', e => {
      const b = e.target.closest('button[data-act]'); if (!b || !shown) return;
      if (b.dataset.act === 'dl') downloadCard(shown);
      if (b.dataset.act === 'forget') { store.del(WL_WALLET); stopRefresh(); clearCard(); say('Card hidden. Look it up anytime with your wallet.'); }
    });

    // ---- API ----
    async function fetchCard(wallet) {
      const r = await fetch(`${WL_CARD_ENDPOINT}?wallet=${encodeURIComponent(wallet)}`, { headers: { Accept: 'application/json' } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error(j.message || j.error || `HTTP ${r.status}`); e.status = r.status; throw e; }
      return j.card;
    }
    let refreshTimer = null, lastAt = 0;
    const stopRefresh = () => { clearInterval(refreshTimer); refreshTimer = null; };
    async function refresh() {
      const w = store.get(WL_WALLET); if (!w || document.hidden) return;
      try {
        const c = await fetchCard(w); lastAt = Date.now(); showCard(c, false);
        const u = slot.querySelector('[data-upd]'); if (u) u.textContent = 'Live balance. Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '.';
      } catch (e) { if (e.status === 404) { store.del(WL_WALLET); store.del(WL_FLAG); stopRefresh(); clearCard(); unlock(); } else console.warn('[GCV card]', e); }
    }
    function startRefresh() { stopRefresh(); refreshTimer = setInterval(refresh, 60000); }
    document.addEventListener('visibilitychange', () => { if (!document.hidden && store.get(WL_WALLET) && Date.now() - lastAt > 60000) refresh(); });

    // Lookup form
    const lk = $('#wl-lookup'), lkIn = $('#wl-lookup-wallet'), lkErr = $('#wl-lookup-err'), lkGo = $('#wl-lookup-go');
    lk.addEventListener('submit', async e => {
      e.preventDefault();
      const v = lkIn.value.trim();
      if (!isAddress(v)) { lkIn.setAttribute('aria-invalid', 'true'); lkErr.textContent = 'That isn\'t a valid Solana address (32–44 base58 characters).'; lkIn.focus(); return; }
      lkIn.removeAttribute('aria-invalid'); lkErr.textContent = ''; lkGo.disabled = true; lkGo.textContent = 'Looking…';
      try { const c = await fetchCard(v); showCard(c, true); lastAt = Date.now(); store.set(WL_WALLET, v); startRefresh(); slot.querySelector('.gcard')?.focus({ preventScroll: true }); }
      catch (err) { lkErr.textContent = err.status === 404 ? 'No whitelist card for that wallet yet. Sign up above.' : `Couldn't load that card (${err.message}).`; }
      finally { lkGo.disabled = false; lkGo.textContent = 'Find card'; }
    });

    // ---- Counter: only a real number from the API, otherwise "— / 2026" ----
    const claimedEl = $('#wl-claimed'), bar = $('#wl-bar'), countNote = $('#wl-count-note');
    const loadCount = () => {
      if (!WL_ENDPOINT) { countNote.textContent = 'The counter goes live when signups open.'; return; }
      fetch(WL_ENDPOINT, { headers: { Accept: 'application/json' } })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then(j => {
          if (j.open === false) { countNote.textContent = 'Signups open soon.'; return; }
          const n = Number(j.claimed ?? j.count);
          if (!Number.isInteger(n) || n < 0) throw new Error('bad count');
          const c = Math.min(n, WL_CAP);
          claimedEl.textContent = c.toLocaleString('en-US');
          $('span', bar).style.setProperty('--w', (c / WL_CAP * 100).toFixed(2) + '%');
          bar.setAttribute('aria-valuenow', c); bar.setAttribute('aria-valuetext', `${c} of ${WL_CAP} claimed`);
          countNote.textContent = c >= WL_CAP ? 'All spots are claimed.' : j.tokenLive === false ? 'Live count. Signups need a wallet holding $GCV, so spots open at token launch.' : 'Live count from the whitelist backend.';
        })
        .catch(e => { console.warn('[GCV whitelist count]', e); countNote.textContent = 'Couldn\'t load the live count right now.'; });
    };
    loadCount();

    // ---- Optional ownership code ----
    const gen = $('#wl-gen'), codeEl = $('#wl-code'), codeCopy = $('#wl-code-copy'), xField = $('#wl-x-field');
    const showCode = (c) => { codeEl.textContent = c; codeEl.hidden = codeCopy.hidden = xField.hidden = false; gen.textContent = 'New code'; };
    const saved = store.get(WL_CODE); if (saved) showCode(saved);
    gen.addEventListener('click', () => {
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(6)); // no 0/O/1/I mix-ups
      const c = 'GCV-' + [...r].map(x => A[x % A.length]).join('');
      store.set(WL_CODE, c); showCode(c); say(`Your code: ${c}`);
    });

    // ---- Validation (PSN is optional) ----
    const f = { wallet: $('#wl-wallet'), psn: $('#wl-psn'), email: $('#wl-email'), x: $('#wl-x'), hype: $('#wl-hype') };
    const rules = {
      wallet: v => !v ? 'Enter your Solana wallet address.' : !isAddress(v) ? 'That isn\'t a valid Solana address (32–44 base58 characters, no 0, O, I or l).' : '',
      psn: v => v && !/^[A-Za-z][A-Za-z0-9_-]{2,15}$/.test(v) ? 'PSN IDs are 3–16 characters: letters, numbers, - or _, and start with a letter. Or leave it empty.' : '',
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
    function unlock() { lock(false); submit.textContent = 'Claim my spot'; setResult('', ''); }
    const done = () => {
      if (!store.get(WL_FLAG)) return;
      lock(true); submit.textContent = 'You\'re on the list';
      setResult('is-ok', 'You\'re on the list from this browser. Your crew card is below. ');
      const again = document.createElement('button'); again.type = 'button'; again.textContent = 'Sign up a different wallet';
      again.addEventListener('click', () => { store.del(WL_FLAG); unlock(); f.wallet.focus(); });
      result.append(again);
    };
    done();

    // Returning visitor: show their card straight away, then keep it live.
    if (WL_ENDPOINT && store.get(WL_WALLET)) { refresh().then(() => { if (shown) startRefresh(); }); }

    const t0 = Date.now(); let sending = false;
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

      sending = true; submit.disabled = true; wl.setAttribute('aria-busy', 'true'); submit.textContent = 'Checking your wallet…'; setResult('', '');
      const code = store.get(WL_CODE);
      const body = {
        wallet: f.wallet.value.trim(), psn: f.psn.value.trim() || null, email: f.email.value.trim() || null,
        hype: f.hype.checked, code: code || null, x: code ? (f.x.value.trim().replace(/^@/, '') || null) : null,
        website: $('#wl-website').value, t: Date.now() - t0,
      };
      try {
        const r = await fetch(WL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({}));
        if (j.open === false) { setResult('is-info', j.message || 'Signups open soon. Nothing was saved.'); return; }
        if (!r.ok || !j.card) {
          const msg = j.error || j.message || `HTTP ${r.status}`;
          setResult(j.code === 'token_not_live' || j.code === 'no_balance' ? 'is-info' : 'is-err', j.code ? msg : `Couldn't send that (${msg}). Please try again in a moment.`);
          if (j.full) countNote.textContent = 'All spots are claimed.';
          return;
        }
        store.set(WL_FLAG, JSON.stringify({ wallet: body.wallet, at: new Date().toISOString() })); store.set(WL_WALLET, body.wallet);
        done(); showCard(j.card, true); lastAt = Date.now(); startRefresh(); loadCount();
        say(j.existing ? 'That wallet was already on the list. Here\'s its card.' : 'You\'re on the list ✔');
        $('#wl-card-zone').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      } catch (err) {
        console.warn('[GCV whitelist]', err);
        setResult('is-err', `Couldn't send that (${err.message}). Please try again in a moment.`);
      } finally { sending = false; wl.removeAttribute('aria-busy'); if (!store.get(WL_FLAG)) { submit.disabled = false; submit.textContent = 'Claim my spot'; } }
    });
  }

  $('#year').textContent = new Date().getFullYear();
})();
