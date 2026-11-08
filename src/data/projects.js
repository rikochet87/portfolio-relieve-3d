// Proyectos del portfolio. Fuente: repos de github.com/rikochet87.
// orbit: 0 = destacados (órbita interna), 1 = productos y herramientas, 2 = trabajo para clientes.
// Para agregar un proyecto: sumá un objeto acá y sus imágenes en public/img/.

const GH = 'https://github.com/rikochet87/';

export const CATEGORIES = [
  { id: 0, es: 'Destacados', en: 'Featured' },
  { id: 1, es: 'Productos y herramientas', en: 'Products & tools' },
  { id: 2, es: 'Clientes', en: 'Client work' },
];

export const PROJECTS = [
  {
    id: 'sig-vial',
    grupo: { es: 'SIG Vial y Equipos Viales', en: 'SIG Vial & Equipos Viales' }, // nombre del lugar compartido
    lugar: 'vialidad', // en el mapa: el predio de Vialidad, con el edificio y el galpón de Equipos Viales
    name: 'SIG Vial Chaco',
    orbit: 0,
    since: '2026-06-10', // primer commit: ordena la ruta
    sign: { es: '29.000 km · 103 consorcios', en: '29,000 km · 103 consortiums' }, // segunda línea del cartel de entrada
    color: '#3ddc97',
    status: { es: 'En uso diario', en: 'In daily use' },
    tagline: {
      es: 'Plataforma GIS para ~29.000 km de red vial rural',
      en: 'GIS platform for a ~29,000 km rural road network',
    },
    description: {
      es: 'Sistema que diseñé y construí para la Dirección de Vialidad Provincial del Chaco: 103 consorcios camineros, 5 zonas y ~29.000 km de caminos que antes no tenían datos digitales.',
      en: 'A system I designed and built for the Chaco provincial road department: 103 maintenance consortiums, 5 zones and ~29,000 km of roads that had no digital data before.',
    },
    highlights: {
      es: [
        'App Android offline-first para técnicos de campo: GPS en segundo plano, inspección de puentes y alcantarillas, fotos.',
        'Plataforma web con mapa interactivo, relevamientos, cómputos y presupuestos de obra, inventario y permisos por rol.',
        'Módulo de hidrología: lluvia de ~70 pluviómetros interpolada (IDW, Thiessen), niveles del Paraná y mapas de inundación satelitales.',
        'Reportes públicos sin cuenta: estado de caminos y fauna atropellada desde el celular.',
      ],
      en: [
        'Offline-first Android app for field technicians: background GPS, bridge and culvert inspections, photos.',
        'Web platform with an interactive map, surveys, public works calculators and budgets, inventory and role-based permissions.',
        'Hydrology module: rainfall from ~70 gauges interpolated over the network (IDW, Thiessen), Paraná river levels and satellite flood maps.',
        'Public reporting with no account: road conditions and roadkill wildlife from any phone.',
      ],
    },
    stack: ['TypeScript', 'React Native', 'Next.js', 'Supabase', 'PostgreSQL', 'Leaflet', 'QGIS', 'Earth Engine'],
    images: ['img/sig-vial.png', 'img/sig-vial-2.png'],
    links: [
      { type: 'repo', label: { es: 'Showcase', en: 'Showcase' }, url: GH + 'sig-vial-chaco-showcase' },
      { type: 'demo', label: { es: 'Demo hidrología', en: 'Hydrology demo' }, url: 'https://sig-vial-chaco-panel.vercel.app/hidrologia/publico-85afwsdcuj' },
    ],
  },
  {
    id: 'aion',
    name: 'Aión',
    orbit: 0,
    since: '2026-10-15', // primer commit: ordena la ruta
    sign: { es: 'IA · API de Anthropic', en: 'AI · Anthropic API' }, // segunda línea del cartel de entrada
    color: '#b18cff',
    status: { es: 'En producción · beta cerrada', en: 'In production · closed beta' },
    tagline: {
      es: 'Acompañante con IA para procesos de coaching',
      en: 'AI companion for coaching processes',
    },
    description: {
      es: 'Asistente conversacional que acompaña a las personas entre sesiones de coaching, basado en la Ontología del Lenguaje. Complementa al coach humano, no lo reemplaza.',
      en: 'A conversational assistant that supports people between coaching sessions, based on the Ontology of Language. It complements a human coach; it does not replace one.',
    },
    highlights: {
      es: [
        'Construido sobre la API de Anthropic y desplegado en Cloudflare Workers.',
        'Memoria del proceso, cuentas de usuario, seguimientos programados y panel de administración.',
        'Chat web instalable; integración con WhatsApp en curso.',
      ],
      en: [
        'Built on the Anthropic API and deployed on Cloudflare Workers.',
        'Process memory, user accounts, scheduled follow-ups and an admin panel.',
        'Installable web chat; WhatsApp integration in progress.',
      ],
    },
    stack: ['Anthropic API', 'Cloudflare Workers', 'JavaScript', 'PWA'],
    images: ['img/aion.jpg'],
    links: [{ type: 'repo', label: { es: 'Showcase', en: 'Showcase' }, url: GH + 'aion-showcase' }],
  },
  {
    id: 'trazocad',
    name: 'TrazoCAD',
    orbit: 0,
    since: '2026-10-18', // primer commit: ordena la ruta
    sign: { es: '+180 comandos · DXF', en: '180+ commands · DXF' }, // segunda línea del cartel de entrada
    color: '#4fc3f7',
    status: { es: 'Producto propio · en desarrollo', en: 'Personal product · in development' },
    tagline: {
      es: 'CAD 2D estilo AutoCAD en el navegador, escrito desde cero',
      en: 'AutoCAD-style 2D CAD in the browser, written from scratch',
    },
    description: {
      es: 'Software de dibujo técnico como PWA instalable y offline. JavaScript puro, sin dependencias y sin paso de build.',
      en: 'Technical drawing software as an installable, offline PWA. Pure JavaScript, zero dependencies, no build step.',
    },
    highlights: {
      es: [
        'Línea de comandos y nombres de comandos de AutoCAD, con alias en español.',
        'Lee y escribe DXF (2007, 2000, R12), incluidas polilíneas 3D, caras 3D y superficies TIN.',
        'Coordenadas reales de relevamiento (Gauss-Krüger) con origen local: la precisión se mantiene en cualquier zoom.',
        'Tests automatizados en Chrome headless.',
      ],
      en: [
        'AutoCAD command line and command names, with Spanish aliases.',
        'Reads and writes DXF (2007, 2000, R12), including 3D polylines, 3D faces and TIN surfaces.',
        'Real survey coordinates (Gauss-Krüger) with a local origin, so precision holds at any zoom.',
        'Automated tests in headless Chrome.',
      ],
    },
    stack: ['JavaScript', 'Canvas', 'PWA', 'DXF'],
    images: ['img/trazocad.png', 'img/trazocad-2.png'],
    links: [{ type: 'repo', label: { es: 'Showcase', en: 'Showcase' }, url: GH + 'trazocad-showcase' }],
  },
  {
    id: 'calcuobra',
    lugar: 'obra', // en el mapa: un edificio de cinco pisos en construcción, con grúa y obreros (places.js)
    name: 'CalcuObra',
    orbit: 1,
    since: '2026-10-08', // primer commit: ordena la ruta
    sign: { es: 'Plano → cómputo → 3D', en: 'Plan → quantities → 3D' }, // segunda línea del cartel de entrada
    color: '#ffb547',
    status: { es: 'Online', en: 'Live' },
    tagline: {
      es: 'Calculadoras de obra y diseñador de planos con cómputo',
      en: 'Construction calculators and floor plan designer',
    },
    description: {
      es: 'Dibujá un plano y obtené el cómputo de materiales al instante. Subí un DXF de AutoCAD y miralo en 3D.',
      en: 'Draw a floor plan and get a bill of materials instantly. Upload an AutoCAD DXF and see it in 3D.',
    },
    highlights: {
      es: [
        'Diseñador de planos 2D con vista 3D en Three.js.',
        'Calculadoras de ladrillos, hormigón, pintura, cerámicos, escaleras y contrapisos.',
        'Presupuesto exportable, pensado para Argentina.',
      ],
      en: [
        '2D floor plan designer with a Three.js 3D view.',
        'Calculators for bricks, concrete, paint, ceramics, stairs and subfloors.',
        'Exportable budget, built for Argentina.',
      ],
    },
    stack: ['JavaScript', 'Three.js', 'Vercel'],
    images: ['img/calcuobra.png', 'img/calcuobra-2.png'],
    links: [
      { type: 'demo', label: { es: 'Ver online', en: 'Live demo' }, url: 'https://arq-web-app-self.vercel.app' },
      { type: 'repo', label: { es: 'Repositorio', en: 'Repository' }, url: GH + 'arq-web-app' },
    ],
  },
  {
    id: 'equipos-viales',
    junto: 'sig-vial', // comparte lugar en el mapa con SIG Vial: el galpón de las máquinas, al lado del edificio
    name: 'Equipos Viales',
    orbit: 1,
    since: '2026-06-05', // primer commit: ordena la ruta
    sign: { es: '5 zonas · inventario vial', en: '5 zones · road inventory' }, // segunda línea del cartel de entrada
    color: '#ff7a59',
    status: { es: 'Online', en: 'Live' },
    tagline: {
      es: 'Inventario de equipos viales de la DVP Chaco',
      en: 'Road equipment inventory for the Chaco road department',
    },
    description: {
      es: 'Sistema web para gestionar y estandarizar el inventario de maquinaria vial de la Dirección de Vialidad Provincial y de los consorcios camineros.',
      en: 'A web system to manage and standardize the road machinery inventory of the provincial road department and its consortiums.',
    },
    highlights: {
      es: [
        'Usuarios por zona que solo ven y editan sus equipos; administrador con vista de las 5 zonas.',
        'Alertas de pólizas de seguro vencidas.',
        'Panel con métricas por zona y exportación a Excel y PDF.',
      ],
      en: [
        'Zone users see and edit only their own equipment; an admin sees all 5 zones.',
        'Alerts for expired insurance policies.',
        'Dashboard with per-zone metrics and Excel and PDF export.',
      ],
    },
    stack: ['TypeScript', 'Next.js', 'Supabase', 'Tailwind'],
    images: [],
    links: [
      { type: 'demo', label: { es: 'Ver online', en: 'Live app' }, url: 'https://equipos-viales.vercel.app' },
      { type: 'repo', label: { es: 'Repositorio', en: 'Repository' }, url: GH + 'equipos-viales' },
    ],
  },
  {
    id: 'actas',
    lugar: 'parque', // en el mapa: la entrada de un parque nacional (places.js)
    name: 'Actas Guardaparques',
    orbit: 1,
    since: '2026-11-05', // primer commit: ordena la ruta
    sign: { es: 'Funciona sin señal', en: 'Works with no signal' }, // segunda línea del cartel de entrada
    color: '#8bc34a',
    status: { es: 'v0.3 · online', en: 'v0.3 · live' },
    tagline: {
      es: 'PWA offline para labrar actas de Guardaparques Nacionales',
      en: 'Offline PWA for National Park Rangers to issue citations',
    },
    description: {
      es: 'App instalable que reemplaza el talonario de papel para Actas de Infracción y de Constatación del Cuerpo de Guardaparques Nacionales (APN). Funciona sin señal.',
      en: 'An installable app that replaces the paper booklet for infraction and inspection reports of Argentina’s National Park Rangers. Works with no signal.',
    },
    highlights: {
      es: [
        'Asistente de 6 pasos con GPS, fotos, testigos y firma táctil.',
        'Normativa sugerida por conducta (Dto. 300/2022) y numeración correlativa.',
        'Código de integridad SHA-256 al cerrar: el acta queda bloqueada.',
        'Impresión en el lugar por impresora térmica Bluetooth (ESC/POS) o PDF.',
      ],
      en: [
        '6-step wizard with GPS, photos, witnesses and touch signatures.',
        'Suggested regulations per offence (Decree 300/2022) and sequential numbering.',
        'SHA-256 integrity code on close: the report is locked.',
        'On-site printing on Bluetooth thermal printers (ESC/POS) or PDF.',
      ],
    },
    stack: ['JavaScript', 'PWA', 'IndexedDB', 'Web Bluetooth'],
    images: ['img/actas-2.jpg', 'img/actas.png'],
    links: [
      { type: 'demo', label: { es: 'Ver online', en: 'Live app' }, url: 'https://rikochet87.github.io/actas-guardaparques/' },
      { type: 'repo', label: { es: 'Repositorio', en: 'Repository' }, url: GH + 'actas-guardaparques' },
    ],
  },
  {
    id: 'racha',
    name: 'Racha',
    orbit: 1,
    since: '2026-06-15', // primer commit: ordena la ruta
    sign: { es: 'App Android · 3 temas', en: 'Android app · 3 themes' }, // segunda línea del cartel de entrada
    color: '#ff5d8f',
    status: { es: 'App Android', en: 'Android app' },
    tagline: {
      es: 'Tracker de hábitos minimalista basado en rachas',
      en: 'Minimalist streak-based habit tracker',
    },
    description: {
      es: 'App para construir rutinas diarias con rachas, grillas de progreso y estadísticas, sin distracciones ni suscripciones.',
      en: 'An app to build daily routines with streaks, progress grids and statistics — no distractions, no subscriptions.',
    },
    highlights: {
      es: [
        'Hábitos con frecuencia personalizada y ventana móvil de 7, 14 o 30 días.',
        '“Día de gracia”: un día excusado por semana que no rompe la racha.',
        'Estadísticas semanales y mensuales con mapa de calor, recordatorios y 3 temas.',
      ],
      en: [
        'Habits with custom frequency and a rolling 7, 14 or 30-day window.',
        '“Grace day”: one excused day per week that keeps the streak alive.',
        'Weekly and monthly stats with a heatmap, reminders and 3 themes.',
      ],
    },
    stack: ['TypeScript', 'React Native', 'Expo'],
    images: ['img/racha.jpg', 'img/racha-2.jpg'],
    links: [{ type: 'repo', label: { es: 'Repositorio', en: 'Repository' }, url: GH + 'racha' }],
  },
  {
    id: 'cancha',
    name: 'Gestión de Cancha',
    orbit: 2,
    since: '2026-10-30', // primer commit: ordena la ruta
    sign: { es: 'Turnos · buffet · caja', en: 'Bookings · snack bar · till' }, // segunda línea del cartel de entrada
    color: '#2ec4b6',
    status: { es: 'Proyecto para cliente', en: 'Client project' },
    tagline: {
      es: 'Turnos, buffet y caja para un complejo de fútbol 5',
      en: 'Bookings, snack bar and cash register for a 5-a-side venue',
    },
    description: {
      es: 'PWA para el celular, la tablet o la PC del mostrador que reemplaza el cuaderno, el WhatsApp y la caja de zapatos: todo el complejo en un solo lugar.',
      en: 'A PWA for the phone, tablet or front-desk PC that replaces the notebook, the WhatsApp chat and the cash box: the whole venue in one place.',
    },
    highlights: {
      es: [
        'Grilla de turnos por cancha y hora, señas, turnos fijos semanales y confirmación por WhatsApp. Superposiciones imposibles.',
        'Punto de venta con lector de código de barras USB/Bluetooth o la cámara del celular.',
        'Stock con mínimos, ingreso de mercadería escaneando y caja diaria por medio de pago.',
        'Modo demo que corre entero en el navegador con datos de ejemplo.',
      ],
      en: [
        'Booking grid by pitch and hour, deposits, weekly recurring bookings and WhatsApp confirmation. No overlaps possible.',
        'Point of sale with a USB/Bluetooth barcode scanner or the phone camera.',
        'Stock with minimums, goods received by scanning, and a daily cash register by payment method.',
        'Demo mode that runs entirely in the browser with sample data.',
      ],
    },
    stack: ['React', 'TypeScript', 'Vite', 'Supabase', 'ZXing'],
    images: ['img/cancha.png', 'img/cancha-2.png'],
    links: [{ type: 'repo', label: { es: 'Showcase', en: 'Showcase' }, url: GH + 'football-pitch-manager-showcase' }],
  },
  {
    id: 'tropico',
    lugar: 'cafe', // en el mapa: un parador de ruta (places.js)
    name: 'Trópico Café',
    orbit: 2,
    since: '2026-11-04', // primer commit: ordena la ruta
    sign: { es: 'Recorrido 3D', en: '3D walkthrough' }, // segunda línea del cartel de entrada
    color: '#e8734a',
    status: { es: 'Proyecto para cliente', en: 'Client project' },
    tagline: {
      es: 'Sitio web con recorrido 3D del local guiado por scroll',
      en: 'Website with a scroll-driven 3D walkthrough of the venue',
    },
    description: {
      es: 'Sitio de una sola página para un café de especialidad en Resistencia, Chaco. El home es un recorrido 3D por el local que avanza con el scroll.',
      en: 'A single-page website for a specialty coffee shop in Resistencia, Chaco. The home page is a 3D walkthrough of the venue driven by scrolling.',
    },
    highlights: {
      es: [
        'Siete escenas modeladas en Three.js: vereda, vitrina, concept store, salón y patio.',
        'Mapamundi calado generado a partir de datos de Natural Earth.',
        'Carta completa en panel lateral. Un único archivo, sin build.',
      ],
      en: [
        'Seven scenes modeled in Three.js: sidewalk, display case, concept store, lounge and patio.',
        'Cut-out world map generated from Natural Earth data.',
        'Full menu in a side panel. A single file, no build step.',
      ],
    },
    stack: ['Three.js', 'JavaScript', 'GitHub Pages'],
    images: ['img/tropico.jpg', 'img/tropico-2.jpg'],
    links: [
      { type: 'demo', label: { es: 'Ver online', en: 'Live site' }, url: 'https://rikochet87.github.io/tropico-cafe/' },
      { type: 'repo', label: { es: 'Repositorio', en: 'Repository' }, url: GH + 'tropico-cafe' },
    ],
  },
];
