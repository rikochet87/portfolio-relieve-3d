// Los lugares de la ruta: cada proyecto es un lugar sobre el camino, según su categoría.
//   orbit 0 (destacados)            → localidad: casas, tanque de agua y antena
//   orbit 1 (productos)             → estación de servicio: surtidores con las tecnologías
//   orbit 2 (trabajo para clientes) → paraje: un local al costado del camino
// Un proyecto puede pedir otro lugar con `lugar` (projects.js): 'cafe' es un parador de ruta
// 'parque' la entrada de un parque nacional, con boletería y camping, y 'obra' un edificio
// de cinco pisos a medio construir, con la grúa torre, el andamio y los obreros.
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
// el tambor del trompito: más angosto en la boca
const potGeo = new THREE.CylinderGeometry(0.35, 0.5, 1, 10).toNonIndexed();
for (const g of [unitBox, unitCyl, unitCone, hipRoof, gableRoof, potGeo]) g.deleteAttribute('uv');

// Uniforme de guardaparque nacional: sombrero de ala ancha y pantalón verde oliva, camisa
// beige y chaleco gris oscuro con el escudo dorado en el pecho.
const UNIF = { sombrero: '#5f5c3f', pantalon: '#6f7358', camisa: '#d6cbb4', chaleco: '#33383f', escudo: '#d4a62a', botas: '#4a3628' };

// Una persona con piernas y brazos que se mueven: piezas propias (no van en la malla única).
// `look` trae los colores; sin sombrero, chaleco o escudo, esas piezas no van. Por defecto, el
// uniforme de guardaparque.
function makePerson(scale, look = UNIF) {
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const piel = mat(look.piel || '#c99a72');
  const box = (w, h, d, m, x, y, z, parent) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    parent.add(b);
    return b;
  };
  const g = new THREE.Group();
  // piernas, colgadas de la cadera (con pantalón corto, la pierna es de piel y lleva medias)
  const legs = [-1, 1].map((sd) => {
    const hip = new THREE.Group();
    hip.position.set(sd * 0.013, 0.08, 0);
    if (look.corto) {
      box(0.019, 0.03, 0.023, mat(look.pantalon), 0, -0.014, 0, hip);
      box(0.016, 0.047, 0.019, mat(look.medias || look.camisa), 0, -0.05, 0, hip);
    } else box(0.018, 0.075, 0.022, mat(look.pantalon), 0, -0.037, 0, hip);
    box(0.02, 0.012, 0.03, mat(look.botas), 0, -0.074, 0.004, hip);
    g.add(hip);
    return hip;
  });
  box(0.05, 0.075, 0.03, mat(look.camisa), 0, 0.118, 0, g); // torso
  if (look.chaleco) box(0.054, 0.068, 0.034, mat(look.chaleco), 0, 0.12, 0, g); // chaleco encima
  if (look.escudo) box(0.01, 0.01, 0.002, mat(look.escudo), -0.012, 0.135, 0.018, g); // escudo en el pecho
  // brazos, colgados del hombro
  const arms = [-1, 1].map((sd) => {
    const sh = new THREE.Group();
    sh.position.set(sd * 0.034, 0.15, 0);
    box(0.014, 0.065, 0.016, look.corto ? piel : mat(look.camisa), 0, -0.03, 0, sh);
    box(0.012, 0.012, 0.014, piel, 0, -0.068, 0, sh);
    g.add(sh);
    return sh;
  });
  box(0.03, 0.032, 0.03, piel, 0, 0.172, 0, g); // cabeza
  if (look.pelo && !look.casco) box(0.032, 0.012, 0.032, mat(look.pelo), 0, 0.192, -0.002, g);
  if (look.casco) {
    // casco de obra: la copa y el ala
    const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.019, 0.016, 12), mat(look.casco));
    copa.position.y = 0.196;
    const ala = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.003, 12), mat(look.casco));
    ala.position.y = 0.189;
    g.add(copa, ala);
  }
  if (look.sombrero) {
    const ala = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.004, 14), mat(look.sombrero));
    ala.position.y = 0.19;
    const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.019, 0.02, 10), mat(look.sombrero));
    copa.position.y = 0.2;
    g.add(ala, copa);
  }
  g.scale.setScalar(scale);
  return { g, legs, arms };
}

// Cartel del buffet de la cancha.
function drawBuffet(g, w, h) {
  g.fillStyle = '#16233a';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#2ec4b6';
  g.fillRect(0, h - 10, w, 10);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  fitText(g, 'BUFFET', w - 30, h * 0.62, 800);
  g.fillText('BUFFET', w / 2, h / 2 - 3);
}

// Cartel de obra: el aviso de la obra con el color del proyecto y la franja de peligro abajo.
function drawObraSign(g, w, h, p, lang) {
  g.fillStyle = '#f7f5ef';
  g.fillRect(0, 0, w, h);
  g.fillStyle = p.color;
  g.fillRect(0, 0, w, h * 0.22);
  g.fillStyle = '#1b1d21';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const top = lang === 'es' ? 'OBRA EN CONSTRUCCIÓN' : 'UNDER CONSTRUCTION';
  fitText(g, top, w - 60, h * 0.13, 800);
  g.fillText(top, w / 2, h * 0.115);
  fitText(g, p.name, w - 80, h * 0.27, 800);
  g.fillText(p.name, w / 2, h * 0.43);
  g.fillStyle = '#3d4148';
  fitText(g, p.sign[lang], w - 80, h * 0.11, 500);
  g.fillText(p.sign[lang], w / 2, h * 0.66);
  // franja de peligro amarilla y negra
  const y0 = h * 0.82;
  const hh = h - y0;
  g.fillStyle = '#f2b705';
  g.fillRect(0, y0, w, hh);
  g.save();
  g.beginPath();
  g.rect(0, y0, w, hh);
  g.clip();
  g.fillStyle = '#1b1d21';
  const s = h * 0.09;
  for (let x = -hh; x < w + hh; x += s * 2) {
    g.beginPath();
    g.moveTo(x, h);
    g.lineTo(x + s, h);
    g.lineTo(x + s + hh, y0);
    g.lineTo(x + hh, y0);
    g.closePath();
    g.fill();
  }
  g.restore();
}

export function buildPlaces({ projects, sites, stops, curve, roadDist, height, water, roadHalf, lang, quality }) {
  const root = new THREE.Group();
  const solids = [];
  const glows = [];
  const textMeshes = [];
  const blinkers = [];
  const guardaparques = []; // recorridos de la gente que camina (guardaparques, el mozo, clientes)
  const partidos = []; // canchas con jugadores
  const gruas = []; // grúas torre que giran llevando ladrillos
  const tambores = []; // tambores de los mixers, que giran
  const textures = [];

  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler(0, 0, 0, 'YXZ');
  const color = new THREE.Color();
  function paint(g, col) {
    color.set(col);
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set([color.r, color.g, color.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  // rotX inclina la pieza sobre su eje x, después de girarla rotY
  function bake(list, geo, col, pos, rotY, scale, rotX = 0) {
    tmpE.set(rotX, rotY, 0);
    tmpQ.setFromEuler(tmpE);
    tmpM.compose(pos, tmpQ, scale);
    const g = geo.clone().applyMatrix4(tmpM);
    paint(g, col);
    list.push(g);
  }
  // una barra fina de a hasta b: caños del andamio, el reticulado de la grúa
  const UP = new THREE.Vector3(0, 1, 0);
  const tmpV = new THREE.Vector3();
  function rod(list, col, a, b, t = 0.015) {
    tmpV.subVectors(b, a);
    const len = tmpV.length();
    if (len < 1e-4) return;
    tmpQ.setFromUnitVectors(UP, tmpV.divideScalar(len));
    tmpM.compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), tmpQ, new THREE.Vector3(t, len, t));
    const g = unitBox.clone().applyMatrix4(tmpM);
    paint(g, col);
    list.push(g);
  }

  // Ordenar por fecha y medir el kilómetro de cada lugar sobre la ruta.
  const L = curve.getLength();
  const n = curve.points.length;
  const DIV = 200;
  const lengths = curve.getLengths(n * DIV);
  const byId = new Map(projects.map((p) => [p.id, p]));
  const order = [...projects].filter((p) => p.since && !p.junto).sort((a, b) => a.since.localeCompare(b.since));
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
      signs.push(() => tex.userData.redraw(p.grupo ? { ...p, name: p.grupo[lang] } : p, lang));
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

    // una persona quieta, en la malla única (las que se mueven son makePerson)
    const PIEL = ['#e0b48a', '#c58c5f', '#8d5a3b', '#f0c9a0'];
    const ROPA = ['#d64545', '#3a7bd5', '#f2c230', '#2e9e6a', '#e8692e', '#8e5bd1', '#ececec'];
    const K = 1.5; // un poco más grandes que a escala, para que se vean desde arriba
    // giro: hacia dónde mira (si no, al azar); sobre: altura extra, para sentarla en una silla
    // casco y chaleco: obreros; base: altura absoluta del piso donde está (una losa)
    const persona = (u, v, { sentada = false, ropa, mochila = false, guarda = false, giro: mira, sobre = 0, casco, chaleco, base } = {}) => {
      if (!buildable(u, v) || !clearOfRoad(u, v, 0.1, 0.1, 0.1)) return;
      const q = at(u, v);
      const gq = base ?? groundAt(q.x, q.z);
      const col = guarda ? UNIF.chaleco : ropa || ROPA[Math.floor(rnd() * ROPA.length)];
      const piel = PIEL[Math.floor(rnd() * PIEL.length)];
      const giro = mira ?? rnd() * Math.PI * 2;
      const pz = (geo, c, du, dv, y, w, h, d) => piece(solids, geo, c, u + du, v + dv, y * K + sobre, w * K, h * K, d * K, giro, gq);
      if (sentada) {
        pz(unitBox, '#2f3a4a', 0, 0, 0.025, 0.045, 0.03, 0.06);
        pz(unitBox, col, 0, 0, 0.075, 0.05, 0.07, 0.04);
        pz(unitBox, piel, 0, 0, 0.135, 0.035, 0.04, 0.035);
      } else {
        pz(unitBox, guarda ? UNIF.pantalon : '#2f3a4a', 0, 0, 0.04, 0.04, 0.08, 0.03);
        pz(unitBox, col, 0, 0, 0.115, 0.05, 0.075, 0.035);
        pz(unitBox, piel, 0, 0, 0.175, 0.035, 0.04, 0.035);
        if (guarda) {
          pz(unitBox, UNIF.camisa, 0, 0, 0.11, 0.062, 0.06, 0.026); // mangas de la camisa
          pz(unitCyl, UNIF.sombrero, 0, 0, 0.196, 0.075, 0.01, 0.075); // ala del sombrero
          pz(unitCyl, UNIF.sombrero, 0, 0, 0.21, 0.04, 0.025, 0.04); // copa
        }
        // la mochila, detrás: el frente de la persona es (cos giro, −sin giro) en (u, v)
        if (mochila) pz(unitBox, '#5a4a3a', -Math.cos(giro) * 0.03 * K, Math.sin(giro) * 0.03 * K, 0.12, 0.04, 0.06, 0.03);
        if (chaleco) pz(unitBox, chaleco, 0, 0, 0.117, 0.054, 0.066, 0.039);
      }
      if (casco) {
        const hy = sentada ? 0.135 : 0.175; // altura de la cabeza
        pz(unitCyl, casco, 0, 0, hy + 0.024, 0.04, 0.02, 0.04);
        pz(unitCyl, casco, 0, 0, hy + 0.015, 0.05, 0.004, 0.05);
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
        // galpón largo detrás del edificio
        galpon(U - 0.3, vb + 2.05, 2.2, 0.8, 0.42);
        // al lado, el galpón grande con su patio y las máquinas: es Equipos Viales (`junto` en projects.js)
        const vecino = projects.find((q) => q.junto === p.id);
        {
          const GU = 3.35;
          const GD = 3.0;
          const GW = 1.3;
          flat('#6f6553', GU - GD / 2 - 0.15, GU + GD / 2 + 0.15, roadHalf + 0.35, vb + 0.05);
          galpon(GU, vb + GW / 2, GD, GW, 0.6);
          if (vecino) {
            const q = at(GU, vb - 0.005);
            const gq = groundAt(q.x, q.z);
            piece(solids, unitBox, '#2b2f36', GU, vb - 0.005, 0.68, 0.02, 0.17, 1.5, 0, gq);
            const tex = canvasTexture(768, 96, drawBrand);
            textures.push(tex);
            tex.userData.redraw(vecino);
            textPlane(tex, new THREE.Vector3(q.x, gq + 0.68, q.z), side.clone().negate(), 1.44, 0.18, false);
          }
          maquina('motoniveladora', GU - 1.0, roadHalf + 0.95, 0.15);
          maquina('motoniveladora', GU - 0.05, roadHalf + 0.9, 0.1);
          maquina('retro', GU + 1.05, roadHalf + 1.0, -0.3);
          maquina('volcador', GU - 0.95, vb - 0.45, 0);
          maquina('volcador', GU + 0.05, vb - 0.42, 0.05);
          maquina('rodillo', GU + 1.15, vb - 0.5, 1.4);
        }
        // árboles del predio
        for (const [u, v] of [[-2.4, vb + 0.4], [-2.5, vb + 1.6], [-1.9, vb + 2.9], [1.1, vb + 3.0], [5.4, vb + 0.6], [5.2, vb + 2.0]]) tree(u, v, 0.9 + rnd() * 0.4);
      }
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
      // gente sentada tomando café: mirando la mesa, con la taza adelante (algunas sillas libres)
      {
        const mesas = [[-0.95, sv - 0.32], [-0.35, sv - 0.55], [0.35, sv - 0.55], [0.95, sv - 0.32]];
        const ocupadas = [[0, -1], [0, 1], [1, -1], [2, 1], [3, -1], [3, 1]];
        for (const [m, sd] of ocupadas) {
          const [u, v] = mesas[m];
          // de frente a la mesa: el frente de una persona es (cos giro, −sin giro) en (u, v)
          persona(u + sd * 0.15, v, { sentada: true, giro: sd < 0 ? 0 : Math.PI, sobre: 0.035 });
          piece(solids, unitCyl, '#f4f1ea', u + sd * 0.045, v, 0.14, 0.03, 0.025, 0.03, 0, gy); // taza
        }
        for (const [u, v] of mesas) piece(solids, unitCyl, '#f4f1ea', u, v + 0.04, 0.14, 0.022, 0.03, 0.022, 0, gy);
      }
      // los que se mueven: el mozo entre la puerta y las mesas, y dos que llegan desde el playón
      const MOZO = { camisa: '#f4f4f2', chaleco: '#1d1d1d', pantalon: '#1d1d1d', botas: '#111111', pelo: '#2a1d14' };
      guardaparques.push(
        { path: [at(0.02, sv - 0.12), at(0.7, sv - 0.75)], speed: 0.14, phase: 0.2, look: MOZO },
        { path: [at(-1.75, roadHalf + 0.55), at(-0.2, sv - 0.15)], speed: 0.11, phase: 0.55, look: { camisa: '#3a7bd5', pantalon: '#3b3f46', botas: '#2b2b2b', pelo: '#5a3b22' } },
        { path: [at(-1.62, roadHalf + 0.45), at(-0.07, sv - 0.2)], speed: 0.11, phase: 0.53, look: { camisa: '#e8692e', pantalon: '#2f3a4a', botas: '#2b2b2b', pelo: '#1d1410' } },
      );
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
    } else if (kind === 'obra') {
      // ---------- Obra en construcción: un edificio de cinco pisos a medio hacer, con la grúa
      // torre, el andamio, el obrador, el mixer y los obreros trabajando ----------
      let Y0 = roadHalf + 0.6; // frente del cerco
      while (Y0 < roadHalf + 4 && !clearOfRoad(0, Y0 + 1.5, 3.0, 4.5, 0.25)) Y0 += 0.3;
      const Y1 = Y0 + 3.0; // fondo del cerco
      const UA = -2.25; // costados del cerco
      const UB = 2.25;
      // el terreno de la obra, tierra removida, y la entrada de ripio desde la ruta
      flat('#8a7356', UA, UB, Y0, Y1);
      flat('#7d725f', 0.3, 1.7, roadHalf + 0.25, Y0 + 0.05, 0.5);

      // ----- el edificio -----
      const BU = 0.35; // centro, a lo largo de la ruta
      const D = 2.0; // largo, a lo largo de la ruta
      const W = 1.3; // fondo
      const vb = Y0 + 1.45; // frente
      const BV = vb + W / 2;
      const FL = 0.38; // alto de cada piso
      const LOSA = 0.05;
      const COL = 0.07;
      // plano, a la altura de la esquina más alta, sobre la platea de hormigón (que llega hasta el andamio)
      let hiG = -Infinity;
      let loG = Infinity;
      for (const [a, b] of [[-D / 2, -0.35], [D / 2, -0.35], [-D / 2, W], [D / 2, W], [0, W / 2]]) {
        const q = at(BU + a, vb + b);
        const gq = groundAt(q.x, q.z);
        hiG = Math.max(hiG, gq);
        loG = Math.min(loG, gq);
      }
      const B = Math.max(hiG, water + 0.1) + 0.05; // nivel de la platea
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
      const wpt = (u, v, y) => {
        const c = at(u, v);
        c.y = B + y;
        return c;
      };
      // pieza a una altura sobre la platea; w a lo ancho (v), d a lo largo (u)
      const pz = (list, geo, col, u, v, y, w, h, d, rx = 0) => bake(list, geo, col, wpt(u, v, y), rot, V3(w, h, d), rx);
      {
        const bh = B - loG + 0.12;
        pz(solids, unitBox, '#8f8b83', BU, vb + (W - 0.25) / 2, -bh / 2, W + 0.45, bh, D + 0.2);
      }
      const HORM = '#a9a69f';
      const CU = [-D / 2, -D / 6, D / 6, D / 2].map((t) => BU + t);
      const CV = [0, W / 2, W].map((t) => vb + t);
      // columnas, de la platea al techo
      for (const u of CU) for (const v of CV) pz(solids, unitBox, HORM, u, v, (5 * FL) / 2, COL, 5 * FL, COL);
      // losas: las cuatro primeras enteras; la del techo con dos tramos hormigonados y el tercero en el encofrado
      for (let k = 1; k <= 4; k++) pz(solids, unitBox, k % 2 ? '#b1aea7' : '#aaa79f', BU, BV, k * FL - LOSA / 2, W + 0.06, LOSA, D + 0.06);
      const u0 = BU - D / 2 - 0.03;
      const uF = BU + D / 6; // hasta acá está hormigonado
      const uE = BU + D / 2 + 0.03;
      pz(solids, unitBox, '#bdbab3', (u0 + uF) / 2, BV, 5 * FL - LOSA / 2, W + 0.06, LOSA, uF - u0);
      // el encofrado: tablero fenólico con la malla de hierros encima y las tablas de borde
      const yE = 5 * FL - LOSA; // piso del encofrado
      pz(solids, unitBox, '#c9965a', (uF + uE) / 2, BV, yE + 0.006, W + 0.06, 0.012, uE - uF);
      for (let k = 0; k <= 8; k++) pz(solids, unitBox, '#4f4239', uF + 0.02 + ((uE - uF - 0.04) * k) / 8, BV, yE + 0.02, W, 0.006, 0.006);
      for (let k = 0; k <= 6; k++) pz(solids, unitBox, '#4f4239', (uF + uE) / 2, vb + (W * k) / 6, yE + 0.026, 0.006, 0.006, uE - uF - 0.03);
      for (const dv of [-0.035, W + 0.035]) pz(solids, unitBox, '#b07f45', (uF + uE) / 2, vb + dv, yE + 0.03, 0.012, LOSA + 0.02, uE - uF);
      pz(solids, unitBox, '#b07f45', uE, BV, yE + 0.03, W + 0.08, LOSA + 0.02, 0.012);
      // puntales rojos bajo la losa del techo, recién hormigonada
      for (let a = 0; a < 9; a++) {
        for (let b = 0; b < 5; b++) {
          const u = BU - D / 2 + 0.12 + (a * (D - 0.24)) / 8;
          const v = vb + 0.12 + (b * (W - 0.24)) / 4;
          pz(solids, unitBox, '#c23b22', u, v, 4 * FL + (FL - LOSA) / 2, 0.013, FL - LOSA, 0.013);
        }
      }
      // los hierros de arranque que asoman sobre cada columna
      for (const u of CU) for (const v of CV) for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pz(solids, unitBox, '#4f4239', u + a * 0.022, v + b * 0.022, 5 * FL + 0.09, 0.008, 0.18, 0.008);
      // núcleo de la escalera y el ascensor, al fondo, más alto que el resto
      pz(solids, unitBox, '#9b988f', BU, vb + W - 0.2, (5 * FL + 0.26) / 2, 0.3, 5 * FL + 0.26, 0.36);

      // ----- paredes: abajo revocadas, en el medio el ladrillo hueco, arriba a medio levantar -----
      const ESP = 0.04;
      const LAD = ['#b5532f', '#a94a2a', '#bf5d36'];
      const caras = {
        frente: { alongU: true, at: (t) => [t, vb], ts: CU },
        fondo: { alongU: true, at: (t) => [t, vb + W], ts: CU },
        izq: { alongU: false, at: (t) => [BU - D / 2, t], ts: CV },
        der: { alongU: false, at: (t) => [BU + D / 2, t], ts: CV },
      };
      // un paño entre dos columnas; alto < 1 lo corta a medio levantar (sin ventana)
      const pano = (cara, i, piso, col, { ventana = true, puerta = false, alto = 1 } = {}) => {
        const t0 = cara.ts[i];
        const t1 = cara.ts[i + 1];
        const y0 = piso * FL;
        const H = (FL - LOSA) * alto;
        const largo = t1 - t0 - COL;
        const put = (t, y, len, hh) => {
          const [u, v] = cara.at(t);
          if (cara.alongU) pz(solids, unitBox, col, u, v, y + hh / 2, ESP, hh, len);
          else pz(solids, unitBox, col, u, v, y + hh / 2, len, hh, ESP);
        };
        if (!ventana || alto < 1) return put((t0 + t1) / 2, y0, largo, H);
        const sill = puerta ? 0 : 0.1;
        const lint = 0.07;
        const vw = largo * (puerta ? 0.42 : 0.5);
        const lado = (largo - vw) / 2;
        if (sill) put((t0 + t1) / 2, y0, largo, sill);
        put((t0 + t1) / 2, y0 + H - lint, largo, lint);
        put(t0 + COL / 2 + lado / 2, y0 + sill, lado, H - sill - lint);
        put(t1 - COL / 2 - lado / 2, y0 + sill, lado, H - sill - lint);
      };
      let nl = 0;
      const lad = () => LAD[nl++ % LAD.length];
      for (const [nombre, cara] of Object.entries(caras)) {
        for (let i = 0; i < cara.ts.length - 1; i++) {
          pano(cara, i, 0, '#d9d4c9', { puerta: nombre === 'frente' && i === 1 }); // planta baja revocada
          pano(cara, i, 1, lad());
          pano(cara, i, 2, lad());
        }
      }
      // tercer piso: el fondo y un costado cerrados, el frente y el otro costado a medio levantar
      for (let i = 0; i < 3; i++) pano(caras.fondo, i, 3, lad());
      for (let i = 0; i < 2; i++) pano(caras.izq, i, 3, lad());
      pano(caras.frente, 0, 3, lad());
      pano(caras.frente, 1, 3, lad(), { alto: 0.4 });
      pano(caras.der, 0, 3, lad(), { alto: 0.65 });
      // ladrillos apilados junto a la pared que se está levantando
      for (const [du, dv, dy] of [[0.12, 0.2, 0], [0.12, 0.2, 0.045], [0.24, 0.2, 0]]) pz(solids, unitBox, lad(), BU + du, vb + dv, 3 * FL + 0.022 + dy, 0.08, 0.045, 0.1);
      pz(solids, unitBox, '#8e8a83', BU - 0.2, vb + 0.25, 3 * FL + 0.035, 0.1, 0.07, 0.1); // balde de mezcla

      // ----- andamio en el frente, hasta el cuarto piso -----
      {
        const vi = vb - 0.08; // línea de adentro
        const vo = vb - 0.26; // línea de afuera
        const vp = (vi + vo) / 2; // tablones
        const TUBO = '#9aa1a8';
        const n = 4;
        const us = Array.from({ length: n + 1 }, (_, k) => BU - D / 2 - 0.06 + ((D + 0.12) * k) / n);
        const Htop = 4 * FL + 0.18;
        for (const u of us) {
          for (const v of [vi, vo]) rod(solids, TUBO, wpt(u, v, 0), wpt(u, v, Htop), 0.014);
          for (let k = 1; k <= 4; k++) rod(solids, TUBO, wpt(u, vi, k * FL - 0.012), wpt(u, vo, k * FL - 0.012), 0.012);
        }
        for (let k = 1; k <= 4; k++) {
          for (const v of [vi, vo]) rod(solids, TUBO, wpt(us[0], v, k * FL - 0.012), wpt(us[n], v, k * FL - 0.012), 0.012);
          rod(solids, TUBO, wpt(us[0], vo, k * FL + 0.16), wpt(us[n], vo, k * FL + 0.16), 0.01); // baranda
          pz(solids, unitBox, k % 2 ? '#a87b4a' : '#b98a55', (us[0] + us[n]) / 2, vp, k * FL, 0.17, 0.012, D + 0.12);
          // cruces de San Andrés en la cara de afuera
          for (let b = 0; b < n; b++) {
            const [ua, ub] = (b + k) % 2 ? [us[b], us[b + 1]] : [us[b + 1], us[b]];
            rod(solids, TUBO, wpt(ua, vo, (k - 1) * FL), wpt(ub, vo, k * FL - 0.012), 0.008);
          }
        }
        // media sombra verde en las dos últimas bahías de arriba
        pz(solids, unitBox, '#2e7a4c', (us[2] + us[4]) / 2, vo - 0.012, 3 * FL + (FL + 0.18) / 2, 0.006, FL + 0.18, us[4] - us[2]);
      }

      // ----- la grúa torre: el mástil fijo y la cabeza que gira -----
      const GU = BU - D / 2 - 0.55;
      const GV = BV;
      const gc = at(GU, GV);
      const gG = groundAt(gc.x, gc.z);
      const HJ = B + 5 * FL + 0.9; // altura de la pluma
      piece(solids, unitBox, '#8f8b83', GU, GV, 0.04, 0.36, 0.12, 0.36, 0, gG);
      {
        const M = 0.07;
        const cp = (a, b, y) => {
          const c = at(GU + a, GV + b);
          c.y = y;
          return c;
        };
        const esq = [[-M, -M], [M, -M], [M, M], [-M, M]];
        const ya = gG + 0.1;
        const yb = HJ - 0.07;
        for (const [a, b] of esq) rod(solids, AMARILLO, cp(a, b, ya), cp(a, b, yb), 0.018);
        const nSeg = Math.round((yb - ya) / 0.16);
        const sh = (yb - ya) / nSeg;
        for (let s = 0; s <= nSeg; s++) {
          const y0 = ya + s * sh;
          for (let c = 0; c < 4; c++) {
            const [a0, b0] = esq[c];
            const [a1, b1] = esq[(c + 1) % 4];
            rod(solids, AMARILLO, cp(a0, b0, y0), cp(a1, b1, y0), 0.01);
            if (s < nSeg) rod(solids, AMARILLO, cp(...(s % 2 ? esq[c] : esq[(c + 1) % 4]), y0), cp(...(s % 2 ? esq[(c + 1) % 4] : esq[c]), y0 + sh), 0.008);
          }
        }
      }
      // la cabeza, en coordenadas propias: x a lo largo de la pluma, y hacia arriba
      const cabeza = new THREE.Group();
      cabeza.position.set(gc.x, HJ, gc.z);
      {
        const hs = [];
        const lp = (col, x, y, z, w, h, d) => bake(hs, unitBox, col, V3(x, y, z), 0, V3(w, h, d));
        const lr = (col, a, b, t) => rod(hs, col, V3(...a), V3(...b), t);
        lp('#d9a404', 0, -0.035, 0, 0.2, 0.07, 0.2); // corona de giro
        lp('#ecebe4', 0.07, -0.1, 0.14, 0.13, 0.12, 0.11); // cabina del gruista
        lp('#7fb6dc', 0.137, -0.09, 0.14, 0.004, 0.07, 0.09);
        // pluma: reticulado de sección triangular
        const JL = 2.3;
        for (const z of [-0.045, 0.045]) lr(AMARILLO, [0.08, 0, z], [JL, 0, z], 0.014);
        lr(AMARILLO, [0.08, 0.1, 0], [JL, 0.1, 0], 0.014);
        for (let x = 0.08; x < JL - 0.01; x += 0.15) {
          const x2 = Math.min(x + 0.15, JL);
          const xm = (x + x2) / 2;
          lr(AMARILLO, [x, 0, -0.045], [x, 0, 0.045], 0.008);
          for (const z of [-0.045, 0.045]) {
            lr(AMARILLO, [x, 0, z], [xm, 0.1, 0], 0.008);
            lr(AMARILLO, [xm, 0.1, 0], [x2, 0, z], 0.008);
          }
        }
        lp(AMARILLO, JL, 0.05, 0, 0.03, 0.12, 0.11); // punta
        // contrapluma con la pasarela y los contrapesos de hormigón
        for (const z of [-0.06, 0.06]) lr(AMARILLO, [-0.08, 0, z], [-0.9, 0, z], 0.016);
        lp('#8e9196', -0.5, 0.004, 0, 0.82, 0.01, 0.12);
        for (let k = 0; k < 3; k++) lp('#8f8c86', -0.66 - k * 0.075, -0.08, 0, 0.068, 0.17, 0.16);
        // la torreta y los tensores
        for (const z of [-0.06, 0.06]) lr(AMARILLO, [0, 0, z], [0, 0.5, 0], 0.016);
        lr('#3b3b3b', [0, 0.5, 0], [1.45, 0.1, 0], 0.007);
        lr('#3b3b3b', [0, 0.5, 0], [-0.88, 0.01, 0], 0.007);
        // el cartel en la contrapluma, con el color del proyecto
        for (const z of [-0.07, 0.07]) lp(p.color, -0.5, -0.04, z, 0.6, 0.06, 0.006);
        cabeza.add(new THREE.Mesh(mergeGeometries(hs), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
      }
      const lam = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
      const carro = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.1), lam('#3d4146'));
      const cable = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lam('#1e1e1e'));
      const gancho = new THREE.Group();
      {
        const hk = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.025), lam('#e8692e'));
        hk.position.y = 0.15;
        gancho.add(hk);
      }
      // la carga: un pallet de ladrillos colgado de las eslingas
      const carga = new THREE.Group();
      {
        const pal = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.2), lam('#8a6a44'));
        pal.position.y = 0.0125;
        const lad2 = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.17), lam('#b5532f'));
        lad2.position.y = 0.075;
        carga.add(pal, lad2);
        for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const e = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.06, 0.004), lam('#2b2b2b'));
          e.position.set(a * 0.045, 0.145, b * 0.045);
          e.rotation.set(b * 0.6, 0, -a * 0.6);
          carga.add(e);
        }
        gancho.add(carga);
      }
      cabeza.add(carro, cable, gancho);
      root.add(cabeza);
      blinkers.push({ pos: new THREE.Vector3(gc.x, HJ + 0.55, gc.z), color: '#ff3b30', phase: i * 0.37, size: 0.6 });
      // de dónde levanta (la pila de pallets) y dónde baja (la losa del techo)
      const PA = [-1.55, Y0 + 0.65];
      const PB = [BU - 0.5, vb + 0.4];
      {
        const qa = at(...PA);
        const qb = at(...PB);
        const ang = (q) => Math.atan2(-(q.z - gc.z), q.x - gc.x);
        const thA = ang(qa);
        let dTh = ang(qb) - thA;
        dTh = Math.atan2(Math.sin(dTh), Math.cos(dTh));
        gruas.push({
          cabeza,
          carro,
          cable,
          gancho,
          carga,
          HJ,
          thA,
          dTh,
          rA: Math.hypot(qa.x - gc.x, qa.z - gc.z),
          rB: Math.hypot(qb.x - gc.x, qb.z - gc.z),
          yA: groundAt(qa.x, qa.z) + 0.2,
          yB: B + 5 * FL + 0.005,
          hi: B + 5 * FL + 0.42,
          phase: 0,
        });
      }

      // ----- materiales: pallets de ladrillos, arena, piedra, hierros y la carretilla -----
      for (const [u, v] of [PA, [-1.9, Y0 + 0.65], [-1.55, Y0 + 0.98], [-1.9, Y0 + 0.98]]) {
        const q = at(u, v);
        const gq = groundAt(q.x, q.z);
        piece(solids, unitBox, '#8a6a44', u, v, 0.03, 0.24, 0.03, 0.24, 0, gq);
        piece(solids, unitBox, lad(), u, v, 0.11, 0.2, 0.14, 0.2, 0, gq);
      }
      for (const [u, v, col, s] of [[-1.85, Y0 + 1.55, '#d6b98a', 0.55], [-1.9, Y0 + 2.2, '#8d8a84', 0.45]]) {
        const q = at(u, v);
        piece(solids, unitCone, col, u, v, s * 0.24, s, s * 0.48, s, 0, groundAt(q.x, q.z));
      }
      {
        const q = at(-0.6, Y0 + 0.3);
        const gq = groundAt(q.x, q.z);
        for (let k = 0; k < 6; k++) piece(solids, unitBox, '#4f4239', -0.6, Y0 + 0.27 + (k % 3) * 0.022, 0.025 + Math.floor(k / 3) * 0.02, 0.014, 0.014, 1.2, 0, gq);
        // tablones
        const q2 = at(2.0, Y0 + 0.6);
        const g2 = groundAt(q2.x, q2.z);
        for (let k = 0; k < 4; k++) piece(solids, unitBox, k % 2 ? '#a87b4a' : '#b98a55', 2.0, Y0 + 0.6, 0.015 + k * 0.025, 0.5, 0.022, 0.16, 0, g2);
        // carretilla junto a la arena
        const cu = -1.35;
        const cv2 = Y0 + 1.35;
        const q3 = at(cu, cv2);
        const g3 = groundAt(q3.x, q3.z);
        piece(solids, unitBox, '#2f6fa8', cu, cv2, 0.09, 0.12, 0.05, 0.16, 0, g3);
        piece(solids, unitBox, '#1b1b1b', cu, cv2, 0.035, 0.02, 0.07, 0.07, 0, g3);
        for (const dv of [-0.05, 0.05]) piece(solids, unitBox, '#5a5e64', cu - 0.13, cv2 + dv, 0.07, 0.01, 0.01, 0.14, 0, g3);
      }

      // ----- el trompito, con la arena al lado -----
      const TU = 0.55;
      const TV = vb - 0.55;
      {
        const q = at(TU, TV);
        const gt = groundAt(q.x, q.z);
        piece(solids, unitBox, '#c23b22', TU, TV, 0.07, 0.16, 0.12, 0.04, 0, gt);
        for (const dv of [-0.08, 0.08]) piece(solids, unitBox, '#1b1b1b', TU - 0.02, TV + dv, 0.04, 0.02, 0.08, 0.08, 0, gt);
        const c = at(TU + 0.02, TV);
        c.y = gt + 0.19;
        bake(solids, potGeo, '#e8692e', c, rot, V3(0.15, 0.15, 0.15), 0.7);
      }

      // ----- el mixer, entrando por el portón, con el tambor girando -----
      const MU = 0.95;
      const MV = Y0 + 0.55;
      {
        const q = at(MU, MV);
        const gm = groundAt(q.x, q.z);
        piece(solids, unitBox, '#2b2b2b', MU, MV, 0.1, 0.2, 0.04, 0.95, 0, gm); // chasis
        piece(solids, unitBox, '#f4f4f2', MU + 0.38, MV, 0.2, 0.22, 0.2, 0.2, 0, gm); // cabina
        piece(glows, unitBox, '#9fd3ff', MU + 0.481, MV, 0.24, 0.18, 0.07, 0.01, 0, gm); // parabrisas
        for (const u of [MU + 0.36, MU - 0.08, MU - 0.3]) for (const dv of [-0.1, 0.1]) piece(solids, unitBox, '#1b1b1b', u, MV + dv, 0.06, 0.05, 0.12, 0.12, 0, gm);
        piece(solids, unitBox, '#5a5e64', MU + 0.12, MV, 0.17, 0.16, 0.1, 0.05, 0, gm); // apoyo del tambor
        rod(solids, '#5a5e64', V3(at(MU - 0.4, MV).x, gm + 0.3, at(MU - 0.4, MV).z), V3(at(MU - 0.58, MV).x, gm + 0.18, at(MU - 0.58, MV).z), 0.04); // canaleta
        const dg = new THREE.Group();
        const dc = at(MU - 0.12, MV);
        dg.position.set(dc.x, gm + 0.28, dc.z);
        dg.rotation.set(0.22, rot, 0, 'YXZ'); // la boca de atrás, más alta
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.075, 0.48, 10).rotateX(Math.PI / 2), lam(p.color));
        for (const a of [0, Math.PI]) {
          const st = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.42), lam('#f4f4f2'));
          st.position.set(Math.cos(a) * 0.095, Math.sin(a) * 0.095, 0);
          drum.add(st);
        }
        dg.add(drum);
        root.add(dg);
        tambores.push(drum);
      }

      // ----- el obrador (un contenedor), el baño químico y la mesa con los planos -----
      {
        const OU = 1.95;
        const OV = Y0 + 1.7;
        const q = at(OU, OV);
        const go = groundAt(q.x, q.z);
        piece(solids, unitBox, '#3d6f8e', OU, OV, 0.2, 0.9, 0.38, 0.42, 0, go);
        piece(solids, unitBox, '#335f7a', OU, OV, 0.4, 0.92, 0.025, 0.44, 0, go);
        piece(solids, unitBox, '#24292f', OU - 0.212, OV - 0.2, 0.15, 0.13, 0.26, 0.01, 0, go); // puerta
        piece(glows, unitBox, '#ffe2b0', OU - 0.212, OV + 0.18, 0.22, 0.2, 0.1, 0.01, 0, go); // ventana
        const qb = at(OU, Y0 + 2.6);
        piece(solids, unitBox, '#2a64b8', OU, Y0 + 2.6, 0.16, 0.17, 0.32, 0.17, 0, groundAt(qb.x, qb.z));
        piece(solids, unitBox, '#e9ecef', OU, Y0 + 2.6, 0.33, 0.18, 0.02, 0.18, 0, groundAt(qb.x, qb.z));
        // mesa de caballetes con el plano azul
        const mu = 1.5;
        const mv = Y0 + 1.2;
        const qm = at(mu, mv);
        const gm = groundAt(qm.x, qm.z);
        for (const du of [-0.11, 0.11]) piece(solids, unitBox, '#7a5434', mu + du, mv, 0.065, 0.16, 0.13, 0.02, 0, gm);
        piece(solids, unitBox, '#c9965a', mu, mv, 0.135, 0.2, 0.015, 0.32, 0, gm);
        piece(solids, unitBox, '#2f5f9e', mu, mv, 0.145, 0.15, 0.004, 0.24, 0, gm);
        persona(mu, mv - 0.17, { ropa: '#e9e9e9', casco: '#f4f4f2', giro: -Math.PI / 2 }); // el capataz
        persona(mu + 0.2, mv + 0.15, { ropa: '#2f3a4a', casco: '#f4f4f2', giro: Math.PI * 0.85 }); // la arquitecta
      }

      // ----- el cerco de media sombra, con el portón abierto -----
      const cerco = (u, v, alongU) => {
        if (!buildable(u, v)) return;
        const q = at(u, v);
        const gq = groundAt(q.x, q.z);
        piece(solids, unitBox, '#2f5e3e', u, v, 0.13, alongU ? 0.012 : 0.5, 0.24, alongU ? 0.5 : 0.012, 0, gq);
        const [pu, pv] = alongU ? [u - 0.25, v] : [u, v - 0.25];
        piece(solids, unitBox, '#7b8087', pu, pv, 0.14, 0.025, 0.28, 0.025, 0, gq);
      };
      for (let u = UA + 0.25; u < UB; u += 0.5) {
        if (u < 0.3 || u > 1.7) cerco(u, Y0, true);
        cerco(u, Y1, true);
      }
      for (let v = Y0 + 0.25; v < Y1; v += 0.5) {
        cerco(UA, v, false);
        cerco(UB, v, false);
      }

      // ----- cartel de obra, mirando a la ruta -----
      {
        const cu = -1.15;
        const cv2 = Y0 - 0.1;
        const q = at(cu, cv2);
        const g0 = groundAt(q.x, q.z);
        for (const du of [-0.5, 0.5]) piece(solids, unitBox, '#6b4a2e', cu + du, cv2, 0.48, 0.04, 0.96, 0.04, 0, g0);
        piece(solids, unitBox, '#2b2f36', cu, cv2, 0.66, 0.03, 0.62, 1.14, 0, g0);
        const tex = canvasTexture(768, 416, drawObraSign);
        textures.push(tex);
        signs.push(() => tex.userData.redraw(p, lang));
        textPlane(tex, new THREE.Vector3(q.x, g0 + 0.66, q.z), side.clone().negate(), 1.1, 0.596, false, 0.018);
      }

      // ----- los obreros -----
      const AMA = '#f2c230';
      const NAR = '#ff7a1a';
      const obrero = (casco, camisa = '#3a7bd5', chaleco = NAR) => ({ camisa, chaleco, pantalon: '#3a4a63', botas: '#3b2a1a', casco, pelo: '#2a1d14' });
      // quietos: el que levanta la pared del tercero, el que ata hierros en el encofrado, el del trompito,
      // el que guía la canaleta del mixer y uno que descansa sentado en un pallet
      persona(BU + 0.02, vb + 0.16, { ropa: '#3a7bd5', casco: AMA, chaleco: NAR, base: B + 3 * FL, giro: Math.PI / 2 });
      persona(BU + 0.62, vb + 0.55, { ropa: '#d6cbb4', casco: AMA, chaleco: '#c8e03a', base: B + yE + 0.012 });
      persona(BU + 0.78, vb + 0.95, { ropa: '#e9e9e9', casco: '#3a7bd5', chaleco: NAR, base: B + yE + 0.012, giro: 2.4 });
      persona(TU - 0.2, TV + 0.05, { ropa: '#2e9e6a', casco: AMA, chaleco: NAR, giro: 0 });
      persona(MU - 0.68, MV + 0.14, { ropa: '#8e5bd1', casco: AMA, chaleco: '#c8e03a', giro: 0.3 });
      persona(-1.9, Y0 + 0.98, { sentada: true, ropa: '#d64545', casco: AMA, sobre: 0.17, giro: -Math.PI / 2 });
      // los que caminan: por la losa del techo (el que recibe la carga de la grúa), por el tercer piso,
      // por el tablón del andamio y por el terreno, de los pallets a la puerta
      guardaparques.push(
        { path: [at(BU - 0.85, vb + 0.25), at(BU - 0.45, vb + 0.55)], y: B + 5 * FL, speed: 0.07, phase: 0.1, look: obrero(AMA) },
        { path: [at(BU - 0.8, vb + 0.95), at(BU - 0.22, vb + 0.85)], y: B + 5 * FL, speed: 0.06, phase: 0.6, look: obrero('#f4f4f2', '#e9e9e9', '#c8e03a') },
        { path: [at(BU - 0.75, vb + 0.5), at(BU + 0.7, vb + 0.5)], y: B + 3 * FL, speed: 0.08, phase: 0.3, look: obrero(AMA, '#d64545') },
        { path: [at(BU - D / 2 + 0.05, vb - 0.17), at(BU + D / 2 - 0.05, vb - 0.17)], y: B + 2 * FL + 0.006, speed: 0.07, phase: 0.45, look: obrero(AMA, '#2e9e6a') },
        { path: [at(-1.35, Y0 + 0.8), at(BU - 0.05, vb - 0.38)], speed: 0.09, phase: 0.2, look: obrero(AMA, '#f2c230', '#c8e03a') },
      );
      // algunos árboles fuera del cerco
      for (const [u, v] of [[-3.0, Y0 + 0.5], [-3.1, Y0 + 2.2], [3.0, Y0 + 1.0], [3.1, Y0 + 2.6], [-1.2, Y1 + 0.7], [1.6, Y1 + 0.8]]) tree(u, v, 0.9 + rnd() * 0.4);
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
      // dos guardaparques recorriendo el acceso, del pórtico al camping y de vuelta
      guardaparques.push(
        { path: [at(0.18, v0 - 0.35), at(0.18, v0 + 3.3)], speed: 0.16, phase: 0 },
        { path: [at(-0.06, v0 - 0.2), at(-0.06, v0 + 3.45)], speed: 0.16, phase: 0.04 },
      );
      // monte alrededor
      for (const [u, v] of [[-2.6, 1.0], [2.5, 0.8], [-2.9, 2.5], [2.9, 2.2], [-2.7, 4.0], [2.8, 4.2], [-2.0, 5.5], [2.2, 5.7], [0.4, 6.4], [-1.2, 7.0], [1.5, 6.4], [3.3, 3.2], [-3.4, 3.3], [-2.6, 7.4], [-4.0, 7.3], [-1.0, 5.2], [-4.6, 5.8], [-3.2, 5.6]]) {
        tree(u + (rnd() - 0.5) * 0.4, v0 + v + (rnd() - 0.5) * 0.4, 0.85 + rnd() * 0.45);
      }
    } else {
      // ---------- Paraje: un local al costado del camino (la cancha tiene su buffet) ----------
      if (p.id !== 'cancha') {
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
        // el buffet, al lado de la cancha, con el mostrador mirando al juego
        const BU = 2.25;
        {
          const { top, c: bc } = block(solids, unitBox, '#e6e1d6', BU, pv, 1.25, 0.42, 0.7);
          const gb = groundAt(bc.x, bc.z);
          // techo plano con alero hacia la cancha, sobre dos postes
          piece(solids, unitBox, '#2a3b55', BU - 0.15, pv, top - gb + 0.02, 1.45, 0.04, 1.05, 0, gb);
          for (const dv of [-0.6, 0.6]) piece(solids, unitBox, '#2a3b55', BU - 0.62, pv + dv, (top - gb) / 2, 0.035, top - gb, 0.035, 0, gb);
          // mostrador con la luz de adentro y el cartel arriba
          piece(glows, unitBox, '#ffdf9e', BU - 0.356, pv, 0.24, 0.8, 0.14, 0.01, 0, gb);
          piece(solids, unitBox, '#c9c2b3', BU - 0.4, pv, 0.13, 0.84, 0.03, 0.08, 0, gb);
          const ftex = canvasTexture(512, 128, drawBuffet);
          textures.push(ftex);
          ftex.userData.redraw();
          const fq = at(BU - 0.357, pv);
          textPlane(ftex, new THREE.Vector3(fq.x, gb + 0.36, fq.z), tan.clone().negate(), 0.7, 0.13, false, 0.004);
          // heladera de bebidas y mesas de plástico blancas bajo el alero
          piece(solids, unitBox, '#c0392b', BU - 0.42, pv + 0.52, 0.12, 0.14, 0.24, 0.08, 0, gb);
          for (const dv of [-0.35, 0.3]) {
            piece(solids, unitCyl, '#f2f2f2', BU - 0.62, pv + dv, 0.1, 0.17, 0.015, 0.17, 0, gb);
            piece(solids, unitCyl, '#dcdcdc', BU - 0.62, pv + dv, 0.05, 0.02, 0.1, 0.02, 0, gb);
          }
        }
        // el asado, detrás del buffet: la parrilla con las brasas y gente alrededor
        {
          const AU = BU + 0.75;
          const AV = pv - 0.25;
          const q = at(AU, AV);
          const ga = groundAt(q.x, q.z);
          piece(solids, unitBox, '#8a4b32', AU, AV, 0.09, 0.3, 0.18, 0.18, 0, ga); // base de ladrillo
          piece(solids, unitBox, '#2b2b2b', AU, AV, 0.19, 0.28, 0.02, 0.16, 0, ga); // parrilla
          piece(solids, unitBox, '#7a3a26', AU, AV, 0.21, 0.08, 0.02, 0.05, 0, ga); // la carne
          piece(solids, unitBox, '#7a3a26', AU, AV + 0.08, 0.21, 0.07, 0.02, 0.05, 0, ga);
          blinkers.push({ pos: new THREE.Vector3(q.x, ga + 0.24, q.z), color: '#ff8a3c', phase: 0, size: 0.45, steady: true });
          persona(AU + 0.12, AV + 0.22, { ropa: '#e9e9e9' }); // el asador
          persona(AU - 0.18, AV + 0.3);
          persona(AU + 0.3, AV - 0.05, { ropa: '#3a7bd5' });
          piece(solids, unitBox, '#7a5434', AU + 0.05, AV + 0.62, 0.11, 0.42, 0.03, 0.22, 0, ga); // mesa
          persona(AU - 0.12, AV + 0.62, { sentada: true });
          persona(AU + 0.22, AV + 0.62, { sentada: true });
        }
        // gente mirando el partido del lado de afuera de la cancha
        for (const [du, dv] of [[-0.9, -1.0], [-0.65, -1.02], [-0.1, -1.0], [0.15, -1.03], [0.75, -1.0], [-1.55, 0.25], [-1.55, -0.1]]) persona(du, pv + dv);
        // jugadores y pelota: se mueven en update()
        partidos.push({ pc: at(0, pv), tan: tan.clone(), side: side.clone(), y: py + 0.05 });
      }
    }
  });

  // ---------- Gente que camina: guardaparques, el mozo del café y clientes ----------
  const walkers = guardaparques.map((w) => {
    const r = makePerson(1.5, w.look);
    root.add(r.g);
    return { ...w, ...r };
  });

  // ---------- Jugadores de fútbol 5 ----------
  const CAMISETAS = [
    { camisa: '#e8692e', pantalon: '#1e1e1e', medias: '#e8692e', botas: '#111111', corto: true, pelo: '#2a1d14' },
    { camisa: '#f2f2f2', pantalon: '#1e4fa3', medias: '#f2f2f2', botas: '#111111', corto: true, pelo: '#3b2a1a' },
  ];
  const canchas = partidos.map((c) => {
    const jugadores = [0, 1, 2, 3].map((k) => {
      const r = makePerson(1.5, { ...CAMISETAS[k % 2], piel: ['#c99a72', '#8d5a3b', '#e0b48a', '#b07a52'][k] });
      root.add(r.g);
      // zona de cada uno: los naranjas de un lado, los blancos del otro
      const base = [[-0.55, -0.25], [0.55, 0.2], [-0.35, 0.3], [0.45, -0.3]][k];
      return { ...r, base, ph: k * 1.7 };
    });
    const pelota = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshLambertMaterial({ color: '#ffffff' }));
    root.add(pelota);
    return { ...c, jugadores, pelota };
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
      // fútbol 5: cada jugador corre por su zona; la pelota va de uno a otro con un pique
      for (const c of canchas) {
        const toW = (u, v) => [c.pc.x + c.tan.x * u + c.side.x * v, c.pc.z + c.tan.z * u + c.side.z * v];
        const pos = c.jugadores.map((j) => {
          const u = j.base[0] + Math.sin(time * 0.9 + j.ph) * 0.32;
          const v = j.base[1] + Math.sin(time * 0.7 + j.ph * 1.3) * 0.22;
          return toW(u, v);
        });
        const T = 1.3; // un pase cada 1,3 s
        const n = Math.floor(time / T);
        const f = time / T - n;
        const ORDEN = [0, 2, 1, 3];
        const from = ORDEN[n % 4];
        const to = ORDEN[(n + 1) % 4];
        const bx = pos[from][0] + (pos[to][0] - pos[from][0]) * f;
        const bz = pos[from][1] + (pos[to][1] - pos[from][1]) * f;
        c.pelota.position.set(bx, c.y + 0.05 + Math.sin(Math.PI * f) * 0.12, bz);
        c.jugadores.forEach((j, k) => {
          const [x, z] = pos[k];
          j.g.position.set(x, c.y, z);
          j.g.rotation.y = Math.atan2(bx - x, bz - z); // miran la pelota
          const sw = Math.sin(time * 11 + j.ph) * 0.7;
          // el que patea levanta la pierna al soltar la pelota
          const patea = k === from && f < 0.15 ? -1.1 * (1 - f / 0.15) : 0;
          j.legs[0].rotation.x = sw;
          j.legs[1].rotation.x = patea || -sw;
          j.arms[0].rotation.x = -sw * 0.7;
          j.arms[1].rotation.x = sw * 0.7;
        });
      }
      // grúas: levantan un pallet de ladrillos de la pila, giran y lo bajan en la losa del techo
      for (const g of gruas) {
        const f = (time / 28 + g.phase) % 1;
        const ss = (a, b, x) => {
          const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
          return t * t * (3 - 2 * t);
        };
        const bump = (t) => (1 - Math.cos(Math.PI * 2 * t)) / 2; // 0 → 1 → 0
        let k;
        let yH; // altura del fondo de la carga
        let cargado;
        if (f < 0.12) {
          k = 0;
          yH = g.hi + (g.yA - g.hi) * bump(f / 0.12);
          cargado = f > 0.06;
        } else if (f < 0.45) {
          k = ss(0.12, 0.45, f);
          yH = g.hi;
          cargado = true;
        } else if (f < 0.58) {
          k = 1;
          yH = g.hi + (g.yB - g.hi) * bump((f - 0.45) / 0.13);
          cargado = f < 0.515;
        } else {
          k = 1 - ss(0.58, 1, f);
          yH = g.hi;
          cargado = false;
        }
        g.cabeza.rotation.y = g.thA + g.dTh * k;
        const r = g.rA + (g.rB - g.rA) * k;
        g.carro.position.set(r, -0.03, 0);
        const yl = yH - g.HJ; // en coordenadas de la cabeza (negativo: debajo de la pluma)
        const top = -0.05;
        const bot = yl + 0.15;
        g.cable.position.set(r, (top + bot) / 2, 0);
        g.cable.scale.set(0.006, Math.max(top - bot, 0.001), 0.006);
        g.gancho.position.set(r, yl, 0);
        g.carga.visible = cargado;
      }
      for (const t of tambores) t.rotation.z = time * 1.6;
      // van y vuelven por su recorrido, mirando hacia donde caminan y moviendo piernas y brazos
      for (const w of walkers) {
        const [a0, a1] = w.path;
        const len = Math.hypot(a1.x - a0.x, a1.z - a0.z);
        const cyc = ((time * w.speed) / len + w.phase) % 2;
        const ida = cyc < 1;
        const f = ida ? cyc : 2 - cyc;
        // un respiro en cada punta: se frenan y dan la vuelta
        const e = f < 0.04 ? 0 : f > 0.96 ? 1 : (f - 0.04) / 0.92;
        const x = a0.x + (a1.x - a0.x) * e;
        const z = a0.z + (a1.z - a0.z) * e;
        w.g.position.set(x, w.y ?? height(x, z), z); // y: los que caminan por una losa o el andamio
        const dx = (a1.x - a0.x) * (ida ? 1 : -1);
        const dz = (a1.z - a0.z) * (ida ? 1 : -1);
        w.g.rotation.y = Math.atan2(dx, dz);
        const moving = e > 0 && e < 1;
        const sw = moving ? Math.sin(time * 9 + w.phase * 40) * 0.6 : 0;
        w.legs[0].rotation.x = sw;
        w.legs[1].rotation.x = -sw;
        w.arms[0].rotation.x = -sw * 0.8;
        w.arms[1].rotation.x = sw * 0.8;
      }
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
