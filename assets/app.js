(() => {
  const root = document.documentElement;

  // Header: clear over a hero, solid once past it. Pages without a hero keep it solid.
  const bar = document.querySelector('[data-bar]');
  const hero = document.querySelector('.hero, .phero');
  if (bar && hero) {
    const setBar = () => bar.classList.toggle('is-solid', window.scrollY > hero.offsetHeight - 90);
    setBar();
    window.addEventListener('scroll', setBar, { passive: true });
  }

  // Film pause
  const film = document.querySelector('.hero__film, video.phero__media');
  const pause = document.querySelector('[data-pause]');
  if (film && pause) {
    pause.addEventListener('click', () => {
      const paused = !film.paused;
      paused ? film.pause() : film.play();
      pause.textContent = paused ? 'Play film' : 'Pause film';
      pause.setAttribute('aria-pressed', String(paused));
    });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { film.pause(); pause.textContent = 'Play film'; }
  }

  // Home film has no pause button: start it as soon as it can play, in case the browser holds back autoplay
  if (film && !pause && film.matches('.hero__film')) {
    const start = () => { if (film.paused) film.play().catch(() => {}); };
    film.addEventListener('canplay', start);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    start();
  }

  // Film captions: approved cue text and timing (108 s loop), shown as live text so they sit above the shading
  const cap = document.querySelector('[data-film-cap]');
  if (film && cap) {
    const cues = [
      [0.6, 6.5, 'CASE Consultants', 'In Torbay since 1988'],
      [8.0, 11.61, 'Extensions and alterations', 'Structural and condition surveys'],
      [11.61, 15.27, 'Extensions and alterations', 'Temporary works: needles and props'],
      [15.27, 24.0, 'Extensions and alterations', 'Steel, timber and masonry design'],
      [29.05, 31.68, 'New buildings', 'Piling and foundations'],
      [31.68, 34.84, 'New buildings', 'Multi-storey building design'],
      [34.84, 38.2, 'New buildings', 'Contract documents'],
      [39.2, 44.19, 'Princess Promenade, Torquay', 'Engineering design for Torbay Council'],
      [44.19, 50.2, 'Princess Promenade, Torquay', 'Details and tender documents'],
      [53.4, 55.9, 'Foundations and ground', 'Retaining walls'],
      [55.9, 58.9, 'Foundations and ground', 'Piling'],
      [58.9, 63.6, 'Foundations and ground', 'Contract administration'],
      [72.23, 75.71, 'Livermead Sea Wall, Torquay', 'Inspection after the storms'],
      [75.71, 78.74, 'Livermead Sea Wall, Torquay', 'Emergency repairs co-ordinated'],
      [78.74, 82.6, 'Livermead Sea Wall, Torquay', 'Design and contract administration'],
      [88.61, 90.82, 'Rail', 'Structures for Network Rail'],
      [90.82, 94.35, 'Rail', 'Temporary works for the lift'],
      [94.35, 100.2, 'Rail', 'Earthworks and maintenance'],
      [101.1, 107.16, 'CASE Consultants', 'Survey, design, contract administration and expert witness'],
    ];
    const [k, t] = cap.querySelectorAll('p');
    let shown = -1, timer = 0;
    const update = () => {
      const now = film.currentTime % 108;
      const i = cues.findIndex(([a, b]) => now >= a && now < b);
      if (i !== shown) {
        shown = i;
        clearTimeout(timer);
        cap.classList.add('is-off');
        if (i >= 0) timer = setTimeout(() => { k.textContent = cues[i][2]; t.textContent = cues[i][3]; cap.classList.remove('is-off'); }, k.textContent ? 300 : 0);
      }
    };
    const tick = () => { update(); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    film.addEventListener('timeupdate', update);
  }

  // Home services: picture follows the service under the pointer
  const pic = document.querySelector('[data-svc-pic]');
  const rows = document.querySelectorAll('.svc[data-pic]');
  if (pic) {
    // The current picture stays on screen until the next one is fully loaded, so the frame is never blank
    const decoded = (img) => Promise.race([img.decode ? img.decode().catch(() => {}) : 0, new Promise((r) => setTimeout(r, 300))]);
    const ready = {};
    const load = (src) => ready[src] || (ready[src] = new Promise((done) => {
      const i = new Image();
      i.onload = () => decoded(i).then(done);
      i.onerror = done;
      i.src = src;
    }));
    // Each new picture fades in on top; the ones underneath are removed only once it is fully in,
    // so a fully visible picture always sits at the bottom of the stack
    const fig = pic.parentNode;
    let want = pic.getAttribute('src');
    rows.forEach((row) => row.addEventListener('mouseenter', () => {
      rows.forEach((r) => r.classList.toggle('is-on', r === row));
      const src = row.dataset.pic;
      if (want === src) return;
      want = src;
      load(src).then(() => {
        if (want !== src) return;
        const next = pic.cloneNode();
        next.removeAttribute('data-svc-pic');
        next.classList.add('is-back');
        next.src = src;
        fig.appendChild(next);
        decoded(next).then(() => {
          if (want !== src) { next.remove(); return; }
          next.getBoundingClientRect();
          next.classList.remove('is-back');
          const settle = () => { while (next.isConnected && next.previousElementSibling) next.previousElementSibling.remove(); };
          next.addEventListener('transitionend', settle, { once: true });
          setTimeout(settle, 1200);
        });
      });
    }));
    rows.forEach((r) => load(r.dataset.pic));
  }

  // Projects filter: rows run pair, pair, single full-width, repeating; pairs alternate wide-narrow and narrow-wide; a lone last tile spans the row (same rule as build.mjs)
  const list = document.querySelector('[data-plist]');
  if (list) {
    const tiles = [...list.querySelectorAll('.ptile')];
    const buttons = document.querySelectorAll('[data-filter]');
    const none = document.querySelector('[data-none]');
    const layout = () => {
      const shown = tiles.filter((t) => !t.hidden);
      let row = 0, k = 0;
      while (k < shown.length) {
        const size = row % 3 === 2 ? 1 : 2, pairRow = row - Math.floor(row / 3);
        for (let j = 0; j < size && k + j < shown.length; j++) {
          const t = shown[k + j];
          t.classList.remove('is-w', 'is-n', 'is-full');
          if (size === 1 || k === shown.length - 1) t.classList.add('is-full');
          else t.classList.add((j === 0) === (pairRow % 2 === 0) ? 'is-w' : 'is-n');
        }
        k += size; row++;
      }
      if (none) none.hidden = shown.length > 0;
    };
    const apply = (key) => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === key)));
      tiles.forEach((t) => { t.hidden = key !== 'all' && !t.dataset.cats.split(' ').includes(key); t.classList.add('is-in'); });
      layout();
    };
    buttons.forEach((b) => b.addEventListener('click', () => {
      apply(b.dataset.filter);
      history.replaceState(null, '', b.dataset.filter === 'all' ? location.pathname + location.search : '#' + b.dataset.filter);
    }));
    const start = location.hash.slice(1);
    if (start && [...buttons].some((b) => b.dataset.filter === start)) apply(start); else layout();
  }

  // Quiet reveals
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
  if (/[?&]still/.test(location.search)) document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));

  // Load every picture on the page soon after opening, so none appear late while scrolling.
  // On the home page this waits until the film can play, so the film starts first.
  const warm = () => document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
  const heroFilm = document.querySelector('.hero__film');
  if (heroFilm && heroFilm.readyState < 3) {
    let done = false;
    const go = () => { if (!done) { done = true; warm(); } };
    heroFilm.addEventListener('canplay', go, { once: true });
    setTimeout(go, 2500);
  } else if (document.readyState === 'complete') warm();
  else window.addEventListener('load', warm, { once: true });

  // Fetch a page as soon as the pointer rests on its link, so it opens at once
  const seen = new Set();
  document.addEventListener('pointerover', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.origin !== location.origin || seen.has(a.pathname)) return;
    seen.add(a.pathname);
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = a.pathname;
    document.head.appendChild(l);
  }, { passive: true });
})();
