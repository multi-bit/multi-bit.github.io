(() => {
  const S = window.SITE;
  const P = S.person;
  const WORK_ORDER = ['soozy', 'twl', 'feast', 'pokkee', 'fit9', 'cheerfor'];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v, d = 0) => v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt = (st) => (st.prefix || '') + (st.plain ? String(st.value) : num(st.value, st.decimals)) + (st.suffix || '');
  const pad = (n) => String(n).padStart(2, '0');
  const host = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const stat = (st) => `
    <div class="stat">
      <b data-count="${st.plain ? '' : st.value}" data-d="${st.decimals || 0}" data-pre="${esc(st.prefix || '')}" data-suf="${esc(st.suffix || '')}">${esc(fmt(st))}</b>
      <span>${esc(st.label)}</span>
    </div>`;

  const chips = (items) => `<ul class="chips">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

  const links = (items) => items.length
    ? `<ul class="links">${items.map(([label, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}<span aria-hidden="true">↗</span></a></li>`).join('')}</ul>`
    : '';

  const orb = (b) => {
    const l = b.look || {};
    const [c0, c1, c2] = l.colors || ['transparent', 'transparent', 'transparent'];
    const cls = ['orb', l.wire ? 'wire' : '', l.rings ? 'ring' : ''].join(' ').trim();
    return `<span class="${cls}" style="--c0:${c0};--c1:${c1};--c2:${c2};--ring:${l.rings || 'transparent'}" aria-hidden="true"></span>`;
  };

  const work = (b, i) => `
    <article class="work rv" id="${b.id}" style="--a:${(b.look && b.look.glow) || 'var(--ink)'}">
      <div class="work-side">
        <span class="idx">${pad(i + 1)}</span>
        ${orb(b)}
        <h3>${esc(b.name)}</h3>
        <p class="years">${esc(b.years)}</p>
        <p class="state"><i></i>${esc(b.status)}</p>
      </div>
      <div class="work-main">
        <p class="tagline">${esc(b.tagline)}</p>
        <p class="role">${esc(b.role)}</p>
        ${b.stats.length ? `<div class="stats">${b.stats.map(stat).join('')}</div>` : ''}
        <ul class="hl">${b.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        ${b.lesson ? `<p class="lesson"><span>What I'd change</span>${esc(b.lesson)}</p>` : ''}
        ${chips(b.stack)}
        ${links(b.links)}
      </div>
    </article>`;

  const listBlock = (b) => `
    <div class="side-block rv">
      <p class="label">${esc(b.years)}</p>
      <h3>${esc(b.name)}</h3>
      <p class="muted">${esc(b.tagline)}</p>
      <ul class="rows">
        ${b.list.map(([name, meta, text]) => `
          <li><div><b>${esc(name)}</b><span>${esc(meta)}</span></div><p>${esc(text)}</p></li>`).join('')}
      </ul>
      ${chips(b.stack)}
    </div>`;

  const byId = Object.fromEntries(S.bodies.map((b) => [b.id, b]));
  const products = WORK_ORDER.map((id) => byId[id]).filter(Boolean);

  document.getElementById('app').innerHTML = `
    <section class="hero wrap" id="top">
      <p class="eyebrow rv">${esc(P.title)} · ${esc(P.location)} · since ${P.since}</p>
      <h1 class="rv">I design, build and ship <em>whole products</em>, from the first sketch to the App Store and the server it runs on.</h1>
      <div class="hero-foot rv">
        <p class="intro">${esc(P.intro)}</p>
        <div class="hero-cta">
          <a class="btn solid" href="#work">See the work</a>
          <a class="btn" href="mailto:${esc(P.email)}">Email me</a>
        </div>
      </div>
      <ul class="disciplines rv">${P.disciplines.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
      <div class="stats big rv">${S.headline.map(stat).join('')}</div>
    </section>

    <section class="wrap" id="work">
      <div class="sec-head rv">
        <p class="label">Selected work</p>
        <h2>Products I built and run, <em>end to end</em>.</h2>
      </div>
      <nav class="index rv" aria-label="Products">
        ${products.map((b, i) => `<a href="#${b.id}"><span>${pad(i + 1)}</span>${esc(b.name)}<em>${esc(b.years)}</em></a>`).join('')}
      </nav>
      ${products.map(work).join('')}
    </section>

    <section class="wrap" id="beside">
      <div class="sec-head rv">
        <p class="label">Before &amp; beside</p>
        <h2>Where it started, and what I tinker with.</h2>
      </div>
      <div class="two">
        ${['origins', 'lab'].map((id) => byId[id]).filter(Boolean).map(listBlock).join('')}
      </div>
    </section>

    <section class="wrap" id="about">
      <div class="sec-head rv">
        <p class="label">About</p>
        <h2>${esc(P.pitch)}</h2>
      </div>
      <div class="two">
        <div class="rv">
          <p class="label">Experience</p>
          <ul class="exp">
            ${S.experience.map((e) => `
              <li>
                <p class="dates">${esc(e.dates)}</p>
                <h3>${esc(e.title)}</h3>
                <p class="org">${esc(e.org)}</p>
                <p class="muted">${esc(e.text)}</p>
              </li>`).join('')}
          </ul>
        </div>
        <div class="rv">
          <p class="label">Toolbox</p>
          <div class="skills">
            ${S.skills.map((g) => `<div><h4>${esc(g.group)}</h4>${chips(g.items)}</div>`).join('')}
          </div>
        </div>
      </div>
    </section>

    <section class="contact" id="contact">
      <div class="wrap">
        <p class="label">Contact</p>
        <h2 class="rv">Let's build <em>something</em> together.</h2>
        <p class="muted rv">${esc(P.status)}</p>
        <div class="mail rv">
          <a href="mailto:${esc(P.email)}">${esc(P.email)}</a>
          <button type="button" class="btn" id="copy">Copy</button>
        </div>
        <ul class="links rv">
          <li><a href="${esc(P.links.linkedin)}" target="_blank" rel="noopener">LinkedIn<span aria-hidden="true">↗</span></a></li>
          <li><a href="${esc(P.links.github)}" target="_blank" rel="noopener">GitHub<span aria-hidden="true">↗</span></a></li>
          <li><a href="../">The galaxy version of this site<span aria-hidden="true">↗</span></a></li>
        </ul>
        <footer>
          <span>© ${new Date().getFullYear()} ${esc(P.name)} · ${esc(P.handle)}</span>
          <span>${esc(P.languages)}</span>
        </footer>
      </div>
    </section>`;

  const copy = document.getElementById('copy');
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(P.email);
      copy.textContent = 'Copied';
    } catch {
      copy.textContent = 'Press ⌘C';
    }
    setTimeout(() => { copy.textContent = 'Copy'; }, 1600);
  });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    if (Number.isNaN(target) || reduced) return;
    const d = +el.dataset.d;
    const t0 = performance.now();
    const dur = 1100;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = el.dataset.pre + num(target * e, d) + el.dataset.suf;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      en.target.querySelectorAll('[data-count]').forEach(countUp);
      io.unobserve(en.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));
})();
