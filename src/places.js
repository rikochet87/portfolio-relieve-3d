// Los lugares de la ruta: cada proyecto es un lugar sobre el camino, según su categoría.
//   orbit 0 (destacados)            → localidad: casas, tanque de agua y antena
//   orbit 1 (productos)             → estación de servicio: surtidores con las tecnologías
//   orbit 2 (trabajo para clientes) → paraje: un local al costado del camino
// Un proyecto puede pedir otro lugar con `lugar` (projects.js): 'cafe' es un parador de ruta
// y 'parque' la entrada de un parque nacional, con boletería y camping.
// Cada lugar tiene su cartel verde de entrada (nombre, una cifra y la fecha) y su mojón
// con el kilómetro. La ruta arranca en el km 0 con el primer proyecto y sigue por fecha.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SIGN_GREEN = '#0b6b3c';
const FONT = '"Space Grotesk", "Inter", Arial, sans-serif';
const MONO = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';
const MONTHS = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export const fechaCorta = (iso, lang) => {
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[lang][m - 1]} ${y}`;
};
const kmTexto = (km, lang) => (lang === 'es' ? km.toFixed(1).replace('.', ',') : km.toFixed(1));

// Generador con semilla: el pueblo sale igual en cada visita.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------- Texto en canvas ----------
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData.redraw = (...args) => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, w, h);
    draw(g, w, h, ...args);
    tex.needsUpdate = true;
  };
  return tex;
}
function fitText(g, text, maxW, size, weight = 700, family = FONT) {
  let s = size;
  do {
    g.font = `${weight} ${s}px ${family}`;
    if (g.measureText(text).width <= maxW) break;
    s -= 2;
  } while (s > 10);
  return s;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Cartel verde de ruta: nombre, una cifra y la fecha de inicio.
function drawEntrySign(g, w, h, p, lang) {
  g.fillStyle = SIGN_GREEN;
  roundRect(g, 4, 4, w - 8, h - 8, 26);
  g.fill();
  g.strokeStyle = '#f4f6f2';
  g.lineWidth = 10;
  roundRect(g, 20, 20, w - 40, h - 40, 16);
  g.stroke();
  // punto con el color del proyecto
  g.fillStyle = p.color;
  g.beginPath();
  g.arc(78, 112, 20, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  const name = p.name.toUpperCase();
  fitText(g, name, w - 160, 96);
  g.textBaseline = 'middle';
  g.fillText(name, 118, 116);
  g.fillStyle = 'rgba(255,255,255,0.92)';
  fitText(g, p.sign[lang], w - 110, 60, 500);
  g.fillText(p.sign[lang], 58, 232);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.font = `500 40px ${MONO}`;
  const since = `${lang === 'es' ? 'desde' : 'since'} ${fechaCorta(p.since, lang)}`;
  g.textAlign = 'right';
  g.fillText(since, w - 58, 324);
  g.textAlign = 'left';
}

// Mojón: blanco, con el kilómetro en negro.
function drawMojon(g, w, h, km, lang) {
  g.fillStyle = '#f2f2ee';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#1a1a1a';
  g.fillRect(0, 0, w, h * 0.16);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 54px ${FONT}`;
  g.fillText('KM', w / 2, h * 0.38);
  fitText(g, kmTexto(km, lang), w - 16, 74);
  g.fillText(kmTexto(km, lang), w / 2, h * 0.66);
}

// Etiqueta de un surtidor: la tecnología, chica y en monoespaciada.
function drawPump(g, w, h, text) {
  g.fillStyle = '#10141c';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#e9edf2';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  fitText(g, text, w - 20, 54, 500, MONO);
  g.fillText(text, w / 2, h / 2 + 2);
}

// Cartel de un local o el tótem de una estación, con el color del proyecto.
function drawBrand(g, w, h, p) {
  g.fillStyle = p.color;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(6,10,16,0.92)';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const words = p.name.toUpperCase().split(' ');
  const lines = w > h ? [words.join(' ')] : words;
  const lh = Math.min(h / (lines.length + 0.6), 110);
  lines.forEach((l, i) => {
    fitText(g, l, w - 30, lh * 0.8);
    g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh);
  });
}

// Tótem de la estación: el nombre arriba y las tecnologías como la tabla de precios de los combustibles.
function drawTotem(g, w, h, p) {
  g.fillStyle = '#12161d';
  g.fillRect(0, 0, w, h);
  const head = h * 0.3;
  g.fillStyle = p.color;
  g.fillRect(0, 0, w, head);
  g.fillStyle = 'rgba(6,10,16,0.92)';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const words = p.name.toUpperCase().split(' ');
  const lh = head / (words.length + 0.5);
  words.forEach((l, i) => {
    fitText(g, l, w - 28, lh * 0.85);
    g.fillText(l, w / 2, head / 2 + (i - (words.length - 1) / 2) * lh);
  });
  const rows = p.stack.slice(0, 4);
  const rh = (h - head - 16) / 4;
  rows.forEach((tech, i) => {
    const y = head + 8 + rh * i;
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)';
    g.fillRect(10, y + 4, w - 20, rh - 8);
    g.fillStyle = '#e8edf2';
    g.textAlign = 'left';
    fitText(g, tech, w - 70, rh * 0.42, 500, MONO);
    g.fillText(tech, 22, y + rh / 2);
    g.fillStyle = p.color;
    g.beginPath();
    g.arc(w - 30, y + rh / 2, rh * 0.13, 0, Math.PI * 2);
    g.fill();
  });
}

// Marca de Trópico, como en el toldo del local real: el nombre grande en blanco sobre terracota
// y «concept coffee» debajo. Sirve para el toldo y para el cartel alto de la ruta.
const TERRACOTA = '#c4461f';
function drawTropico(g, w, h, p, lang, tall = false) {
  g.fillStyle = TERRACOTA;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,0.1)';
  g.fillRect(0, h - h * 0.08, w, h * 0.08);
  g.fillStyle = '#fbf3e6';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const name = p.name.split(' ')[0].toUpperCase(); // «TRÓPICO»
  const big = tall ? h * 0.34 : h * 0.5;
  g.save();
  g.translate(w / 2, h * (tall ? 0.36 : 0.4));
  g.transform(1, 0, -0.12, 1, 0, 0); // apenas inclinada, como la letra de la marca
  fitText(g, name, w * 0.82, big, 800);
  g.fillText(name, 0, 0);
  g.restore();
  // la ® chica arriba a la derecha
  const nw = g.measureText(name).width;
  g.lineWidth = Math.max(2, big * 0.04);
  g.strokeStyle = '#fbf3e6';
  g.beginPath();
  g.arc(w / 2 + nw / 2 + big * 0.18, h * (tall ? 0.36 : 0.4) - big * 0.32, big * 0.09, 0, Math.PI * 2);
  g.stroke();
  fitText(g, 'concept coffee', w * 0.5, big * 0.36, 500);
  g.fillText('concept coffee', w / 2 + w * 0.06, h * (tall ? 0.6 : 0.8));
  if (tall) {
    g.fillStyle = 'rgba(251,243,230,0.85)';
    const sub = lang === 'es' ? 'PARADOR · ABIERTO 24 H' : 'ROADSIDE CAFÉ · OPEN 24 H';
    fitText(g, sub, w * 0.8, h * 0.1, 600);
    g.fillText(sub, w / 2, h * 0.84);
  }
}
const drawCafeSign = (g, w, h, p, lang) => drawTropico(g, w, h, p, lang, true);

// Pórtico del parque: letras claras talladas sobre madera oscura.
function drawParkSign(g, w, h, lang) {
  g.fillStyle = '#5a3a22';
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < h; y += h / 4) g.fillRect(0, y, w, 4);
  g.strokeStyle = '#e9d9b4';
  g.lineWidth = 6;
  g.strokeRect(12, 12, w - 24, h - 24);
  g.fillStyle = '#f1e4c2';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const t = lang === 'es' ? 'PARQUE NACIONAL' : 'NATIONAL PARK';
  fitText(g, t, w - 70, h * 0.42);
  g.fillText(t, w / 2, h * 0.42);
  const sub = lang === 'es' ? 'Bienvenidos · área protegida' : 'Welcome · protected area';
  fitText(g, sub, w - 90, h * 0.2, 500);
  g.fillText(sub, w / 2, h * 0.74);
}

// Cartelito de la boletería.
function drawBooth(g, w, h, lang) {
  g.fillStyle = '#efe4c8';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#3d2a18';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const t = lang === 'es' ? 'BOLETERÍA' : 'TICKETS';
  fitText(g, t, w - 24, h * 0.62);
  g.fillText(t, w / 2, h / 2 + 2);
}

function drawPitch(g, w, h) {
  g.fillStyle = '#2f7d3a';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    g.fillRect((i * w) / 8, 0, w / 8, h);
  }
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 6;
  g.strokeRect(14, 14, w - 28, h - 28);
  g.beginPath();
  g.moveTo(w / 2, 14);
  g.lineTo(w / 2, h - 14);
  g.stroke();
  g.beginPath();
  g.arc(w / 2, h / 2, h * 0.16, 0, Math.PI * 2);
  g.stroke();
  g.strokeRect(14, h * 0.3, w * 0.1, h * 0.4);
  g.strokeRect(w - 14 - w * 0.1, h * 0.3, w * 0.1, h * 0.4);
}

// ---------- Geometría ----------
const unitBox = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
const unitCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 10).toNonIndexed();
const unitCone = new THREE.ConeGeometry(0.5, 1, 10).toNonIndexed();
const hipRoof = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).toNonIndexed();
const gableRoof = (() => {
  // prisma triangular de 1 × 1 × 1, cumbrera a lo largo de z
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 3).rotateX(Math.PI / 2).rotateZ(Math.PI);
  // centrado y de alto 1, como el techo a cuatro aguas
  g.translate(0, -0.125, 0).scale(1.16, 1 / 0.75, 1);
  return g.toNonIndexed();
})();
for (const g of [unitBox, unitCyl, unitCone, hipRoof, gableRoof]) g.deleteAttribute('uv');

export function buildPlaces({ projects, sites, stops, curve, roadDist, height, water, roadHalf, lang, quality }) {
  const root = new THREE.Group();
  const solids = [];
  const glows = [];
  const textMeshes = [];
  const blinkers = [];
  const textures = [];

  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler();
  const color = new THREE.Color();
  function bake(list, geo, col, pos, rotY, scale) {
    tmpE.set(0, rotY, 0);
    tmpQ.setFromEuler(tmpE);
    tmpM.compose(pos, tmpQ, scale);
    const g = geo.clone().applyMatrix4(tmpM);
    color.set(col);
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set([color.r, color.g, color.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    list.push(g);
  }

  // Ordenar por fecha y medir el kilómetro de cada lugar sobre la ruta.
  const L = curve.getLength();
  const n = curve.points.length;
  const DIV = 200;
  const lengths = curve.getLengths(n * DIV);
  const byId = new Map(projects.map((p) => [p.id, p]));
  const order = [...projects].filter((p) => p.since).sort((a, b) => a.since.localeCompare(b.since));
  const startLen = lengths[order.length ? stops[sites.findIndex((s) => s.id === order[0].id)] * DIV : 0] ?? 0;

  const signs = []; // carteles que cambian con el idioma

  // stops[k] = índice del punto de control de la ruta que corresponde al lugar k
  sites.forEach((site, k) => {
    const i = stops[k];
    const p = byId.get(site.id);
    if (!p) return;
    const len = lengths[i * DIV];
    const km = ((((len - startLen) % L) + L) % L) * 0.1; // 1 unidad = 100 m
    const t = len / L;
    const origin = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).setY(0).normalize();
    const side = new THREE.Vector3(-tan.z, 0, tan.x); // derecha según el sentido de la ruta
    const rot = Math.atan2(tan.x, tan.z); // el eje z local queda a lo largo de la ruta
    const rnd = rng(i * 7919 + 13);

    // posición en coordenadas de la ruta: u a lo largo, v hacia la derecha
    const at = (u, v, base = origin, tt = tan, ss = side) => new THREE.Vector3(base.x + tt.x * u + ss.x * v, 0, base.z + tt.z * u + ss.z * v);
    const groundAt = (x, z) => height(x, z);

    // Volumen apoyado en el terreno: se hunde hasta el punto más bajo de su planta.
    function block(list, geo, col, u, v, w, h, d, { y = 0, rotExtra = 0, sit = true } = {}) {
      const c = at(u, v);
      let lo = groundAt(c.x, c.z);
      let hi = lo;
      if (sit) {
        for (const [du, dv] of [[-d / 2, -w / 2], [d / 2, -w / 2], [-d / 2, w / 2], [d / 2, w / 2]]) {
          const q = at(u + du, v + dv);
          const gh = groundAt(q.x, q.z);
          lo = Math.min(lo, gh);
          hi = Math.max(hi, gh);
        }
      }
      const bottom = lo - 0.12 + y;
      const top = hi + y + h;
      c.y = (bottom + top) / 2;
      bake(list, geo, col, c, rot + rotExtra, new THREE.Vector3(w, top - bottom, d));
      return { top, c };
    }
    // Pieza a una altura fija sobre el suelo del lugar (techos, carteles).
    function piece(list, geo, col, u, v, y, w, h, d, rotExtra = 0, groundY = null) {
      const c = at(u, v);
      c.y = (groundY ?? groundAt(c.x, c.z)) + y;
      bake(list, geo, col, c, rot + rotExtra, new THREE.Vector3(w, h, d));
    }
    // Plano con texto, mirando hacia el normal dado (en el plano xz).
    function textPlane(tex, pos, normal, w, h, twoSided = true, off = 0.012) {
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.FrontSide });
      const mk = (nx, nz, off) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        m.position.set(pos.x + nx * off, pos.y, pos.z + nz * off);
        m.rotation.y = Math.atan2(nx, nz);
        root.add(m);
        textMeshes.push(m);
      };
      mk(normal.x, normal.z, off);
      if (twoSided) mk(-normal.x, -normal.z, off);
    }
    const buildable = (u, v) => {
      const c = at(u, v);
      return groundAt(c.x, c.z) > water + 0.15;
    };
    // ¿una planta de w × d en (u, v) queda lejos de la ruta real? La ruta curva: no alcanza con
    // mirar la distancia a la tangente del lugar.
    const clearOfRoad = (u, v, w, d, gap = 0.3) => {
      for (const [du, dv] of [[0, 0], [-d / 2, -w / 2], [d / 2, -w / 2], [-d / 2, w / 2], [d / 2, w / 2]]) {
        const q = at(u + du, v + dv);
        if (roadDist(q.x, q.z) < roadHalf + gap) return false;
      }
      return true;
    };

    // ---------- Cartel verde de entrada, antes de llegar ----------
    {
      const back = (len - 4.4 + L) % L;
      const sp = curve.getPointAt(back / L);
      const st = curve.getTangentAt(back / L).setY(0).normalize();
      const ss = new THREE.Vector3(-st.z, 0, st.x);
      const off = roadHalf + 1.35;
      const base = new THREE.Vector3(sp.x + ss.x * off, 0, sp.z + ss.z * off);
      const gy = groundAt(base.x, base.z);
      const W = 2.1;
      const H = 0.74;
      const y0 = 0.62;
      const rotS = Math.atan2(st.x, st.z);
      // el cartel mira al tránsito, así que su ancho corre a lo largo de "side": los postes se separan sobre ese eje
      for (const k of [-0.7, 0.7]) {
        const pp = new THREE.Vector3(base.x + ss.x * k, 0, base.z + ss.z * k);
        const g0 = groundAt(pp.x, pp.z);
        pp.y = g0 - 0.1 + (y0 + H + 0.1) / 2;
        bake(solids, unitCyl, '#8d9196', pp, 0, new THREE.Vector3(0.07, y0 + H + 0.1, 0.07));
      }
      // tablero: el reverso gris, el frente con el cartel
      const bp = new THREE.Vector3(base.x, gy + y0 + H / 2, base.z);
      bake(solids, unitBox, '#5d6268', bp, rotS, new THREE.Vector3(W + 0.06, H + 0.06, 0.04));
      const tex = canvasTexture(1024, 360, drawEntrySign);
      textures.push(tex);
      signs.push(() => tex.userData.redraw(p, lang));
      textPlane(tex, bp, new THREE.Vector3(-st.x, 0, -st.z), W, H, true, 0.032);
    }

    // ---------- Mojón en el lugar ----------
    {
      const v = -(roadHalf + 0.5);
      const c = at(0.6, v);
      const gy = groundAt(c.x, c.z);
      c.y = gy + 0.16;
      bake(solids, unitBox, '#ecebe6', c, rot, new THREE.Vector3(0.2, 0.44, 0.1));
      const tex = canvasTexture(160, 256, drawMojon);
      textures.push(tex);
      signs.push(() => tex.userData.redraw(km, lang));
      // una cara mira a la calzada y la otra al campo
      textPlane(tex, new THREE.Vector3(c.x + side.x * 0.1, gy + 0.2, c.z + side.z * 0.1), side.clone(), 0.18, 0.3, false);
      textPlane(tex, new THREE.Vector3(c.x - side.x * 0.1, gy + 0.2, c.z - side.z * 0.1), side.clone().negate(), 0.18, 0.3, false);
    }

    const walls = ['#ddd2bf', '#cdbfa6', '#e6ddcd', '#c9b79a', '#d8cdb9'];
    const roofs = ['#9a4b33', '#874231', '#6d7378', '#a55a3a'];

    const kind = p.lugar || ['localidad', 'estacion', 'paraje'][p.orbit];
    // Una planta apoyada en el suelo, en tramos: un camino largo de un solo bloque sobre una
    // ladera se volvería un muro.
    const flat = (col, u0, u1, v0, v1, step = 0.7) => {
      const nu = Math.max(1, Math.ceil((u1 - u0) / step));
      const nv = Math.max(1, Math.ceil((v1 - v0) / step));
      const du = (u1 - u0) / nu;
      const dv = (v1 - v0) / nv;
      for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) block(solids, unitBox, col, u0 + du * (a + 0.5), v0 + dv * (b + 0.5), dv + 0.02, 0.03, du + 0.02);
    };
    const tree = (u, v, s = 1) => {
      if (!buildable(u, v) || !clearOfRoad(u, v, 0.5 * s, 0.5 * s, 0.2)) return;
      const c = at(u, v);
      const gy = groundAt(c.x, c.z);
      piece(solids, unitCyl, '#5b4130', u, v, 0.15 * s, 0.07 * s, 0.34 * s, 0.07 * s, 0, gy);
      piece(solids, unitCone, rnd() < 0.5 ? '#2f6b3a' : '#3c7d45', u, v, 0.62 * s, 0.5 * s, 0.75 * s, 0.5 * s, 0, gy);
      piece(solids, unitCone, '#4a8c4f', u, v, 0.98 * s, 0.34 * s, 0.5 * s, 0.34 * s, 0, gy);
    };

    // galpón con techo de chapa y dos portones hacia la ruta
    const galpon = (u, v, d, w, h) => {
      if (!buildable(u, v)) return;
      const { top, c: gc } = block(solids, unitBox, '#c9c8c2', u, v, w, h, d);
      bake(solids, gableRoof, '#a3a8ae', new THREE.Vector3(gc.x, top + 0.09, gc.z), rot, new THREE.Vector3(w * 1.05, 0.18, d * 1.02));
      const gy = groundAt(gc.x, gc.z);
      // portones hacia el patio
      for (let k = -1; k <= 1; k += 2) piece(solids, unitBox, '#6e747b', u + k * d * 0.25, v - w / 2 - 0.005, h * 0.4, 0.01, h * 0.7, d * 0.18, 0, gy);
    };
    // máquinas viales: coordenadas propias (l hacia adelante, s al costado) y un ángulo
    const AMARILLO = '#f2b705';
    const maquina = (tipo, cu, cv2, a) => {
      if (!buildable(cu, cv2) || !clearOfRoad(cu, cv2, 0.6, 0.6, 0.15)) return;
      const q0 = at(cu, cv2);
      const gq = groundAt(q0.x, q0.z);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const mp = (list, geo, col, l, sd, y, w, h, d) => piece(list, geo, col, cu + l * ca - sd * sa, cv2 + l * sa + sd * ca, y, w, h, d, -a, gq);
      const rueda = (l, sd, r = 0.07) => mp(solids, unitBox, '#1b1b1b', l, sd, r, 0.05, r * 2, r * 2);
      if (tipo === 'motoniveladora') {
        mp(solids, unitBox, AMARILLO, 0.08, 0, 0.17, 0.08, 0.06, 0.62); // bastidor
        mp(solids, unitBox, AMARILLO, -0.2, 0, 0.17, 0.2, 0.15, 0.24); // motor
        mp(solids, unitBox, AMARILLO, -0.02, 0, 0.3, 0.17, 0.16, 0.16); // cabina
        mp(glows, unitBox, '#9fd3ff', 0.065, 0, 0.32, 0.14, 0.08, 0.01);
        mp(solids, unitBox, '#3d4146', 0.12, 0, 0.07, 0.36, 0.06, 0.025); // cuchilla
        for (const l of [-0.26, -0.12]) for (const sd of [-0.1, 0.1]) rueda(l, sd);
        for (const sd of [-0.09, 0.09]) rueda(0.36, sd);
      } else if (tipo === 'retro') {
        mp(solids, unitBox, AMARILLO, 0, 0, 0.14, 0.2, 0.12, 0.36);
        mp(solids, unitBox, AMARILLO, -0.05, 0, 0.28, 0.16, 0.17, 0.14);
        mp(glows, unitBox, '#9fd3ff', 0.025, 0, 0.3, 0.12, 0.08, 0.01);
        mp(solids, unitBox, '#3d4146', 0.24, 0, 0.08, 0.26, 0.07, 0.06); // pala frontal
        mp(solids, unitBox, AMARILLO, -0.27, 0, 0.27, 0.035, 0.035, 0.22); // brazo
        mp(solids, unitBox, AMARILLO, -0.39, 0, 0.16, 0.035, 0.2, 0.035);
        mp(solids, unitBox, '#3d4146', -0.4, 0, 0.05, 0.08, 0.06, 0.08);
        for (const l of [-0.11, 0.11]) for (const sd of [-0.11, 0.11]) rueda(l, sd, l < 0 ? 0.08 : 0.06);
      } else if (tipo === 'volcador') {
        mp(solids, unitBox, '#d9d9d6', 0.24, 0, 0.18, 0.2, 0.17, 0.16); // cabina
        mp(glows, unitBox, '#9fd3ff', 0.325, 0, 0.21, 0.16, 0.06, 0.01);
        mp(solids, unitBox, '#c0392b', -0.1, 0, 0.2, 0.22, 0.15, 0.48); // caja
        mp(solids, unitBox, '#2b2b2b', 0.05, 0, 0.09, 0.16, 0.04, 0.6);
        for (const l of [0.24, -0.08, -0.22]) for (const sd of [-0.1, 0.1]) rueda(l, sd, 0.06);
      } else if (tipo === 'rodillo') {
        mp(solids, unitBox, AMARILLO, -0.08, 0, 0.13, 0.16, 0.12, 0.26);
        mp(solids, unitBox, AMARILLO, -0.1, 0, 0.27, 0.13, 0.14, 0.12);
        mp(solids, unitCyl.clone().rotateZ(Math.PI / 2), '#7b8087', 0.17, 0, 0.08, 0.22, 0.16, 0.16); // rolo
        for (const sd of [-0.09, 0.09]) rueda(-0.12, sd, 0.07);
      }
    };

    if (kind === 'localidad' || kind === 'vialidad') {
      // ---------- Localidad ----------
      // En 'vialidad' va sólo el predio (más abajo): sin casas ni tanque de agua.
      const predio = kind === 'vialidad';
      const size = predio ? 0 : site.h >= 12.5 ? 16 : 11;
      let placed = 0;
      const slots = [];
      for (const row of [1.55, 2.75]) for (let u = -3.6; u <= 3.6; u += 1.05) for (const s of [-1, 1]) slots.push([u + (rnd() - 0.5) * 0.25, s * (row + rnd() * 0.25)]);
      slots.sort(() => rnd() - 0.5);
      for (const [u, v] of slots) {
        if (placed >= size) break;
        if (Math.abs(u) < 0.9 && v < 0 && Math.abs(v) < 2.2) continue; // lugar del mojón
        if (Math.abs(u) < 0.6 && v > 0 && v < 2.2) continue; // el haz del marcador
        if (predio && v > 0) continue;
        if (!buildable(u, v)) continue;
        const w = 0.55 + rnd() * 0.25;
        const d = 0.5 + rnd() * 0.35;
        if (!clearOfRoad(u, v, w * 1.15, d * 1.15)) continue;
        const h = 0.36 + rnd() * 0.16;
        const { top, c } = block(solids, unitBox, walls[Math.floor(rnd() * walls.length)], u, v, w, h, d);
        // techo a cuatro aguas o a dos aguas
        const roofCol = roofs[Math.floor(rnd() * roofs.length)];
        const rh = 0.2 + rnd() * 0.1;
        const rp = new THREE.Vector3(c.x, top + rh / 2, c.z);
        bake(solids, rnd() < 0.5 ? hipRoof : gableRoof, roofCol, rp, rot, new THREE.Vector3(w * 1.12, rh, d * 1.12));
        // ventanas encendidas del lado de la ruta
        const face = -Math.sign(v) * (w / 2 + 0.006);
        for (const du of [-d * 0.22, d * 0.22]) {
          if (rnd() < 0.25) continue;
          const wp = at(u + du, v + face);
          wp.y = top - h * 0.48;
          bake(glows, unitBox, rnd() < 0.8 ? '#ffd28a' : '#cfe3ff', wp, rot, new THREE.Vector3(0.02, 0.11, 0.1));
        }
        placed++;
      }
      // tanque de agua elevado
      const freeSpot = (cands, size) => cands.find(([u, v]) => clearOfRoad(u, v, size, size, 0.5) && buildable(u, v)) || cands[0];
      if (!predio) {
        const [u, v] = freeSpot([[2.2, -3.7], [-2.6, -3.9], [3.2, 3.9], [-3.6, 2.8]], 0.8);
        const c = at(u, v);
        const gy = groundAt(c.x, c.z);
        for (const [a, b] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
          const q = at(u + a, v + b);
          q.y = gy - 0.1 + 0.8;
          bake(solids, unitBox, '#9aa0a6', q, rot, new THREE.Vector3(0.05, 1.6, 0.05));
        }
        piece(solids, unitCyl, '#c9cdd2', u, v, 1.72, 0.66, 0.42, 0.66, 0, gy);
        piece(solids, unitCone, '#9aa0a6', u, v, 2.02, 0.7, 0.18, 0.7, 0, gy);
      }
      // antena con baliza roja
      {
        const [u, v] = freeSpot(predio ? [[-4.4, 2.6], [-3.4, -3.6], [0.8, -4.2]] : [[-2.4, 3.9], [2.6, 4.1], [-3.4, -3.6], [0, 4.4]], 0.5);
        const c = at(u, v);
        const gy = groundAt(c.x, c.z);
        piece(solids, unitCyl, '#b8bcc2', u, v, 1.4, 0.06, 2.8, 0.06, 0, gy);
        piece(solids, unitCyl, '#b8bcc2', u, v, 0.15, 0.4, 0.3, 0.4, 0, gy);
        blinkers.push({ pos: new THREE.Vector3(c.x, gy + 2.85, c.z), color: '#ff3b30', phase: i * 0.7, size: 0.9 });
      }
      if (predio) {
        // ---------- El predio de Vialidad: edificio de cuatro pisos con parasoles, playa de
        // estacionamiento, galpones y el patio con las máquinas viales ----------
        let vb = roadHalf + 1.7; // frente del edificio
        while (vb < roadHalf + 4 && !clearOfRoad(-0.2, vb + 0.5, 1.1, 3.0, 0.3)) vb += 0.3;
        flat('#55585e', -1.9, 1.7, roadHalf + 0.3, vb - 0.4);
        // autos en la playa
        const autos = ['#d9d9d9', '#2f6fa8', '#8c1d18', '#1f1f1f', '#e8e8e8', '#5b6b52'];
        for (let k = 0; k < 6; k++) {
          const u = -1.55 + k * 0.5;
          const v = roadHalf + 0.75 + (k % 2) * 0.06;
          if (!clearOfRoad(u, v, 0.4, 0.24, 0.05)) continue;
          const q = at(u, v);
          const gq = groundAt(q.x, q.z);
          piece(solids, unitBox, autos[k], u, v, 0.08, 0.4, 0.1, 0.22, 0, gq);
          piece(solids, unitBox, autos[k], u, v + 0.02, 0.16, 0.24, 0.07, 0.2, 0, gq);
        }
        // cantero bajo naranja con pasto, delante del edificio
        {
          const q = at(-0.2, vb - 0.22);
          const gq = groundAt(q.x, q.z);
          piece(solids, unitBox, '#d48a4c', -0.2, vb - 0.22, 0.07, 0.2, 0.14, 2.6, 0, gq);
          piece(solids, unitBox, '#5f9a3e', -0.2, vb - 0.22, 0.145, 0.17, 0.02, 2.56, 0, gq);
        }
        // el edificio
        const U = -0.2;
        const D = 2.9; // largo, a lo largo de la ruta
        const W = 1.0; // fondo
        const PB = 0.3; // planta baja
        const PISO = 0.27;
        const PISOS = 4;
        const cv = vb + W / 2;
        const top0 = PB + PISO * PISOS;
        const { c } = block(solids, unitBox, '#dc9f6c', U, cv, W, top0, D);
        const gb = groundAt(c.x, c.z);
        // planta baja vidriada, un poco hacia adentro
        piece(solids, unitBox, '#2c2f33', U, cv - 0.04, PB / 2, W, PB, D - 0.02, 0, gb);
        piece(glows, unitBox, '#ffe2b0', U - 0.7, vb + 0.035, 0.12, 0.01, 0.18, 0.5, 0, gb);
        piece(glows, unitBox, '#cfe3ff', U + 0.6, vb + 0.035, 0.12, 0.01, 0.16, 0.9, 0, gb);
        // remate marrón arriba
        piece(solids, unitBox, '#8a6448', U, cv, top0 + 0.08, W + 0.04, 0.16, D + 0.04, 0, gb);
        piece(solids, unitBox, '#9da3a8', U, cv, top0 + 0.17, W - 0.1, 0.02, D - 0.1, 0, gb);
        // fachada: ventanas por piso, parasoles horizontales blancos y aletas verticales
        const caras = [
          { n: -1, largo: D, at: (t) => [U + t, vb] }, // frente, hacia la ruta
          { n: 0, largo: W, at: (t) => [U - D / 2, cv + t] }, // cabeceras
          { n: 0, largo: W, at: (t) => [U + D / 2, cv + t] },
        ];
        for (const cara of caras) {
          const frente = cara.n === -1;
          const bays = Math.round(cara.largo / 0.19);
          const paso = cara.largo / bays;
          // cada pieza sobresale hacia afuera de la cara: el frente hacia la ruta (−v), las cabeceras hacia ±u
          const out = (t, o) => {
            const [u, v] = cara.at(t);
            if (frente) return [u, v - o];
            return [u + Math.sign(u - U) * o, v];
          };
          const dims = (a, b, c2) => (frente ? [a, b, c2] : [c2, b, a]); // [espesor, alto, largo]
          for (let f = 0; f < PISOS; f++) {
            const y0 = PB + f * PISO;
            for (let b = 0; b < bays; b++) {
              const t = -cara.largo / 2 + paso * (b + 0.5);
              const [u, v] = out(t, 0.006);
              const lit = rnd() < 0.42;
              const [ww, hh, dd] = dims(0.01, 0.1, paso * 0.8);
              piece(lit ? glows : solids, unitBox, lit ? '#ffdc9c' : '#262a30', u, v, y0 + 0.17, ww, hh, dd, 0, gb);
            }
            // parasol: dos listones blancos sobre la ventana
            for (const dy of [0.235, 0.265]) {
              const [u, v] = out(0, 0.035);
              const [ww, hh, dd] = dims(0.07, 0.016, cara.largo + 0.02);
              piece(solids, unitBox, '#eef0f1', u, v, y0 + dy, ww, hh, dd, 0, gb);
            }
          }
          for (let b = 0; b <= bays; b++) {
            const t = -cara.largo / 2 + paso * b;
            const [u, v] = out(t, 0.04);
            const [ww, hh, dd] = dims(0.08, PISO * PISOS, 0.018);
            piece(solids, unitBox, '#f3f4f5', u, v, PB + (PISO * PISOS) / 2, ww, hh, dd, 0, gb);
          }
        }
        // galpón largo detrás del edificio; el galpón grande y las máquinas son de Equipos Viales
        galpon(U - 0.3, vb + 2.05, 2.2, 0.8, 0.42);
        // árboles del predio
        for (const [u, v] of [[-2.4, vb + 0.4], [-2.5, vb + 1.6], [-1.9, vb + 2.9], [1.1, vb + 3.0]]) tree(u, v, 0.9 + rnd() * 0.4);
      }
    } else if (kind === 'galpon') {
      // ---------- Equipos Viales: el galpón grande del predio de Vialidad, con el patio de las máquinas ----------
      let vg = roadHalf + 1.6; // borde del patio más lejos de la ruta
      while (vg < roadHalf + 4 && !clearOfRoad(0, roadHalf + 1.2, 1.2, 3.6, 0.2)) vg += 0.3;
      flat('#6f6553', -2.0, 2.0, roadHalf + 0.5, vg + 0.9);
      galpon(0, vg + 1.65, 3.4, 1.4, 0.6);
      // el nombre sobre los portones
      {
        const q = at(0, vg + 0.94);
        const gq = groundAt(q.x, q.z);
        piece(solids, unitBox, '#2b2f36', 0, vg + 0.945, 0.68, 0.02, 0.17, 1.5, 0, gq);
        const tex = canvasTexture(768, 96, drawBrand);
        textures.push(tex);
        tex.userData.redraw(p);
        textPlane(tex, new THREE.Vector3(q.x, gq + 0.68, q.z), side.clone().negate(), 1.44, 0.18, false);
      }
      maquina('motoniveladora', -1.4, roadHalf + 1.05, 0.15);
      maquina('motoniveladora', -0.5, roadHalf + 1.0, 0.1);
      maquina('retro', 1.4, roadHalf + 1.1, -0.3);
      maquina('volcador', -1.25, vg + 0.35, 0);
      maquina('volcador', -0.35, vg + 0.4, 0.05);
      maquina('rodillo', 0.75, vg + 0.3, 1.4);
      maquina('motoniveladora', 1.6, vg + 0.4, Math.PI / 2);
      for (const [u, v] of [[2.6, vg + 0.6], [2.5, vg + 2.4], [-2.6, vg + 2.2], [2.6, roadHalf + 1.0]]) tree(u, v, 0.9 + rnd() * 0.4);
    } else if (kind === 'estacion') {
      // ---------- Estación de servicio ----------
      let v0 = roadHalf + 1.25;
      while (v0 < roadHalf + 4 && !clearOfRoad(0, v0 + 0.5, 2.6, 2.4, 0.35)) v0 += 0.4;
      const c0 = at(0, v0);
      const gy = groundAt(c0.x, c0.z);
      // playa de hormigón
      block(solids, unitBox, '#5f6268', 0, v0 + 0.35, 2.3, 0.04, 2.6);
      const CH = 0.82;
      for (const [a, b] of [[-0.85, -0.45], [0.85, -0.45], [-0.85, 0.45], [0.85, 0.45]]) piece(solids, unitBox, '#d9dce0', a, v0 + b, CH / 2, 0.07, CH, 0.07, 0, gy);
      piece(solids, unitBox, '#eef0f2', 0, v0, CH + 0.05, 1.25, 0.06, 2.1, 0, gy);
      piece(solids, unitBox, p.color, 0, v0, CH, 1.3, 0.1, 2.15, 0, gy); // franja con el color del proyecto
      piece(glows, unitBox, '#fff4dc', 0, v0, CH - 0.06, 1.1, 0.01, 1.9, 0, gy); // luz bajo el techo
      // surtidores: uno por tecnología (hasta cuatro), con la etiqueta chica mirando a la ruta
      const techs = p.stack.slice(0, 4);
      techs.forEach((tech, k) => {
        const u = (k - (techs.length - 1) / 2) * 0.48;
        piece(solids, unitBox, '#d7dade', u, v0, 0.04, 0.24, 0.08, 0.36, 0, gy);
        piece(solids, unitBox, '#e8eaed', u, v0, 0.22, 0.18, 0.34, 0.24, 0, gy);
        piece(solids, unitBox, p.color, u, v0, 0.42, 0.19, 0.05, 0.25, 0, gy);
        const tex = canvasTexture(256, 72, drawPump);
        textures.push(tex);
        tex.userData.redraw(tech);
        const fp = at(u, v0 - 0.092);
        fp.y = gy + 0.27;
        textPlane(tex, fp, side.clone().negate(), 0.22, 0.062, false);
        const bp = at(u, v0 + 0.092);
        bp.y = gy + 0.27;
        textPlane(tex, bp, side.clone(), 0.22, 0.062, false);
      });
      // minimercado
      const sv = v0 + 1.25;
      const { top } = block(solids, unitBox, '#e4e1da', 0.2, sv, 0.75, 0.48, 1.5);
      piece(solids, unitBox, '#3b3f46', 0.2, sv, top - gy + 0.03, 0.8, 0.06, 1.55, 0, gy);
      piece(glows, unitBox, '#bfe3ff', 0.2, sv - 0.38, 0.26, 0.01, 0.26, 1.1, 0, gy);
      // tótem con el nombre, antes de entrar
      {
        const u = -1.55;
        let v = roadHalf + 0.6;
        while (v < roadHalf + 2.5 && !clearOfRoad(u, v, 0.7, 0.2, 0.15)) v += 0.25;
        const c = at(u, v);
        const g0 = groundAt(c.x, c.z);
        piece(solids, unitBox, '#4a4f57', u, v, 0.55, 0.08, 1.1, 0.08, 0, g0);
        piece(solids, unitBox, '#2b2f36', u, v, 1.6, 0.66, 1.1, 0.08, 0, g0);
        const tex = canvasTexture(320, 520, drawTotem);
        textures.push(tex);
        tex.userData.redraw(p);
        textPlane(tex, new THREE.Vector3(c.x, g0 + 1.6, c.z), tan.clone().negate(), 0.62, 1.04, true, 0.052);
      }
    } else if (kind === 'cafe') {
      // ---------- Parador de ruta, con la fachada del Trópico de verdad: frente crema, toldo
      // terracota con la marca, dos ventanales en arco, sillas naranjas y canteros con plantas ----------
      let sv = roadHalf + 2.0; // frente del local
      while (sv < roadHalf + 4.8 && !clearOfRoad(0, sv + 0.45, 1.0, 2.6, 0.3)) sv += 0.3;
      // playón de ripio junto a la ruta y la vereda de baldosas frente al local
      flat('#7d725f', -2.1, 2.1, roadHalf + 0.25, sv - 0.8);
      flat('#c9b79c', -1.5, 1.5, sv - 0.8, sv + 0.02, 0.5);
      // el local, de dos plantas y techo plano
      const { top, c } = block(solids, unitBox, '#f3e8d2', 0, sv + 0.45, 0.9, 0.95, 2.3);
      const gy = groundAt(c.x, c.z);
      piece(solids, unitBox, '#ddd0b5', 0, sv + 0.45, top - gy + 0.02, 0.94, 0.05, 2.34, 0, gy);
      const H = top - gy; // alto del frente sobre el suelo del medio
      // persianas de la planta alta
      for (const u of [-0.7, 0, 0.7]) {
        piece(solids, unitBox, '#8d7c66', u, sv - 0.01, H - 0.26, 0.03, 0.24, 0.3, 0, gy);
        piece(solids, unitBox, '#c9b79a', u, sv - 0.025, H - 0.4, 0.05, 0.025, 0.36, 0, gy);
      }
      // toldo terracota con la marca
      piece(solids, unitBox, TERRACOTA, 0, sv - 0.1, 0.56, 0.2, 0.16, 2.3, 0, gy);
      piece(solids, unitBox, '#9e3416', 0, sv - 0.19, 0.47, 0.03, 0.03, 2.3, 0, gy);
      {
        const fp = at(0, sv - 0.205);
        fp.y = gy + 0.56;
        const tex = canvasTexture(1024, 160, (g, w, h, p) => drawTropico(g, w, h, p, lang));
        textures.push(tex);
        tex.userData.redraw(p);
        textPlane(tex, fp, side.clone().negate(), 2.28, 0.156, false, 0.002);
      }
      // dos ventanales en arco y la puerta, con marco terracota y la luz de adentro
      const arch = unitCyl.clone().rotateZ(Math.PI / 2); // disco que mira a la calle
      for (const u of [-0.62, 0.62]) {
        // debajo del toldo: el arco tiene que terminar antes que él
        piece(solids, unitBox, '#b04a22', u, sv - 0.012, 0.13, 0.02, 0.24, 0.46, 0, gy);
        piece(solids, arch, '#b04a22', u, sv - 0.012, 0.25, 0.02, 0.46, 0.46, 0, gy);
        piece(glows, unitBox, '#ffe7c4', u, sv - 0.024, 0.13, 0.01, 0.22, 0.38, 0, gy);
        piece(glows, arch, '#ffe7c4', u, sv - 0.024, 0.25, 0.01, 0.38, 0.38, 0, gy);
        piece(solids, unitBox, '#b04a22', u, sv - 0.03, 0.2, 0.01, 0.38, 0.022, 0, gy); // parante
        piece(solids, unitBox, '#b04a22', u, sv - 0.03, 0.25, 0.01, 0.022, 0.38, 0, gy); // travesaño
      }
      piece(solids, unitBox, '#9e3416', 0, sv - 0.012, 0.21, 0.02, 0.42, 0.26, 0, gy);
      piece(glows, unitBox, '#ffe7c4', 0, sv - 0.024, 0.18, 0.01, 0.34, 0.18, 0, gy);
      // mesas negras con sillas naranjas en la vereda
      for (const [u, v] of [[-0.95, sv - 0.32], [-0.35, sv - 0.55], [0.35, sv - 0.55], [0.95, sv - 0.32]]) {
        piece(solids, unitCyl, '#1d1d1d', u, v, 0.005, 0.12, 0.01, 0.12, 0, gy);
        piece(solids, unitCyl, '#2a2a2a', u, v, 0.06, 0.015, 0.12, 0.015, 0, gy);
        piece(solids, unitCyl, '#c9531f', u, v, 0.12, 0.17, 0.015, 0.17, 0, gy);
        for (const du of [-0.14, 0.14]) {
          piece(solids, unitBox, '#d65a22', u + du, v, 0.07, 0.08, 0.015, 0.08, 0, gy);
          piece(solids, unitBox, '#d65a22', u + du * 1.3, v, 0.12, 0.08, 0.1, 0.012, 0, gy);
        }
      }
      // canteros naranjas con plantas tropicales a los costados
      for (const s of [-1, 1]) {
        const u = s * 1.38;
        const v = sv - 0.35;
        if (!buildable(u, v)) continue;
        const q = at(u, v);
        const qy = groundAt(q.x, q.z);
        piece(solids, unitBox, '#d2541f', u, v, 0.09, 0.55, 0.18, 0.32, 0, qy);
        for (let k = 0; k < 6; k++) {
          const a = k * 1.05 + rnd();
          const du = Math.cos(a) * 0.1;
          const dv = Math.sin(a) * 0.17;
          const hh = 0.22 + rnd() * 0.16;
          piece(solids, unitCone, k % 2 ? '#3f8f3a' : '#57a843', u + du, v + dv, 0.18 + hh / 2, 0.12, hh, 0.12, a, qy);
        }
      }
      // un camión y un auto en el playón
      {
        const tv = roadHalf + 0.75;
        if (clearOfRoad(-1.15, tv, 0.36, 1.5, 0.05)) {
          const g0 = groundAt(at(-1.15, tv).x, at(-1.15, tv).z);
          piece(solids, unitBox, '#e9ecef', -1.25, tv, 0.25, 0.3, 0.34, 1.05, 0, g0);
          piece(solids, unitBox, '#c0392b', -0.5, tv, 0.18, 0.3, 0.24, 0.3, 0, g0);
          piece(glows, unitBox, '#9fd3ff', -0.35, tv, 0.24, 0.26, 0.07, 0.01, 0, g0);
          for (const u of [-1.55, -1.0, -0.5]) piece(solids, unitBox, '#1c1c1c', u, tv, 0.06, 0.34, 0.12, 0.13, 0, g0);
        }
        if (clearOfRoad(1.2, tv, 0.3, 0.5, 0.05)) {
          const g0 = groundAt(at(1.2, tv).x, at(1.2, tv).z);
          piece(solids, unitBox, '#2f6fa8', 1.2, tv, 0.08, 0.24, 0.1, 0.46, 0, g0);
          piece(solids, unitBox, '#2a5d8b', 1.18, tv, 0.17, 0.2, 0.08, 0.26, 0, g0);
        }
      }
      // cartel alto con la marca, en el borde de la ruta
      {
        const u = -2.45;
        let v = roadHalf + 0.55;
        while (v < roadHalf + 2.5 && !clearOfRoad(u, v, 0.2, 0.2, 0.1)) v += 0.25;
        const q = at(u, v);
        const g0 = groundAt(q.x, q.z);
        piece(solids, unitCyl, '#555a61', u, v, 0.9, 0.08, 1.8, 0.08, 0, g0);
        piece(solids, unitBox, '#7e2c12', u, v, 1.95, 1.04, 0.6, 0.06, 0, g0);
        const tex = canvasTexture(768, 432, drawCafeSign);
        textures.push(tex);
        signs.push(() => tex.userData.redraw(p, lang));
        textPlane(tex, new THREE.Vector3(q.x, g0 + 1.95, q.z), tan.clone().negate(), 0.98, 0.55, true, 0.035);
      }
    } else if (kind === 'parque') {
      // ---------- Parque nacional: pórtico, boletería con barrera, casa del guardaparque y camping ----------
      let v0 = roadHalf + 1.5; // pórtico
      while (v0 < roadHalf + 4 && !clearOfRoad(0, v0 + 2.2, 4.5, 4.4, 0.3)) v0 += 0.3;
      // camino de acceso de ripio
      flat('#8f7f5f', -0.38, 0.38, roadHalf + 0.15, v0 + 4.6);
      const g0 = (() => {
        const q = at(0, v0);
        return groundAt(q.x, q.z);
      })();
      // pórtico de troncos con el cartel
      for (const u of [-0.62, 0.62]) piece(solids, unitCyl, '#6b4a2e', u, v0, 0.66, 0.13, 1.42, 0.13, 0, g0);
      piece(solids, unitBox, '#5d3f26', 0, v0, 1.38, 0.14, 0.12, 1.7, 0, g0);
      piece(solids, unitBox, '#4a3220', 0, v0, 1.08, 0.06, 0.4, 1.12, 0, g0);
      {
        const q = at(0, v0);
        const tex = canvasTexture(768, 256, drawParkSign);
        textures.push(tex);
        signs.push(() => tex.userData.redraw(lang));
        textPlane(tex, new THREE.Vector3(q.x, g0 + 1.08, q.z), side.clone().negate(), 1.08, 0.36, true, 0.035);
      }
      // boletería a la derecha del acceso, con su barrera
      const bv = v0 + 1.0;
      {
        const { top, c } = block(solids, unitBox, '#9a6a42', 0.85, bv, 0.5, 0.42, 0.5);
        bake(solids, hipRoof, '#2f5d3a', new THREE.Vector3(c.x, top + 0.1, c.z), rot, new THREE.Vector3(0.66, 0.2, 0.66));
        const gy = groundAt(c.x, c.z);
        // ventanilla hacia el acceso
        piece(glows, unitBox, '#ffe0a8', 0.595, bv, 0.27, 0.22, 0.14, 0.01, 0, gy);
        const tex = canvasTexture(256, 72, drawBooth);
        textures.push(tex);
        signs.push(() => tex.userData.redraw(lang));
        const fp = at(0.85, bv - 0.26);
        fp.y = top - 0.06;
        textPlane(tex, fp, side.clone().negate(), 0.42, 0.12, false);
        // barrera roja y blanca cruzando el camino
        piece(solids, unitBox, '#d8d8d8', 0.55, bv - 0.3, 0.2, 0.06, 0.4, 0.06, 0, gy);
        for (let k = 0; k < 4; k++) piece(solids, unitBox, k % 2 ? '#f2f2f2' : '#d23a2a', 0.42 - k * 0.24 - 0.12, bv - 0.3, 0.36, 0.035, 0.035, 0.24, 0, gy);
      }
      // casa del guardaparque, con el mástil y la bandera
      {
        const u = -1.55;
        const v = v0 + 1.3;
        if (buildable(u, v) && clearOfRoad(u, v, 0.9, 1.1, 0.3)) {
          const { top, c } = block(solids, unitBox, '#a77b52', u, v, 0.8, 0.46, 1.05);
          bake(solids, gableRoof, '#2f5d3a', new THREE.Vector3(c.x, top + 0.13, c.z), rot, new THREE.Vector3(0.95, 0.26, 1.18));
          const gy = groundAt(c.x, c.z);
          piece(glows, unitBox, '#ffd28a', u - 0.2, v - 0.405, 0.25, 0.01, 0.12, 0.16, 0, gy);
          piece(glows, unitBox, '#ffd28a', u + 0.22, v - 0.405, 0.25, 0.01, 0.12, 0.16, 0, gy);
          const fu = u - 0.75;
          const fv = v - 0.15;
          piece(solids, unitCyl, '#d9dce0', fu, fv, 0.8, 0.03, 1.6, 0.03, 0, gy);
          const stripes = ['#74acdf', '#ffffff', '#74acdf'];
          stripes.forEach((col, k) => piece(solids, unitBox, col, fu + 0.18, fv, 1.5 - k * 0.075, 0.01, 0.075, 0.34, 0, gy));
          piece(solids, unitCyl, '#f6b40e', fu + 0.18, fv, 1.425, 0.03, 0.012, 0.03, 0, gy);
        }
      }
      // camping al fondo: carpas, mesas y el fogón
      const tents = ['#e8692e', '#3a7bd5', '#f2c230', '#5aa05a', '#d64545', '#8e5bd1'];
      let tk = 0;
      for (const [u, v] of [[-1.9, 3.2], [-1.1, 3.8], [1.2, 3.1], [1.9, 3.75], [-1.6, 4.6], [1.5, 4.55], [0.9, 5.2], [-0.8, 5.25]]) {
        const tv = v0 + v;
        if (!buildable(u, tv) || !clearOfRoad(u, tv, 0.6, 0.6, 0.3)) continue;
        const q = at(u, tv);
        const gy = groundAt(q.x, q.z);
        q.y = gy + 0.15;
        bake(solids, gableRoof, tents[tk++ % tents.length], q, rot + (rnd() - 0.5) * 1.2 + (tk % 2) * Math.PI / 2, new THREE.Vector3(0.44, 0.32, 0.6));
      }
      {
        const u = 0;
        const v = v0 + 4.0;
        const q = at(u, v);
        const gy = groundAt(q.x, q.z);
        piece(solids, unitCyl, '#6e6a64', u, v, 0.02, 0.32, 0.05, 0.32, 0, gy);
        piece(solids, unitBox, '#5b4130', u, v, 0.06, 0.04, 0.04, 0.24, 0.6, gy);
        piece(solids, unitBox, '#5b4130', u, v, 0.06, 0.04, 0.04, 0.24, -0.6, gy);
        blinkers.push({ pos: new THREE.Vector3(q.x, gy + 0.16, q.z), color: '#ff9a3c', phase: 0, size: 0.55, steady: true });
        for (const [a, b] of [[-0.7, 0.2], [0.65, -0.25]]) {
          piece(solids, unitBox, '#7a5434', u + a, v + b, 0.13, 0.22, 0.04, 0.42, 0, gy);
          piece(solids, unitBox, '#6a482c', u + a, v + b - 0.18, 0.07, 0.07, 0.03, 0.42, 0, gy);
          piece(solids, unitBox, '#6a482c', u + a, v + b + 0.18, 0.07, 0.07, 0.03, 0.42, 0, gy);
        }
      }
      // gente: acampando alrededor del fogón, entre las carpas y paseando por el sendero
      const PIEL = ['#e0b48a', '#c58c5f', '#8d5a3b', '#f0c9a0'];
      const ROPA = ['#d64545', '#3a7bd5', '#f2c230', '#2e9e6a', '#e8692e', '#8e5bd1', '#ececec'];
      const K = 1.5; // un poco más grandes que a escala, para que se vean desde arriba
      const persona = (u, v, { sentada = false, ropa, mochila = false, guarda = false } = {}) => {
        if (!buildable(u, v) || !clearOfRoad(u, v, 0.1, 0.1, 0.1)) return;
        const q = at(u, v);
        const gq = groundAt(q.x, q.z);
        const col = guarda ? '#6b6a3a' : ropa || ROPA[Math.floor(rnd() * ROPA.length)];
        const piel = PIEL[Math.floor(rnd() * PIEL.length)];
        const giro = rnd() * Math.PI * 2;
        const pz = (geo, c, du, dv, y, w, h, d) => piece(solids, geo, c, u + du, v + dv, y * K, w * K, h * K, d * K, giro, gq);
        if (sentada) {
          pz(unitBox, '#2f3a4a', 0, 0, 0.025, 0.045, 0.03, 0.06);
          pz(unitBox, col, 0, 0, 0.075, 0.05, 0.07, 0.04);
          pz(unitBox, piel, 0, 0, 0.135, 0.035, 0.04, 0.035);
        } else {
          pz(unitBox, guarda ? '#4e4d2a' : '#2f3a4a', 0, 0, 0.04, 0.04, 0.08, 0.03);
          pz(unitBox, col, 0, 0, 0.115, 0.05, 0.075, 0.035);
          pz(unitBox, piel, 0, 0, 0.175, 0.035, 0.04, 0.035);
          if (guarda) pz(unitCyl, '#8a6a3a', 0, 0, 0.2, 0.07, 0.012, 0.07); // sombrero
          // la mochila, detrás: el frente de la persona es (cos giro, −sin giro) en (u, v)
          if (mochila) pz(unitBox, '#5a4a3a', -Math.cos(giro) * 0.03 * K, Math.sin(giro) * 0.03 * K, 0.12, 0.04, 0.06, 0.03);
        }
      };
      // guardaparque en la boletería
      persona(0.5, v0 + 0.82, { guarda: true });
      // alrededor del fogón (en v0 + 4.0)
      for (const [du, dv] of [[-0.28, 0.05], [0.26, 0.12], [0.05, 0.3], [-0.12, -0.27], [0.2, -0.22]]) persona(du, v0 + 4.0 + dv, { sentada: true });
      persona(-1.45, v0 + 3.45);
      persona(1.55, v0 + 3.35);
      persona(1.1, v0 + 4.85);
      // sendero que sale del camping y se mete en el monte, con caminantes
      const sendero = [[0, 4.6], [-0.4, 5.4], [-1.1, 6.0], [-2.0, 6.5], [-3.0, 6.7], [-3.9, 6.4]];
      for (let k = 0; k < sendero.length - 1; k++) {
        const [u0, w0] = sendero[k];
        const [u1, w1] = sendero[k + 1];
        const n = 4;
        for (let j = 0; j < n; j++) {
          const t = (j + 0.5) / n;
          const u = u0 + (u1 - u0) * t;
          const v = v0 + w0 + (w1 - w0) * t;
          if (!buildable(u, v)) continue;
          const q = at(u, v);
          piece(solids, unitBox, '#9a8761', u, v, 0.004, 0.16, 0.012, 0.3, Math.atan2(w1 - w0, u1 - u0), groundAt(q.x, q.z));
        }
      }
      persona(-0.55, v0 + 5.55, { mochila: true });
      persona(-0.7, v0 + 5.68, { mochila: true });
      persona(-2.3, v0 + 6.58, { mochila: true });
      persona(-3.35, v0 + 6.62);
      persona(-3.5, v0 + 6.55, { ropa: '#f2c230' });
      // familia mirando el cartel de la entrada
      persona(-0.55, v0 - 0.2);
      persona(-0.68, v0 - 0.12, { ropa: '#3a7bd5' });
      // monte alrededor
      for (const [u, v] of [[-2.6, 1.0], [2.5, 0.8], [-2.9, 2.5], [2.9, 2.2], [-2.7, 4.0], [2.8, 4.2], [-2.0, 5.5], [2.2, 5.7], [0.4, 6.4], [-1.2, 7.0], [1.5, 6.4], [3.3, 3.2], [-3.4, 3.3], [-2.6, 7.4], [-4.0, 7.3], [-1.0, 5.2], [-4.6, 5.8], [-3.2, 5.6]]) {
        tree(u + (rnd() - 0.5) * 0.4, v0 + v + (rnd() - 0.5) * 0.4, 0.85 + rnd() * 0.45);
      }
    } else {
      // ---------- Paraje: un local al costado del camino ----------
      let sv = roadHalf + 1.5;
      while (sv < roadHalf + 4 && !clearOfRoad(0, sv - 0.2, 1.4, 1.8, 0.3)) sv += 0.4;
      const wall = '#d6d0c4';
      const { top, c } = block(solids, unitBox, wall, 0, sv, 0.85, 0.5, 1.6);
      const roofCol = '#6d7378';
      bake(solids, gableRoof, roofCol, new THREE.Vector3(c.x, top + 0.13, c.z), rot, new THREE.Vector3(1.0, 0.26, 1.75));
      const gy = groundAt(c.x, c.z);
      // cartel sobre la fachada
      const fp = at(0, sv - 0.44);
      fp.y = top - 0.12;
      const tex = canvasTexture(512, 128, drawBrand);
      textures.push(tex);
      tex.userData.redraw(p);
      piece(solids, unitBox, '#2b2f36', 0, sv - 0.43, top - gy - 0.12, 0.02, 0.2, 1.24, 0, gy);
      textPlane(tex, fp, side.clone().negate(), 1.2, 0.18, false);
      // vidriera encendida
      piece(glows, unitBox, '#ffd9a0', 0, sv - 0.43, 0.2, 0.01, 0.22, 0.9, 0, gy);
      if (p.id === 'cancha') {
        // la cancha de fútbol 5, del otro lado de la ruta, con sus torres de luz
        let pv = -(roadHalf + 2.3);
        while (pv > -(roadHalf + 5) && !clearOfRoad(0, pv, 1.8, 2.8, 0.3)) pv -= 0.4;
        const pc = at(0, pv);
        // plana sobre la ladera: a la altura de su esquina más alta, con un terraplén debajo
        let hiG = -Infinity;
        let loG = Infinity;
        for (const [a, b] of [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.8], [1.3, 0.8], [0, 0]]) {
          const q = at(a, pv + b);
          const gq = groundAt(q.x, q.z);
          hiG = Math.max(hiG, gq);
          loG = Math.min(loG, gq);
        }
        const py = Math.max(hiG, water + 0.05) + 0.04;
        const ptex = canvasTexture(512, 320, drawPitch);
        textures.push(ptex);
        ptex.userData.redraw();
        const pitch = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshLambertMaterial({ map: ptex }));
        pitch.rotation.set(-Math.PI / 2, 0, rot - Math.PI / 2);
        pitch.position.set(pc.x, py + 0.05, pc.z);
        root.add(pitch);
        // base de tierra debajo, por si el terreno no es plano
        const bh = py - loG + 0.15;
        bake(solids, unitBox, '#4a5a34', new THREE.Vector3(pc.x, py - 0.01 - bh / 2, pc.z), rot, new THREE.Vector3(1.75, bh, 2.75));
        for (const [a, b] of [[-1.35, -0.85], [1.35, -0.85], [-1.35, 0.85], [1.35, 0.85]]) {
          const q = at(a, pv + b);
          q.y = py + 0.6;
          bake(solids, unitCyl, '#aeb3b9', q, 0, new THREE.Vector3(0.04, 1.2, 0.04));
          blinkers.push({ pos: new THREE.Vector3(q.x, py + 1.22, q.z), color: '#fff8e6', phase: 0, size: 0.7, steady: true });
        }
      }
    }
  });

  // ---------- Mallas ----------
  if (solids.length) {
    const m = new THREE.Mesh(mergeGeometries(solids), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    root.add(m);
  }
  if (glows.length) {
    const m = new THREE.Mesh(mergeGeometries(glows), new THREE.MeshBasicMaterial({ vertexColors: true }));
    root.add(m);
  }
  // balizas: un punto de luz que no se tapa con la niebla del fondo
  const dot = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const sprites = blinkers.map((b) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: b.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(b.pos);
    s.scale.setScalar(b.size);
    root.add(s);
    return { s, ...b };
  });

  const setLang = (l) => {
    lang = l;
    signs.forEach((f) => f());
  };
  setLang(lang);
  void quality;

  return {
    root,
    setLang,
    update(time) {
      for (const b of sprites) {
        if (b.steady) continue;
        const on = (time * 0.9 + b.phase) % 1 < 0.45;
        b.s.material.opacity = on ? 1 : 0.15;
      }
    },
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
