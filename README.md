# Portfolio · Matías Rosello — relieve 3D

Portfolio personal hecho con **Three.js + Vite**: un mapa topográfico 3D donde cada proyecto es un cerro con su marcador, unidos por una ruta. Un guiño a mi trabajo en GIS y vialidad. Bilingüe ES/EN.

- Terreno procedural con curvas de nivel, sombreado de relieve y tintas hipsométricas.
- Ruta con calzada, banquinas y señalización; el terreno se nivela debajo y hay terraplenes sobre el agua.
- Vegetación instanciada (montes, palmares, arbustos y rocas) y vehículos circulando.
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
src/data/projects.js     datos de los proyectos  <- editar acá
src/style.css            estilos base
src/relieve.css          estilos propios de esta versión (HUD)
public/img/              capturas de los proyectos
```

## Agregar o editar un proyecto

1. Sumá un objeto en `src/data/projects.js` (`orbit`: 0 destacados, 1 productos, 2 clientes).
2. Poné sus capturas en `public/img/` y listalas en `images`.
3. Ubicalo en el mapa en `SITES` dentro de `src/terrain.js` (posición y altura del cerro) y sumalo a `ROUTE` para que la ruta pase por él.

Cada proyecto tiene URL propia: `/#/sig-vial`, `/#/aion`, etc.

## Ajustes rápidos

En `src/terrain.js`:

- `MARKER_SCALE`: tamaño de los marcadores (1 = grande, 0,6 = actual).
- `CAPS`: cantidad de árboles, palmeras, arbustos y rocas.
- `pickQuality()`: cuándo un equipo arranca en calidad baja.

## Publicar

`dist/` funciona en cualquier hosting estático: Vercel, Netlify, Cloudflare Pages o GitHub Pages.
