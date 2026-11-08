"""Arma src/data/zonas.js: latitud y longitud de la ciudad que da nombre a cada zona horaria IANA.

Fuente: zone.tab (coordenadas) y los enlaces de tzdata.zi (nombres viejos, como Asia/Calcutta, que
algunos navegadores todavía devuelven). Correr con la base tz del sistema:

    python3 scripts/build_zonas.py
"""
import re
from pathlib import Path

TZ = Path('/usr/share/zoneinfo')


def coord(s):
    m = re.fullmatch(r'([+-])(\d{2})(\d{2})(\d{2})?([+-])(\d{3})(\d{2})(\d{2})?', s)
    sg1, d1, m1, s1, sg2, d2, m2, s2 = m.groups()
    lat = int(d1) + int(m1) / 60 + int(s1 or 0) / 3600
    lon = int(d2) + int(m2) / 60 + int(s2 or 0) / 3600
    return (-lat if sg1 == '-' else lat, -lon if sg2 == '-' else lon)


zonas = {}
for line in (TZ / 'zone.tab').read_text().splitlines():
    if line.startswith('#') or not line.strip():
        continue
    _, c, name, *_ = line.split('\t')
    zonas[name] = coord(c)

# enlaces: L destino alias
for line in (TZ / 'tzdata.zi').read_text().splitlines():
    if line.startswith('L '):
        _, dest, alias = line.split()
        if dest in zonas and alias not in zonas:
            zonas[alias] = zonas[dest]

body = ',\n'.join(f'  {name!r}: [{lat:.2f}, {lon:.2f}]'.replace("'", '"') for name, (lat, lon) in sorted(zonas.items()))
out = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'zonas.js'
out.write_text(
    '// Generado por scripts/build_zonas.py: no editar a mano.\n'
    '// Zona horaria IANA → [latitud, longitud] de la ciudad que le da nombre.\n'
    f'export const ZONAS = {{\n{body},\n}};\n'
)
print(len(zonas), 'zonas →', out, out.stat().st_size, 'bytes')
