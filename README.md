# Portfolio · Matías Roselló — relieve 3D

Portfolio personal hecho con **Three.js + Vite**: un mapa topográfico 3D recorrido por una ruta, donde cada proyecto es un lugar sobre el camino. Un guiño a mi trabajo en GIS y vialidad. Bilingüe ES/EN.

- **La ruta va en orden cronológico**: el primer proyecto es el km 0 y los demás siguen por fecha de creación (`since`).
- **Cada categoría es un tipo de lugar**: los destacados son localidades (casas, tanque de agua, antena), los productos son estaciones de servicio y los trabajos para clientes, parajes con su local (la cancha tiene su cancha). Algunos proyectos tienen un lugar propio: SIG Vial y Equipos Viales comparten el predio de Vialidad y un solo marcador: el edificio de cuatro pisos con parasoles blancos y, al lado, el galpón grande con las máquinas viales en el patio. Al tocar el marcador se elige cuál de los dos ver; Trópico Café es un parador de ruta con galería, mesas y camiones en el playón, y Actas Guardaparques, la entrada a un parque nacional con pórtico, boletería, casa del guardaparque, camping con gente alrededor del fogón y un sendero con caminantes.
- **Señalización vial**: cartel verde de entrada con el nombre, una cifra y la fecha; mojón con el kilómetro; en las estaciones, el tótem y los surtidores muestran las tecnologías.
- Terreno procedural con lomas, curvas de nivel, sombreado de relieve y tintas hipsométricas; un río y un arroyo con su planicie, y puentes donde la ruta los cruza (`RIVERS` en `src/terrain.js`). Cada lugar se asienta en una explanada a la altura de la ruta.
- Vegetación instanciada (montes y palmares junto al agua) y vehículos circulando.
- HUD estilo SIG: norte, escala y coordenadas Gauss-Krüger bajo el cursor.
- Calidad adaptable: nivel inicial según el equipo y ajuste en marcha si bajan los cuadros por segundo.

## Comandos

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/ (estático, base relativa)
npm run preview
```

## Estructura

```
index.html               maquetado (barra superior, hero, panel, HUD, overlays)
src/main.js              UI: textos ES/EN, panel de proyecto, "Sobre mí", lista, rutas #/id
src/terrain.js           escena 3D: terreno, ruta, vegetación, marcadores, cámara, HUD
src/places.js            lugares sobre la ruta: localidades, estaciones, parajes, el parador, el parque, carteles y mojones
src/data/projects.js     datos de los proyectos  <- editar acá
src/style.css            estilos base
src/relieve.css          estilos propios de esta versión (HUD)
public/img/              capturas de los proyectos
```

## Agregar o editar un proyecto

1. Sumá un objeto en `src/data/projects.js`:
   - `orbit`: 0 destacado (localidad), 1 producto (estación de servicio), 2 cliente (paraje).
   - `lugar` (opcional): `'vialidad'`, `'cafe'` o `'parque'` para usar uno de esos lugares en vez del de su categoría.
   - `junto` (opcional): el id de otro proyecto con el que comparte lugar y marcador; el marcador muestra `grupo` (del otro) y al tocarlo se elige cuál ver.
   - `since`: fecha de inicio (`AAAA-MM-DD`, el primer commit). Ordena la ruta y sale en el cartel.
   - `sign`: la segunda línea del cartel de entrada, en `es` y `en`. Una cifra corta.
   - `stack`: las primeras cuatro tecnologías van en los surtidores y el tótem de las estaciones.
2. Poné sus capturas en `public/img/` y listalas en `images`.
3. Ubicalo en `SITES` dentro de `src/terrain.js` (posición y altura del cerro). La ruta une los lugares por fecha, así que tienen que quedar alrededor del centro en ese orden (sentido horario visto desde arriba) para que el camino no se cruce.

Los lugares se arman en `src/places.js`.

Cada proyecto tiene URL propia: `/#/sig-vial`, `/#/aion`, etc.

## Ajustes rápidos

En `src/terrain.js`:

- `MARKER_SCALE`: tamaño de los marcadores (1 = grande, 0,6 = actual).
- `CAPS`: cantidad de árboles, palmeras, arbustos y rocas.
- `pickQuality()`: cuándo un equipo arranca en calidad baja.

## Publicar

`dist/` funciona en cualquier hosting estático: Vercel, Netlify, Cloudflare Pages o GitHub Pages.

En GitHub Pages se publica solo: `.github/workflows/pages.yml` compila y sube `dist/` en cada push a `main`. En **Settings → Pages**, la fuente tiene que ser **GitHub Actions** (no la rama): servida desde la rama, la página queda en blanco porque el código sin compilar no corre en el navegador.

Sitio: https://rikochet87.github.io/portfolio-relieve-3d/
