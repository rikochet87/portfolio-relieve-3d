import './style.css';
import './relieve.css';
import { PROJECTS, CATEGORIES } from './data/projects.js';

const UI = {
  es: {
    'nav.about': 'Sobre mí',
    'nav.list': 'Lista',
    'hero.kicker': 'Resistencia, Chaco · Argentina',
    'hero.role': 'Desarrollador de software asistido por IA · GIS y sistemas geoespaciales',
    'hero.hint': 'Cada cerro es un proyecto: los más altos son los destacados. Hacé click en un marcador · arrastrá para moverte · clic derecho para girar.',
    'list.title': 'Todos los proyectos',
    all: 'Todos',
    highlights: 'Qué hace',
    stack: 'Tecnologías',
    noimg: 'Capturas próximamente',
    sun: 'Software · GIS · IA',
    close: 'Cerrar',
    prev: 'Anterior',
    next: 'Siguiente',
  },
  en: {
    'nav.about': 'About',
    'nav.list': 'List',
    'hero.kicker': 'Resistencia, Chaco · Argentina',
    'hero.role': 'AI-assisted software developer · GIS & geospatial systems',
    'hero.hint': 'Each peak is a project: the tallest are the featured ones. Click a marker · drag to pan · right-click to rotate.',
    'list.title': 'All projects',
    all: 'All',
    highlights: 'What it does',
    stack: 'Tech stack',
    noimg: 'Screenshots coming soon',
    sun: 'Software · GIS · AI',
    close: 'Close',
    prev: 'Previous',
    next: 'Next',
  },
};

const ABOUT = {
  es: {
    lead: 'Construyo sistemas completos que funcionan, para problemas reales — del campo a producción — con la IA como parte central de cómo diseño y escribo código.',
    body: [
      'En 2022 me hice cargo del área SIG de la Dirección de Vialidad Provincial del Chaco. No había datos digitales. Hoy los ~29.000 km de red vial rural y sus 103 consorcios camineros funcionan sobre un sistema que diseñé y construí: una app Android offline para los técnicos de campo y una plataforma web para la oficina.',
      'También desarrollo productos propios y para clientes: un asistente conversacional con IA en producción, un CAD 2D escrito desde cero, sistemas de gestión para comercios y apps móviles.',
    ],
    flow: ['Entender el problema real', 'diseñar la solución', 'construirla con agentes de IA', 'probarla con datos reales', 'entregarla', 'aprender y mejorar'],
    bgTitle: 'Formación',
    bg: [
      'Estudios de Ingeniería Civil en la UNNE (4 años)',
      'Años de dibujo CAD y modelado 3D para arquitectura e ingeniería',
      'Experto Universitario en Tecnología Satelital, Teledetección y SIG — UTN Buenos Aires (2024)',
      'QGIS Integral: análisis de datos espaciales — Centro REDES, CONICET (2024, nota 10/10)',
      'Mantenimiento y Conservación Vial — Facultad de Ingeniería, UNNE (2024)',
      'Coach Ontológico certificado (AACOP), con foco en neurocoaching',
    ],
    stackTitle: 'Stack',
    contact: 'Abierto a trabajo remoto. Hablemos.',
    howTitle: 'Cómo trabajo',
  },
  en: {
    lead: 'I build complete, working systems for real problems — from the field to production — with AI as a core part of how I design and write code.',
    body: [
      'In 2022 I took over the GIS area of the road maintenance department of Chaco Province, Argentina. There was no digital data. Today the ~29,000 km rural road network and its 103 maintenance consortiums run on a system I designed and built: an offline Android app for field technicians and a web platform for the office.',
      'I also build products of my own and for clients: a conversational AI assistant in production, a 2D CAD application written from scratch, management systems for small businesses and mobile apps.',
    ],
    flow: ['Understand the real problem', 'design the solution', 'build it with AI agents', 'test it against real data', 'deliver it', 'learn and improve'],
    bgTitle: 'Background',
    bg: [
      'Civil Engineering studies at UNNE (4 years)',
      'Years of CAD drafting and 3D modeling for architecture and engineering',
      'University Expert in Satellite Technology, Remote Sensing and GIS — UTN Buenos Aires (2024)',
      'QGIS Integral: Spatial Data Analysis — Centro REDES, CONICET (2024, grade 10/10)',
      'Road Maintenance and Conservation — Faculty of Engineering, UNNE (2024)',
      'Certified Ontological Coach (AACOP), with a focus on neurocoaching',
    ],
    stackTitle: 'Stack',
    contact: 'Open to remote work. Let’s talk.',
    howTitle: 'How I work',
  },
};

const STACK = [
  ['Lenguajes|Languages', 'TypeScript · JavaScript · Python · SQL'],
  ['Frontend y mobile|Frontend & mobile', 'React · Next.js · React Native / Expo · Vite · PWA'],
  ['Backend y datos|Backend & data', 'Supabase / PostgreSQL · Firebase · Cloudflare Workers · Vercel'],
  ['GIS y mapas|GIS & maps', 'QGIS · Leaflet · GeoJSON · Google Earth Engine · teledetección'],
  ['IA|AI', 'Claude Code · Anthropic API · agentes de IA'],
  ['Diseño y CAD|Design & CAD', 'AutoCAD · Civil 3D · Revit · SketchUp · Three.js'],
];

const EMAIL = 'rosellomatias87@gmail.com';
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function storage(key, val) {
  try {
    if (val === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, val);
  } catch {
    return null;
  }
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let lang = storage('lang') || (navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en');
let current = null; // id del proyecto abierto
let filter = null;
let galaxy = null;
const t = (k) => UI[lang][k] ?? k;

// ---------- Textos estáticos ----------
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $('[data-action="lang"]').textContent = lang === 'es' ? 'EN' : 'ES';
  document.querySelectorAll('[data-action="close"],[data-action="close-overlay"]').forEach((b) => b.setAttribute('aria-label', t('close')));
  $('[data-action="prev"]').setAttribute('aria-label', t('prev'));
  $('[data-action="next"]').setAttribute('aria-label', t('next'));
  renderFilters();
  renderLabels();
  renderAbout();
  renderList();
  if (current) renderPanel(current);
}

// ---------- Filtros por categoría ----------
function renderFilters() {
  const el = $('#filters');
  const opts = [{ id: null, label: t('all') }, ...CATEGORIES.map((c) => ({ id: c.id, label: c[lang] }))];
  el.innerHTML = opts
    .map((o) => `<button class="chip ${filter === o.id ? 'is-active' : ''}" data-filter="${o.id ?? ''}" aria-pressed="${filter === o.id}">${esc(o.label)}</button>`)
    .join('');
}
$('#filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-filter]');
  if (!b) return;
  filter = b.dataset.filter === '' ? null : Number(b.dataset.filter);
  galaxy?.setFilter(filter);
  renderFilters();
});

// ---------- Etiquetas de planetas ----------
const labelEls = new Map();
let sunLabelEl = null;
function renderLabels() {
  const box = $('#labels');
  if (!labelEls.size) {
    PROJECTS.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'label is-hidden';
      b.style.setProperty('--c', p.color);
      b.addEventListener('click', () => select(p.id));
      b.addEventListener('mouseenter', () => galaxy?.setHover(p.id));
      b.addEventListener('mouseleave', () => galaxy?.setHover(null));
      box.appendChild(b);
      labelEls.set(p.id, b);
    });
    sunLabelEl = document.createElement('div');
    sunLabelEl.className = 'label label--sun is-hidden';
    box.appendChild(sunLabelEl);
  }
  PROJECTS.forEach((p) => {
    const b = labelEls.get(p.id);
    b.textContent = p.name;
    b.setAttribute('aria-label', `${p.name} — ${p.tagline[lang]}`);
  });
  sunLabelEl.textContent = t('sun');
}

function onFrame(data, sun, isFocused) {
  for (const d of data) {
    const el = labelEls.get(d.id);
    const hide = !d.visible || isFocused;
    el.classList.toggle('is-hidden', hide);
    el.classList.toggle('is-dim', d.dim);
    if (!hide) el.style.transform = `translate(${d.x}px, ${d.y}px) translate(-50%, -100%)`;
  }
  sunLabelEl.classList.toggle('is-hidden', !sun.visible || isFocused);
  sunLabelEl.style.transform = `translate(${sun.x}px, ${sun.y}px) translate(-50%, 0)`;
}

function onHover(id) {
  labelEls.forEach((el, k) => el.classList.toggle('is-hover', k === id));
}

// ---------- Panel de proyecto ----------
function renderPanel(id) {
  const i = PROJECTS.findIndex((p) => p.id === id);
  const p = PROJECTS[i];
  const panel = $('#panel');
  panel.style.setProperty('--c', p.color);
  $('#panel-count').textContent = `${String(i + 1).padStart(2, '0')} / ${String(PROJECTS.length).padStart(2, '0')}`;

  const gallery = p.images.length
    ? `<div class="p-gallery">
        <img class="p-gallery__main" src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy" />
        ${p.images.length > 1 ? `<div class="p-gallery__thumbs">${p.images.map((src, k) => `<button class="${k === 0 ? 'is-active' : ''}" data-img="${src}" aria-label="${k + 1}"><img src="${src}" alt="" loading="lazy" /></button>`).join('')}</div>` : ''}
      </div>`
    : `<div class="p-noimg">${esc(t('noimg'))}</div>`;

  const links = p.links
    .map((l, k) => `<a class="btn ${k === 0 ? 'btn--primary' : ''}" href="${l.url}" target="_blank" rel="noopener">${esc(l.label[lang])} <span aria-hidden="true">↗</span></a>`)
    .join('');

  $('#panel-body').innerHTML = `
    <span class="p-status">${esc(p.status[lang])}</span>
    <h2 class="p-title" id="panel-title">${esc(p.name)}</h2>
    <p class="p-tagline">${esc(p.tagline[lang])}</p>
    ${gallery}
    <p class="p-desc">${esc(p.description[lang])}</p>
    <h3 class="p-h">${esc(t('highlights'))}</h3>
    <ul class="p-list">${p.highlights[lang].map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
    <h3 class="p-h">${esc(t('stack'))}</h3>
    <div class="tags">${p.stack.map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div>
    <div class="p-links">${links}</div>`;
}

$('#panel-body').addEventListener('click', (e) => {
  const thumb = e.target.closest('[data-img]');
  if (thumb) {
    $('.p-gallery__main').src = thumb.dataset.img;
    thumb.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === thumb));
    return;
  }
  const main = e.target.closest('.p-gallery__main');
  if (main) openLightbox(main.src);
});

function openLightbox(src) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `<img src="${src}" alt="" />`;
  lb.addEventListener('click', () => lb.remove());
  document.body.appendChild(lb);
}

function select(id, { fromHash = false } = {}) {
  if (!id) return deselect();
  closeOverlays();
  current = id;
  renderPanel(id);
  const panel = $('#panel');
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
  $('#hero').classList.add('is-hidden');
  $('#filters').classList.add('is-hidden');
  galaxy?.focus(id);
  if (!fromHash) history.replaceState(null, '', `#/${id}`);
  $('#panel-body').scrollTop = 0;
}

function deselect() {
  if (!current) return;
  current = null;
  const panel = $('#panel');
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  $('#hero').classList.remove('is-hidden');
  $('#filters').classList.remove('is-hidden');
  galaxy?.unfocus();
  history.replaceState(null, '', location.pathname + location.search);
}

function step(dir) {
  const i = PROJECTS.findIndex((p) => p.id === current);
  select(PROJECTS[(i + dir + PROJECTS.length) % PROJECTS.length].id);
}

// ---------- Sobre mí ----------
function renderAbout() {
  const a = ABOUT[lang];
  const L = lang === 'es' ? 0 : 1;
  $('#about-body').innerHTML = `
    <div class="about">
      <p class="hero__kicker">${esc(t('hero.role'))}</p>
      <h2 class="overlay__title">Matías Rosello</h2>
      <p class="about__lead">${esc(a.lead)}</p>
      <div class="about__cols">
        <div>
          ${a.body.map((p) => `<p>${esc(p)}</p>`).join('')}
          <h3 class="p-h">${esc(a.howTitle)}</h3>
          <div class="flow">${a.flow.map((f) => `<span>${esc(f)}</span>`).join('<i>→</i>')}</div>
          <h3 class="p-h">${esc(a.stackTitle)}</h3>
          ${STACK.map(([k, v]) => `<div class="stack-row"><b>${esc(k.split('|')[L])}</b><span>${esc(v)}</span></div>`).join('')}
        </div>
        <div>
          <h3 class="p-h">${esc(a.bgTitle)}</h3>
          <ul class="p-list">${a.bg.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="contact">
        <p>${esc(a.contact)}</p>
        <a class="btn btn--primary" href="mailto:${EMAIL}">${EMAIL}</a>
        <a class="btn" href="https://github.com/rikochet87" target="_blank" rel="noopener">GitHub ↗</a>
      </div>
    </div>`;
}

// ---------- Lista ----------
function renderList() {
  $('#list-grid').innerHTML = PROJECTS.map((p) => {
    const cat = CATEGORIES.find((c) => c.id === p.orbit)[lang];
    const img = p.images[0] ? `<img class="card__img" src="${p.images[0]}" alt="" loading="lazy" />` : `<div class="card__img card__img--empty"></div>`;
    return `<button class="card" style="--c:${p.color}" data-open="${p.id}">
      ${img}
      <div class="card__body">
        <span class="card__cat">${esc(cat)}</span>
        <h3 class="card__name">${esc(p.name)}</h3>
        <p class="card__tag">${esc(p.tagline[lang])}</p>
      </div>
    </button>`;
  }).join('');
}
$('#list-grid').addEventListener('click', (e) => {
  const c = e.target.closest('[data-open]');
  if (c) select(c.dataset.open);
});

// ---------- Overlays ----------
let lastFocus = null;
function openOverlay(id) {
  if (current) deselect();
  closeOverlays();
  lastFocus = document.activeElement;
  const el = $('#' + id);
  el.classList.add('is-open');
  el.setAttribute('aria-hidden', 'false');
  el.querySelector('.panel__close').focus();
}
function closeOverlays() {
  document.querySelectorAll('.overlay.is-open').forEach((el) => {
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
  });
  lastFocus?.focus?.();
  lastFocus = null;
}
document.querySelectorAll('.overlay').forEach((o) => o.addEventListener('click', (e) => e.target === o && closeOverlays()));

// ---------- Acciones globales ----------
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-action]');
  if (!a) return;
  const act = a.dataset.action;
  if (act === 'home') {
    e.preventDefault();
    closeOverlays();
    deselect();
  } else if (act === 'about') openOverlay('about');
  else if (act === 'list') openOverlay('list');
  else if (act === 'close') deselect();
  else if (act === 'close-overlay') closeOverlays();
  else if (act === 'prev') step(-1);
  else if (act === 'next') step(1);
  else if (act === 'lang') {
    lang = lang === 'es' ? 'en' : 'es';
    storage('lang', lang);
    applyLang();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if ($('.lightbox')) return $('.lightbox').remove();
    if ($('.overlay.is-open')) return closeOverlays();
    deselect();
  }
  if (current && !$('.overlay.is-open') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) step(e.key === 'ArrowRight' ? 1 : -1);
});

function fromHash() {
  const id = location.hash.replace(/^#\/?/, '');
  if (PROJECTS.some((p) => p.id === id)) select(id, { fromHash: true });
  else if (!id) deselect();
}
window.addEventListener('hashchange', fromHash);

// ---------- Arranque ----------
applyLang();

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

async function start() {
  const loader = $('#loader');
  if (!hasWebGL()) {
    document.body.classList.add('no-webgl');
    loader.classList.add('is-done');
    openOverlay('list');
    return;
  }
  try {
    const { createTerrain: createGalaxy } = await import('./terrain.js');
    // createTerrain es asíncrona: el cargador queda visible hasta que la escena está compilada
    galaxy = await createGalaxy({
      canvas: $('#scene'),
      projects: PROJECTS,
      reducedMotion,
      onSelect: (id) => (id ? select(id) : deselect()),
      onHover,
      onFrame,
    });
  } catch (err) {
    console.error(err);
    document.body.classList.add('no-webgl');
    openOverlay('list');
  }
  requestAnimationFrame(() => loader.classList.add('is-done'));
  if (location.hash) setTimeout(fromHash, reducedMotion ? 0 : 1200);
}
start();
