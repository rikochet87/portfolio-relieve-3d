// Posición del sol (algoritmo de la NOAA, error de minutos de arco) para dos lugares:
//   - Resistencia, Chaco: la hora de allá (UTC−3; Argentina no cambia la hora en verano).
//   - La zona del visitante: la hora de su reloj y la ciudad que da nombre a su zona horaria
//     (src/data/zonas.js). No pide permiso de ubicación: la zona horaria la da el navegador.
// El deslizador elige una hora del día de hoy en ese lugar.
import { ZONAS } from './data/zonas.js';

const RAD = Math.PI / 180;

export const RESISTENCIA = { id: 'resistencia', nombre: 'Resistencia', corto: 'RES', lat: -27.4606, lon: -58.9839, tz: -3 };

// El lugar del visitante, o null si su zona horaria no está en la tabla (UTC, Etc/GMT+3…).
export function lugarDelVisitante() {
  let zona = null;
  try {
    zona = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
  const c = zona && ZONAS[zona];
  if (!c) return null;
  const nombre = zona.split('/').pop().replace(/_/g, ' ');
  return { id: 'local', zona, nombre, corto: nombre.slice(0, 3).toUpperCase(), lat: c[0], lon: c[1], tz: null };
}

// Fecha de hoy y hora actual en el lugar (tz fijo, o el reloj del dispositivo).
export function ahoraEn(lugar, now = new Date()) {
  if (lugar.tz === null) return { fecha: { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() }, hora: now.getHours() + now.getMinutes() / 60 };
  const d = new Date(now.getTime() + lugar.tz * 3600e3);
  return { fecha: { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }, hora: d.getUTCHours() + d.getUTCMinutes() / 60 };
}

// El instante (ms UTC) de una hora local en una fecha del lugar.
export function instante(lugar, fecha, hora) {
  const min = Math.round(hora * 60);
  if (lugar.tz === null) return new Date(fecha.y, fecha.m, fecha.d, 0, min).getTime();
  return Date.UTC(fecha.y, fecha.m, fecha.d, 0, min) - lugar.tz * 3600e3;
}

// Dirección hacia el sol en un instante, vista desde lat/lon, en los ejes del mapa: x al este,
// y arriba, −z al norte. También la elevación en grados.
export function direccionSolUTC(ms, lat, lon) {
  const t = new Date(ms);
  const y = t.getUTCFullYear();
  const doy = Math.floor((Date.UTC(y, t.getUTCMonth(), t.getUTCDate()) - Date.UTC(y, 0, 1)) / 864e5) + 1;
  const horaUtc = t.getUTCHours() + t.getUTCMinutes() / 60 + t.getUTCSeconds() / 3600;
  const g = ((2 * Math.PI) / 365) * (doy - 1 + (horaUtc - 12) / 24); // año fraccional
  const ecTiempo = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  // hora solar verdadera (minutos) y ángulo horario
  const tsv = horaUtc * 60 + ecTiempo + 4 * lon;
  const ha = (tsv / 4 - 180) * RAD;
  const phi = lat * RAD;
  const este = -Math.cos(decl) * Math.sin(ha);
  const norte = Math.cos(phi) * Math.sin(decl) - Math.sin(phi) * Math.cos(decl) * Math.cos(ha);
  const arriba = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  return { x: este, y: arriba, z: -norte, elev: Math.asin(Math.max(-1, Math.min(1, arriba))) / RAD };
}

// El sol en el lugar a una hora local de una fecha.
export const solEn = (lugar, fecha, hora) => direccionSolUTC(instante(lugar, fecha, hora), lugar.lat, lugar.lon);

// Salida y puesta del sol (horas locales), buscando cuándo el borde del sol cruza el horizonte.
// null si ese día no sale o no se pone (cerca de los polos).
export function saleYSePone(lugar, fecha) {
  const H = -0.833; // refracción y radio del sol
  let sale = null;
  let pone = null;
  let prev = solEn(lugar, fecha, 0).elev;
  for (let m = 2; m <= 24 * 60; m += 2) {
    const e = solEn(lugar, fecha, m / 60).elev;
    if (prev < H && e >= H && sale === null) sale = m / 60;
    if (prev >= H && e < H) pone = m / 60;
    prev = e;
  }
  return { sale, pone };
}

export const hhmm = (h) => {
  const t = Math.round(h * 60);
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
