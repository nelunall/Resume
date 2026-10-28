/* Majra: single-page app with in-memory routes (mirrored to #/path when opened directly).
   Routes: #/  #/companies  #/company/:id  #/majors  #/major/:id  #/coop  #/search/:q
           #/resume/:companyId[/coop]  #/builder/:companyId/:format  #/assessment */
(function () {
  'use strict';

  /* ---------- Storage (wrapped: can fail in private mode) ---------- */
  const PREFIX = 'majra.';
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
    loginMode: 'signin',
    afterLogin: '',
    path: '',
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

  function brandHTML() {
    return '<a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">M<i>/</i>J</span>' +
      '<span class="brand-name">MAJRA <span class="brand-ar">مجرى</span></span></a>';
  }

  function langBtn() {
    return '<button class="util-btn" type="button" data-action="lang" lang="' + (S.lang === 'en' ? 'ar' : 'en') + '" aria-label="' + esc(t('langLabel')) + '">' +
      icon('globe') + '<span>' + t('langToggle') + '</span></button>';
  }

  function themeBtn() {
    return '<button class="util-btn" type="button" data-action="theme">' + icon(S.theme === 'dark' ? 'sun' : 'moon') +
      '<span>' + (S.theme === 'dark' ? t('lightMode') : t('darkMode')) + '</span></button>';
  }

  function renderHeader() {
    const route = currentRoute()[0] || '';
    const unread = allNotifs().filter((n) => !S.read.includes(n.id)).length;
    const nav = [
      ['companies', t('navCompanies'), ['companies', 'company']],
      ['majors', t('navMajors'), ['majors', 'major']],
      ['coop', t('navCoop'), ['coop']]
    ];
    const initials = S.user ? S.user.name.split(/\s+/).map((w) => w.charAt(0)).join('').slice(0, 2).toUpperCase() : '';
    const account = S.user
      ? '<span class="account"><span class="avatar" aria-hidden="true">' + esc(initials) + '</span><span class="account-name">' + esc(S.user.name) + '</span>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-action="logout">' + icon('logout', 'flip-rtl') + t('logout') + '</button></span>'
      : '<a class="btn btn-ghost" href="#/login"' + (route === 'login' ? ' aria-current="page"' : '') + '>' + icon('user') + t('login') + '</a>';

    const notifItems = allNotifs().map((n) => {
      const isRead = S.read.includes(n.id);
      return '<li class="notif' + (isRead ? '' : ' unread') + '"><span class="dot" aria-hidden="true"></span><div><p>' + esc(L(n)) + '</p><p class="muted small">' + esc(L(n.time)) + '</p></div></li>';
    }).join('');

    $('#site-header').innerHTML =
      '<div class="utility"><div class="container utility-inner">' +
      '<p class="utility-note">' + icon('sparkle', 'star') + t('utilityNote', { n: COMPANIES.length }) + '</p>' +
      '<div class="utility-tools">' +
      '<div class="notif-wrap">' +
      '<button class="util-btn" type="button" data-action="notif" aria-expanded="' + S.notifOpen + '" aria-controls="notif-panel">' + icon('bell') +
      '<span>' + t('notifications') + '</span>' + (unread ? '<span class="badge">' + unread + '<span class="sr-only"> unread</span></span>' : '') + '</button>' +
      '<div class="notif-panel" id="notif-panel"' + (S.notifOpen ? '' : ' hidden') + '>' +
      '<div class="notif-head"><h2 class="h4">' + t('notifications') + '</h2>' +
      (unread ? '<button class="link-btn" type="button" data-action="mark-read">' + t('markRead') + '</button>' : '') + '</div>' +
      (notifItems ? '<ul class="notif-list">' + notifItems + '</ul>' : '<p class="muted">' + t('noNotifs') + '</p>') +
      '</div></div>' +
      langBtn() + themeBtn() +
      '</div></div></div>' +
      '<div class="mainbar"><div class="container mainbar-inner">' + brandHTML() +
      '<nav class="main-nav" aria-label="Main"><ul>' + nav.map((n, i) =>
        '<li><a class="nav-link" href="#/' + n[0] + '"' + (n[2].includes(route) ? ' aria-current="page"' : '') + '><span class="nav-num">' + pad(i + 1) + '</span>' + n[1] + '</a></li>'
      ).join('') + '</ul></nav>' +
      '<div class="mainbar-actions">' + account +
      '<a class="btn btn-accent" href="#/companies">' + t('ctaBuild') + icon('arrow', 'flip-rtl') + '</a></div>' +
      '</div></div>';
  }

  function renderFooter() {
    const col = (title, links) => '<div class="footer-col"><h2 class="footer-h">' + title + '</h2><ul>' +
      links.map((l) => '<li><a href="' + l[0] + '">' + l[1] + '</a></li>').join('') + '</ul></div>';
    $('#site-footer').innerHTML =
      '<div class="container footer-grid">' +
      '<div class="footer-brand">' + brandHTML() + '<p class="muted">' + t('footerAbout') + '</p></div>' +
      col(t('fExplore'), [['#/companies', t('navCompanies')], ['#/majors', t('navMajors')], ['#/coop', t('navCoop')]]) +
      col(t('fCareer'), [['#/companies', t('ctaBuild')], ['#/assessment', t('assessTitle')], ['#/login', t('login')]]) +
      '<div class="footer-col"><h2 class="footer-h">' + t('fSettings') + '</h2><div class="footer-tools">' + langBtn() + themeBtn() + '</div></div>' +
      '</div>' +
      '<div class="container footer-bottom"><p>© 2026 Majra · مجرى</p><p class="muted small">' + t('footer') + '</p></div>';
  }

  /* ---------- Views ---------- */
  const statHTML = (n, label) => '<div class="stat"><p class="stat-num">' + n + '</p><p class="stat-label">' + label + '</p></div>';

  /* Product preview in the hero: a resume card with the smart gauge. Decorative. */
  function heroVisual() {
    const c = findCompany('aramco');
    const chip = (id, hot) => '<span class="mock-chip' + (hot ? ' hot' : '') + '">' + (hot ? icon('flame') : '') + esc(L(findSkill(id))) + '</span>';
    return '<div class="hero-visual" aria-hidden="true">' +
      '<div class="mock-paper">' +
      '<p class="mock-name">' + (S.lang === 'ar' ? 'سارة القحطاني' : 'Sara Alqahtani') + '</p>' +
      '<p class="mock-title">' + esc(L(findMajor('petroleum').role)) + '</p>' +
      '<p class="mock-h">' + t('pvSummary') + '</p><span class="mock-line" style="width:92%"></span><span class="mock-line" style="width:80%"></span>' +
      '<p class="mock-h">' + t('pvSkills') + '</p><div class="mock-chips">' + chip('reservoir', true) + chip('timemgmt') + chip('hse', true) + chip('teamwork') + '</div>' +
      '<p class="mock-h">' + t('pvExperience') + '</p><span class="mock-line" style="width:88%"></span><span class="mock-line" style="width:70%"></span><span class="mock-line" style="width:76%"></span>' +
      '</div>' +
      '<div class="mock-gauge">' +
      '<div class="mock-gauge-head">' + logoTile(c, 'sm') + '<div><p class="mock-g-title">' + t('gaugeTitle') + '</p><p class="mock-g-sub">' + esc(L(c)) + '</p></div></div>' +
      '<div class="gauge-meter level-high"><svg viewBox="0 0 120 68"><path class="g-track" d="M10 60 A50 50 0 0 1 110 60" pathLength="100"/>' +
      '<path class="g-fill" d="M10 60 A50 50 0 0 1 110 60" pathLength="100" stroke-dasharray="78 100"/></svg>' +
      '<div class="gauge-value"><span class="g-num">78<small>%</small></span><span class="g-label">' + t('gHigh') + '</span></div></div>' +
      '</div></div>';
  }

  function viewHome() {
    const m = S.homeMajor;
    const roles = COMPANIES.reduce((n, c) => n + totalOpenings(c), 0);
    const coops = COMPANIES.filter((c) => c.coop).length;
    return '<section class="hero"><div class="container hero-grid"><div class="hero-copy">' +
      '<p class="eyebrow">' + icon('sparkle', 'star') + t('eyebrow', { n: COMPANIES.length }) + '</p>' +
      '<h1 class="display" tabindex="-1"><span>' + t('heroA') + '</span> <span><em>' + t('heroB') + '</em> ' + t('heroC') + '</span></h1>' +
      '<p class="lede">' + t('heroSub') + '</p>' +
      searchForm() +
      '<div class="suggest"><h2 class="label" id="sugg-label">' + t('suggested') + '</h2>' +
      '<div class="chips" role="group" aria-labelledby="sugg-label">' +
      '<button type="button" class="chip" data-action="home-major" data-id="all" aria-pressed="' + (m === 'all') + '">' + t('all') + '</button>' +
      MAJORS.map((mj) => '<button type="button" class="chip" data-action="home-major" data-id="' + mj.id + '" aria-pressed="' + (m === mj.id) + '">' + esc(L(mj)) + '</button>').join('') +
      '</div></div></div>' + heroVisual() + '</div></section>' +
      '<section class="stats-band" aria-label="' + esc(t('statsLabel')) + '"><div class="container stats">' +
      statHTML(COMPANIES.length, t('stCompanies')) + statHTML(MAJORS.length, t('stMajors')) + statHTML(roles, t('stRoles')) + statHTML(coops, t('stCoop')) +
      '</div></section>' +
      '<section class="container section" aria-labelledby="hiring-title" id="hiring">' + homeGrid() + '</section>' +
      '<section class="how" aria-labelledby="how-title"><div class="container">' +
      '<p class="eyebrow">' + icon('sparkle', 'star') + t('howEyebrow') + '</p><h2 class="h2" id="how-title">' + t('howTitle') + '</h2>' +
      '<ol class="how-steps">' + [1, 2, 3, 4].map((i) => '<li><span class="how-num" aria-hidden="true">' + pad(i) + '</span><h3 class="h4">' + t('how' + i + 'T') + '</h3><p class="muted">' + t('how' + i + 'D') + '</p></li>').join('') + '</ol>' +
      '</div></section>' +
      '<section class="container section"><div class="coop-banner">' +
      '<div><p class="eyebrow">' + icon('cap') + t('navCoop') + '</p><h2 class="h2">' + t('coopBannerT') + '</h2><p class="lede">' + t('coopBannerD', { n: coops }) + '</p></div>' +
      '<a class="btn btn-accent btn-lg" href="#/coop">' + t('coopBannerBtn') + icon('arrow', 'flip-rtl') + '</a></div></section>';
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
      certs: '',
      certFiles: []
    };
  }

  function ensureDraft(cid, fmt, coop) {
    /* One draft per user: switching company keeps what they already typed. */
    if (!S.draft) S.draft = { companyId: cid, format: fmt, coop: !!coop, data: blankData() };
    S.draft.companyId = cid;
    /* Abilities used to be a separate list; fold any old entries into Skills. */
    const d = S.draft.data;
    if (d.abilities && d.abilities.length) { d.abilities.forEach((a) => { if (!d.skills.includes(a)) d.skills.push(a); }); }
    d.abilities = [];
    if (!d.certFiles) d.certFiles = [];
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
    chronological: ['personal', 'summary', 'experience', 'education', 'skills', 'certs'],
    functional: ['personal', 'summary', 'skills', 'highlights', 'history', 'education', 'certs'],
    hybrid: ['personal', 'summary', 'skills', 'experience', 'education', 'certs']
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

  function popularChips() {
    const have = new Set(S.draft.data.skills.map((x) => { const sk = matchSkill(x); return sk ? sk.id : ''; }));
    const items = POPULAR_SKILLS.filter((id) => !have.has(id)).map(findSkill);
    if (!items.length) return '';
    return '<p class="label popular-label">' + t('popular') + ' <span class="muted">· ' + t('popularH') + '</span></p>' +
      '<div class="chips">' + items.map((sk) => '<button type="button" class="chip chip-add" data-action="boost" data-id="' + sk.id + '">' + icon('plus') + esc(L(sk)) + '</button>').join('') + '</div>';
  }

  function tagField(list) {
    const label = t('secSkills');
    const id = 'f-' + list;
    return '<div class="field wide"><label for="' + id + '">' + label + '</label>' +
      '<p class="help" id="' + id + '-help">' + t('fSkillsH') + '</p>' +
      '<ul class="tag-list" id="' + list + '-tags" aria-label="' + esc(label) + '">' + tagList(list) + '</ul>' +
      '<div class="tag-entry"><input id="' + id + '" type="text" dir="auto" data-tag-input="' + list + '" list="skill-options-' + list + '" aria-describedby="' + id + '-help ' + id + '-err" autocomplete="off">' +
      '<button type="button" class="btn btn-ghost" data-action="add-tag" data-list="' + list + '">' + icon('plus') + t('add') + '</button></div>' +
      '<p class="field-error" id="' + id + '-err" hidden></p>' +
      '<div id="popular-skills">' + popularChips() + '</div>' +
      '<datalist id="skill-options-' + list + '">' + SKILLS.map((s) => '<option value="' + esc(L(s)) + '"></option>').join('') + '</datalist></div>';
  }

  function fmtSize(b) {
    return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  }

  function certFileList() {
    return S.draft.data.certFiles.map((f, i) =>
      '<li class="file-item">' + icon('file') + '<span class="file-name" dir="auto">' + esc(f.name) + '</span><span class="muted small">' + fmtSize(f.size) + '</span>' +
      '<button type="button" class="tag-remove" data-action="remove-file" data-index="' + i + '" aria-label="' + esc(t('removeFile', { f: f.name })) + '">' + icon('x') + '</button></li>').join('');
  }

  function certUpload() {
    return '<div class="field wide"><span class="field-label" id="cert-files-label">' + t('fCertFiles') + '</span>' +
      '<p class="help" id="cert-files-help">' + t('fCertFilesH') + '</p>' +
      '<div class="file-drop" id="file-drop">' + icon('upload', 'drop-icon') +
      '<button type="button" class="btn btn-ghost" data-action="pick-files" aria-describedby="cert-files-label cert-files-help">' + icon('clip') + t('chooseFiles') + '</button>' +
      '<span class="muted small">' + t('dropHint') + '</span>' +
      '<input type="file" id="f-cert-files" class="sr-only" tabindex="-1" aria-hidden="true" multiple accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg">' +
      '</div><ul class="file-list" id="cert-files">' + certFileList() + '</ul></div>';
  }

  function addCertFiles(fileList) {
    const okTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    let added = 0;
    Array.from(fileList || []).forEach((f) => {
      const extOk = /\.(pdf|png|jpe?g)$/i.test(f.name);
      if (!okTypes.includes(f.type) && !extOk) { toast(t('fileType', { f: f.name })); return; }
      if (f.size > 5 * 1048576) { toast(t('fileTooBig', { f: f.name })); return; }
      if (S.draft.data.certFiles.some((x) => x.name === f.name && x.size === f.size)) return;
      S.draft.data.certFiles.push({ name: f.name, size: f.size, type: f.type });
      added++;
    });
    if (added) {
      $('#cert-files').innerHTML = certFileList();
      refreshBuilder();
      announce(t('attached') + ': ' + added);
    }
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
        return wrap('secCerts', '<div class="field-grid">' + input({ bind: 'certs', label: t('fCerts'), value: d.certs, textarea: true, rows: 3, help: t('fCertsH'), wide: true }) + certUpload() + '</div>');
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
        sec('pvSkills', chipsList(d.skills));
    } else if (fmt === 'functional') {
      body = sec('pvSummary', summary) + sec('pvSkills', chipsList(d.skills)) +
        sec('pvHighlights', highlights()) + sec('pvHistory', expShort()) + sec('pvEducation', edu());
    } else {
      body = sec('pvSummary', summary) + sec('pvSkills', chipsList(d.skills)) +
        sec('pvExperience', expFull()) + sec('pvEducation', edu());
    }
    const files = d.certFiles || [];
    if (certs.length || files.length) {
      body += sec('pvCerts', '<ul>' + certs.map((c) => '<li>' + esc(c) + '</li>').join('') +
        files.map((f) => '<li class="pv-file">' + esc(f.name) + ' <span class="pv-date">(' + t('attached') + ')</span></li>').join('') + '</ul>');
    }

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
      '</div>' +
      '<div class="preview-wrap" id="preview-wrap"><div class="resume-paper fmt-' + fmt + '" id="preview" lang="' + S.lang + '" dir="' + (S.lang === 'ar' ? 'rtl' : 'ltr') + '">' + previewHTML() + '</div></div>' +
      '</div></aside></div>';
  }

  function refreshBuilder(opts) {
    const p = $('#preview');
    if (p) p.innerHTML = previewHTML();
    if (opts && opts.tags) {
      ['skills'].forEach((l) => { const ul = $('#' + l + '-tags'); if (ul) ul.innerHTML = tagList(l); });
      const pop = $('#popular-skills'); if (pop) pop.innerHTML = popularChips();
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
    navigate('assessment');
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
    if (S.result && S.result.submittedAt === S.submission.at) return viewDone(c);
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
    /* Scores go to the company only; the candidate sees a confirmation. */
    S.result = { submittedAt: S.submission.at, at: Date.now(), skills: skills, correct: correct, total: qz.questions.length,
      answered: qz.answers.filter((a) => a != null).length, score: Math.round(correct / qz.questions.length * 100), timeUp: !!timeUp };
    store.set('result', S.result);
    qz.done = true;
    S.quiz = null;
    if (timeUp) toast(t('timeUp'));
    if (currentRoute()[0] === 'assessment') render();
  }

  function viewDone(c) {
    const r = S.result;
    const sub = S.submission;
    const fmt = FORMATS.find((f) => f.id === sub.format);
    const when = new Date(r.at || sub.at).toLocaleString(S.lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    const fact = (k, v) => '<div><dt>' + k + '</dt><dd>' + esc(v) + '</dd></div>';
    return '<section class="container page-head done">' + stepper(4) +
      '<div class="done-card panel"><span class="done-icon">' + icon('check') + '</span>' +
      '<h1 class="h1" tabindex="-1">' + t('doneTitle') + '</h1>' +
      '<p class="lede">' + esc(t('doneSub', { c: L(c) })) + '</p>' +
      (r.timeUp ? '<p class="note">' + icon('clock') + t('doneTimeUp') + '</p>' : '') +
      '<dl class="done-facts">' + fact(t('dCompany'), L(c)) + fact(t('dFormat'), fmt ? t(fmt.name) : '') +
      fact(t('dAnswered'), t('answeredOf', { a: r.answered != null ? r.answered : r.total, b: r.total })) + fact(t('dWhen'), when) + '</dl>' +
      '<div class="result-actions"><a class="btn btn-accent" href="#/companies">' + t('explore') + icon('arrow', 'flip-rtl') + '</a>' +
      '<a class="btn btn-ghost" href="#/">' + t('goHome') + '</a></div>' +
      '</div></section>';
  }

  function viewNotFound() {
    return '<section class="container page-head"><h1 class="h1" tabindex="-1">' + t('notFound') + '</h1><a class="btn btn-accent" href="#/">' + t('goHome') + '</a></section>';
  }

  /* ---------- Login page ---------- */
  function loginField(id, label, type, auto, help) {
    const described = id + '-err' + (help ? ' ' + id + '-help' : '');
    const control = type === 'password'
      ? '<div class="pw-wrap"><input id="' + id + '" type="password" autocomplete="' + auto + '" required dir="ltr" aria-describedby="' + described + '">' +
        '<button type="button" class="icon-btn" data-action="pw-toggle" aria-pressed="false" aria-label="' + esc(t('showPw')) + '">' + icon('eye') + '</button></div>'
      : '<input id="' + id + '" type="' + type + '" autocomplete="' + auto + '" required dir="' + (type === 'email' ? 'ltr' : 'auto') + '" aria-describedby="' + described + '">';
    return '<div class="field"><label for="' + id + '">' + label + '</label>' + control +
      (help ? '<p class="help" id="' + id + '-help">' + help + '</p>' : '') +
      '<p class="field-error" id="' + id + '-err" hidden></p></div>';
  }

  function viewLogin() {
    const signup = S.loginMode === 'signup';
    const tab = (id, label, sel) => '<button type="button" role="tab" id="tab-' + id + '" class="tab" aria-selected="' + sel + '" aria-controls="login-form" data-action="login-tab" data-id="' + id + '">' + label + '</button>';
    return '<section class="login-page"><div class="container login-grid">' +
      '<div class="login-side">' +
      '<p class="eyebrow">' + icon('sparkle', 'star') + 'MAJRA · مجرى</p>' +
      '<h1 class="h1" tabindex="-1">' + (signup ? t('signupHead') : t('loginHead')) + '</h1>' +
      '<p class="lede">' + t('loginLede') + '</p>' +
      '<ul class="benefits">' + ['b1', 'b2', 'b3'].map((k) => '<li>' + icon('checkCircle') + t(k) + '</li>').join('') + '</ul>' +
      '</div>' +
      '<div class="login-card panel">' +
      '<div class="tabs" role="tablist" aria-label="' + esc(t('loginTitle')) + '">' + tab('signin', t('tabSignin'), !signup) + tab('signup', t('tabSignup'), signup) + '</div>' +
      '<form id="login-form" class="login-form" role="tabpanel" aria-labelledby="tab-' + (signup ? 'signup' : 'signin') + '" novalidate>' +
      (signup ? loginField('l-name', t('fName'), 'text', 'name') : '') +
      loginField('l-email', t('fEmail'), 'email', 'email') +
      loginField('l-pass', t('password'), 'password', signup ? 'new-password' : 'current-password', signup ? t('passHelp') : '') +
      (signup ? '' : '<div class="login-row"><label class="check"><input type="checkbox" id="l-remember" checked> ' + t('remember') + '</label>' +
        '<button type="button" class="link-btn" data-action="forgot">' + t('forgot') + '</button></div>') +
      '<button type="submit" class="btn btn-accent btn-lg wide">' + (signup ? t('signupBtn') : t('loginBtn')) + '</button>' +
      '<p class="muted small">' + t('loginSub') + '</p>' +
      '</form></div></div></section>';
  }

  function doLogin() {
    const signup = S.loginMode === 'signup';
    const nameEl = $('#l-name');
    const emailEl = $('#l-email');
    const passEl = $('#l-pass');
    document.querySelectorAll('#login-form .field-error').forEach((el) => { el.hidden = true; });
    document.querySelectorAll('#login-form [aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    const errs = [];
    if (signup && !nameEl.value.trim()) errs.push(['l-name', t('errName')]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) errs.push(['l-email', t('errEmail')]);
    if (!passEl.value) errs.push(['l-pass', t('errPass')]);
    else if (signup && passEl.value.length < 8) errs.push(['l-pass', t('errPassLen')]);
    if (errs.length) {
      errs.forEach((e) => {
        const m = $('#' + e[0] + '-err');
        m.hidden = false; m.innerHTML = icon('alert') + esc(e[1]);
        $('#' + e[0]).setAttribute('aria-invalid', 'true');
      });
      $('#' + errs[0][0]).focus();
      return;
    }
    const email = emailEl.value.trim();
    const name = signup ? nameEl.value.trim() : email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
    S.user = { name: name, email: email };
    store.set('user', S.user);
    if (S.draft) {
      if (!S.draft.data.email) S.draft.data.email = email;
      if (!S.draft.data.name) S.draft.data.name = name;
      saveDraft();
    }
    toast(t('welcome', { n: name }));
    const back = S.afterLogin && S.afterLogin !== 'login' ? S.afterLogin : '';
    navigate(back);
  }

  /* ---------- Router ----------
     Navigation is kept in memory (S.path) so it also works inside an embedded preview.
     When opened directly, the address bar mirrors the route as #/path for deep links. */
  const IN_FRAME = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  S.path = location.hash.indexOf('#/') === 0 ? location.hash.slice(2) : '';

  function currentRoute() {
    return S.path.split('/').filter(Boolean).map((p) => { try { return decodeURIComponent(p); } catch (e) { return p; } });
  }

  function navigate(path, replace) {
    path = String(path).replace(/^#?\/?/, '');
    if (path === 'login' && currentRoute()[0] !== 'login') S.afterLogin = S.path;
    S.path = path;
    try {
      const url = IN_FRAME ? undefined : '#/' + path;
      if (replace) history.replaceState({ path: path }, '', url);
      else history.pushState({ path: path }, '', url);
    } catch (e) { /* history can be blocked in some frames */ }
    onRoute();
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
      case 'login': html = viewLogin(); break;
      default: html = viewNotFound();
    }
    document.body.dataset.route = r || 'home';
    $('#main').innerHTML = html + '<p class="sr-only" id="sr-status" aria-live="polite"></p>';
    if (r === 'builder' && S.draft) S.lastLevel = analyze().level;
  }

  function onRoute() {
    S.notifOpen = false;
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
    document.title = S.lang === 'ar' ? 'مجرى — وظائف في السعودية' : 'Majra — Saudi Careers';
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

  /* Always show the desktop layout: on narrow screens the 1280px page is scaled down to fit. */
  const DESKTOP_WIDTH = 1280;
  function fitDesktop() {
    const w = document.documentElement.clientWidth;
    const b = document.body;
    if (w > 0 && w < DESKTOP_WIDTH - 100) {
      b.style.width = DESKTOP_WIDTH + 'px';
      b.style.zoom = String(w / DESKTOP_WIDTH);
    } else {
      b.style.width = '';
      b.style.zoom = '';
    }
  }

  /* ---------- Events ---------- */
  function refocus(el, sel) {
    const inFooter = el && el.closest('#site-footer');
    const target = $((inFooter ? '#site-footer ' : '#site-header ') + sel);
    if (target) target.focus();
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#/"]');
    if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      navigate(link.getAttribute('href').slice(2));
      return;
    }
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
        renderAll();
        refocus(el, '[data-action="lang"]');
        break;
      case 'theme':
        S.theme = S.theme === 'dark' ? 'light' : 'dark';
        store.setRaw('theme', S.theme);
        applyTheme();
        renderHeader();
        renderFooter();
        refocus(el, '[data-action="theme"]');
        break;
      case 'logout':
        S.user = null; store.set('user', null); renderHeader(); toast(t('logout'));
        { const l = $('#site-header a[href="#/login"]'); if (l) l.focus(); }
        break;
      case 'login-tab':
        S.loginMode = el.dataset.id;
        render();
        $('#tab-' + S.loginMode).focus();
        break;
      case 'forgot': toast(t('forgotMsg')); break;
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
        const list = 'skills';
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
        rerenderSections('#f-' + list + '-' + idx + '-' + Object.keys(blank)[0]);
        break;
      }
      case 'remove-item': {
        const list = el.dataset.list;
        S.draft.data[list].splice(Number(el.dataset.index), 1);
        rerenderSections('[data-action="add-item"][data-list="' + list + '"]');
        break;
      }
      case 'pick-files': { const fi = $('#f-cert-files'); if (fi) fi.click(); break; }
      case 'remove-file': {
        S.draft.data.certFiles.splice(Number(el.dataset.index), 1);
        $('#cert-files').innerHTML = certFileList();
        refreshBuilder();
        $('[data-action="pick-files"]').focus();
        break;
      }
      case 'focus-field': {
        e.preventDefault();
        const f = $('#' + el.dataset.id);
        if (f) { f.scrollIntoView({ block: 'center' }); f.focus(); }
        break;
      }
      case 'pdf': {
        if (IN_FRAME) {
          const note = $('#pdf-hint');
          note.textContent = t('pdfFrame');
          note.classList.add('note');
          break;
        }
        const old = document.title;
        const nm = S.draft.data.name.trim();
        document.title = (nm ? nm + ' - ' : '') + (S.lang === 'ar' ? 'السيرة الذاتية' : 'Resume');
        window.print();
        setTimeout(() => { document.title = old; }, 500);
        break;
      }
      case 'start-quiz': startQuiz(); $('#q-text').focus(); break;
      default: break;
    }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.dataset.form === 'search') {
      e.preventDefault();
      const q = f.q.value.trim();
      if (q) navigate('search/' + encodeURIComponent(q));
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
    if (e.target.id === 'f-cert-files') { addCertFiles(e.target.files); e.target.value = ''; return; }
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
    if (e.key === 'Escape' && S.notifOpen) { S.notifOpen = false; renderHeader(); $('[data-action="notif"]').focus(); }
  });

  document.addEventListener('dragover', (e) => {
    const z = e.target.closest && e.target.closest('#file-drop');
    if (z) { e.preventDefault(); z.classList.add('over'); }
  });
  document.addEventListener('dragleave', (e) => {
    const z = e.target.closest && e.target.closest('#file-drop');
    if (z) z.classList.remove('over');
  });
  document.addEventListener('drop', (e) => {
    const z = e.target.closest && e.target.closest('#file-drop');
    if (z) { e.preventDefault(); z.classList.remove('over'); addCertFiles(e.dataTransfer.files); }
  });

  window.addEventListener('popstate', (e) => {
    S.path = (e.state && typeof e.state.path === 'string') ? e.state.path : (location.hash.indexOf('#/') === 0 ? location.hash.slice(2) : '');
    onRoute();
  });
  window.addEventListener('hashchange', () => {
    if (location.hash.indexOf('#/') === 0 && location.hash.slice(2) !== S.path) { S.path = location.hash.slice(2); onRoute(); }
  });
  window.addEventListener('resize', fitDesktop);

  try { history.replaceState({ path: S.path }, ''); } catch (e) { /* ignore */ }
  renderAll();
  fitDesktop();
  S.firstRender = false;
})();
