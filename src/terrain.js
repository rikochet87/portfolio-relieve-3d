// Versión "relieve": un mapa topográfico 3D donde cada proyecto es un cerro con su marcador.
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildPlaces } from './places.js';

const SIZE = 130; // lado del terreno en unidades (1 unidad = 100 m en el HUD)
const SEG = 260;
const WATER = 0.35;
const BG = new THREE.Color('#060a10');
const MARKER_SCALE = 0.6; // tamaño de los marcadores de proyecto (1 = tamaño original)

// Ubicación de cada proyecto en el mapa (x, z) y altura de su cerro.
// La ruta los recorre en orden de creación (campo `since` de projects.js), así que van
// alrededor del centro en ese mismo orden, en sentido horario visto desde arriba: el camino
// no se cruza. Los destacados son localidades más altas.
const SITES = {
  'equipos-viales': { x: 23, z: 18, h: 8 },
  'sig-vial': { x: 6, z: 14, h: 12.5 },
  racha: { x: -14, z: 18, h: 7 },
  calcuobra: { x: -28, z: 4, h: 8.5 },
  aion: { x: -20, z: -14, h: 11 },
  trazocad: { x: 2, z: -22, h: 11 },
  cancha: { x: 20, z: -24, h: 7.5 },
  tropico: { x: 31, z: -11, h: 7.5 },
  actas: { x: 32, z: 4, h: 7.5 },
};

// ---------- Función de altura (la misma para la malla, los marcadores, el camino y el HUD) ----------
function hash2(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, oct = 5) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x * f + 17.3, z * f - 4.1);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}
const smooth = (e0, e1, x) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};

function makeHeight(sites) {
  return (x, z) => {
    const n = fbm(x * 0.045, z * 0.045);
    const ridge = 1 - Math.abs(fbm(x * 0.03 + 40, z * 0.03 - 12, 4) * 2 - 1);
    let h = n * 6.5 + ridge * ridge * 3 - 3;
    for (const s of sites) {
      const dx = x - s.x;
      const dz = z - s.z;
      const sig = 5.2 + s.h * 0.25;
      h += s.h * Math.exp(-(dx * dx + dz * dz) / (2 * sig * sig));
    }
    const r = Math.hypot(x, z) / (SIZE * 0.5);
    h = h * (1 - smooth(0.55, 0.98, r)) - smooth(0.8, 1.0, r) * 0.6;
    return h;
  };
}

const TERRAIN_VERT = /* glsl */ `
  uniform float uRise;
  varying vec3 vW;
  varying vec3 vN;
  void main() {
    vec3 p = position;
    p.y *= uRise;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz;
    vN = normal;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const TERRAIN_FRAG = /* glsl */ `
  uniform vec3 uBg;
  uniform float uMaxH;
  uniform float uRadius;
  uniform float uRise;
  varying vec3 vW;
  varying vec3 vN;
  void main() {
    float h = vW.y;
    float t = clamp(h / (uMaxH * max(uRise, 0.001)), 0.0, 1.0);
    // tintas hipsométricas oscuras
    vec3 c = mix(vec3(0.05, 0.13, 0.11), vec3(0.09, 0.21, 0.12), smoothstep(0.0, 0.25, t));
    c = mix(c, vec3(0.20, 0.19, 0.12), smoothstep(0.3, 0.65, t));
    c = mix(c, vec3(0.46, 0.41, 0.32), smoothstep(0.7, 1.0, t));
    // sombreado de relieve (luz desde el noroeste, como un hillshade clásico)
    vec3 L = normalize(vec3(-1.0, 1.3, -1.0));
    float hs = clamp(dot(normalize(vN), L), 0.0, 1.0);
    c *= 0.3 + hs * 1.0;
    // curvas de nivel: normales cada 0,9 y maestras cada 4,5
    float f = h / 0.9;
    float line = 1.0 - smoothstep(fwidth(f) * 0.5, fwidth(f) * 1.5, abs(fract(f - 0.5) - 0.5));
    float f5 = h / 4.5;
    float line5 = 1.0 - smoothstep(0.0, fwidth(f5) * 1.8, abs(fract(f5 - 0.5) - 0.5));
    vec3 lc = mix(vec3(0.35, 0.85, 0.75), vec3(1.0, 0.76, 0.42), smoothstep(0.45, 0.9, t));
    c = mix(c, lc, clamp(line * 0.32 + line5 * 0.75, 0.0, 1.0) * step(0.02, h));
    // cuadrícula cada 1 km
    vec2 g = vW.xz / 10.0;
    vec2 gl = 1.0 - smoothstep(vec2(0.0), fwidth(g) * 1.0, abs(fract(g - 0.5) - 0.5));
    c += vec3(0.5, 0.6, 1.0) * max(gl.x, gl.y) * 0.07;
    // borde circular que se funde con el fondo
    float r = length(vW.xz) / uRadius;
    c = mix(c, uBg, smoothstep(0.7, 0.98, r));
    gl_FragColor = vec4(c, 1.0);
  }
`;

const WATER_VERT = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const WATER_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uRadius;
  varying vec3 vW;
  void main() {
    float r = length(vW.xz) / uRadius;
    float rip = 0.5 + 0.5 * sin(vW.x * 1.3 + uTime * 0.8) * sin(vW.z * 1.1 - uTime * 0.6);
    vec3 c = mix(vec3(0.03, 0.12, 0.2), vec3(0.08, 0.26, 0.38), rip * 0.5);
    float a = 0.82 * (1.0 - smoothstep(0.66, 0.95, r));
    gl_FragColor = vec4(c, a);
  }
`;

// Ruta: vUv.x = distancia a lo largo (unidades), vUv.y = 0..1 de banquina a banquina
const ROAD_VERT = /* glsl */ `
  uniform float uRise;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.y *= uRise;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const ROAD_FRAG = /* glsl */ `
  uniform float uEdge;   // dónde termina la calzada y empieza la banquina (0..1 desde el eje)
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    float acr = abs(vUv.y - 0.5) * 2.0;          // 0 en el eje, 1 en el borde de la banquina
    float aa = fwidth(acr) * 1.2;
    float grain = (hash(floor(vUv * vec2(14.0, 40.0))) - 0.5) * 0.035;
    vec3 asphalt = vec3(0.15, 0.16, 0.18) + grain;
    vec3 gravel = vec3(0.36, 0.31, 0.24) + grain * 2.0;
    vec3 c = mix(asphalt, gravel, smoothstep(uEdge - aa, uEdge + aa, acr));
    // líneas de borde blancas
    float edgeLine = 1.0 - smoothstep(0.035, 0.035 + aa, abs(acr - uEdge * 0.86));
    c = mix(c, vec3(0.86, 0.88, 0.9), edgeLine * 0.85);
    // línea central amarilla discontinua
    float dash = step(0.42, fract(vUv.x * 0.8));
    float center = (1.0 - smoothstep(0.04, 0.04 + aa, acr)) * dash;
    c = mix(c, vec3(1.0, 0.78, 0.28), center);
    // la banquina se funde con el terreno
    float fade = 1.0 - smoothstep(0.9, 1.0, acr);
    gl_FragColor = vec4(c, fade);
  }
`;

function glowTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.4, outer);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Nivel de calidad inicial según el equipo. Celulares y equipos modestos arrancan con
// terreno menos denso, menos resolución y la mitad de la vegetación.
function pickQuality() {
  const dpr = window.devicePixelRatio || 1;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  const low = coarse || cores <= 4 || mem <= 4;
  return low
    ? { name: 'baja', seg: 170, maxDpr: 1.5, veg: 0.5, antialias: dpr < 1.5 }
    : { name: 'alta', seg: SEG, maxDpr: 2, veg: 1, antialias: true };
}

// Cede el control al navegador un cuadro, para que el cargador siga animado entre etapas pesadas.
const yieldFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

export async function createTerrain({ canvas, projects, reducedMotion, lang = 'es', onSelect, onHover, onFrame }) {
  const quality = pickQuality();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.antialias, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxDpr));
  renderer.setClearColor(BG, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 1000);
  if (import.meta.env.DEV) window.__relieve = { scene, renderer, camera };
  const controls = new MapControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.screenSpacePanning = false;
  controls.minDistance = 10;
  controls.maxDistance = 150;
  controls.maxPolarAngle = 1.3;
  controls.autoRotateSpeed = 0.2;
  controls.autoRotate = !reducedMotion;

  const clock = new THREE.Clock();
  const uTime = { value: 0 };
  const uRise = { value: reducedMotion ? 1 : 0 };

  const sites = projects.map((p) => ({ ...(SITES[p.id] || { x: 0, z: 0, h: 6 }), id: p.id }));
  const rawHeight = makeHeight(sites);

  // ---------- Trazado de la ruta ----------
  // La ruta pasa por todos los proyectos en orden de creación: el primero es el km 0. El perfil
  // longitudinal se suaviza (pendientes razonables), nunca baja del agua (terraplén) y el terreno
  // se nivela debajo.
  const ROUTE = [...projects].sort((a, b) => (a.since || '').localeCompare(b.since || '')).map((p) => p.id);
  const routeSites = ROUTE.map((id) => sites.find((s) => s.id === id)).filter(Boolean);
  const curve = new THREE.CatmullRomCurve3(routeSites.map((s) => new THREE.Vector3(s.x, 0, s.z)), true, 'centripetal');
  const ROAD_W = 0.55; // semiancho de calzada
  const SHOULDER = 0.25; // banquina
  const NS = 1400;
  const roadPts = [];
  for (let i = 0; i < NS; i++) {
    const p = curve.getPointAt(i / NS);
    roadPts.push({ x: p.x, z: p.z, h: rawHeight(p.x, p.z) });
  }
  for (let pass = 0; pass < 4; pass++) {
    const hs = roadPts.map((p) => p.h);
    const K = 14;
    for (let i = 0; i < NS; i++) {
      let s = 0;
      for (let k = -K; k <= K; k++) s += hs[(i + k + NS) % NS];
      roadPts[i].h = s / (2 * K + 1);
    }
  }
  for (const p of roadPts) p.h = Math.max(p.h, WATER + 0.3);

  const CELL = 2.5;
  const grid = new Map();
  roadPts.forEach((p, i) => {
    const key = `${Math.floor(p.x / CELL)},${Math.floor(p.z / CELL)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(i);
  });
  function nearestRoad(x, z) {
    const cx = Math.floor(x / CELL);
    const cz = Math.floor(z / CELL);
    let best = null;
    let bd = Infinity;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const list = grid.get(`${cx + i},${cz + j}`);
        if (!list) continue;
        for (const k of list) {
          const p = roadPts[k];
          const d = (p.x - x) ** 2 + (p.z - z) ** 2;
          if (d < bd) {
            bd = d;
            best = p;
          }
        }
      }
    }
    return best ? { d: Math.sqrt(bd), h: best.h } : null;
  }
  const BLEND = 1.7;
  const height = (x, z) => {
    const raw = rawHeight(x, z);
    const r = nearestRoad(x, z);
    if (!r || r.d > ROAD_W + SHOULDER + BLEND) return raw;
    const b = 1 - smooth(ROAD_W + SHOULDER * 0.5, ROAD_W + SHOULDER + BLEND, r.d);
    return raw + (r.h - 0.05 - raw) * b;
  };

  // ---------- Terreno ----------
  await yieldFrame();
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, quality.seg, quality.seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  let maxH = 0;
  for (let i = 0; i < pos.count; i++) {
    const h = height(pos.getX(i), pos.getZ(i));
    pos.setY(i, h);
    if (h > maxH) maxH = h;
  }
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(
    geo,
    new THREE.ShaderMaterial({
      vertexShader: TERRAIN_VERT,
      fragmentShader: TERRAIN_FRAG,
      uniforms: { uBg: { value: new THREE.Vector3(6 / 255, 10 / 255, 16 / 255) }, uMaxH: { value: maxH }, uRadius: { value: SIZE * 0.5 }, uRise },
    })
  );
  scene.add(terrain);

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(SIZE * 0.5, 96).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, uniforms: { uTime, uRadius: { value: SIZE * 0.5 } }, transparent: true, depthWrite: false })
  );
  scene.add(water);

  // ---------- Ruta: calzada + banquinas, plana en sentido transversal ----------
  const roadHeightAt = (t) => {
    const f = (((t % 1) + 1) % 1) * NS;
    const i = Math.floor(f);
    const a = roadPts[i % NS].h;
    const b = roadPts[(i + 1) % NS].h;
    return a + (b - a) * (f - i);
  };
  {
    const L = curve.getLength();
    const OFF = [-(ROAD_W + SHOULDER), -ROAD_W, 0, ROAD_W, ROAD_W + SHOULDER];
    const verts = [];
    const uvs = [];
    const idx = [];
    for (let i = 0; i <= NS; i++) {
      const t = i / NS;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const h = roadPts[i % NS].h;
      OFF.forEach((o, j) => {
        const shoulder = j === 0 || j === OFF.length - 1;
        verts.push(p.x + side.x * o, h + (shoulder ? 0.03 : 0.06), p.z + side.z * o);
        uvs.push(t * L, (o + ROAD_W + SHOULDER) / (2 * (ROAD_W + SHOULDER)));
      });
      if (i < NS) {
        const a = i * OFF.length;
        const b = a + OFF.length;
        for (let j = 0; j < OFF.length - 1; j++) idx.push(a + j, b + j, a + j + 1, a + j + 1, b + j, b + j + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    const road = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        vertexShader: ROAD_VERT,
        fragmentShader: ROAD_FRAG,
        uniforms: { uRise, uEdge: { value: ROAD_W / (ROAD_W + SHOULDER) } },
        transparent: true,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    road.userData.isRoad = true;
    scene.add(road);
  }

  // ---------- Luz (solo para vegetación y vehículos; el terreno tiene su propio sombreado) ----------
  scene.add(new THREE.HemisphereLight(0xa8c0ff, 0x1c2a1c, 1.3));
  const sunLight = new THREE.DirectionalLight(0xfff0dc, 2.2);
  sunLight.position.set(-30, 40, -30);
  scene.add(sunLight);

  // ---------- Vegetación y rocas (instanciadas) ----------
  function part(geo, color, y, sx = 1, sy = 1, sz = 1) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    g.deleteAttribute('uv');
    g.scale(sx, sy, sz);
    g.translate(0, y, 0);
    const c = new THREE.Color(color);
    const col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < col.length; i += 3) col.set([c.r, c.g, c.b], i);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }
  const KINDS = {
    // algarrobo / quebracho: copa ancha
    broadleaf: mergeGeometries([
      part(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 5), '#5c4532', 0.25),
      part(new THREE.IcosahedronGeometry(0.42, 0), '#3f7c40', 0.78, 1.1, 0.8, 1.1),
      part(new THREE.IcosahedronGeometry(0.28, 0), '#4f9447', 1.02, 1, 0.8, 1),
    ]),
    // árbol alto de copa angosta
    tall: mergeGeometries([
      part(new THREE.CylinderGeometry(0.04, 0.06, 0.7, 5), '#5a4330', 0.35),
      part(new THREE.IcosahedronGeometry(0.3, 0), '#2f6d42', 1.0, 1, 1.7, 1),
    ]),
    // palmera caranday, cerca del agua
    palm: mergeGeometries([
      part(new THREE.CylinderGeometry(0.03, 0.05, 1.15, 5), '#7d6244', 0.57),
      part(new THREE.ConeGeometry(0.55, 0.22, 7).rotateX(Math.PI), '#5e9e4a', 1.16),
    ]),
    bush: part(new THREE.IcosahedronGeometry(0.22, 0), '#3e7a3a', 0.12, 1.2, 0.7, 1.2),
    rock: part(new THREE.DodecahedronGeometry(0.22, 0), '#857b6c', 0.07, 1, 0.6, 1),
  };
  const CAPS = { broadleaf: 2600, tall: 1200, palm: 500, bush: 1800, rock: 220 };
  for (const kind in CAPS) CAPS[kind] = Math.round(CAPS[kind] * quality.veg);
  await yieldFrame();
  const vegSpots = { broadleaf: [], tall: [], palm: [], bush: [], rock: [] };
  {
    let seed = 1234567;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const R = SIZE * 0.5 * 0.68;
    const add = (kind, x, z, h, s) => {
      if (vegSpots[kind].length < CAPS[kind]) vegSpots[kind].push({ x, z, h, s, r: rnd() * Math.PI * 2, tint: 0.8 + rnd() * 0.4 });
    };
    for (let i = 0; i < 26000; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = Math.sqrt(rnd()) * R;
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      const h = height(x, z);
      if (h < WATER + 0.12) continue;
      const road = nearestRoad(x, z);
      if (road && road.d < ROAD_W + SHOULDER + 0.45) continue;
      if (sites.some((s) => Math.hypot(x - s.x, z - s.z) < 6.2)) continue; // lugar para el pueblo, la estación o el local
      const slope = Math.hypot(height(x + 0.4, z) - height(x - 0.4, z), height(x, z + 0.4) - height(x, z - 0.4)) / 0.8;
      const forest = fbm(x * 0.07 + 100, z * 0.07 - 50, 3);
      const edgeFade = 1 - smooth(0.8, 1, rr / R); // menos densidad hacia el borde del mapa
      if (rnd() > edgeFade) continue;
      if (h < WATER + 2.2) {
        // palmares en las zonas bajas, como en el Chaco
        if (rnd() < 0.35) add('palm', x, z, h, 0.8 + rnd() * 0.5);
        else if (rnd() < 0.3) add('bush', x, z, h, 0.8 + rnd() * 0.6);
      } else if (h > 10 || slope > 2.2) {
        if (rnd() < 0.12) add('rock', x, z, h, 0.7 + rnd() * 1.1);
        else if (rnd() < 0.25) add('bush', x, z, h, 0.6 + rnd() * 0.5);
      } else if (forest > 0.5) {
        if (rnd() < 0.68) add('broadleaf', x, z, h, 0.8 + rnd() * 0.6);
        else add('tall', x, z, h, 0.8 + rnd() * 0.6);
      } else if (forest > 0.42) {
        if (rnd() < 0.3) add('bush', x, z, h, 0.7 + rnd() * 0.6);
        else if (rnd() < 0.08) add('broadleaf', x, z, h, 0.8 + rnd() * 0.5);
      } else if (rnd() < 0.025) {
        add('broadleaf', x, z, h, 0.9 + rnd() * 0.5);
      }
    }
  }
  const vegMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const vegMeshes = Object.entries(vegSpots).map(([kind, spots]) => {
    const mesh = new THREE.InstancedMesh(KINDS[kind], vegMat, spots.length);
    const c = new THREE.Color();
    spots.forEach((s, i) => mesh.setColorAt(i, c.setScalar(s.tint)));
    mesh.userData.spots = spots;
    scene.add(mesh);
    return mesh;
  });
  const dummy = new THREE.Object3D();
  function placeVegetation(rise) {
    for (const mesh of vegMeshes) {
      mesh.userData.spots.forEach((s, i) => {
        dummy.position.set(s.x, s.h * rise - 0.02, s.z);
        dummy.rotation.set(0, s.r, 0);
        dummy.scale.setScalar(s.s * (0.25 + 0.75 * rise));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  placeVegetation(uRise.value);

  // ---------- Vehículos circulando (mano derecha) ----------
  const cars = [];
  {
    const bodyColors = ['#d8dde3', '#c0392b', '#2e86de', '#f1c40f', '#e67e22', '#ecf0f1', '#16a085', '#8e44ad'];
    const head = glowTexture('rgba(255,250,225,1)', 'rgba(255,230,160,0.35)');
    const tail = glowTexture('rgba(255,80,60,1)', 'rgba(255,40,30,0.3)');
    const carMat = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.13, 0.48), carMat(bodyColors[i % bodyColors.length]));
      body.position.y = 0.1;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.24), carMat('#1d2530'));
      cabin.position.set(0, 0.21, -0.03);
      const hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: head, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      hl.position.set(0, 0.12, 0.3);
      hl.scale.setScalar(0.6);
      const tl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tail, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      tl.position.set(0, 0.12, -0.27);
      tl.scale.setScalar(0.32);
      g.add(body, cabin, hl, tl);
      g.scale.setScalar(1.5);
      scene.add(g);
      cars.push({ g, t0: i / 9, dir: i % 2 ? 1 : -1, speed: 0.0035 + (i % 3) * 0.0012 });
    }
  }
  const carPos = new THREE.Vector3();
  const carTan = new THREE.Vector3();
  function moveCars(time, rise) {
    for (const c of cars) {
      const t = (((c.t0 + time * c.speed * c.dir) % 1) + 1) % 1;
      curve.getPointAt(t, carPos);
      curve.getTangentAt(t, carTan).multiplyScalar(c.dir);
      // carril derecho según el sentido de circulación
      const lane = ROAD_W * 0.48;
      carPos.x += -carTan.z * lane;
      carPos.z += carTan.x * lane;
      carPos.y = (roadHeightAt(t) + 0.06) * rise;
      c.g.position.copy(carPos);
      c.g.lookAt(carPos.x + carTan.x, carPos.y, carPos.z + carTan.z);
      c.g.visible = rise > 0.9;
    }
  }

  // ---------- Lugares sobre la ruta: localidades, estaciones de servicio y parajes ----------
  if (document.fonts?.load) {
    // los carteles se dibujan en un canvas: esperar la tipografía, pero sin trabar la carga
    await Promise.race([Promise.all(['700 64px "Space Grotesk"', '500 40px "Space Grotesk"'].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
  }
  const places = buildPlaces({ projects, sites: routeSites, curve, height, water: WATER, roadHalf: ROAD_W + SHOULDER, lang, quality });
  scene.add(places.root);

  // punto blanco del pin: un círculo nítido
  const dotTexture = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(32, 32, 28, 0, Math.PI * 2);
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  // ---------- Marcadores ----------
  const markers = projects.map((proj) => {
    const s = SITES[proj.id] || { x: 0, z: 0 };
    const color = new THREE.Color(proj.color);
    const ground = height(s.x, s.z);
    const group = new THREE.Group();
    group.position.set(s.x, 0, s.z);
    scene.add(group);

    // columna de luz desde el suelo hasta el marcador
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1, 8, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    group.add(beam);

    // cabeza: un pin de mapa del color del proyecto, con el punto blanco al medio
    const headGeo = mergeGeometries([new THREE.SphereGeometry(0.8, 20, 14), new THREE.ConeGeometry(0.69, 1.35, 20, 1, true).rotateX(Math.PI).translate(0, -0.95, 0)]);
    const head = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color }));
    const edges = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture, color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    edges.scale.setScalar(0.85);
    edges.renderOrder = 11;
    head.add(edges);
    const shell = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.05, 6, 48).rotateX(Math.PI / 2).translate(0, -1.85, 0), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 }));
    // halo que se ve a través de árboles y cerros, para no perder nunca un proyecto de vista
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,255,255,0.95)', `rgba(${(color.r * 255) | 0},${(color.g * 255) | 0},${(color.b * 255) | 0},0.45)`), color, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(6.5);
    glow.renderOrder = 10;
    const hit = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    // el área de click no se achica con el marcador, para que siga siendo fácil de tocar
    hit.scale.setScalar(1 / MARKER_SCALE);
    const headGroup = new THREE.Group();
    headGroup.add(head, shell, glow, hit);
    group.add(headGroup);

    // base fija + pulso en el suelo
    const base = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 1.25, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false, side: THREE.DoubleSide })
    );
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 1.25, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, depthTest: false, side: THREE.DoubleSide })
    );
    base.renderOrder = ring.renderOrder = 9;
    group.add(base, ring);

    hit.userData.id = proj.id;
    return { id: proj.id, orbit: proj.orbit, ground, group, beam, head, edges, shell, glow, headGroup, base, ring, hit, hover: 0, dim: 0, phase: Math.random() * 10 };
  });

  // ---------- HUD estilo SIG (si la página lo trae) ----------
  const hud = document.getElementById('hud');
  const hudCoords = document.getElementById('hud-coords');
  const hudNorth = document.getElementById('hud-north');
  const hudBar = document.getElementById('hud-scale-bar');
  const hudScale = document.getElementById('hud-scale-label');
  const fmt = (n) => Math.round(n).toLocaleString('es-AR');

  // ---------- Cámara ----------
  const home = new THREE.Vector3();
  const homeTarget = new THREE.Vector3(0, 0, 0);
  const camGoal = new THREE.Vector3();
  const targetGoal = new THREE.Vector3();
  let flying = false;
  let focused = null;
  let portrait = false;
  const viewShift = { x: 0, y: 0 };
  let viewShiftGoal = { x: 0, y: 0 };

  function computeHome() {
    portrait = camera.aspect < 0.9;
    const elev = THREE.MathUtils.degToRad(portrait ? 58 : 40);
    let dist = 84;
    // en pantallas anchas el mapa se corre a la derecha para dejar lugar al título
    homeTarget.set(portrait ? 0 : -14 * Math.min(1, (camera.aspect - 0.9) / 1.1), 0, portrait ? 0 : 2);
    if (portrait) {
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
      dist = 47 / tanH;
    }
    home.set(homeTarget.x, Math.sin(elev) * dist, Math.cos(elev) * dist);
    controls.maxDistance = Math.max(150, dist * 1.4);
  }

  function flyTo(p, t) {
    camGoal.copy(p);
    targetGoal.copy(t);
    flying = true;
    controls.enabled = false;
    if (reducedMotion) {
      camera.position.copy(p);
      controls.target.copy(t);
    }
  }

  function headPos(m, out = new THREE.Vector3()) {
    return m.headGroup.getWorldPosition(out);
  }

  function focus(id) {
    const m = markers.find((x) => x.id === id);
    if (!m) return;
    focused = m;
    controls.autoRotate = false;
    const target = new THREE.Vector3(m.group.position.x, m.ground + 2.6, m.group.position.z);
    // acercarse desde el lado donde ya está la cámara, para que el vuelo sea corto
    const dir = camera.position.clone().sub(controls.target).setY(0);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    dir.normalize();
    const dist = portrait ? 44 : 25;
    const el = THREE.MathUtils.degToRad(34);
    const camPos = target.clone().addScaledVector(dir, Math.cos(el) * dist).add(new THREE.Vector3(0, Math.sin(el) * dist, 0));
    flyTo(camPos, target);
    updateViewShiftGoal();
  }

  function unfocus() {
    focused = null;
    flyTo(home, homeTarget);
    updateViewShiftGoal();
  }

  // Mismo criterio que la versión galaxia: el panel tapa una parte de la pantalla y la vista se corre.
  function updateViewShiftGoal() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const shortLandscape = h <= 500 && w > h;
    if (!focused) {
      if (portrait) viewShiftGoal = { x: 0, y: -h * 0.12 };
      else if (shortLandscape) viewShiftGoal = { x: 0, y: -h * 0.1 }; // el corrimiento a la derecha ya lo da homeTarget
      else viewShiftGoal = { x: 0, y: 0 };
      return;
    }
    if (shortLandscape) viewShiftGoal = { x: w * 0.26, y: 0 };
    else if (w <= 760) viewShiftGoal = { x: 0, y: h * 0.31 };
    else viewShiftGoal = { x: Math.min(480, w) / 2, y: 0 };
  }

  function applyViewShift() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (Math.abs(viewShift.x) < 0.5 && Math.abs(viewShift.y) < 0.5 && !viewShiftGoal.x && !viewShiftGoal.y) camera.clearViewOffset();
    else camera.setViewOffset(w, h, viewShift.x, viewShift.y, w, h);
  }

  // ---------- Filtros ----------
  let filter = null;
  const setFilter = (orbit) => (filter = orbit);

  // ---------- Interacción ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null;
  let downAt = null;
  let lastPointer = null;

  function setRay(e) {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
  }
  function pick(e) {
    setRay(e);
    const hits = raycaster.intersectObjects(markers.map((m) => m.hit), false);
    return hits.length ? markers.find((m) => m.hit === hits[0].object) : null;
  }
  function setHovered(m) {
    if (m === hovered) return;
    hovered = m;
    canvas.style.cursor = m ? 'pointer' : '';
    onHover?.(m ? m.id : null);
  }

  // Coordenadas bajo el cursor: se marcha a lo largo del rayo hasta tocar el terreno.
  function groundUnderRay() {
    const o = raycaster.ray.origin;
    const d = raycaster.ray.direction;
    if (d.y >= 0) return null;
    let prev = 0;
    for (let t = 0; t < 400; t += 1.0) {
      const x = o.x + d.x * t;
      const z = o.z + d.z * t;
      const y = o.y + d.y * t;
      const g = Math.max(height(x, z), WATER) * uRise.value;
      if (y <= g) {
        // refinar entre prev y t
        let a = prev;
        let b = t;
        for (let k = 0; k < 8; k++) {
          const m = (a + b) / 2;
          const yx = o.y + d.y * m;
          const gx = Math.max(height(o.x + d.x * m, o.z + d.z * m), WATER) * uRise.value;
          if (yx <= gx) b = m;
          else a = m;
        }
        const x2 = o.x + d.x * b;
        const z2 = o.z + d.z * b;
        if (Math.hypot(x2, z2) > SIZE * 0.47) return null;
        return { x: x2, z: z2, h: height(x2, z2) };
      }
      prev = t;
    }
    return null;
  }

  // el HUD se recalcula solo cuando cambia algo (mouse o cámara), no en cada cuadro
  let hudDirty = true;
  controls.addEventListener('change', () => (hudDirty = true));

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    lastPointer = e;
    hudDirty = true;
    setHovered(pick(e));
  });
  canvas.addEventListener('pointerleave', () => {
    setHovered(null);
    lastPointer = null;
  });
  canvas.addEventListener('pointerdown', (e) => {
    downAt = { x: e.clientX, y: e.clientY };
    controls.autoRotate = false;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 6) return;
    const m = pick(e);
    if (m) onSelect?.(m.id);
    else if (focused) onSelect?.(null);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    computeHome();
    updateViewShiftGoal();
    hudDirty = true;
  }
  window.addEventListener('resize', resize);
  resize();

  // Intro: vista cenital del mapa plano; el relieve se levanta mientras la cámara se inclina.
  // El vuelo arranca recién cuando todo está compilado (ver más abajo).
  camera.position.set(homeTarget.x, 150, 2);
  controls.target.copy(homeTarget);
  camera.lookAt(homeTarget);

  const screen = new THREE.Vector3();
  const labelData = markers.map((m) => ({ id: m.id, x: 0, y: 0, visible: false, dim: false }));
  const noSun = { x: 0, y: 0, visible: false };
  const tmpV = new THREE.Vector3();
  const limit = SIZE * 0.4;

  let lastVegRise = -1;
  const stats = { js: 0, render: 0, n: 0, quality: quality.name, perfLevel: 0 };
  if (import.meta.env.DEV) window.__relieve.stats = stats;

  // ---------- Ajuste de calidad en marcha ----------
  // Si los cuadros por segundo quedan por debajo de 40 durante 2 s, se baja un escalón.
  // Solo baja (nunca sube) para no oscilar. Se ignoran cuadros de más de 250 ms:
  // son pestañas en segundo plano o tirones puntuales, no falta de potencia.
  const perf = { time: 0, frames: 0, warmup: 1.5, level: 0 };
  function degrade() {
    perf.level++;
    stats.perfLevel = perf.level;
    if (perf.level === 1 || perf.level === 3) {
      renderer.setPixelRatio(Math.max(perf.level === 1 ? 1 : 0.75, renderer.getPixelRatio() * 0.75));
      resize();
    } else if (perf.level === 2) {
      for (const mesh of vegMeshes) mesh.count = Math.floor(mesh.userData.spots.length * 0.5);
    }
  }
  function trackPerf(rawDt) {
    if (perf.level >= 3 || rawDt > 0.25 || document.visibilityState !== 'visible') return;
    if (perf.warmup > 0) return void (perf.warmup -= rawDt);
    perf.time += rawDt;
    perf.frames++;
    if (perf.time >= 2) {
      if (perf.frames / perf.time < 40) {
        degrade();
        perf.warmup = 1;
      }
      perf.time = 0;
      perf.frames = 0;
    }
  }

  // Precompilar shaders y subir la geometría a la GPU antes de mostrar nada:
  // así el primer cuadro no se traba y la entrada arranca fluida.
  await yieldFrame();
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);
  clock.getDelta(); // descartar el tiempo de carga para que el primer paso de la animación sea normal
  flyTo(home, homeTarget);

  renderer.setAnimationLoop(() => {
    const tStart = performance.now();
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    trackPerf(rawDt);
    uTime.value += dt;
    const k = 1 - Math.exp(-dt * 2.6);
    if (uRise.value < 1) uRise.value = Math.min(1, uRise.value + dt * 0.45);
    const rise = uRise.value * uRise.value * (3 - 2 * uRise.value);
    water.position.y = WATER * rise;
    if (rise !== lastVegRise) {
      placeVegetation(uRise.value);
      lastVegRise = rise;
    }
    moveCars(uTime.value, uRise.value);
    places.root.scale.y = Math.max(uRise.value, 0.001);
    places.root.visible = uRise.value > 0.05;
    places.update(uTime.value);

    for (const m of markers) {
      const g = m.ground * rise;
      const top = g + 5 + Math.sin(uTime.value * 1.4 + m.phase) * 0.2;
      m.beam.scale.y = Math.max(top - g, 0.001);
      m.beam.position.y = (g + top) / 2;
      m.headGroup.position.y = top;
      m.ring.position.y = m.base.position.y = g + 0.12;
      const isHover = hovered === m || focused === m;
      m.hover += ((isHover ? 1 : 0) - m.hover) * k * 2;
      const dimmed = filter !== null && filter !== m.orbit;
      m.dim += ((dimmed ? 1 : 0) - m.dim) * k * 2;
      m.head.rotation.y += dt * 0.8;
      m.shell.rotation.y -= dt * 0.4;
      // de lejos el marcador se agranda para mantener un tamaño mínimo en pantalla
      const camDist = camera.position.distanceTo(m.headGroup.getWorldPosition(tmpV));
      const far = THREE.MathUtils.clamp(camDist / 40, 1, 2.2);
      m.headGroup.scale.setScalar(MARKER_SCALE * (1 + m.hover * 0.3) * far * (portrait ? 1.2 : 1) * (1 - m.dim * 0.35));
      m.beam.scale.x = m.beam.scale.z = MARKER_SCALE;
      const vis = 1 - m.dim * 0.85;
      m.beam.material.opacity = 0.85 * vis;
      m.shell.material.opacity = (0.35 + m.hover * 0.45) * vis;
      m.glow.material.opacity = (0.85 + m.hover * 0.15) * vis;
      m.head.material.opacity = vis;
      m.head.material.transparent = vis < 1;
      m.edges.material.opacity = 0.9 * vis;
      m.base.material.opacity = 0.9 * vis * rise;
      m.base.scale.setScalar(MARKER_SCALE * Math.min(far, 1.4));
      // pulso en el suelo, como un punto GPS
      const pt = (uTime.value * 0.5 + m.phase) % 1;
      m.ring.scale.setScalar(MARKER_SCALE * (1 + pt * 1.8) * Math.min(far, 1.4));
      m.ring.material.opacity = (1 - pt) * 0.8 * vis * rise;
    }

    if (flying) {
      const f = reducedMotion ? 1 : k * 1.15;
      camera.position.lerp(camGoal, f);
      controls.target.lerp(targetGoal, f);
      camera.lookAt(controls.target);
      if (camera.position.distanceTo(camGoal) < 0.05) {
        camera.position.copy(camGoal);
        controls.target.copy(targetGoal);
        flying = false;
        controls.enabled = true;
        controls.autoRotate = !focused && !reducedMotion;
      }
    } else {
      controls.update();
      // no dejar que el mapa se vaya fuera de pantalla al arrastrar
      const cx = THREE.MathUtils.clamp(controls.target.x, -limit, limit);
      const cz = THREE.MathUtils.clamp(controls.target.z, -limit, limit);
      if (cx !== controls.target.x || cz !== controls.target.z) {
        tmpV.set(cx - controls.target.x, 0, cz - controls.target.z);
        controls.target.add(tmpV);
        camera.position.add(tmpV);
      }
    }

    viewShift.x += (viewShiftGoal.x - viewShift.x) * k;
    viewShift.y += (viewShiftGoal.y - viewShift.y) * k;
    applyViewShift();

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    markers.forEach((m, i) => {
      headPos(m, screen);
      screen.y += 1.6 * m.headGroup.scale.x;
      screen.project(camera);
      const d = labelData[i];
      d.visible = screen.z < 1 && Math.abs(screen.x) < 1.2 && Math.abs(screen.y) < 1.2;
      d.x = (screen.x * 0.5 + 0.5) * w;
      d.y = (-screen.y * 0.5 + 0.5) * h;
      d.dim = m.dim > 0.5;
    });
    onFrame?.(labelData, noSun, !!focused);

    // HUD: norte, escala y coordenadas Gauss-Krüger ficticias (origen cerca de Resistencia, Chaco)
    if (hud) hud.classList.toggle('is-hidden', !!focused);
    if (hud && (hudDirty || flying)) {
      hudDirty = false;
      const az = controls.getAzimuthalAngle();
      hudNorth.style.transform = `rotate(${az}rad)`;
      // escala: cuántos píxeles mide 1 unidad (100 m) en el punto que mira la cámara
      const a = controls.target.clone().project(camera);
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const b = controls.target.clone().add(right).project(camera);
      const pxPerUnit = Math.hypot((b.x - a.x) * w * 0.5, (b.y - a.y) * h * 0.5);
      const nice = [100, 200, 500, 1000, 2000, 5000, 10000];
      const meters = nice.find((mtr) => (mtr / 100) * pxPerUnit >= 60) || 10000;
      hudBar.style.width = `${Math.round((meters / 100) * pxPerUnit)}px`;
      hudScale.textContent = meters >= 1000 ? `${meters / 1000} km` : `${meters} m`;
      if (lastPointer) {
        setRay(lastPointer);
        const gpt = groundUnderRay();
        if (gpt) {
          const X = 6962000 - gpt.z * 100;
          const Y = 5547000 + gpt.x * 100;
          const Z = 48 + Math.max(gpt.h, WATER) * 9;
          hudCoords.textContent = `X ${fmt(X)}  ·  Y ${fmt(Y)}  ·  Z ${fmt(Z)} m`;
        }
      }
    }

    const tJs = performance.now();
    renderer.render(scene, camera);
    if (import.meta.env.DEV) {
      stats.js += tJs - tStart;
      stats.render += performance.now() - tJs;
      stats.n++;
    }
  });

  return {
    setLang: (l) => places.setLang(l),
    focus,
    unfocus,
    setFilter,
    setHover: (id) => setHovered(markers.find((m) => m.id === id) || null),
    resize,
  };
}
