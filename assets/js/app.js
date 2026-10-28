/* Masar: single-page app with hash routes.
   Routes: #/  #/companies  #/company/:id  #/majors  #/major/:id  #/coop  #/search/:q
           #/resume/:companyId[/coop]  #/builder/:companyId/:format  #/assessment */
(function () {
  'use strict';

  /* ---------- Storage (wrapped: can fail in private mode) ---------- */
  const PREFIX = 'masar.';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
    raw(k) { try { return localStorage.getItem(PREFIX + k); } catch (e) { return null; } },
    setRaw(k, v) { try { localStorage.setItem(PREFIX + k, v); } catch (e) { /* ignore */ } }
  };

  /* ---------- State ---------- */
  const S = {
    lang: store.raw('lang') === 'ar' ? 'ar' : 'en',
    theme: store.raw('theme') === 'light' ? 'light' : 'dark',
    user: store.get('user', null),
    read: store.get('read', []),
    extraNotifs: store.get('notifs', []),
    draft: store.get('draft', null),
    submission: store.get('submission', null),
    result: store.get('result', null),
    homeMajor: 'all',
    sector: 'all',
    quiz: null,
    timer: null,
    notifOpen: false,
    menuOpen: false,
    previewOpen: false,
    lastLevel: null,
    firstRender: true
  };

  /* ---------- Helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function t(key, vars) {
    let s = STRINGS[S.lang][key];
    if (s == null) s = STRINGS.en[key];
    if (s == null) s = key;
    if (vars) Object.keys(vars).forEach((k) => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  const L = (o) => (o ? (o[S.lang] != null ? o[S.lang] : o.en) : '');
  const findCompany = (id) => COMPANIES.find((c) => c.id === id);
  const findMajor = (id) => MAJORS.find((m) => m.id === id);
  const findSkill = (id) => SKILLS.find((s) => s.id === id);
  const pad = (n) => String(n).padStart(2, '0');

  function openings(companyId, majorId) {
    let h = 0;
    const s = companyId + majorId;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return (h % 8) + 1;
  }
  const totalOpenings = (c) => c.majors.reduce((n, m) => n + openings(c.id, m), 0);

  /* Skill matching: exact name/alias first, then whole-word contains. */
  const norm = (s) => String(s).toLowerCase().trim().replace(/\s+/g, ' ');
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function matchSkill(text) {
    const n = norm(text);
    if (!n) return null;
    const names = (s) => [s.en, s.ar, s.id].concat(s.aliases).map(norm);
    let hit = SKILLS.find((s) => names(s).includes(n));
    if (hit) return hit;
    hit = SKILLS.find((s) => names(s).some((term) => term.length >= 2 &&
      new RegExp('(^|[^a-z0-9\\u0600-\\u06ff])' + reEsc(term) + '($|[^a-z0-9\\u0600-\\u06ff])').test(n)));
    return hit || null;
  }

  function toast(msg) {
    const region = $('#toast-region');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    region.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3800);
  }

  function announce(msg) {
    const el = $('#sr-status');
    if (el) { el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 50); }
  }

  /* ---------- Shared bits ---------- */
  function logoTile(c, size) {
    return '<span class="logo-tile ' + (size || '') + '" style="--c:' + c.color + '" aria-hidden="true">' + esc(c.mark) + '</span>';
  }

  function searchForm(q) {
    return '<form class="search" role="search" data-form="search">' +
      '<label class="sr-only" for="q">' + t('searchLabel') + '</label>' +
      '<span class="search-icon">' + icon('search') + '</span>' +
      '<input id="q" name="q" type="search" autocomplete="off" placeholder="' + esc(t('searchPh')) + '" value="' + esc(q || '') + '">' +
      '<button class="btn btn-accent" type="submit">' + t('searchBtn') + '</button>' +
      '</form>';
  }

  function companyCard(c, majorId) {
    let roleText;
    if (majorId && majorId !== 'all') {
      const n = openings(c.id, majorId);
      roleText = L(findMajor(majorId).role) + ' · ' + (n === 1 ? t('opening1') : t('openings', { n: n }));
    } else {
      const n = totalOpenings(c);
      roleText = n === 1 ? t('role1') : t('roles', { n: n });
    }
    return '<article class="company-card">' +
      '<a class="card-link" href="#/company/' + c.id + '">' +
      '<div class="card-media" style="--c:' + c.color + '" aria-hidden="true">' +
      '<span class="card-mark">' + esc(c.mark) + '</span>' +
      '<span class="card-word">' + esc(L(c)) + '</span>' +
      '</div>' +
      '<div class="card-body">' +
      '<h3 class="card-title">' + esc(L(c)) + '</h3>' +
      '<p class="card-meta">' + esc(L(c.sector)) + ' · ' + esc(L(c.city)) + '</p>' +
      '<div class="card-tags"><span class="tag">' + icon('briefcase') + esc(roleText) + '</span>' +
      (c.coop ? '<span class="tag tag-accent">' + icon('cap') + t('coopBadge') + '</span>' : '') +
      '</div></div></a></article>';
  }

  function stepper(current) {
    const steps = [t('stepFormat'), t('stepBuild'), t('stepAssess')];
    return '<ol class="stepper" aria-label="' + esc(t('stepOf', { a: Math.min(current, 3), b: 3 })) + '">' +
      steps.map((s, i) => {
        const n = i + 1;
        const cls = n < current ? 'done' : n === current ? 'current' : '';
        return '<li class="' + cls + '"' + (n === current ? ' aria-current="step"' : '') + '>' +
          '<span class="step-num">' + (n < current ? icon('check') : pad(n)) + '</span>' + s + '</li>';
      }).join('') + '</ol>';
  }

  function backLink(href, label) {
    return '<a class="back-link" href="' + href + '">' + icon('arrowBack', 'flip-rtl') + esc(label) + '</a>';
  }

  /* ---------- Header & footer ---------- */
  function allNotifs() {
    return S.extraNotifs.concat(NOTIFICATIONS);
  }

  function renderHeader() {
    const route = currentRoute()[0] || '';
    const unread = allNotifs().filter((n) => !S.read.includes(n.id)).length;
    const nav = [
      ['companies', t('navCompanies'), ['companies', 'company']],
      ['majors', t('navMajors'), ['majors', 'major']],
      ['coop', t('navCoop'), ['coop']]
    ];
    const userBtn = S.user
      ? '<button class="btn btn-ghost btn-sm" type="button" data-action="logout">' + icon('logout', 'flip-rtl') + '<span>' + esc(t('hello', { n: S.user.name })) + '</span></button>'
      : '<button class="btn btn-accent btn-sm" type="button" data-action="login">' + icon('user') + '<span>' + t('login') + '</span></button>';

    const notifItems = allNotifs().map((n) => {
      const isRead = S.read.includes(n.id);
      return '<li class="notif' + (isRead ? '' : ' unread') + '"><span class="dot" aria-hidden="true"></span><div><p>' + esc(L(n)) + '</p><p class="muted small">' + esc(L(n.time)) + '</p></div></li>';
    }).join('');

    $('#site-header').innerHTML =
      '<div class="container header-inner">' +
      '<a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">M<i>/</i>S</span><span class="brand-name">MASAR <span class="brand-ar">مسار</span></span></a>' +
      '<nav class="main-nav' + (S.menuOpen ? ' open' : '') + '" id="main-nav" aria-label="Main">' +
      '<ul>' + nav.map((n, i) =>
        '<li><a class="nav-link" href="#/' + n[0] + '"' + (n[2].includes(route) ? ' aria-current="page"' : '') + '><span class="nav-num">' + pad(i + 1) + '</span>' + n[1] + '</a></li>'
      ).join('') + '</ul>' +
      '<div class="nav-extra">' +
      '<button class="btn btn-ghost btn-sm" type="button" data-action="lang" lang="' + (S.lang === 'en' ? 'ar' : 'en') + '">' + icon('globe') + t('langToggle') + '</button>' +
      userBtn + '</div>' +
      '</nav>' +
      '<div class="header-tools">' +
      '<div class="notif-wrap">' +
      '<button class="icon-btn" type="button" data-action="notif" aria-expanded="' + S.notifOpen + '" aria-controls="notif-panel" aria-label="' + esc(t('notifications') + (unread ? ' (' + unread + ')' : '')) + '">' + icon('bell') +
      (unread ? '<span class="badge" aria-hidden="true">' + unread + '</span>' : '') + '</button>' +
      '<div class="notif-panel" id="notif-panel"' + (S.notifOpen ? '' : ' hidden') + '>' +
      '<div class="notif-head"><h2 class="h4">' + t('notifications') + '</h2>' +
      (unread ? '<button class="link-btn" type="button" data-action="mark-read">' + t('markRead') + '</button>' : '') + '</div>' +
      (notifItems ? '<ul class="notif-list">' + notifItems + '</ul>' : '<p class="muted">' + t('noNotifs') + '</p>') +
      '</div></div>' +
      '<button class="btn btn-ghost btn-sm desktop-only" type="button" data-action="lang" lang="' + (S.lang === 'en' ? 'ar' : 'en') + '" aria-label="' + esc(t('langLabel')) + '">' + icon('globe') + t('langToggle') + '</button>' +
      '<button class="icon-btn" type="button" data-action="theme" aria-label="' + esc(S.theme === 'dark' ? t('themeLight') : t('themeDark')) + '">' + icon(S.theme === 'dark' ? 'sun' : 'moon') + '</button>' +
      '<span class="desktop-only">' + userBtn + '</span>' +
      '<button class="icon-btn menu-btn" type="button" data-action="menu" aria-expanded="' + S.menuOpen + '" aria-controls="main-nav" aria-label="' + esc(S.menuOpen ? t('close') : t('menu')) + '">' + icon(S.menuOpen ? 'x' : 'menu') + '</button>' +
      '</div></div>';
  }

  function renderFooter() {
    $('#site-footer').innerHTML = '<div class="container footer-inner">' +
      '<p class="brand-name">MASAR <span class="brand-ar">مسار</span></p>' +
      '<p class="muted small">' + t('footer') + '</p></div>';
  }

  /* ---------- Views ---------- */
  function viewHome() {
    const m = S.homeMajor;
    return '<section class="hero container">' +
      '<p class="eyebrow">' + icon('sparkle', 'star') + t('eyebrow', { n: COMPANIES.length }) + '</p>' +
      '<h1 class="display" tabindex="-1"><span>' + t('heroA') + '</span> <span><em>' + t('heroB') + '</em> ' + t('heroC') + '</span></h1>' +
      '<p class="lede">' + t('heroSub') + '</p>' +
      searchForm() +
      '<div class="suggest"><h2 class="label" id="sugg-label">' + t('suggested') + '</h2>' +
      '<div class="chips" role="group" aria-labelledby="sugg-label">' +
      '<button type="button" class="chip" data-action="home-major" data-id="all" aria-pressed="' + (m === 'all') + '">' + t('all') + '</button>' +
      MAJORS.map((mj) => '<button type="button" class="chip" data-action="home-major" data-id="' + mj.id + '" aria-pressed="' + (m === mj.id) + '">' + esc(L(mj)) + '</button>').join('') +
      '</div></div></section>' +
      '<section class="container section" aria-labelledby="hiring-title" id="hiring">' + homeGrid() + '</section>';
  }

  function homeGrid() {
    const m = S.homeMajor;
    const list = m === 'all' ? COMPANIES : COMPANIES.filter((c) => c.majors.includes(m));
    return '<div class="section-head"><h2 class="h2" id="hiring-title">' + (m === 'all' ? t('hiringTitle') : esc(t('hiringFor', { m: L(findMajor(m)) }))) + '</h2>' +
      '<p class="count">' + t('showing', { n: list.length }) + '</p></div>' +
      '<div class="company-grid">' + list.map((c) => companyCard(c, m)).join('') + '</div>';
  }

  function viewCompanies() {
    const sectors = [];
    COMPANIES.forEach((c) => { if (!sectors.find((s) => s.en === c.sector.en)) sectors.push(c.sector); });
    const list = S.sector === 'all' ? COMPANIES : COMPANIES.filter((c) => c.sector.en === S.sector);
    return '<section class="container page-head">' +
      '<p class="eyebrow">' + icon('sparkle', 'star') + pad(1) + ' — ' + t('navCompanies') + '</p>' +
      '<h1 class="h1" tabindex="-1">' + t('companiesTitle') + '</h1><p class="lede">' + t('companiesSub') + '</p>' +
      '<div class="chips" role="group" aria-label="' + esc(t('allSectors')) + '">' +
      '<button type="button" class="chip" data-action="sector" data-id="all" aria-pressed="' + (S.sector === 'all') + '">' + t('allSectors') + '</button>' +
      sectors.map((s) => '<button type="button" class="chip" data-action="sector" data-id="' + esc(s.en) + '" aria-pressed="' + (S.sector === s.en) + '">' + esc(L(s)) + '</button>').join('') +
      '</div></section>' +
      '<section class="container section"><p class="count">' + t('showing', { n: list.length }) + '</p>' +
      '<div class="company-grid">' + list.map((c) => companyCard(c)).join('') + '</div></section>';
  }

  function viewMajors() {
    return '<section class="container page-head">' +
      '<p class="eyebrow">' + icon('sparkle', 'star') + pad(2) + ' — ' + t('navMajors') + '</p>' +
      '<h1 class="h1" tabindex="-1">' + t('majorsTitle') + '</h1><p class="lede">' + t('majorsSub') + '</p></section>' +
      '<section class="container section"><ul class="major-grid">' +
      MAJORS.map((m, i) => {
        const n = COMPANIES.filter((c) => c.majors.includes(m.id)).length;
        return '<li><a class="major-card" href="#/major/' + m.id + '"><span class="major-num">' + pad(i + 1) + '</span>' +
          '<span class="major-name">' + esc(L(m)) + '</span><span class="muted small">' + t('companiesHiring', { n: n }) + '</span>' +
          '<span class="major-arrow">' + icon('arrow', 'flip-rtl') + '</span></a></li>';
      }).join('') + '</ul></section>';
  }

  function viewMajor(id) {
    const m = findMajor(id);
    if (!m) return viewNotFound();
    const list = COMPANIES.filter((c) => c.majors.includes(id));
    return '<section class="container page-head">' + backLink('#/majors', t('navMajors')) +
      '<p class="eyebrow">' + icon('sparkle', 'star') + t('companiesHiring', { n: list.length }) + '</p>' +
      '<h1 class="h1" tabindex="-1">' + esc(L(m)) + '</h1>' +
      '<div class="chips" role="group" aria-label="' + esc(t('navMajors')) + '">' +
      MAJORS.map((mj) => '<a class="chip" href="#/major/' + mj.id + '"' + (mj.id === id ? ' aria-current="page"' : '') + '>' + esc(L(mj)) + '</a>').join('') +
      '</div></section>' +
      '<section class="container section"><div class="company-grid">' + list.map((c) => companyCard(c, id)).join('') + '</div></section>';
  }

  function viewCompany(id) {
    const c = findCompany(id);
    if (!c) return viewNotFound();
    const groups = [3, 2, 1].map((w) => ({ w: w, items: c.skills.filter((s) => s[1] === w) })).filter((g) => g.items.length);
    return '<section class="container page-head">' + backLink('#/companies', t('navCompanies')) +
      '<div class="company-head">' + logoTile(c, 'lg') +
      '<div><p class="eyebrow">' + esc(L(c.sector)) + ' · ' + icon('pin') + esc(L(c.city)) + '</p>' +
      '<h1 class="h1" tabindex="-1">' + esc(L(c)) + '</h1>' +
      '<p class="lede">' + esc(L(c.about)) + '</p>' +
      '<a class="btn btn-accent btn-lg" href="#/resume/' + c.id + '">' + t('startResume') + icon('arrow', 'flip-rtl') + '</a></div></div></section>' +
      '<section class="container section company-grid-2">' +
      '<div class="panel"><h2 class="h3">' + t('openRoles') + '</h2><ul class="role-list">' +
      c.majors.map((mid) => {
        const mj = findMajor(mid);
        return '<li><div><p class="role-title">' + esc(L(mj.role)) + '</p><p class="muted small">' + esc(L(mj)) + '</p></div>' +
          '<span class="tag">' + (openings(c.id, mid) === 1 ? t('opening1') : t('openings', { n: openings(c.id, mid) })) + '</span></li>';
      }).join('') + '</ul></div>' +
      '<div class="stack">' +
      '<div class="panel"><h2 class="h3">' + t('inDemand') + '</h2>' +
      groups.map((g) => '<h3 class="label level-' + g.w + '">' + icon(g.w === 3 ? 'flame' : g.w === 2 ? 'trend' : 'check') + t('w' + g.w) + '</h3>' +
        '<ul class="chips static">' + g.items.map((s) => '<li class="chip">' + esc(L(findSkill(s[0]))) + '</li>').join('') + '</ul>').join('') +
      '</div>' +
      '<div class="panel"><h2 class="h3">' + t('coopProgram') + '</h2>' +
      (c.coop
        ? '<dl class="facts"><div><dt>' + icon('calendar') + t('coopSeason') + '</dt><dd>' + esc(L(c.coop.season)) + '</dd></div>' +
          '<div><dt>' + icon('clock') + '</dt><dd>' + t('coopWeeks', { n: c.coop.weeks }) + '</dd></div></dl>' +
          '<a class="btn btn-ghost" href="#/resume/' + c.id + '/coop">' + t('applyCoop') + icon('arrow', 'flip-rtl') + '</a>'
        : '<p class="muted">' + t('noCoop') + '</p>') +
      '</div></div></section>';
  }

  function viewCoop() {
    const list = COMPANIES.filter((c) => c.coop);
    return '<section class="container page-head">' +
      '<p class="eyebrow">' + icon('sparkle', 'star') + pad(3) + ' — ' + t('navCoop') + '</p>' +
      '<h1 class="h1" tabindex="-1">' + t('coopTitle') + '</h1><p class="lede">' + t('coopSub') + '</p></section>' +
      '<section class="container section"><ul class="coop-list">' +
      list.map((c) => '<li class="coop-item">' + logoTile(c) +
        '<div class="coop-main"><h2 class="h3"><a href="#/company/' + c.id + '">' + esc(L(c)) + '</a></h2>' +
        '<p class="muted small">' + esc(L(c.sector)) + ' · ' + esc(L(c.city)) + '</p>' +
        '<p class="coop-facts"><span class="tag">' + icon('clock') + t('coopWeeks', { n: c.coop.weeks }) + '</span>' +
        '<span class="tag">' + icon('calendar') + esc(L(c.coop.season)) + '</span></p>' +
        '<p class="label">' + t('coopMajors') + '</p><ul class="chips static">' +
        c.majors.map((m) => '<li class="chip">' + esc(L(findMajor(m))) + '</li>').join('') + '</ul></div>' +
        '<a class="btn btn-accent" href="#/resume/' + c.id + '/coop">' + t('applyCoop') + icon('arrow', 'flip-rtl') + '</a></li>').join('') +
      '</ul></section>';
  }

  function viewSearch(q) {
    const n = norm(q);
    const majors = n ? MAJORS.filter((m) => norm(m.en).includes(n) || norm(m.ar).includes(n) || norm(m.role.en).includes(n) || norm(m.role.ar).includes(n)) : [];
    const companies = n ? COMPANIES.filter((c) => norm(c.en).includes(n) || norm(c.ar).includes(n) || norm(c.sector.en).includes(n) || norm(c.sector.ar).includes(n)) : [];
    const sk = matchSkill(q);
    const skills = n ? SKILLS.filter((s) => s === sk || norm(s.en).includes(n) || norm(s.ar).includes(n)) : [];
    const none = !majors.length && !companies.length && !skills.length;
    let html = '<section class="container page-head"><h1 class="h1" tabindex="-1">' + esc(t('searchTitle', { q: q })) + '</h1>' + searchForm(q) + '</section><section class="container section">';
    if (none) html += '<p class="empty">' + t('searchEmpty') + '</p>';
    if (majors.length) {
      html += '<h2 class="h3">' + t('resMajors') + '</h2><ul class="chips static res-block">' +
        majors.map((m) => '<li><a class="chip" href="#/major/' + m.id + '">' + esc(L(m)) + '</a></li>').join('') + '</ul>';
    }
    if (companies.length) {
      html += '<h2 class="h3">' + t('resCompanies') + '</h2><div class="company-grid res-block">' + companies.map((c) => companyCard(c)).join('') + '</div>';
    }
    if (skills.length) {
      html += '<h2 class="h3">' + t('resSkills') + '</h2><ul class="skill-results res-block">' + skills.map((s) => {
        const cos = COMPANIES.filter((c) => c.skills.some((x) => x[0] === s.id));
        return '<li class="panel"><p class="role-title">' + esc(L(s)) + '</p><p class="muted small">' + t('wantedBy', { n: cos.length }) + '</p>' +
          '<p class="mini-logos">' + cos.map((c) => '<a href="#/company/' + c.id + '" class="mini-logo">' + logoTile(c, 'sm') + '<span>' + esc(L(c)) + '</span></a>').join('') + '</p></li>';
      }).join('') + '</ul>';
    }
    return html + '</section>';
  }

  const FORMATS = [
    { id: 'chronological', name: 'fmtChron', desc: 'fmtChronD', best: 'fmtChronB' },
    { id: 'functional', name: 'fmtFunc', desc: 'fmtFuncD', best: 'fmtFuncB' },
    { id: 'hybrid', name: 'fmtHyb', desc: 'fmtHybD', best: 'fmtHybB' }
  ];

  /* Small page sketches showing each format's layout. */
  function formatArt(id) {
    const bar = (x, y, w, cls) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="4" rx="2" class="' + (cls || 'a-line') + '"/>';
    let body = '<rect x="0.5" y="0.5" width="99" height="129" rx="6" class="a-page"/>' + bar(12, 12, 44, 'a-head') + bar(12, 20, 30);
    if (id === 'chronological') {
      [36, 62, 88].forEach((y) => { body += bar(12, y, 20, 'a-accent') + bar(36, y, 52) + bar(36, y + 8, 46) + bar(36, y + 16, 40); });
    } else if (id === 'functional') {
      body += bar(12, 36, 26, 'a-accent');
      [46, 54, 62, 70].forEach((y, i) => { body += '<rect x="12" y="' + y + '" width="' + (i % 2 ? 34 : 30) + '" height="5" rx="2.5" class="a-chip"/><rect x="54" y="' + y + '" width="' + (i % 2 ? 30 : 34) + '" height="5" rx="2.5" class="a-chip"/>'; });
      body += bar(12, 86, 26, 'a-accent') + bar(12, 96, 76) + bar(12, 104, 70) + bar(12, 112, 50);
    } else {
      body += bar(12, 36, 26, 'a-accent');
      [46, 54].forEach((y) => { body += '<rect x="12" y="' + y + '" width="22" height="5" rx="2.5" class="a-chip"/><rect x="38" y="' + y + '" width="24" height="5" rx="2.5" class="a-chip"/><rect x="66" y="' + y + '" width="22" height="5" rx="2.5" class="a-chip"/>'; });
      [70, 96].forEach((y) => { body += bar(12, y, 20, 'a-accent') + bar(36, y, 52) + bar(36, y + 8, 44) + bar(36, y + 16, 36); });
    }
    return '<svg class="format-art" viewBox="0 0 100 130" aria-hidden="true">' + body + '</svg>';
  }

  function viewFormat(cid, coop) {
    const c = findCompany(cid);
    if (!c) return viewNotFound();
    const back = coop ? '#/coop' : '#/company/' + cid;
    return '<section class="container page-head">' + backLink(back, L(c)) + stepper(1) +
      '<h1 class="h1" tabindex="-1">' + t('formatTitle') + '</h1>' +
      '<p class="lede">' + esc(t('formatSub', { c: L(c) })) + (coop ? ' <span class="tag tag-accent">' + icon('cap') + t('coopProgram') + '</span>' : '') + '</p></section>' +
      '<section class="container section"><ul class="format-grid">' +
      FORMATS.map((f, i) => '<li class="format-card">' +
        '<span class="format-num">' + pad(i + 1) + '</span>' + formatArt(f.id) +
        '<h2 class="h3">' + t(f.name) + '</h2><p>' + t(f.desc) + '</p>' +
        '<p class="muted small best">' + icon('checkCircle') + t(f.best) + '</p>' +
        '<a class="btn btn-accent" href="#/builder/' + cid + '/' + f.id + (coop ? '/coop' : '') + '">' + esc(t('useFormat', { f: t(f.name) })) + icon('arrow', 'flip-rtl') + '</a>' +
        '</li>').join('') + '</ul></section>';
  }

  /* ---------- Resume builder ---------- */
  function blankData() {
    return {
      name: S.user ? S.user.name : '', title: '', email: S.user ? S.user.email : '', phone: '', city: '', linkedin: '', summary: '',
      skills: [], abilities: [],
      experience: [{ role: '', org: '', start: '', end: '', details: '' }],
      highlights: [{ area: '', details: '' }],
      education: [{ degree: '', school: '', year: '', gpa: '' }],
      certs: ''
    };
  }

  function ensureDraft(cid, fmt, coop) {
    /* One draft per user: switching company keeps what they already typed. */
    if (!S.draft) S.draft = { companyId: cid, format: fmt, coop: !!coop, data: blankData() };
    S.draft.companyId = cid;
    S.draft.format = fmt;
    S.draft.coop = !!coop;
    saveDraft();
  }

  let saveTimer = null;
  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set('draft', S.draft), 300);
  }

  const SECTION_ORDER = {
    chronological: ['personal', 'summary', 'experience', 'education', 'skills', 'abilities', 'certs'],
    functional: ['personal', 'summary', 'skills', 'abilities', 'highlights', 'history', 'education', 'certs'],
    hybrid: ['personal', 'summary', 'skills', 'abilities', 'experience', 'education', 'certs']
  };

  function input(o) {
    const id = 'f-' + o.bind.replace(/\./g, '-');
    const help = o.help ? '<p class="help" id="' + id + '-help">' + o.help + '</p>' : '';
    const err = '<p class="field-error" id="' + id + '-err" hidden></p>';
    const describedBy = [o.help ? id + '-help' : '', id + '-err'].filter(Boolean).join(' ');
    const common = ' id="' + id + '" data-bind="' + o.bind + '" aria-describedby="' + describedBy + '"' +
      (o.required ? ' required aria-required="true"' : '') + (o.auto ? ' autocomplete="' + o.auto + '"' : '') +
      (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + ' dir="' + (o.dir || 'auto') + '"';
    const control = o.textarea
      ? '<textarea' + common + ' rows="' + (o.rows || 3) + '">' + esc(o.value) + '</textarea>'
      : '<input type="' + (o.type || 'text') + '"' + common + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') + ' value="' + esc(o.value) + '">';
    return '<div class="field' + (o.wide ? ' wide' : '') + '"><label for="' + id + '">' + o.label +
      (o.required ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' + control + help + err + '</div>';
  }

  function tagStatus(text) {
    const c = findCompany(S.draft.companyId);
    const sk = matchSkill(text);
    if (!sk) return 'unknown';
    const want = c.skills.find((s) => s[0] === sk.id);
    if (!want) return 'not';
    return want[1] === 3 ? 'high' : want[1] === 2 ? 'in' : 'valued';
  }
  const STATUS = {
    high: { icon: 'flame', key: 'sHigh' }, in: { icon: 'trend', key: 'sIn' }, valued: { icon: 'check', key: 'sValued' },
    not: { icon: 'minus', key: 'sNot' }, unknown: { icon: 'help', key: 'sUnknown' }
  };

  function tagList(list) {
    const items = S.draft.data[list];
    return items.map((text, i) => {
      const st = tagStatus(text);
      return '<li class="tag-item s-' + st + '"><span class="tag-text">' + esc(text) + '</span>' +
        '<span class="tag-status">' + icon(STATUS[st].icon) + t(STATUS[st].key) + '</span>' +
        '<button type="button" class="tag-remove" data-action="remove-tag" data-list="' + list + '" data-index="' + i + '" aria-label="' + esc(t('removeTag', { s: text })) + '">' + icon('x') + '</button></li>';
    }).join('');
  }

  function tagField(list) {
    const label = list === 'skills' ? t('secSkills') : t('secAbilities');
    const id = 'f-' + list;
    return '<div class="field wide"><label for="' + id + '">' + label + '</label>' +
      '<p class="help" id="' + id + '-help">' + (list === 'skills' ? t('fSkillsH') : t('fAbilitiesH')) + '</p>' +
      '<ul class="tag-list" id="' + list + '-tags" aria-label="' + esc(label) + '">' + tagList(list) + '</ul>' +
      '<div class="tag-entry"><input id="' + id + '" type="text" dir="auto" data-tag-input="' + list + '" list="skill-options-' + list + '" aria-describedby="' + id + '-help ' + id + '-err" autocomplete="off">' +
      '<button type="button" class="btn btn-ghost" data-action="add-tag" data-list="' + list + '">' + icon('plus') + t('add') + '</button></div>' +
      '<p class="field-error" id="' + id + '-err" hidden></p>' +
      '<datalist id="skill-options-' + list + '">' + SKILLS.filter((s) => (list === 'skills' ? s.type === 'tech' : s.type === 'soft')).map((s) => '<option value="' + esc(L(s)) + '"></option>').join('') + '</datalist></div>';
  }

  function repeatGroup(list, legendKey, fields, addKey) {
    const items = S.draft.data[list];
    return items.map((it, i) =>
      '<fieldset class="repeat"><legend>' + t(legendKey) + ' ' + (i + 1) + '</legend><div class="field-grid">' +
      fields.map((f) => input(Object.assign({}, f, { bind: list + '.' + i + '.' + f.key, value: it[f.key] }))).join('') +
      '</div>' + (items.length > 1 ? '<button type="button" class="link-btn danger" data-action="remove-item" data-list="' + list + '" data-index="' + i + '">' + icon('trash') + t('remove') + '</button>' : '') +
      '</fieldset>').join('') +
      '<button type="button" class="btn btn-ghost add-item" data-action="add-item" data-list="' + list + '">' + icon('plus') + t(addKey) + '</button>';
  }

  function formSection(key) {
    const d = S.draft.data;
    const wrap = (titleKey, inner) => '<section class="form-section" aria-labelledby="sec-' + key + '"><h2 class="h3" id="sec-' + key + '">' + t(titleKey) + '</h2>' + inner + '</section>';
    const expFields = [
      { key: 'role', label: t('fRole') }, { key: 'org', label: t('fOrg') },
      { key: 'start', label: t('fStart'), ph: '2023' }, { key: 'end', label: t('fEnd'), ph: t('fEndPh') }
    ];
    switch (key) {
      case 'personal':
        return wrap('secPersonal', '<div class="field-grid">' +
          input({ bind: 'name', label: t('fName'), value: d.name, required: true, auto: 'name' }) +
          input({ bind: 'title', label: t('fTitle'), value: d.title, auto: 'organization-title' }) +
          input({ bind: 'email', label: t('fEmail'), value: d.email, required: true, type: 'email', auto: 'email', dir: 'ltr' }) +
          input({ bind: 'phone', label: t('fPhone'), value: d.phone, type: 'tel', auto: 'tel', ph: '+966 5X XXX XXXX', dir: 'ltr' }) +
          input({ bind: 'city', label: t('fCity'), value: d.city, auto: 'address-level2' }) +
          input({ bind: 'linkedin', label: t('fLinkedin'), value: d.linkedin, type: 'url', auto: 'url', dir: 'ltr' }) +
          '</div>');
      case 'summary':
        return wrap('secSummary', input({ bind: 'summary', label: t('fSummary'), value: d.summary, textarea: true, rows: 4, help: t('fSummaryH'), wide: true }));
      case 'skills': return wrap('secSkills', tagField('skills'));
      case 'abilities': return wrap('secAbilities', tagField('abilities'));
      case 'experience':
        return wrap('secExperience', '<div id="list-experience">' + repeatGroup('experience', 'secExperience',
          expFields.concat([{ key: 'details', label: t('fDetails'), textarea: true, rows: 3, help: t('fDetailsH'), wide: true }]), 'addExp') + '</div>');
      case 'history':
        return wrap('secHistory', '<div id="list-experience">' + repeatGroup('experience', 'secHistory', expFields, 'addExp') + '</div>');
      case 'highlights':
        return wrap('secHighlights', '<div id="list-highlights">' + repeatGroup('highlights', 'secHighlights', [
          { key: 'area', label: t('fArea'), ph: t('fAreaPh') },
          { key: 'details', label: t('fAch'), textarea: true, rows: 3, help: t('fDetailsH'), wide: true }
        ], 'addAch') + '</div>');
      case 'education':
        return wrap('secEducation', '<div id="list-education">' + repeatGroup('education', 'secEducation', [
          { key: 'degree', label: t('fDegree') }, { key: 'school', label: t('fSchool') },
          { key: 'year', label: t('fYear'), inputmode: 'numeric' }, { key: 'gpa', label: t('fGpa'), ph: '4.5 / 5' }
        ], 'addEdu') + '</div>');
      case 'certs':
        return wrap('secCerts', input({ bind: 'certs', label: t('fCerts'), value: d.certs, textarea: true, rows: 3, help: t('fCertsH'), wide: true }));
      default: return '';
    }
  }

  function analyze() {
    const c = findCompany(S.draft.companyId);
    const d = S.draft.data;
    const have = new Set();
    const counts = { high: 0, in: 0, valued: 0, not: 0, unknown: 0 };
    d.skills.concat(d.abilities).forEach((text) => {
      const sk = matchSkill(text);
      if (sk) have.add(sk.id);
      counts[tagStatus(text)]++;
    });
    const total = c.skills.reduce((n, s) => n + s[1], 0);
    const got = c.skills.filter((s) => have.has(s[0])).reduce((n, s) => n + s[1], 0);
    const score = total ? Math.round((got / total) * 100) : 0;
    const level = score >= 70 ? 'high' : score >= 35 ? 'mid' : 'low';
    const missing = c.skills.filter((s) => !have.has(s[0])).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { c: c, score: score, level: level, counts: counts, missing: missing, any: d.skills.length + d.abilities.length > 0, have: have };
  }

  function gaugeHTML() {
    const a = analyze();
    const levelText = t(a.level === 'high' ? 'gHigh' : a.level === 'mid' ? 'gMid' : 'gLow');
    const summary = ['high', 'in', 'valued', 'not', 'unknown'].filter((k) => a.counts[k]).map((k) =>
      '<li class="s-' + k + '">' + icon(STATUS[k].icon) + '<b>' + a.counts[k] + '</b> ' + t(STATUS[k].key) + '</li>').join('');
    return '<div class="gauge-head"><h2 class="h3">' + icon('sparkle', 'star') + t('gaugeTitle') + '</h2><p class="muted small">' + esc(t('gaugeFor', { c: L(a.c) })) + '</p></div>' +
      '<div class="gauge-meter level-' + a.level + '" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + a.score + '" aria-valuetext="' + a.score + '%, ' + esc(levelText) + '" aria-label="' + esc(t('gaugeFor', { c: L(a.c) })) + '">' +
      '<svg viewBox="0 0 120 68" aria-hidden="true"><path class="g-track" d="M10 60 A50 50 0 0 1 110 60" pathLength="100"/>' +
      '<path class="g-fill" d="M10 60 A50 50 0 0 1 110 60" pathLength="100" stroke-dasharray="' + a.score + ' 100"/></svg>' +
      '<div class="gauge-value"><span class="g-num">' + a.score + '<small>%</small></span><span class="g-label">' + levelText + '</span></div></div>' +
      (a.any ? '<ul class="gauge-counts">' + summary + '</ul>' : '<p class="muted small center">' + t('gaugeEmpty') + '</p>') +
      (a.missing.length ? '<div class="boost"><h3 class="label">' + t('boost') + '</h3><p class="muted small">' + esc(t('boostH', { c: L(a.c) })) + '</p>' +
        '<div class="chips">' + a.missing.map((s) => {
          const sk = findSkill(s[0]);
          return '<button type="button" class="chip chip-add level-' + s[1] + '" data-action="boost" data-id="' + sk.id + '">' + icon('plus') + esc(L(sk)) + '<span class="sr-only"> (' + t('w' + s[1]) + ')</span></button>';
        }).join('') + '</div></div>' : '');
  }

  function lines(text) {
    return String(text || '').split('\n').map((s) => s.replace(/^[\s•\-–*]+/, '').trim()).filter(Boolean);
  }
  const hasExp = (e) => e.role || e.org || e.details;
  const ph = (n) => '<div class="pv-ph" aria-hidden="true">' + Array.from({ length: n }, (_, i) => '<span style="width:' + [92, 78, 64, 84][i % 4] + '%"></span>').join('') + '</div>';

  function previewHTML() {
    const d = S.draft.data;
    const fmt = S.draft.format;
    const contact = [d.email, d.phone, d.city, d.linkedin].filter(Boolean).map((x) => '<span>' + esc(x) + '</span>').join('');
    const sec = (key, inner) => '<section class="pv-sec' + (inner.indexOf('<div class="pv-ph"') === 0 ? ' pv-empty' : '') + '"><h3>' + t(key) + '</h3>' + inner + '</section>';
    const chipsList = (arr) => arr.length ? '<ul class="pv-chips">' + arr.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>' : ph(1);
    const dates = (e) => (e.start || e.end) ? '<span class="pv-date">' + esc(e.start) + (e.start ? ' – ' : '') + esc(e.end || t('present')) + '</span>' : '';
    const expFull = () => {
      const items = d.experience.filter(hasExp);
      return items.length ? items.map((e) => '<div class="pv-item"><div class="pv-row"><p><b>' + esc(e.role) + '</b>' + (e.org ? ' · ' + esc(e.org) : '') + '</p>' + dates(e) + '</div>' +
        (lines(e.details).length ? '<ul>' + lines(e.details).map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '') + '</div>').join('') : ph(3);
    };
    const expShort = () => {
      const items = d.experience.filter(hasExp);
      return items.length ? items.map((e) => '<div class="pv-row"><p><b>' + esc(e.role) + '</b>' + (e.org ? ' · ' + esc(e.org) : '') + '</p>' + dates(e) + '</div>').join('') : ph(2);
    };
    const edu = () => {
      const items = d.education.filter((e) => e.degree || e.school);
      return items.length ? items.map((e) => '<div class="pv-row"><p><b>' + esc(e.degree) + '</b>' + (e.school ? ' · ' + esc(e.school) : '') + (e.gpa ? ' · ' + esc(e.gpa) : '') + '</p>' + (e.year ? '<span class="pv-date">' + esc(e.year) + '</span>' : '') + '</div>').join('') : ph(2);
    };
    const highlights = () => {
      const items = d.highlights.filter((h) => h.area || h.details);
      return items.length ? items.map((h) => '<div class="pv-item"><p><b>' + esc(h.area) + '</b></p>' +
        (lines(h.details).length ? '<ul>' + lines(h.details).map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '') + '</div>').join('') : ph(3);
    };
    const certs = lines(d.certs);
    const summary = d.summary ? '<p>' + esc(d.summary) + '</p>' : ph(2);

    let body = '';
    if (fmt === 'chronological') {
      body = sec('pvSummary', summary) + sec('pvExperience', expFull()) + sec('pvEducation', edu()) +
        sec('pvSkills', chipsList(d.skills)) + sec('pvAbilities', chipsList(d.abilities));
    } else if (fmt === 'functional') {
      body = sec('pvSummary', summary) + sec('pvSkills', chipsList(d.skills)) + sec('pvAbilities', chipsList(d.abilities)) +
        sec('pvHighlights', highlights()) + sec('pvHistory', expShort()) + sec('pvEducation', edu());
    } else {
      body = sec('pvSummary', summary) + '<div class="pv-two">' + sec('pvSkills', chipsList(d.skills)) + sec('pvAbilities', chipsList(d.abilities)) + '</div>' +
        sec('pvExperience', expFull()) + sec('pvEducation', edu());
    }
    if (certs.length) body += sec('pvCerts', '<ul>' + certs.map((c) => '<li>' + esc(c) + '</li>').join('') + '</ul>');

    return '<header class="pv-head"><p class="pv-name' + (d.name ? '' : ' empty') + '">' + esc(d.name || t('pvName')) + '</p>' +
      '<p class="pv-title' + (d.title ? '' : ' empty') + '">' + esc(d.title || t('pvTitle')) + '</p>' +
      (contact ? '<p class="pv-contact">' + contact + '</p>' : '') + '</header>' + body;
  }

  function viewBuilder(cid, fmt, coop) {
    const c = findCompany(cid);
    if (!c || !SECTION_ORDER[fmt]) return viewNotFound();
    ensureDraft(cid, fmt, coop);
    const fmtName = t(FORMATS.find((f) => f.id === fmt).name);
    return '<section class="container page-head builder-head">' + backLink('#/resume/' + cid + (coop ? '/coop' : ''), t('stepFormat')) + stepper(2) +
      '<h1 class="h1" tabindex="-1">' + esc(t('builderTitle', { f: fmtName })) + '</h1>' +
      '<p class="lede">' + logoTile(c, 'sm') + esc(t('builderFor', { c: L(c) })) + (coop ? ' · ' + t('coopProgram') : '') + '</p></section>' +
      '<div class="container builder">' +
      '<form class="builder-form" id="resume-form" novalidate>' +
      '<div id="error-summary" class="error-summary" tabindex="-1" hidden></div>' +
      '<div id="form-sections">' + SECTION_ORDER[fmt].map(formSection).join('') + '</div>' +
      '<div class="form-actions">' +
      '<button type="button" class="btn btn-ghost btn-lg" data-action="pdf" aria-describedby="pdf-hint">' + icon('download') + t('pdf') + '</button>' +
      '<button type="submit" class="btn btn-accent btn-lg">' + t('submit') + icon('send', 'flip-rtl') + '</button>' +
      '<p class="muted small" id="pdf-hint">' + t('pdfHint') + '</p>' +
      '</div></form>' +
      '<aside class="builder-aside" aria-label="' + esc(t('gaugeTitle')) + '">' +
      '<div class="panel gauge-card" id="gauge">' + gaugeHTML() + '</div>' +
      '<div class="panel preview-card">' +
      '<div class="preview-head"><h2 class="h3">' + icon('eye') + t('preview') + '</h2>' +
      '<button type="button" class="btn btn-ghost btn-sm preview-toggle" data-action="toggle-preview" aria-expanded="' + S.previewOpen + '" aria-controls="preview-wrap">' + (S.previewOpen ? t('hidePreview') : t('showPreview')) + '</button></div>' +
      '<div class="preview-wrap' + (S.previewOpen ? ' open' : '') + '" id="preview-wrap"><div class="resume-paper fmt-' + fmt + '" id="preview" lang="' + S.lang + '" dir="' + (S.lang === 'ar' ? 'rtl' : 'ltr') + '">' + previewHTML() + '</div></div>' +
      '</div></aside></div>' +
      '<a class="gauge-mini" href="#gauge" id="gauge-mini" data-action="jump-gauge">' + miniGauge() + '</a>';
  }

  function miniGauge() {
    const a = analyze();
    return '<span class="g-dot level-' + a.level + '" aria-hidden="true"></span><b>' + a.score + '%</b> ' + t(a.level === 'high' ? 'gHigh' : a.level === 'mid' ? 'gMid' : 'gLow') + '<span class="muted"> · ' + t('gaugeTitle') + '</span>';
  }

  function refreshBuilder(opts) {
    const p = $('#preview');
    if (p) p.innerHTML = previewHTML();
    if (opts && opts.tags) {
      ['skills', 'abilities'].forEach((l) => { const ul = $('#' + l + '-tags'); if (ul) ul.innerHTML = tagList(l); });
      const si = $('#f-skills');
      if (si && si.getAttribute('aria-invalid')) { si.removeAttribute('aria-invalid'); $('#f-skills-err').hidden = true; }
    }
    const g = $('#gauge');
    if (g) {
      g.innerHTML = gaugeHTML();
      const a = analyze();
      if (S.lastLevel && S.lastLevel !== a.level) announce(a.score + '% — ' + t(a.level === 'high' ? 'gHigh' : a.level === 'mid' ? 'gMid' : 'gLow'));
      S.lastLevel = a.level;
    }
    const m = $('#gauge-mini');
    if (m) m.innerHTML = miniGauge();
    saveDraft();
  }

  function rerenderSections(focusSel) {
    const box = $('#form-sections');
    if (!box) return;
    box.innerHTML = SECTION_ORDER[S.draft.format].map(formSection).join('');
    refreshBuilder();
    if (focusSel) { const el = $(focusSel); if (el) el.focus(); }
  }

  function addTags(list, raw) {
    const d = S.draft.data;
    const existing = d.skills.concat(d.abilities).map(norm);
    let added = 0;
    String(raw).split(/[,،]/).map((s) => s.trim()).filter(Boolean).forEach((s) => {
      if (!existing.includes(norm(s)) && s.length <= 60) { d[list].push(s); existing.push(norm(s)); added++; }
    });
    return added;
  }

  function setBound(path, value) {
    const parts = path.split('.');
    let obj = S.draft.data;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
  }

  function validate() {
    const d = S.draft.data;
    const errs = [];
    if (!d.name.trim()) errs.push({ id: 'f-name', msg: t('errName') });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) errs.push({ id: 'f-email', msg: t('errEmail') });
    if (!d.skills.length && !d.abilities.length) errs.push({ id: 'f-skills', msg: t('errSkills') });
    document.querySelectorAll('.field-error').forEach((el) => { el.hidden = true; el.textContent = ''; });
    document.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    const box = $('#error-summary');
    if (!errs.length) { box.hidden = true; return true; }
    errs.forEach((e) => {
      const f = $('#' + e.id); const m = $('#' + e.id + '-err');
      if (f) f.setAttribute('aria-invalid', 'true');
      if (m) { m.hidden = false; m.innerHTML = icon('alert') + esc(e.msg); }
    });
    box.innerHTML = '<p><b>' + t('errSummary', { n: errs.length }) + '</b></p><ul>' + errs.map((e) => '<li><a href="#' + e.id + '" data-action="focus-field" data-id="' + e.id + '">' + esc(e.msg) + '</a></li>').join('') + '</ul>';
    box.hidden = false;
    box.setAttribute('role', 'alert');
    box.focus();
    return false;
  }

  function submitResume() {
    if (!validate()) return;
    const d = S.draft.data;
    const c = findCompany(S.draft.companyId);
    const tags = d.skills.concat(d.abilities);
    const ids = [];
    const untested = [];
    tags.forEach((text) => {
      const sk = matchSkill(text);
      if (sk && !ids.includes(sk.id)) ids.push(sk.id);
      if (!sk || !QUESTIONS[sk.id]) untested.push(text);
    });
    S.submission = { companyId: c.id, format: S.draft.format, coop: S.draft.coop, skillIds: ids, untested: untested, at: Date.now() };
    store.set('submission', S.submission);
    store.set('draft', S.draft);
    S.quiz = null;
    const n = { id: 'sub-' + S.submission.at, en: 'Resume submitted to ' + c.en + '. Your skills assessment is ready.', ar: 'تم إرسال سيرتك إلى ' + c.ar + '. تقييم مهاراتك جاهز.', time: { en: 'Just now', ar: 'الآن' } };
    S.extraNotifs = [n].concat(S.extraNotifs).slice(0, 5);
    store.set('notifs', S.extraNotifs);
    toast(t('submitted', { c: L(c) }));
    location.hash = '#/assessment';
  }

  /* ---------- Assessment ---------- */
  function quizPlan() {
    const sub = S.submission;
    const testable = sub.skillIds.filter((id) => QUESTIONS[id]);
    const ids = testable.length ? testable : ['problemsolving', 'communication', 'english'];
    const per = ids.length > 6 ? 2 : 3;
    let qs = [];
    ids.forEach((id) => QUESTIONS[id].slice(0, per).forEach((q) => qs.push({ skill: id, q: q })));
    qs = qs.slice(0, 24);
    return { general: !testable.length, ids: ids, questions: qs, seconds: qs.length * 40 };
  }

  function viewAssessment() {
    if (!S.submission || !findCompany(S.submission.companyId)) {
      return '<section class="container page-head">' + stepper(3) + '<h1 class="h1" tabindex="-1">' + t('assessTitle') + '</h1>' +
        '<p class="lede">' + t('noSubmission') + '</p><a class="btn btn-accent" href="#/companies">' + t('browseCompanies') + icon('arrow', 'flip-rtl') + '</a></section>';
    }
    const c = findCompany(S.submission.companyId);
    if (S.quiz && !S.quiz.done) return viewQuestion(c);
    if (S.result && S.result.submittedAt === S.submission.at) return viewResults(c);
    const plan = quizPlan();
    const skillName = (id) => (id === 'general' ? t('general') : L(findSkill(id)));
    return '<section class="container page-head">' + stepper(3) +
      '<h1 class="h1" tabindex="-1">' + t('assessTitle') + '</h1>' +
      '<p class="lede">' + esc(t('assessSub', { c: L(c) })) + '</p></section>' +
      '<section class="container section"><div class="panel assess-intro">' +
      '<p class="assess-rules">' + icon('clock') + t('assessRules', { q: plan.questions.length, m: Math.ceil(plan.seconds / 60) }) + '</p>' +
      (plan.general ? '<p class="note">' + t('assessNone') + '</p>' : '') +
      '<h2 class="label">' + t('assessSkills') + '</h2><ul class="chips static">' +
      (plan.general ? '<li class="chip">' + t('general') + '</li>' : plan.ids.map((id) => '<li class="chip">' + esc(skillName(id)) + '</li>').join('')) + '</ul>' +
      (S.submission.untested.length && !plan.general ? '<p class="muted small">' + icon('help') + esc(t('assessUntested', { s: S.submission.untested.join(S.lang === 'ar' ? '، ' : ', ') })) + '</p>' : '') +
      '<button type="button" class="btn btn-accent btn-lg" data-action="start-quiz">' + t('startAssess') + icon('arrow', 'flip-rtl') + '</button>' +
      '</div></section>';
  }

  function fmtTime(s) {
    s = Math.max(0, Math.ceil(s));
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }

  function viewQuestion() {
    const qz = S.quiz;
    const item = qz.questions[qz.idx];
    const q = item.q;
    const opts = (S.lang === 'ar' && q[3]) ? q[3] : q[2];
    const text = S.lang === 'ar' ? q[1] : q[0];
    const skillName = qz.general ? t('general') : L(findSkill(item.skill));
    const total = qz.questions.length;
    const remaining = (qz.endsAt - Date.now()) / 1000;
    return '<section class="container quiz">' + stepper(3) +
      '<div class="quiz-top"><p class="label">' + t('question', { a: qz.idx + 1, b: total }) + '</p>' +
      '<p class="timer' + (remaining <= 60 ? ' warn' : '') + '" id="timer-box"><span class="sr-only">' + t('timeLeft') + ': </span>' + icon('clock') + '<span id="timer" role="timer">' + fmtTime(remaining) + '</span></p></div>' +
      '<div class="progress" role="progressbar" aria-label="' + esc(t('question', { a: qz.idx + 1, b: total })) + '" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + qz.idx + '"><span style="width:' + (qz.idx / total * 100) + '%"></span></div>' +
      '<form id="quiz-form" class="panel quiz-card">' +
      '<fieldset><legend><span class="tag tag-accent">' + esc(t('skillTag', { s: skillName })) + '</span><span class="q-text" id="q-text" tabindex="-1">' + esc(text) + '</span></legend>' +
      '<div class="options">' + item.order.map((oi, pos) =>
        '<label class="option"><input type="radio" name="answer" value="' + oi + '"><span class="opt-key" aria-hidden="true">' + 'ABCD'[pos] + '</span><span dir="auto">' + esc(opts[oi]) + '</span></label>').join('') +
      '</div></fieldset>' +
      '<button type="submit" class="btn btn-accent btn-lg" id="next-btn" disabled>' + (qz.idx + 1 === total ? t('finish') : t('next')) + icon('arrow', 'flip-rtl') + '</button>' +
      '</form></section>';
  }

  function startQuiz() {
    const plan = quizPlan();
    plan.questions.forEach((item) => {
      const order = item.q[2].map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      item.order = order;
    });
    S.quiz = { general: plan.general, questions: plan.questions, idx: 0, answers: [], endsAt: Date.now() + plan.seconds * 1000, warned: false, done: false };
    startTimer();
    render();
  }

  function startTimer() {
    clearInterval(S.timer);
    S.timer = setInterval(() => {
      const qz = S.quiz;
      if (!qz || qz.done) { clearInterval(S.timer); return; }
      const rem = (qz.endsAt - Date.now()) / 1000;
      const el = $('#timer');
      if (el) el.textContent = fmtTime(rem);
      if (rem <= 60) {
        const box = $('#timer-box');
        if (box) box.classList.add('warn');
        if (!qz.warned) { qz.warned = true; announce(t('timeWarn')); }
      }
      if (rem <= 0) finishQuiz(true);
    }, 1000);
  }

  function finishQuiz(timeUp) {
    const qz = S.quiz;
    clearInterval(S.timer);
    const per = {};
    qz.questions.forEach((item, i) => {
      const key = qz.general ? 'general' : item.skill;
      per[key] = per[key] || { id: key, correct: 0, total: 0 };
      per[key].total++;
      if (qz.answers[i] === item.q[4]) per[key].correct++;
    });
    const skills = Object.keys(per).map((k) => per[k]);
    const correct = skills.reduce((n, s) => n + s.correct, 0);
    S.result = { submittedAt: S.submission.at, skills: skills, correct: correct, total: qz.questions.length, score: Math.round(correct / qz.questions.length * 100), timeUp: !!timeUp };
    store.set('result', S.result);
    qz.done = true;
    S.quiz = null;
    if (timeUp) toast(t('timeUp'));
    if (currentRoute()[0] === 'assessment') render();
  }

  function viewResults(c) {
    const r = S.result;
    const v = r.score >= 70 ? 'vHigh' : r.score >= 40 ? 'vMid' : 'vLow';
    const lvl = r.score >= 70 ? 'high' : r.score >= 40 ? 'mid' : 'low';
    const sub = S.submission;
    return '<section class="container page-head">' + stepper(4) +
      '<h1 class="h1" tabindex="-1">' + t('resultsTitle') + '</h1>' +
      '<p class="lede">' + esc(t(v, { c: L(c) })) + '</p></section>' +
      '<section class="container section results">' +
      '<div class="panel score-card level-' + lvl + '"><p class="label">' + t('overall') + '</p><p class="big-score">' + r.score + '<small>%</small></p>' +
      '<p class="muted">' + t('correct', { a: r.correct, b: r.total }) + '</p></div>' +
      '<ul class="panel skill-scores">' + r.skills.map((s) => {
        const pct = Math.round(s.correct / s.total * 100);
        const name = s.id === 'general' ? t('general') : L(findSkill(s.id));
        const l = pct >= 70 ? 'high' : pct >= 40 ? 'mid' : 'low';
        return '<li><div class="row"><span>' + esc(name) + '</span><span class="muted">' + t('correct', { a: s.correct, b: s.total }) + '</span></div>' +
          '<div class="bar level-' + l + '" role="meter" aria-label="' + esc(name) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-valuetext="' + pct + '%"><span style="width:' + pct + '%"></span></div></li>';
      }).join('') + '</ul>' +
      '<div class="result-actions">' +
      '<button type="button" class="btn btn-ghost" data-action="retake">' + t('retake') + '</button>' +
      '<a class="btn btn-ghost" href="#/builder/' + sub.companyId + '/' + sub.format + (sub.coop ? '/coop' : '') + '">' + t('editResume') + '</a>' +
      '<a class="btn btn-accent" href="#/companies">' + t('explore') + icon('arrow', 'flip-rtl') + '</a></div>' +
      '</section>';
  }

  function viewNotFound() {
    return '<section class="container page-head"><h1 class="h1" tabindex="-1">' + t('notFound') + '</h1><a class="btn btn-accent" href="#/">' + t('goHome') + '</a></section>';
  }

  /* ---------- Login dialog ---------- */
  function openLogin() {
    const dlg = $('#login-dialog');
    dlg.innerHTML = '<form class="login-form" id="login-form" novalidate>' +
      '<div class="modal-head"><h2 class="h3" id="login-title">' + t('loginTitle') + '</h2>' +
      '<button type="button" class="icon-btn" data-action="close-login" aria-label="' + esc(t('close')) + '">' + icon('x') + '</button></div>' +
      '<p class="muted small">' + t('loginSub') + '</p>' +
      '<div class="field"><label for="l-email">' + t('fEmail') + '</label><input id="l-email" type="email" autocomplete="email" required dir="ltr" aria-describedby="l-email-err"><p class="field-error" id="l-email-err" hidden></p></div>' +
      '<div class="field"><label for="l-pass">' + t('password') + '</label><div class="pw-wrap"><input id="l-pass" type="password" autocomplete="current-password" required dir="ltr">' +
      '<button type="button" class="icon-btn" data-action="pw-toggle" aria-pressed="false" aria-label="' + esc(t('showPw')) + '">' + icon('eye') + '</button></div></div>' +
      '<button type="submit" class="btn btn-accent btn-lg wide">' + t('loginBtn') + '</button></form>';
    dlg.showModal();
    $('#l-email').focus();
  }

  function doLogin() {
    const email = $('#l-email').value.trim();
    const err = $('#l-email-err');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      err.hidden = false; err.innerHTML = icon('alert') + esc(t('errEmail'));
      $('#l-email').setAttribute('aria-invalid', 'true'); $('#l-email').focus();
      return;
    }
    const raw = email.split('@')[0].replace(/[._-]+/g, ' ');
    const name = raw.replace(/\b\w/g, (ch) => ch.toUpperCase());
    S.user = { name: name, email: email };
    store.set('user', S.user);
    if (S.draft && !S.draft.data.email) { S.draft.data.email = email; S.draft.data.name = S.draft.data.name || name; saveDraft(); }
    $('#login-dialog').close();
    renderHeader();
    toast(t('welcome', { n: name }));
  }

  /* ---------- Router ---------- */
  function currentRoute() {
    return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map((p) => { try { return decodeURIComponent(p); } catch (e) { return p; } });
  }

  function render() {
    const [r, a, b, c] = currentRoute();
    let html;
    switch (r) {
      case undefined: html = viewHome(); break;
      case 'companies': html = viewCompanies(); break;
      case 'company': html = viewCompany(a); break;
      case 'majors': html = viewMajors(); break;
      case 'major': html = viewMajor(a); break;
      case 'coop': html = viewCoop(); break;
      case 'search': html = viewSearch(a || ''); break;
      case 'resume': html = viewFormat(a, b === 'coop'); break;
      case 'builder': html = viewBuilder(a, b, c === 'coop'); break;
      case 'assessment': html = viewAssessment(); break;
      default: html = viewNotFound();
    }
    document.body.dataset.route = r || 'home';
    $('#main').innerHTML = html + '<p class="sr-only" id="sr-status" aria-live="polite"></p>';
    if (r === 'builder' && S.draft) S.lastLevel = analyze().level;
  }

  function onRoute() {
    S.notifOpen = false;
    S.menuOpen = false;
    renderHeader();
    render();
    if (S.firstRender) { S.firstRender = false; return; }
    window.scrollTo(0, 0);
    const h = $('#main h1') || $('#main');
    h.focus({ preventScroll: true });
  }

  function applyLang() {
    const root = document.documentElement;
    root.lang = S.lang;
    root.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
    document.title = S.lang === 'ar' ? 'مسار — وظائف في السعودية' : 'Masar — Saudi Careers';
    $('#skip-link').textContent = t('skip');
  }

  function applyTheme() {
    document.documentElement.dataset.theme = S.theme;
  }

  function renderAll() {
    applyLang();
    applyTheme();
    renderHeader();
    renderFooter();
    render();
  }

  /* ---------- Events ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) {
      if (S.notifOpen && !e.target.closest('.notif-wrap')) { S.notifOpen = false; renderHeader(); }
      return;
    }
    const act = el.dataset.action;
    switch (act) {
      case 'lang':
        S.lang = S.lang === 'en' ? 'ar' : 'en';
        store.setRaw('lang', S.lang);
        S.menuOpen = false;
        renderAll();
        { const btn = $('.header-tools [data-action="lang"]'); if (btn && btn.offsetParent) btn.focus(); }
        break;
      case 'theme':
        S.theme = S.theme === 'dark' ? 'light' : 'dark';
        store.setRaw('theme', S.theme);
        applyTheme();
        renderHeader();
        $('[data-action="theme"]').focus();
        break;
      case 'login': S.menuOpen = false; renderHeader(); openLogin(); break;
      case 'close-login': $('#login-dialog').close(); break;
      case 'logout':
        S.user = null; store.set('user', null); renderHeader(); toast(t('logout'));
        break;
      case 'pw-toggle': {
        const p = $('#l-pass');
        const show = p.type === 'password';
        p.type = show ? 'text' : 'password';
        el.setAttribute('aria-pressed', String(show));
        el.setAttribute('aria-label', show ? t('hidePw') : t('showPw'));
        el.innerHTML = icon(show ? 'eyeOff' : 'eye');
        break;
      }
      case 'notif':
        S.notifOpen = !S.notifOpen;
        renderHeader();
        $('[data-action="notif"]').focus();
        break;
      case 'mark-read':
        S.read = allNotifs().map((n) => n.id);
        store.set('read', S.read);
        renderHeader();
        $('[data-action="notif"]').focus();
        break;
      case 'menu':
        S.menuOpen = !S.menuOpen;
        renderHeader();
        $('[data-action="menu"]').focus();
        break;
      case 'home-major': {
        S.homeMajor = el.dataset.id;
        document.querySelectorAll('[data-action="home-major"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === S.homeMajor)));
        $('#hiring').innerHTML = homeGrid();
        const list = S.homeMajor === 'all' ? COMPANIES : COMPANIES.filter((c) => c.majors.includes(S.homeMajor));
        announce($('#hiring-title').textContent + ': ' + t('showing', { n: list.length }));
        break;
      }
      case 'sector':
        S.sector = el.dataset.id;
        render();
        { const b = document.querySelector('[data-action="sector"][data-id="' + CSS.escape(S.sector) + '"]'); if (b) b.focus(); }
        break;
      case 'add-tag': {
        const list = el.dataset.list;
        const inp = $('#f-' + list);
        if (addTags(list, inp.value)) refreshBuilder({ tags: true });
        inp.value = '';
        inp.focus();
        break;
      }
      case 'remove-tag': {
        const list = el.dataset.list;
        S.draft.data[list].splice(Number(el.dataset.index), 1);
        refreshBuilder({ tags: true });
        $('#f-' + list).focus();
        break;
      }
      case 'boost': {
        const sk = findSkill(el.dataset.id);
        const list = sk.type === 'soft' ? 'abilities' : 'skills';
        addTags(list, L(sk));
        refreshBuilder({ tags: true });
        const next = $('[data-action="boost"]') || $('#f-' + list);
        if (next) next.focus();
        break;
      }
      case 'add-item': {
        const list = el.dataset.list;
        const blank = blankData()[list][0];
        Object.keys(blank).forEach((k) => { blank[k] = ''; });
        S.draft.data[list].push(blank);
        const idx = S.draft.data[list].length - 1;
        const firstKey = Object.keys(blank)[0];
        rerenderSections('#f-' + list + '-' + idx + '-' + firstKey);
        break;
      }
      case 'remove-item': {
        const list = el.dataset.list;
        S.draft.data[list].splice(Number(el.dataset.index), 1);
        rerenderSections('[data-action="add-item"][data-list="' + list + '"]');
        break;
      }
      case 'focus-field': {
        e.preventDefault();
        const f = $('#' + el.dataset.id);
        if (f) { f.scrollIntoView({ block: 'center' }); f.focus(); }
        break;
      }
      case 'jump-gauge': {
        e.preventDefault();
        const g = $('#gauge');
        g.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        break;
      }
      case 'toggle-preview': {
        S.previewOpen = !S.previewOpen;
        $('#preview-wrap').classList.toggle('open', S.previewOpen);
        el.setAttribute('aria-expanded', String(S.previewOpen));
        el.textContent = S.previewOpen ? t('hidePreview') : t('showPreview');
        break;
      }
      case 'pdf': {
        const old = document.title;
        const nm = S.draft.data.name.trim();
        document.title = (nm ? nm + ' - ' : '') + (S.lang === 'ar' ? 'السيرة الذاتية' : 'Resume');
        window.print();
        setTimeout(() => { document.title = old; }, 500);
        break;
      }
      case 'start-quiz': startQuiz(); $('#q-text').focus(); break;
      case 'retake':
        S.result = null; store.set('result', null);
        render(); $('#main h1').focus();
        break;
      default: break;
    }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.dataset.form === 'search') {
      e.preventDefault();
      const q = f.q.value.trim();
      if (q) location.hash = '#/search/' + encodeURIComponent(q);
      else f.q.focus();
    } else if (f.id === 'resume-form') {
      e.preventDefault();
      submitResume();
    } else if (f.id === 'quiz-form') {
      e.preventDefault();
      const sel = f.querySelector('input[name="answer"]:checked');
      if (!sel || !S.quiz) return;
      S.quiz.answers[S.quiz.idx] = Number(sel.value);
      S.quiz.idx++;
      if (S.quiz.idx >= S.quiz.questions.length) { finishQuiz(false); $('#main h1').focus(); return; }
      render();
      $('#q-text').focus();
    } else if (f.id === 'login-form') {
      e.preventDefault();
      doLogin();
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.bind && S.draft) {
      setBound(el.dataset.bind, el.value);
      if (el.getAttribute('aria-invalid')) {
        el.removeAttribute('aria-invalid');
        const m = $('#' + el.id + '-err'); if (m) m.hidden = true;
      }
      refreshBuilder();
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.name === 'answer') { const b = $('#next-btn'); if (b) b.disabled = false; }
  });

  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.tagInput && (e.key === 'Enter' || e.key === ',')) {
      e.preventDefault();
      const list = el.dataset.tagInput;
      if (addTags(list, el.value)) refreshBuilder({ tags: true });
      el.value = '';
    }
    if (e.key === 'Escape') {
      if (S.notifOpen) { S.notifOpen = false; renderHeader(); $('[data-action="notif"]').focus(); }
      else if (S.menuOpen) { S.menuOpen = false; renderHeader(); $('[data-action="menu"]').focus(); }
    }
  });

  window.addEventListener('hashchange', onRoute);

  /* Resume a running quiz timer after a reload is not supported: the quiz lives in memory only. */
  renderAll();
  S.firstRender = false;
})();
