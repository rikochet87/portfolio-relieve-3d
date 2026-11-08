// Posición del sol sobre Resistencia, Chaco (algoritmo de la NOAA, error de minutos de arco).
// El deslizador de la hora es la hora de Resistencia (UTC−3, Argentina no cambia la hora en
// verano), del día de hoy allá: se ve lo mismo desde cualquier parte del mundo.

export const RESISTENCIA = { lat: -27.4606, lon: -58.9839, tz: -3 };

const RAD = Math.PI / 180;

// Fecha y hora actuales en Resistencia.
export function ahoraEnResistencia(now = new Date()) {
  const d = new Date(now.getTime() + RESISTENCIA.tz * 3600e3);
  return {
    fecha: { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() },
    hora: d.getUTCHours() + d.getUTCMinutes() / 60,
  };
}

// Dirección hacia el sol para una hora local de Resistencia en una fecha dada, en los ejes del
// mapa: x al este, y arriba, −z al norte. También la elevación en grados.
export function direccionSol(horaLocal, fecha, lugar = RESISTENCIA) {
  const { lat, lon, tz } = lugar;
  const doy = Math.round((Date.UTC(fecha.y, fecha.m, fecha.d) - Date.UTC(fecha.y, 0, 1)) / 864e5) + 1;
  const horaUtc = horaLocal - tz;
  const g = ((2 * Math.PI) / 365) * (doy - 1 + (horaUtc - 12) / 24); // año fraccional
  const ecTiempo = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  // hora solar verdadera (minutos) y ángulo horario
  const tsv = horaLocal * 60 + ecTiempo + 4 * lon - 60 * tz;
  const ha = (tsv / 4 - 180) * RAD;
  const phi = lat * RAD;
  const este = -Math.cos(decl) * Math.sin(ha);
  const norte = Math.cos(phi) * Math.sin(decl) - Math.sin(phi) * Math.cos(decl) * Math.cos(ha);
  const arriba = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  return { x: este, y: arriba, z: -norte, elev: Math.asin(Math.max(-1, Math.min(1, arriba))) / RAD };
}

// Salida y puesta del sol (horas locales), buscando cuándo el borde del sol cruza el horizonte.
export function saleYSePone(fecha, lugar = RESISTENCIA) {
  const H = -0.833; // refracción y radio del sol
  let sale = null;
  let pone = null;
  let prev = direccionSol(0, fecha, lugar).elev;
  for (let m = 1; m <= 24 * 60; m++) {
    const e = direccionSol(m / 60, fecha, lugar).elev;
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
