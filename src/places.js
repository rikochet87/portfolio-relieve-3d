// Los lugares de la ruta: cada proyecto es un lugar sobre el camino, según su categoría.
//   orbit 0 (destacados)            → localidad: casas, tanque de agua y antena
//   orbit 1 (productos)             → estación de servicio: surtidores con las tecnologías
//   orbit 2 (trabajo para clientes) → paraje: un local al costado del camino
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

    if (p.orbit === 0) {
      // ---------- Localidad ----------
      const size = site.h >= 12.5 ? 16 : 11;
      let placed = 0;
      const slots = [];
      for (const row of [1.55, 2.75]) for (let u = -3.6; u <= 3.6; u += 1.05) for (const s of [-1, 1]) slots.push([u + (rnd() - 0.5) * 0.25, s * (row + rnd() * 0.25)]);
      slots.sort(() => rnd() - 0.5);
      for (const [u, v] of slots) {
        if (placed >= size) break;
        if (Math.abs(u) < 0.9 && v < 0 && Math.abs(v) < 2.2) continue; // lugar del mojón
        if (Math.abs(u) < 0.6 && v > 0 && v < 2.2) continue; // el haz del marcador
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
      {
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
        const [u, v] = freeSpot([[-2.4, 3.9], [2.6, 4.1], [-3.4, -3.6], [0, 4.4]], 0.5);
        const c = at(u, v);
        const gy = groundAt(c.x, c.z);
        piece(solids, unitCyl, '#b8bcc2', u, v, 1.4, 0.06, 2.8, 0.06, 0, gy);
        piece(solids, unitCyl, '#b8bcc2', u, v, 0.15, 0.4, 0.3, 0.4, 0, gy);
        blinkers.push({ pos: new THREE.Vector3(c.x, gy + 2.85, c.z), color: '#ff3b30', phase: i * 0.7, size: 0.9 });
      }
    } else if (p.orbit === 1) {
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
    } else {
      // ---------- Paraje: un local al costado del camino ----------
      let sv = roadHalf + 1.5;
      while (sv < roadHalf + 4 && !clearOfRoad(0, sv - 0.2, 1.4, 1.8, 0.3)) sv += 0.4;
      const isCafe = p.id === 'tropico';
      const wall = isCafe ? '#e8dcc6' : '#d6d0c4';
      const { top, c } = block(solids, unitBox, wall, 0, sv, 0.85, 0.5, 1.6);
      const roofCol = isCafe ? '#b8532b' : '#6d7378';
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
      if (isCafe) {
        // mesas con sombrillas naranjas en la vereda
        for (const u of [-0.55, 0, 0.55]) {
          const q = at(u, sv - 0.8);
          const qy = groundAt(q.x, q.z);
          piece(solids, unitCyl, '#e2e2e2', u, sv - 0.8, 0.08, 0.16, 0.16, 0.16, 0, qy);
          piece(solids, unitCyl, '#cfcfcf', u, sv - 0.8, 0.26, 0.02, 0.36, 0.02, 0, qy);
          piece(solids, unitCone, '#e8692e', u, sv - 0.8, 0.46, 0.42, 0.12, 0.42, 0, qy);
        }
      }
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
