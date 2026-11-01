(() => {
  'use strict';

  const S = window.SITE;
  const T = window.THREE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = matchMedia('(max-width: 760px)').matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const small = () => innerWidth <= 760;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const core = { id: 'core', kind: 'core', name: S.person.name, short: 'Akshay', years: 'the core' };
  const contact = { id: 'contact', kind: 'contact', name: 'Contact', short: 'Contact', years: 'say hi' };
  const ORDER = [core, ...S.bodies, contact];
  const byId = Object.fromEntries(ORDER.map((b) => [b.id, b]));
  const COLORS = { core: '#ffb347', contact: '#ff8fb8', origins: '#d9b38c', lab: '#8b9bff' };
  const colorOf = (b) => (b.look && b.look.glow) || COLORS[b.id] || '#8b9bff';

  const state = {
    mode: 'intro',
    focus: null,
    flying: false,
    timeScale: 1,
    timeTarget: 1,
    warp: 0,
    hyper: 0,
    paused: false,
    idle: 0,
    pending: null,
  };

  /* ================================================================
     Content: panel + plain view
     ================================================================ */

  function statText(s, v) {
    if (s.plain) return String(s.value);
    const n = s.decimals ? v.toFixed(s.decimals) : Math.round(v).toLocaleString('en-US');
    return (s.prefix || '') + n + (s.suffix || '');
  }

  const statsHTML = (stats) =>
    `<div class="stats">${stats
      .map((s) => `<div class="stat"><span class="stat-num" data-stat="${esc(JSON.stringify(s))}">${statText(s, s.value)}</span><span class="stat-label">${esc(s.label)}</span></div>`)
      .join('')}</div>`;

  function animateStats(root) {
    if (reduceMotion) return;
    root.querySelectorAll('[data-stat]').forEach((el) => {
      const s = JSON.parse(el.dataset.stat);
      if (s.plain || !s.value) return;
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / 1300);
        el.textContent = statText(s, s.value * (1 - Math.pow(1 - k, 4)));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  const chips = (items) => `<div class="chips">${items.map((i) => `<span class="chip">${esc(i)}</span>`).join('')}</div>`;

  const linksHTML = (links) =>
    links && links.length
      ? `<h3 class="p-h">Links</h3><div class="links">${links
          .map(([t, u]) => `<a class="link-btn" href="${esc(u)}" target="_blank" rel="noopener"><span>${esc(t)}</span><span>↗</span></a>`)
          .join('')}</div>`
      : '';

  const kindLabel = (b) =>
    ({ belt: 'Asteroid belt', station: 'Space station', core: 'The core', contact: 'Comet' }[b.kind] ||
      (b.look && b.look.wire ? 'Protoplanet' : 'Planet'));

  function renderBody(b) {
    if (b.kind === 'core') return renderCore();
    if (b.kind === 'contact') return renderContact();
    let h = `<div class="p-kicker"><span>${esc(b.years)}</span><span>${kindLabel(b)}</span></div>
      <h2 class="p-title" id="panel-title">${esc(b.name)}</h2>
      <p class="p-tagline">${esc(b.tagline)}</p>
      <div class="p-meta"><div><b>Role:</b> ${esc(b.role)}</div><div><b>Status:</b> ${esc(b.status)}</div></div>`;
    if (b.stats && b.stats.length) h += statsHTML(b.stats);
    if (b.highlights) h += `<h3 class="p-h">${b.look && b.look.wire ? 'Notes' : 'What I built'}</h3><ul class="p-list">${b.highlights.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    if (b.lesson) h += `<div class="lesson"><b>If I built it again:</b> ${esc(b.lesson)}</div>`;
    if (b.list)
      h += `<h3 class="p-h">${b.kind === 'belt' ? 'The rocks' : 'On the bench'}</h3><div class="timeline">${b.list
        .map(([n, y, t]) => `<div class="tl-row"><span class="tl-year">${esc(y)}</span><div><div class="tl-name">${esc(n)}</div><div class="tl-text">${esc(t)}</div></div></div>`)
        .join('')}</div>`;
    h += `<h3 class="p-h">Stack</h3>${chips(b.stack)}`;
    h += linksHTML(b.links);
    return h;
  }

  function renderCore() {
    const p = S.person;
    return `<div class="p-kicker"><span>The core</span><span>${esc(p.location)}</span></div>
      <h2 class="p-title" id="panel-title">${esc(p.name)}</h2>
      <p class="p-tagline">${esc(p.title)} · ${p.disciplines.map(esc).join(' · ')}</p>
      <p class="p-tagline" style="font-size:14px;color:var(--muted)">${esc(p.intro)} ${esc(p.pitch)}</p>
      ${statsHTML(S.headline)}
      <h3 class="p-h">Experience</h3>
      <div class="exp">${S.experience
        .map((e) => `<div class="exp-item"><span class="exp-dates">${esc(e.dates)}</span><b>${esc(e.title)}</b><span class="exp-org">${esc(e.org)}</span><p>${esc(e.text)}</p></div>`)
        .join('')}</div>
      <h3 class="p-h">Skills</h3>
      ${S.skills.map((g) => `<div class="skill-group"><h4>${esc(g.group)}</h4>${chips(g.items)}</div>`).join('')}
      <h3 class="p-h">Languages</h3><p style="margin:0;color:#d6d9f5;font-size:14px">${esc(p.languages)}</p>
      <h3 class="p-h">Next</h3>
      <div class="row-btns"><button class="btn small primary" data-go="contact">Contact me</button><button class="btn small" data-action="plain">Plain view</button></div>`;
  }

  function renderContact() {
    const p = S.person;
    return `<div class="p-kicker"><span>Incoming transmission</span><span>Comet</span></div>
      <h2 class="p-title" id="panel-title">Let's build something.</h2>
      <p class="p-tagline">I'm looking for a full-time role in a product or mobile engineering team. Based in Pune; open to remote and relocation.</p>
      <a class="big-mail" href="mailto:${esc(p.email)}">${esc(p.email)}</a>
      <div class="row-btns">
        <button class="btn small primary" data-action="copy">Copy email</button>
        <a class="btn small" href="${esc(p.links.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>
        <a class="btn small" href="${esc(p.links.github)}" target="_blank" rel="noopener">GitHub ↗</a>
      </div>
      <h3 class="p-h">Roles I fit</h3>
      ${chips(['Product Engineer', 'Full-Stack Engineer', 'iOS Developer (SwiftUI)', 'Mobile Engineer', 'Backend Developer'])}
      <h3 class="p-h">What you get</h3>
      <ul class="p-list">
        <li>Someone who has taken products from a sketch to the App Store, Play Store and production servers, alone, many times.</li>
        <li>Product judgement earned the hard way: validating cheaply, cutting scope, and stopping cleanly when the numbers say so.</li>
        <li>Design included: I've done the UI/UX and branding for everything here.</li>
      </ul>`;
  }

  function renderPlain() {
    const p = S.person;
    const planets = S.bodies.filter((b) => b.kind === 'planet');
    const origins = byId.origins;
    const lab = byId.lab;
    const card = (b) => `<article class="prod-card" style="--c:${colorOf(b)}">
        <h3>${esc(b.name)}</h3><span class="when">${esc(b.years)}</span>
        <p class="what">${esc(b.tagline)} <span style="color:var(--muted)">${esc(b.role)}.</span></p>
        ${b.stats && b.stats.length ? `<div class="nums">${b.stats.map((s) => `<span>${statText(s, s.value)} ${esc(s.label)}</span>`).join('')}</div>` : ''}
        ${b.highlights ? `<p class="what" style="color:var(--muted)">${b.highlights.map(esc).join(' ')}</p>` : ''}
        <div class="nums" style="color:var(--muted)">${b.stack.map(esc).join(' · ')}</div>
        ${b.links.length ? `<div class="plinks">${b.links.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ↗</a>`).join('')}</div>` : ''}
      </article>`;

    $('#plain-content').innerHTML = `
      <div class="plain-top">
        <span class="brand-text" style="font-family:var(--mono);font-weight:600">multi<span style="color:var(--hot)">.</span>bit</span>
        <div class="row-btns">
          <button class="btn small" data-action="print">Save as PDF</button>
          ${webgl ? '<button class="btn small primary" data-action="unplain">Back to the galaxy</button>' : ''}
        </div>
      </div>
      <h1>${esc(p.name)}</h1>
      <p class="role">${esc(p.title)} · ${p.disciplines.map(esc).join(' · ')}</p>
      <p class="intro-text">${esc(p.intro)} ${esc(p.pitch)}</p>
      <p class="intro-text" style="color:var(--mint);font-family:var(--mono);font-size:13px">● ${esc(p.status)}</p>
      <div class="contact-line">
        <a class="btn small primary" href="mailto:${esc(p.email)}">${esc(p.email)}</a>
        <a class="btn small" href="${esc(p.links.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>
        <a class="btn small" href="${esc(p.links.github)}" target="_blank" rel="noopener">GitHub ↗</a>
      </div>
      <div class="plain-stats stats">${S.headline.map((s) => `<div class="stat"><span class="stat-num">${statText(s, s.value)}</span><span class="stat-label">${esc(s.label)}</span></div>`).join('')}</div>

      <h2>Products</h2>
      ${planets.map(card).join('')}

      <h2>Experience</h2>
      <div class="exp">${S.experience
        .map((e) => `<div class="exp-item"><span class="exp-dates">${esc(e.dates)}</span><b>${esc(e.title)}</b><span class="exp-org">${esc(e.org)}</span><p>${esc(e.text)}</p></div>`)
        .join('')}</div>

      <h2>Skills</h2>
      <div class="plain-grid">${S.skills.map((g) => `<div class="skill-group"><h4>${esc(g.group)}</h4>${chips(g.items)}</div>`).join('')}</div>

      <h2>Earlier work · ${esc(origins.years)}, built without AI</h2>
      <div class="timeline">${origins.list
        .map(([n, y, t]) => `<div class="tl-row"><span class="tl-year">${esc(y)}</span><div><div class="tl-name">${esc(n)}</div><div class="tl-text">${esc(t)}</div></div></div>`)
        .join('')}</div>

      <h2>Experiments</h2>
      <div class="timeline">${lab.list
        .map(([n, y, t]) => `<div class="tl-row"><span class="tl-year">${esc(y)}</span><div><div class="tl-name">${esc(n)}</div><div class="tl-text">${esc(t)}</div></div></div>`)
        .join('')}</div>

      <h2>Contact</h2>
      <p class="intro-text">Email <a href="mailto:${esc(p.email)}">${esc(p.email)}</a>. Based in ${esc(p.location)}; open to remote and relocation. Languages: ${esc(p.languages)}.</p>`;
  }

  /* ================================================================
     UI wiring
     ================================================================ */

  const panel = $('#panel');
  const panelBody = $('#panel-body');
  const toastEl = $('#toast');
  let toastTimer = 0;

  function toast(html, ms = 3200) {
    toastEl.innerHTML = html;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  function openPanel(b) {
    panel.style.setProperty('--c', colorOf(b));
    panelBody.style.setProperty('--c', colorOf(b));
    const i = ORDER.indexOf(b);
    $('#panel-crumb').textContent = `${String(i + 1).padStart(2, '0')} / ${String(ORDER.length).padStart(2, '0')}`;
    panelBody.innerHTML = renderBody(b);
    panelBody.scrollTop = 0;
    panel.hidden = false;
    panel.style.animation = 'none';
    void panel.offsetWidth;
    panel.style.animation = '';
    document.body.classList.add('panel-open');
    animateStats(panelBody);
    document.querySelectorAll('.dock button').forEach((el) => el.classList.toggle('active', el.dataset.go === b.id));
  }

  function closePanel() {
    panel.hidden = true;
    document.body.classList.remove('panel-open');
    document.querySelectorAll('.dock button').forEach((el) => el.classList.remove('active'));
  }

  function buildDock() {
    $('#dock').innerHTML = S.bodies
      .map((b) => `<button data-go="${b.id}" style="--c:${colorOf(b)}"><span class="d-name">${esc(b.short)}</span><span class="d-year">${esc(b.years)}</span></button>`)
      .join('');
  }

  const plain = $('#plain');

  function openPlain() {
    renderPlain();
    plain.hidden = false;
    plain.scrollTop = 0;
    state.paused = true;
    setHash('plain');
  }

  function closePlain() {
    if (!webgl) return;
    plain.hidden = true;
    state.paused = false;
    setHash(state.focus ? state.focus.id : '');
  }

  function setHash(id) {
    history.replaceState(null, '', id ? `#${id}` : location.pathname + location.search);
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(S.person.email);
      toast(`Copied <b>${esc(S.person.email)}</b>. Talk soon!`);
    } catch {
      location.href = `mailto:${S.person.email}`;
    }
  }

  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    const act = e.target.closest('[data-action]');
    if (go) {
      if (!plain.hidden) closePlain();
      if (state.mode === 'explore') focusOn(go.dataset.go);
      return;
    }
    if (!act) return;
    const a = act.dataset.action;
    if (a === 'plain') openPlain();
    else if (a === 'unplain') closePlain();
    else if (a === 'print') window.print();
    else if (a === 'close') unfocus();
    else if (a === 'prev') step(-1);
    else if (a === 'next') step(1);
    else if (a === 'copy') copyEmail();
  });

  function step(dir) {
    const i = state.focus ? ORDER.indexOf(state.focus.data) : -1;
    const next = ORDER[(i + dir + ORDER.length) % ORDER.length];
    focusOn(next.id);
  }

  /* ================================================================
     Easter eggs
     ================================================================ */

  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiPos = 0;
  let typed = '';

  function hyperdrive() {
    if (!webgl || state.mode !== 'explore') return;
    state.hyper = 6;
    toast('Achievement unlocked: <b>Hyperdrive</b>. Now imagine this energy on your team.', 5000);
  }

  console.log(
    '%c multi.bit %c Hey, fellow dev 👋\nYou opened the console, so you are my kind of person.\nTry the Konami code on the page, or just type "hire".\n→ ' + S.person.email,
    'background:linear-gradient(90deg,#ffb347,#ff5e7a,#8b5bff);color:#12041a;font-weight:700;padding:4px 8px;border-radius:4px',
    'color:#9aa0c3'
  );

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    konamiPos = k === KONAMI[konamiPos] ? konamiPos + 1 : k === KONAMI[0] ? 1 : 0;
    if (konamiPos === KONAMI.length) {
      konamiPos = 0;
      hyperdrive();
    }

    if (k.length === 1) {
      typed = (typed + k).slice(-8);
      if (typed.endsWith('hire') && state.mode === 'explore') {
        focusOn('contact');
        toast('Secret shortcut found. Here is how to reach me.');
      }
    }

    if (state.mode === 'intro') {
      if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        if (bootDone) launch();
        else finishBoot();
      }
      return;
    }

    if (k === 'Escape') {
      if (!plain.hidden) closePlain();
      else if (state.focus) unfocus();
    }
    if (!plain.hidden || state.mode !== 'explore') return;
    if (k === 'ArrowRight' && state.focus) step(1);
    if (k === 'ArrowLeft' && state.focus) step(-1);
    if (k === 'p') openPlain();
    if (/^[1-9]$/.test(k)) {
      const b = S.bodies[Number(k) - 1];
      if (b) focusOn(b.id);
    }
  });

  /* ================================================================
     Intro: boot sequence and title rotator
     ================================================================ */

  const BOOT = [
    '> booting multi.bit/os (build 2016 → 2026)',
    '> scanning orbit ............. 15 products found',
    '> calibrating SwiftUI thrusters ......... ok',
    '> warming PHP reactors .................. ok',
    '> flushing outbox ....... 52,000+ actions delivered',
    '> status: OPEN TO FULL-TIME ROLES',
  ];
  const bootEl = $('#boot');
  let bootDone = false;
  let bootTimer = 0;
  let rotatorTimer = 0;

  function runBoot() {
    if (reduceMotion) return finishBoot();
    let line = 0;
    let ch = 0;
    const tick = () => {
      if (bootDone) return;
      const lines = BOOT.slice(0, line);
      const cur = BOOT[line] || '';
      bootEl.textContent = [...lines, cur.slice(0, ch)].join('\n') + '▌';
      ch += 2;
      if (ch > cur.length) {
        line += 1;
        ch = 0;
        if (line >= BOOT.length) return finishBoot();
        bootTimer = setTimeout(tick, 160);
        return;
      }
      bootTimer = setTimeout(tick, 14);
    };
    tick();
  }

  function finishBoot() {
    if (bootDone) return;
    bootDone = true;
    clearTimeout(bootTimer);
    bootEl.textContent = BOOT.join('\n');
    $('#intro-hero').classList.add('show');
    $('#launch').focus({ preventScroll: true });
    startRotator();
  }

  function startRotator() {
    const el = $('#rotator');
    const words = ['iOS', 'Android', 'Web', 'Backend', 'Design', 'all of it'];
    const glyphs = '!<>-_\\/[]{}—=+*^?#01';
    let i = 0;
    const scramble = (word) => {
      let f = 0;
      const total = 14;
      const run = () => {
        f += 1;
        const out = word
          .split('')
          .map((c, j) => (j < (f / total) * word.length ? c : glyphs[(Math.random() * glyphs.length) | 0]))
          .join('');
        el.textContent = out;
        if (f < total) requestAnimationFrame(run);
        else el.textContent = word;
      };
      run();
    };
    rotatorTimer = setInterval(() => {
      i = (i + 1) % words.length;
      if (reduceMotion) el.textContent = words[i];
      else scramble(words[i]);
    }, 1900);
  }

  $('#intro').addEventListener('click', (e) => {
    if (!bootDone && !e.target.closest('button')) finishBoot();
  });
  $('#launch').addEventListener('click', () => launch());

  /* ================================================================
     WebGL availability
     ================================================================ */

  const webgl = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(T && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch {
      return false;
    }
  })();

  buildDock();

  if (!webgl) {
    $('#intro').remove();
    document.querySelectorAll('.hud-top, .dock, .hint').forEach((el) => el.remove());
    openPlain();
    return;
  }

  document.body.classList.add('intro-mode');
  const initialHash = location.hash.slice(1);
  if (initialHash === 'plain') openPlain();
  else if (byId[initialHash]) state.pending = initialHash;
  runBoot();

  /* ================================================================
     Three.js scene
     ================================================================ */

  const canvas = $('#scene');
  const renderer = new T.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
  const DPR = Math.min(devicePixelRatio || 1, lowPower ? 1.5 : 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 4000);
  const START = new T.Vector3(0, 70, 260);
  camera.position.copy(START);
  camera.lookAt(0, 0, 0);
  scene.add(camera);

  const controls = new T.OrbitControls(camera, canvas);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 6;
  controls.maxDistance = 220;
  controls.autoRotateSpeed = 0.35;

  const composer = new T.EffectComposer(renderer);
  composer.addPass(new T.RenderPass(scene, camera));
  const bloom = new T.UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), 0.85, 0.55, 0.18);
  composer.addPass(bloom);
  composer.addPass(new T.OutputPass());

  scene.add(new T.AmbientLight(0x50557a, 0.9));
  scene.add(new T.PointLight(0xfff0dd, 3.2, 0, 0));

  const NOISE = `
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0);
      const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy));
      vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);
      vec3 l=1.0-g;
      vec3 i1=min(g.xyz,l.zxy);
      vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;
      vec3 x2=x0-i2+2.0*C.xxx;
      vec3 x3=x0-1.0+3.0*C.xxx;
      i=mod(i,289.0);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=1.0/7.0;
      vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z);
      vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy;
      vec4 y=y_*ns.x+ns.yyyy;
      vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);
      vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0;
      vec4 s1=floor(b1)*2.0+1.0;
      vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
      vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);
      vec3 p1=vec3(a0.zw,h.y);
      vec3 p2=vec3(a1.xy,h.z);
      vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
      m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }
    float fbm(vec3 p){ float f=0.0, a=0.5; for(int i=0;i<OCT;i++){ f+=a*snoise(p); p*=2.03; a*=0.5; } return f; }
  `;
  const withNoise = (oct, src) => `#define OCT ${oct}\n${NOISE}\n${src}`;

  const WORLD_VS = `
    varying vec3 vObj; varying vec3 vN; varying vec3 vWorld;
    void main(){
      vObj = position;
      vN = normalize(mat3(modelMatrix) * normal);
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;

  const uTime = { value: 0 };

  function glowTexture(stops) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, col]) => grad.addColorStop(o, col));
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  const SOFT_GLOW = glowTexture([
    [0, 'rgba(255,255,255,1)'],
    [0.2, 'rgba(255,255,255,0.45)'],
    [0.5, 'rgba(255,255,255,0.08)'],
    [1, 'rgba(255,255,255,0)'],
  ]);

  function glowSprite(color, scale, opacity = 1) {
    const s = new T.Sprite(
      new T.SpriteMaterial({ map: SOFT_GLOW, color: new T.Color(color), transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false })
    );
    s.scale.setScalar(scale);
    return s;
  }

  const invisible = new T.MeshBasicMaterial({ visible: false });

  /* ---------- Background: nebula + stars ---------- */

  const nebula = new T.Mesh(
    new T.SphereGeometry(1500, 48, 32),
    new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      uniforms: { uTime },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: withNoise(
        lowPower ? 3 : 4,
        `varying vec3 vDir; uniform float uTime;
        void main(){
          vec3 d = normalize(vDir);
          float n = fbm(d * 2.2 + vec3(0.0, uTime * 0.004, 0.0));
          float n2 = fbm(d * 4.5 + 7.0);
          float band = exp(-pow(dot(d, normalize(vec3(0.25, 1.0, 0.4))) * 3.0, 2.0));
          vec3 c = mix(vec3(0.09, 0.03, 0.24), vec3(0.01, 0.09, 0.26), smoothstep(-0.3, 0.5, n2));
          c = mix(c, vec3(0.42, 0.06, 0.28), smoothstep(0.2, 0.8, n) * 0.6);
          float a = (0.2 + 0.8 * band) * smoothstep(-0.25, 0.7, n * 0.7 + n2 * 0.5);
          gl_FragColor = vec4(c * a * 0.6, 1.0);
        }`
      ),
    })
  );
  scene.add(nebula);

  function makeStars(count) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const tint = [new T.Color('#ffffff'), new T.Color('#b9c6ff'), new T.Color('#ffd9b0'), new T.Color('#ffb3d9')];
    const planeN = new T.Vector3(0.25, 1, 0.4).normalize();
    const v = new T.Vector3();
    for (let i = 0; i < count; i++) {
      v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      if (i % 3 === 0) v.addScaledVector(planeN, -v.dot(planeN) * 0.85).normalize();
      v.multiplyScalar(320 + Math.random() * 700);
      pos.set([v.x, v.y, v.z], i * 3);
      const c = tint[Math.random() < 0.7 ? 0 : 1 + ((Math.random() * 3) | 0)];
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = Math.random() < 0.03 ? 6 + Math.random() * 5 : 1.5 + Math.random() * 3;
      phase[i] = Math.random() * 100;
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new T.BufferAttribute(col, 3));
    g.setAttribute('aSize', new T.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new T.BufferAttribute(phase, 1));
    return new T.Points(
      g,
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        uniforms: { uTime, uPixel: { value: DPR } },
        vertexShader: `
          attribute vec3 aColor; attribute float aSize; attribute float aPhase;
          uniform float uTime; uniform float uPixel;
          varying vec3 vColor; varying float vTw;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            vTw = 0.6 + 0.4 * sin(uTime * 1.3 + aPhase);
            vColor = aColor;
            gl_PointSize = aSize * uPixel * (420.0 / -mv.z);
          }`,
        fragmentShader: `
          varying vec3 vColor; varying float vTw;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            float a = pow(smoothstep(0.5, 0.0, d), 1.8) * vTw;
            gl_FragColor = vec4(vColor * a * 1.4, a);
          }`,
      })
    );
  }
  const stars = makeStars(lowPower ? 3500 : 8000);
  scene.add(stars);

  /* ---------- Warp streaks (attached to the camera) ---------- */

  const WARP_N = lowPower ? 300 : 700;
  const warpPos = new Float32Array(WARP_N * 6);
  const warpCol = new Float32Array(WARP_N * 6);
  const warpSeeds = [];
  for (let i = 0; i < WARP_N; i++) {
    const r = 4 + Math.random() * 70;
    const a = Math.random() * Math.PI * 2;
    warpSeeds.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: -Math.random() * 600 });
    const c = Math.random() < 0.3 ? [1, 0.75, 0.9] : [0.75, 0.85, 1];
    warpCol.set([...c, 0, 0, 0], i * 6);
  }
  const warpGeo = new T.BufferGeometry();
  warpGeo.setAttribute('position', new T.BufferAttribute(warpPos, 3));
  warpGeo.setAttribute('color', new T.BufferAttribute(warpCol, 3));
  const warpMat = new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false });
  const warpLines = new T.LineSegments(warpGeo, warpMat);
  warpLines.frustumCulled = false;
  camera.add(warpLines);

  function updateWarp(dt) {
    const w = Math.max(state.warp, state.hyper > 0 ? 0.55 : 0);
    warpMat.opacity += (w - warpMat.opacity) * Math.min(1, dt * 6);
    warpLines.visible = warpMat.opacity > 0.01;
    if (!warpLines.visible) return;
    const speed = 120 + 700 * w;
    const len = 4 + 90 * w;
    for (let i = 0; i < WARP_N; i++) {
      const s = warpSeeds[i];
      s.z += speed * dt;
      if (s.z > -2) s.z -= 600;
      warpPos.set([s.x, s.y, s.z, s.x, s.y, s.z - len], i * 6);
    }
    warpGeo.attributes.position.needsUpdate = true;
  }

  /* ---------- Entities ---------- */

  const entities = {};
  const hitMeshes = [];

  function register(e) {
    entities[e.id] = e;
    e.hover = 0;
    e.hoverTarget = 0;
    e.hits.forEach((m) => {
      m.userData.id = e.id;
      hitMeshes.push(m);
    });
  }

  function orbitLine(radius, color, opacity = 0.13) {
    const pts = [];
    for (let i = 0; i < 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      pts.push(new T.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const line = new T.LineLoop(
      new T.BufferGeometry().setFromPoints(pts),
      new T.LineBasicMaterial({ color: new T.Color(color), transparent: true, opacity, depthWrite: false, blending: T.AdditiveBlending })
    );
    line.userData.base = opacity;
    return line;
  }

  /* Sun: the core */
  (() => {
    const group = new T.Group();
    const sun = new T.Mesh(
      new T.SphereGeometry(3.2, 96, 64),
      new T.ShaderMaterial({
        uniforms: { uTime, uHover: { value: 0 } },
        vertexShader: WORLD_VS,
        fragmentShader: withNoise(
          5,
          `uniform float uTime; uniform float uHover; varying vec3 vObj; varying vec3 vN; varying vec3 vWorld;
          void main(){
            vec3 p = normalize(vObj);
            float n = fbm(p * 2.6 + vec3(uTime * 0.05, uTime * 0.03, 0.0));
            float n2 = fbm(p * 7.0 - vec3(0.0, uTime * 0.09, uTime * 0.04));
            float t = clamp(0.55 + 0.6 * n + 0.3 * n2, 0.0, 1.0);
            vec3 col = mix(vec3(1.0, 0.22, 0.02), vec3(1.0, 0.6, 0.14), smoothstep(0.1, 0.55, t));
            col = mix(col, vec3(1.0, 0.95, 0.78), smoothstep(0.6, 0.98, t));
            float mu = max(dot(normalize(vN), normalize(cameraPosition - vWorld)), 0.0);
            col *= 0.6 + 0.6 * pow(mu, 0.45);
            gl_FragColor = vec4(col * (1.6 + uHover * 0.8), 1.0);
          }`
        ),
      })
    );
    group.add(sun);
    const corona = glowSprite('#ff9a3c', 20, 0.75);
    const halo = glowSprite('#ff5e3a', 52, 0.16);
    group.add(corona, halo);
    scene.add(group);
    register({
      id: 'core',
      data: core,
      anchor: group,
      size: 3.4,
      viewDist: 22,
      hits: [sun],
      update(dt, t) {
        sun.rotation.y += dt * 0.04;
        corona.scale.setScalar(20 + Math.sin(t * 1.7) * 0.6 + this.hover * 4);
        sun.material.uniforms.uHover.value = this.hover;
      },
    });
  })();

  /* Planets */
  const PHASES = { feast: 1.1, soozy: 2.3, twl: 0.2, fit9: 4.2, pokkee: 5.3, cheerfor: 3.4, lab: 2.9 };

  function makePlanet(b) {
    const L = b.look;
    const glow = new T.Color(L.glow);
    const pivot = new T.Object3D();
    pivot.rotation.set(L.tilt, 0, L.tilt * 0.6);
    scene.add(pivot);
    const line = orbitLine(L.orbit, L.glow);
    pivot.add(line);
    const carrier = new T.Group();
    pivot.add(carrier);
    const spin = new T.Group();
    carrier.add(spin);
    const extras = new T.Group();
    carrier.add(extras);

    let planetMat = null;
    let atmoMat = null;
    let atmo = null;

    if (L.wire) {
      const ico = new T.LineSegments(
        new T.EdgesGeometry(new T.IcosahedronGeometry(L.size, 1)),
        new T.LineBasicMaterial({ color: new T.Color(L.glow).multiplyScalar(1.6), transparent: true, opacity: 0.9 })
      );
      const inner = new T.Mesh(new T.IcosahedronGeometry(L.size * 0.96, 1), new T.MeshBasicMaterial({ color: '#03140c', transparent: true, opacity: 0.75 }));
      const scan = new T.Mesh(new T.TorusGeometry(L.size * 1.08, 0.018, 6, 64), new T.MeshBasicMaterial({ color: new T.Color(L.glow).multiplyScalar(2) }));
      scan.rotation.x = Math.PI / 2;
      spin.add(inner, ico);
      extras.add(scan);
      extras.userData.scan = scan;
      const g = glowSprite(L.glow, L.size * 5, 0.25);
      extras.add(g);
    } else {
      planetMat = new T.ShaderMaterial({
        uniforms: {
          uTime,
          uA: { value: new T.Color(L.colors[0]) },
          uB: { value: new T.Color(L.colors[1]) },
          uC: { value: new T.Color(L.colors[2]) },
          uGlow: { value: glow },
          uScale: { value: L.scale },
          uBands: { value: L.bands },
          uSeed: { value: Math.random() * 50 },
          uHover: { value: 0 },
        },
        vertexShader: WORLD_VS,
        fragmentShader: withNoise(
          lowPower ? 4 : 5,
          `uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uGlow;
          uniform float uScale; uniform float uBands; uniform float uSeed; uniform float uHover;
          varying vec3 vObj; varying vec3 vN; varying vec3 vWorld;
          void main(){
            vec3 p = normalize(vObj);
            float n = fbm(p * uScale + uSeed + vec3(uTime * 0.01, 0.0, 0.0));
            float warp = fbm(p * uScale * 2.0 - uSeed);
            float bands = sin(p.y * 14.0 + n * 5.0 + warp * 2.0) * 0.5 + 0.5;
            float t = mix(n * 0.6 + 0.5 + warp * 0.2, bands, uBands);
            vec3 col = mix(uA, uB, smoothstep(0.25, 0.6, t));
            col = mix(col, uC, smoothstep(0.68, 0.95, t));
            vec3 N = normalize(vN);
            vec3 L = normalize(-vWorld);
            vec3 V = normalize(cameraPosition - vWorld);
            float d = dot(N, L);
            float lit = smoothstep(-0.15, 0.7, d);
            float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
            vec3 H = normalize(L + V);
            float spec = pow(max(dot(N, H), 0.0), 40.0) * 0.25 * lit;
            vec3 c = col * (0.16 + 1.05 * lit) + spec;
            c += uGlow * fres * (0.2 + 0.6 * lit) * (1.0 + uHover);
            c += uGlow * uHover * 0.12;
            gl_FragColor = vec4(c, 1.0);
          }`
        ),
      });
      const planet = new T.Mesh(new T.SphereGeometry(L.size, lowPower ? 48 : 72, lowPower ? 32 : 48), planetMat);
      spin.add(planet);

      atmoMat = new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: T.BackSide,
        blending: T.AdditiveBlending,
        uniforms: { uGlow: { value: glow }, uHover: { value: 0 }, uPulse: { value: 0 } },
        vertexShader: `varying vec3 vN; varying vec3 vView;
          void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vView = mv.xyz; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform vec3 uGlow; uniform float uHover; uniform float uPulse; varying vec3 vN; varying vec3 vView;
          void main(){
            float d = -dot(normalize(vN), normalize(-vView));
            float i = pow(smoothstep(0.0, 0.55, d), 2.2);
            gl_FragColor = vec4(uGlow * i * (0.75 + uHover * 1.2 + uPulse), i);
          }`,
      });
      atmo = new T.Mesh(new T.SphereGeometry(L.size * 1.2, 48, 32), atmoMat);
      carrier.add(atmo);
    }

    const hit = new T.Mesh(new T.SphereGeometry(L.size * 1.7, 12, 8), invisible);
    carrier.add(hit);

    let updateExtras = () => {};

    if (L.rings) {
      const R = L.size * 1.9;
      const gold = new T.MeshStandardMaterial({ color: L.rings, metalness: 0.7, roughness: 0.3, emissive: new T.Color(L.rings), emissiveIntensity: 0.18 });
      const ringA = new T.Mesh(new T.TorusGeometry(R, 0.05, 16, 128), gold);
      const ringB = new T.Mesh(new T.TorusGeometry(R, 0.05, 16, 128), gold);
      ringA.position.x = -R * 0.45;
      ringB.position.x = R * 0.45;
      ringB.rotation.x = Math.PI / 2;
      const rings = new T.Group();
      rings.add(ringA, ringB);
      rings.rotation.set(0.5, 0, 0.35);
      const gem = glowSprite('#ffffff', 1.2, 0.9);
      gem.position.set(-R * 0.45, R, 0);
      rings.add(gem);
      extras.add(rings);
      updateExtras = (dt, t) => {
        rings.rotation.y += dt * 0.35;
        gem.material.opacity = 0.5 + 0.5 * Math.sin(t * 3);
      };
    }

    if (L.coins) {
      const coinMat = new T.MeshStandardMaterial({ color: '#ffcc55', metalness: 0.5, roughness: 0.3, emissive: '#7a5200', emissiveIntensity: 0.6 });
      const coinGeo = new T.CylinderGeometry(0.24, 0.24, 0.05, 28);
      const ring = new T.Group();
      ring.rotation.set(0.35, 0, -0.2);
      const coins = [];
      for (let i = 0; i < 7; i++) {
        const c = new T.Mesh(coinGeo, coinMat);
        const a = (i / 7) * Math.PI * 2;
        c.position.set(Math.cos(a) * L.size * 2.3, Math.sin(a * 3) * 0.2, Math.sin(a) * L.size * 2.3);
        c.rotation.x = Math.PI / 2;
        ring.add(c);
        coins.push(c);
      }
      extras.add(ring);
      updateExtras = (dt) => {
        ring.rotation.y += dt * 0.5;
        coins.forEach((c, i) => (c.rotation.z += dt * (2 + i * 0.3)));
      };
    }

    if (b.id === 'feast') {
      const boxMat = new T.MeshStandardMaterial({ color: '#ffb070', roughness: 0.6, emissive: '#552000', emissiveIntensity: 0.5 });
      const boxGeo = new T.BoxGeometry(0.16, 0.16, 0.16);
      const crates = new T.Group();
      crates.rotation.z = 0.25;
      const boxes = [];
      for (let i = 0; i < 16; i++) {
        const m = new T.Mesh(boxGeo, boxMat);
        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.2;
        const r = L.size * (2.0 + Math.random() * 0.5);
        m.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.3, Math.sin(a) * r);
        crates.add(m);
        boxes.push(m);
      }
      extras.add(crates);
      updateExtras = (dt) => {
        crates.rotation.y -= dt * 0.25;
        boxes.forEach((m, i) => {
          m.rotation.x += dt * (0.6 + (i % 3) * 0.3);
          m.rotation.y += dt * 0.8;
        });
      };
    }

    if (b.id === 'soozy') {
      const moonMat = new T.MeshStandardMaterial({ color: '#c8fbff', roughness: 0.5, emissive: '#0b5866', emissiveIntensity: 0.7 });
      const moons = [
        { r: 0.24, d: 3.3, s: 0.7, p: 0 },
        { r: 0.18, d: 4.1, s: -0.5, p: 2 },
        { r: 0.28, d: 4.9, s: 0.35, p: 4 },
      ].map((m) => {
        const mesh = new T.Mesh(new T.SphereGeometry(m.r, 20, 14), moonMat);
        extras.add(mesh);
        return { ...m, mesh };
      });
      const MSG = 36;
      const msgPos = new Float32Array(MSG * 3);
      const msgs = Array.from({ length: MSG }, () => ({ from: 0, to: 1, t: Math.random(), speed: 0.3 + Math.random() * 0.5 }));
      const reroll = (m) => {
        m.from = (Math.random() * 4) | 0;
        m.to = (m.from + 1 + ((Math.random() * 3) | 0)) % 4;
        m.t = 0;
        m.speed = 0.35 + Math.random() * 0.5;
      };
      msgs.forEach(reroll);
      msgs.forEach((m) => (m.t = Math.random()));
      const msgGeo = new T.BufferGeometry();
      msgGeo.setAttribute('position', new T.BufferAttribute(msgPos, 3));
      const msgPts = new T.Points(
        msgGeo,
        new T.PointsMaterial({ color: new T.Color('#7ff6ff').multiplyScalar(2.2), size: 0.16, map: SOFT_GLOW, transparent: true, depthWrite: false, blending: T.AdditiveBlending })
      );
      msgPts.frustumCulled = false;
      extras.add(msgPts);
      const nodes = [new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()];
      const a = new T.Vector3();
      const c = new T.Vector3();
      updateExtras = (dt, t) => {
        moons.forEach((m, i) => {
          const ang = t * m.s + m.p;
          m.mesh.position.set(Math.cos(ang) * m.d, Math.sin(ang * 0.7) * 0.6, Math.sin(ang) * m.d);
          nodes[i + 1].copy(m.mesh.position);
        });
        msgs.forEach((m, i) => {
          m.t += dt * m.speed;
          if (m.t >= 1) reroll(m);
          if (m.from === 0) a.copy(nodes[m.to]).normalize().multiplyScalar(L.size);
          else a.copy(nodes[m.from]);
          if (m.to === 0) c.copy(nodes[m.from]).normalize().multiplyScalar(L.size);
          else c.copy(nodes[m.to]);
          const k = m.t;
          const x = a.x + (c.x - a.x) * k;
          const y = a.y + (c.y - a.y) * k + Math.sin(Math.PI * k) * 0.9;
          const z = a.z + (c.z - a.z) * k;
          msgPos.set([x, y, z], i * 3);
        });
        msgGeo.attributes.position.needsUpdate = true;
      };
    }

    const isFit = b.id === 'fit9';
    let angle = PHASES[b.id] || Math.random() * 6.28;

    register({
      id: b.id,
      data: b,
      anchor: carrier,
      size: L.size,
      viewDist: L.size * (L.rings ? 7.5 : 6.5),
      hits: [hit],
      line,
      update(dt, t, sdt) {
        angle += sdt * L.speed;
        carrier.position.set(Math.cos(angle) * L.orbit, 0, Math.sin(angle) * L.orbit);
        spin.rotation.y += dt * (isFit ? 0.6 : 0.12);
        if (planetMat) planetMat.uniforms.uHover.value = this.hover;
        if (atmoMat) {
          atmoMat.uniforms.uHover.value = this.hover;
          if (isFit) {
            const ph = (t % 1.1) / 1.1;
            const beat = Math.exp(-Math.pow((ph - 0.1) * 22, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.26) * 22, 2));
            atmoMat.uniforms.uPulse.value = beat * 1.2;
            spin.scale.setScalar(1 + beat * 0.035);
          }
          atmo.scale.setScalar(1 + this.hover * 0.06);
        }
        if (extras.userData.scan) {
          const s = extras.userData.scan;
          const y = Math.sin(t * 1.3);
          s.position.y = y * L.size;
          s.scale.setScalar(Math.sqrt(Math.max(0.02, 1 - y * y)));
          spin.rotation.x += dt * 0.15;
        }
        updateExtras(dt, t);
      },
    });
  }

  /* Origins asteroid belt */
  function makeBelt(b) {
    const group = new T.Group();
    group.rotation.x = 0.04;
    scene.add(group);
    const N = lowPower ? 700 : 1500;
    const rocks = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), N);
    const m = new T.Matrix4();
    const q = new T.Quaternion();
    const e = new T.Euler();
    const p = new T.Vector3();
    const s = new T.Vector3();
    const col = new T.Color();
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 8.2 + Math.random() * 3.2;
      const gy = (Math.random() + Math.random() + Math.random() - 1.5) * 0.45;
      p.set(Math.cos(a) * r, gy, Math.sin(a) * r);
      e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      q.setFromEuler(e);
      const sc = Math.random() < 0.02 ? 0.25 + Math.random() * 0.15 : 0.04 + Math.random() * 0.12;
      s.set(sc, sc * (0.6 + Math.random() * 0.6), sc);
      m.compose(p, q, s);
      rocks.setMatrixAt(i, m);
      col.setHSL(0.07 + Math.random() * 0.05, 0.25 + Math.random() * 0.2, 0.35 + Math.random() * 0.3);
      rocks.setColorAt(i, col);
    }
    group.add(rocks);
    const anchor = new T.Object3D();
    anchor.position.set(9.8, 0.2, 0);
    group.add(anchor);
    const beacon = glowSprite('#ffd6a0', 2.2, 0.9);
    anchor.add(beacon);
    const ring = new T.Mesh(new T.TorusGeometry(9.8, 1.5, 6, 64), invisible);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    const line = orbitLine(9.8, '#d9b38c', 0.0);
    group.add(line);
    register({
      id: b.id,
      data: b,
      anchor,
      size: 1,
      viewDist: 9,
      hits: [ring],
      line,
      update(dt, t, sdt) {
        group.rotation.y += sdt * 0.03;
        beacon.material.opacity = 0.55 + 0.35 * Math.sin(t * 2.2) + this.hover * 0.4;
      },
    });
  }

  /* The Lab space station */
  function makeStation(b) {
    const L = b.look;
    const pivot = new T.Object3D();
    pivot.rotation.set(L.tilt, 0, -L.tilt * 0.4);
    scene.add(pivot);
    const line = orbitLine(L.orbit, '#8b9bff', 0.09);
    pivot.add(line);
    const carrier = new T.Group();
    pivot.add(carrier);
    const st = new T.Group();
    st.scale.setScalar(0.9);
    carrier.add(st);
    const metal = new T.MeshStandardMaterial({ color: '#c9cde8', metalness: 0.6, roughness: 0.35, emissive: '#1c2040', emissiveIntensity: 0.6 });
    const panelMat = new T.MeshStandardMaterial({ color: '#2a3cff', metalness: 0.3, roughness: 0.3, emissive: '#2236ff', emissiveIntensity: 0.9 });
    const body = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 1.8, 20), metal);
    body.rotation.z = Math.PI / 2;
    st.add(body);
    [-1, 1].forEach((side) => {
      const arm = new T.Mesh(new T.BoxGeometry(0.9, 0.06, 0.06), metal);
      arm.position.x = side * 1.3;
      const pnl = new T.Mesh(new T.BoxGeometry(1.5, 0.03, 0.8), panelMat);
      pnl.position.x = side * 2.4;
      st.add(arm, pnl);
    });
    const torus = new T.Mesh(new T.TorusGeometry(1.0, 0.08, 10, 48), metal);
    torus.rotation.y = Math.PI / 2;
    st.add(torus);
    const blink = new T.Mesh(new T.SphereGeometry(0.07, 8, 8), new T.MeshBasicMaterial({ color: new T.Color('#ff3355').multiplyScalar(3) }));
    blink.position.set(0.9, 0.35, 0);
    st.add(blink);
    const glow = glowSprite('#8b9bff', 6, 0.18);
    st.add(glow);
    const hit = new T.Mesh(new T.SphereGeometry(2.6, 12, 8), invisible);
    carrier.add(hit);
    let angle = PHASES.lab;
    register({
      id: b.id,
      data: b,
      anchor: carrier,
      size: 2.2,
      viewDist: 9,
      hits: [hit],
      line,
      update(dt, t, sdt) {
        angle += sdt * L.speed;
        carrier.position.set(Math.cos(angle) * L.orbit, 0, Math.sin(angle) * L.orbit);
        st.rotation.y += dt * 0.15;
        st.rotation.x = Math.sin(t * 0.4) * 0.15;
        torus.rotation.x += dt * 0.8;
        blink.visible = t % 1.4 < 0.12;
        glow.material.opacity = 0.15 + this.hover * 0.3;
      },
    });
  }

  /* Contact comet */
  function makeComet() {
    const pivot = new T.Object3D();
    pivot.rotation.set(0.55, 0.9, 0.2);
    scene.add(pivot);
    const carrier = new T.Group();
    pivot.add(carrier);
    const head = new T.Mesh(new T.SphereGeometry(0.35, 20, 14), new T.MeshBasicMaterial({ color: new T.Color('#ffd1e6').multiplyScalar(2.4) }));
    carrier.add(head);
    const glow = glowSprite('#ff8fb8', 5, 0.9);
    carrier.add(glow);
    const hit = new T.Mesh(new T.SphereGeometry(2.2, 10, 8), invisible);
    carrier.add(hit);

    const N = lowPower ? 260 : 520;
    const tPos = new Float32Array(N * 3);
    const tAlpha = new Float32Array(N);
    const parts = Array.from({ length: N }, () => ({ p: new T.Vector3(), v: new T.Vector3(), life: 0, max: 1 }));
    const tailGeo = new T.BufferGeometry();
    tailGeo.setAttribute('position', new T.BufferAttribute(tPos, 3));
    tailGeo.setAttribute('aAlpha', new T.BufferAttribute(tAlpha, 1));
    const tail = new T.Points(
      tailGeo,
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        uniforms: { uPixel: { value: DPR }, uMap: { value: SOFT_GLOW } },
        vertexShader: `attribute float aAlpha; uniform float uPixel; varying float vA;
          void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (0.4 + aAlpha) * 70.0 * uPixel / -mv.z; }`,
        fragmentShader: `uniform sampler2D uMap; varying float vA;
          void main(){ vec4 t = texture2D(uMap, gl_PointCoord); vec3 c = mix(vec3(0.55,0.65,1.0), vec3(1.0,0.6,0.85), vA); gl_FragColor = vec4(c * 1.6 * t.a * vA, t.a * vA); }`,
      })
    );
    tail.frustumCulled = false;
    scene.add(tail);

    const A = 44;
    const E = 0.62;
    let theta = 2.2;
    let spawn = 0;
    let idx = 0;
    const world = new T.Vector3();
    const away = new T.Vector3();
    register({
      id: 'contact',
      data: contact,
      anchor: carrier,
      size: 0.6,
      viewDist: 7,
      hits: [hit],
      update(dt, t, sdt) {
        const r = (A * (1 - E * E)) / (1 + E * Math.cos(theta));
        theta += (sdt * 140) / (r * r);
        carrier.position.set(Math.cos(theta) * r, 0, Math.sin(theta) * r);
        glow.scale.setScalar(5 + Math.sin(t * 4) * 0.4 + this.hover * 2.5);
        carrier.getWorldPosition(world);
        away.copy(world).normalize();
        spawn += dt * N * 0.8;
        while (spawn > 1) {
          spawn -= 1;
          const pt = parts[idx];
          idx = (idx + 1) % N;
          pt.p.copy(world).add(new T.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3));
          pt.v.copy(away).multiplyScalar(2.5 + Math.random() * 3).add(new T.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6));
          pt.max = 0.8 + Math.random() * 0.9;
          pt.life = pt.max;
        }
        for (let i = 0; i < N; i++) {
          const pt = parts[i];
          if (pt.life > 0) {
            pt.life -= dt;
            pt.p.addScaledVector(pt.v, dt);
          }
          tPos[i * 3] = pt.p.x;
          tPos[i * 3 + 1] = pt.p.y;
          tPos[i * 3 + 2] = pt.p.z;
          tAlpha[i] = Math.max(0, pt.life / pt.max);
        }
        tailGeo.attributes.position.needsUpdate = true;
        tailGeo.attributes.aAlpha.needsUpdate = true;
      },
    });
  }

  S.bodies.forEach((b) => {
    if (b.kind === 'planet') makePlanet(b);
    else if (b.kind === 'belt') makeBelt(b);
    else if (b.kind === 'station') makeStation(b);
  });
  makeComet();

  /* ---------- Labels ---------- */

  const labelLayer = $('#labels');
  ORDER.forEach((b) => {
    const el = document.createElement('button');
    el.className = 'label';
    el.dataset.go = b.id;
    el.style.setProperty('--c', colorOf(b));
    el.innerHTML = `${esc(b.short)} <small>${esc(b.years)}</small>`;
    el.setAttribute('aria-label', `Open ${b.name}`);
    el.addEventListener('mouseenter', () => {
      entities[b.id].labelHover = true;
      entities[b.id].hoverTarget = 1;
    });
    el.addEventListener('mouseleave', () => {
      entities[b.id].labelHover = false;
      entities[b.id].hoverTarget = hovered === entities[b.id] ? 1 : 0;
    });
    labelLayer.appendChild(el);
    entities[b.id].label = el;
  });

  const projV = new T.Vector3();
  function updateLabels() {
    const W = innerWidth;
    const H = innerHeight;
    const k = H / 2 / Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    for (const id in entities) {
      const e = entities[id];
      e.anchor.getWorldPosition(projV);
      const dist = projV.distanceTo(camera.position);
      projV.project(camera);
      const hidden = projV.z > 1 || Math.abs(projV.x) > 1.2 || Math.abs(projV.y) > 1.2 || (state.focus === e && !state.flying);
      e.label.classList.toggle('hidden', hidden);
      if (hidden) continue;
      const x = (projV.x * 0.5 + 0.5) * W;
      const y = (-projV.y * 0.5 + 0.5) * H;
      const pr = (e.size / dist) * k;
      e.label.style.transform = `translate3d(${(x + pr + 6).toFixed(1)}px, ${y.toFixed(1)}px, 0) translateY(-50%)`;
      e.label.classList.toggle('hot', e.hoverTarget > 0);
      e.label.classList.toggle('dim', !!state.focus && state.focus !== e);
    }
  }

  /* ---------- Picking ---------- */

  const raycaster = new T.Raycaster();
  const pointer = new T.Vector2(9, 9);
  let pointerActive = false;
  let hovered = null;
  let downAt = null;

  canvas.addEventListener('pointermove', (e) => {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    pointerActive = e.pointerType === 'mouse' && e.buttons === 0;
    state.idle = 0;
  });
  canvas.addEventListener('pointerleave', () => (pointerActive = false));
  canvas.addEventListener('pointerdown', (e) => {
    downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    state.idle = 0;
    $('#hint').classList.add('gone');
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || state.mode !== 'explore') return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    const quick = performance.now() - downAt.t < 600;
    downAt = null;
    if (moved > 6 || !quick) return;
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    const id = pick();
    if (id) focusOn(id);
  });
  controls.addEventListener('start', () => {
    state.idle = 0;
    $('#hint').classList.add('gone');
  });

  function pick() {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(hitMeshes, false)[0];
    return hit ? hit.object.userData.id : null;
  }

  function updateHover() {
    const id = pointerActive && state.mode === 'explore' ? pick() : null;
    const next = id ? entities[id] : null;
    if (next !== hovered) {
      if (hovered && !hovered.labelHover) hovered.hoverTarget = 0;
      hovered = next;
      if (hovered) hovered.hoverTarget = 1;
      document.body.classList.toggle('hovering', !!hovered);
    }
  }

  /* ---------- Camera: focus, fly, track ---------- */

  const fly = { t: 0, dur: 1.6, fromPos: new T.Vector3(), fromTarget: new T.Vector3(), offset: new T.Vector3(), toOverview: false };
  const bodyPos = new T.Vector3();
  const shiftV = new T.Vector3();
  const camRight = new T.Vector3();
  const camUp = new T.Vector3();
  const goalTarget = new T.Vector3();
  const goalPos = new T.Vector3();

  function overviewPos(out) {
    const aspect = innerWidth / innerHeight;
    const d = 100 * clamp(Math.pow(1.35 / aspect, 0.85), 1, 2.4);
    return out.set(0, 0.48, 1).normalize().multiplyScalar(d);
  }

  function startFly(dur) {
    fly.t = 0;
    fly.dur = reduceMotion ? 0.01 : dur;
    fly.fromPos.copy(camera.position);
    fly.fromTarget.copy(controls.target);
    state.flying = true;
    controls.enabled = false;
  }

  function focusOn(id) {
    const e = entities[id];
    if (!e || state.mode !== 'explore') return;
    const already = state.focus === e;
    state.focus = e;
    state.timeTarget = 0.12;
    openPanel(e.data);
    setHash(id);
    if (already && !state.flying) return;

    e.anchor.getWorldPosition(bodyPos);
    const up = new T.Vector3(0, 1, 0);
    const viewDist = e.viewDist * (small() ? 1.6 : 1);
    if (id === 'core') {
      fly.offset.set(0.35, 0.4, 1).normalize().multiplyScalar(viewDist);
    } else {
      const out = bodyPos.clone().setY(0).normalize();
      const side = new T.Vector3().crossVectors(up, out).normalize();
      fly.offset.copy(out).multiplyScalar(-0.5).addScaledVector(side, 0.8).addScaledVector(up, 0.42).normalize().multiplyScalar(viewDist);
    }
    fly.toOverview = false;
    const travel = camera.position.distanceTo(bodyPos);
    startFly(clamp(0.9 + travel / 80, 1.1, 2.2));
    controls.minDistance = Math.max(1.5, e.size * 2);
  }

  function unfocus() {
    if (!state.focus) return;
    state.focus = null;
    state.timeTarget = 1;
    closePanel();
    setHash('');
    fly.toOverview = true;
    startFly(1.6);
    controls.minDistance = 6;
  }

  function panelShift(dist, out) {
    out.set(0, 0, 0);
    if (panel.hidden) return out;
    const half = dist * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    camera.updateMatrixWorld();
    if (small()) {
      camUp.setFromMatrixColumn(camera.matrixWorld, 1);
      return out.copy(camUp).multiplyScalar(-0.6 * half);
    }
    const panelW = panel.offsetWidth + 18;
    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    return out.copy(camRight).multiplyScalar((panelW / 2 / (innerHeight / 2)) * half);
  }

  function updateCamera(dt) {
    if (state.flying) {
      fly.t += dt / fly.dur;
      const k = easeInOut(Math.min(1, fly.t));
      if (fly.toOverview) {
        goalTarget.set(0, 0, 0);
        overviewPos(goalPos);
      } else {
        state.focus.anchor.getWorldPosition(bodyPos);
        goalPos.copy(bodyPos).add(fly.offset);
        goalTarget.copy(bodyPos).add(panelShift(fly.offset.length(), shiftV));
        goalPos.add(shiftV);
      }
      const arc = Math.sin(Math.PI * k) * Math.min(18, fly.fromPos.distanceTo(goalPos) * 0.18);
      camera.position.lerpVectors(fly.fromPos, goalPos, k);
      camera.position.y += arc;
      controls.target.lerpVectors(fly.fromTarget, goalTarget, k);
      camera.lookAt(controls.target);
      if (fly.t >= 1) {
        state.flying = false;
        controls.enabled = true;
      }
      return;
    }
    if (state.focus) {
      state.focus.anchor.getWorldPosition(bodyPos);
      const dist = camera.position.distanceTo(controls.target);
      goalTarget.copy(bodyPos).add(panelShift(dist, shiftV));
      shiftV.subVectors(goalTarget, controls.target);
      camera.position.add(shiftV);
      controls.target.copy(goalTarget);
    }
    controls.autoRotate = !state.focus && state.idle > 7 && !reduceMotion;
    controls.update();
  }

  /* ---------- Launch sequence ---------- */

  const warpAnim = { t: 0, dur: 2.8, from: new T.Vector3(), to: new T.Vector3() };

  function launch() {
    if (state.mode !== 'intro') return;
    finishBoot();
    const intro = $('#intro');
    intro.classList.add('leaving');
    $('#warp-flash').classList.add('go');
    setTimeout(() => {
      intro.remove();
      clearInterval(rotatorTimer);
    }, 1000);
    warpAnim.from.copy(camera.position);
    overviewPos(warpAnim.to);
    warpAnim.t = 0;
    state.mode = reduceMotion ? 'explore' : 'warp';
    if (reduceMotion) arrive();
  }

  function arrive() {
    state.mode = 'explore';
    state.warp = 0;
    camera.fov = 50;
    camera.updateProjectionMatrix();
    overviewPos(camera.position);
    controls.target.set(0, 0, 0);
    controls.enabled = true;
    controls.update();
    document.body.classList.remove('intro-mode');
    if (state.pending) {
      const id = state.pending;
      state.pending = null;
      setTimeout(() => focusOn(id), 250);
    } else {
      setTimeout(() => toast('Click a planet, or use the dock below. <b>Further out = newer.</b>', 4200), 400);
    }
  }

  let mx = 0;
  let my = 0;
  addEventListener('pointermove', (e) => {
    mx = e.clientX / innerWidth - 0.5;
    my = e.clientY / innerHeight - 0.5;
  });

  function updateIntro(dt, t) {
    if (state.mode === 'intro') {
      camera.position.set(START.x + Math.sin(t * 0.1) * 20 + mx * 24, START.y + my * 14, START.z);
      camera.lookAt(0, 0, 0);
      return true;
    }
    if (state.mode === 'warp') {
      warpAnim.t += dt / warpAnim.dur;
      const k = Math.min(1, warpAnim.t);
      const e = easeInOut(k);
      camera.position.lerpVectors(warpAnim.from, warpAnim.to, e);
      camera.fov = 50 + 50 * Math.sin(Math.PI * Math.pow(k, 0.8));
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, 0);
      state.warp = Math.sin(Math.PI * Math.min(1, k * 1.15));
      if (k >= 1) arrive();
      return true;
    }
    return false;
  }

  /* ---------- Main loop ---------- */

  let last = performance.now();
  let elapsed = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.paused) return;

    elapsed += dt;
    state.idle += dt;
    uTime.value = elapsed;

    if (state.hyper > 0) state.hyper -= dt;
    const tt = state.hyper > 0 ? 28 : state.timeTarget;
    state.timeScale += (tt - state.timeScale) * Math.min(1, dt * 2.5);
    const motion = reduceMotion ? 0.3 : 1;
    const sdt = dt * state.timeScale * motion;
    bloom.strength = 0.7 + (state.hyper > 0 ? 0.6 : 0) + state.warp * 0.5;

    for (const id in entities) {
      const e = entities[id];
      e.hover += (e.hoverTarget - e.hover) * Math.min(1, dt * 8);
      e.update(dt, elapsed, sdt);
      if (e.line) {
        const want = state.focus === e ? 0.45 : e.line.userData.base + e.hover * 0.3;
        e.line.material.opacity += (want - e.line.material.opacity) * Math.min(1, dt * 5);
      }
    }
    stars.rotation.y += dt * 0.002;

    if (!updateIntro(dt, elapsed)) {
      updateHover();
      updateCamera(dt);
      updateLabels();
    }
    updateWarp(dt);
    composer.render();
  }

  function onResize() {
    const w = innerWidth;
    const h = innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
  }
  addEventListener('resize', onResize);

  if (!plain.hidden) state.paused = true;
  requestAnimationFrame(frame);
})();
