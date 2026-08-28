export const IMAGES = {
  heroBrunch:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663748210326/3rkWk59qfXE5Vj2tcVcjSw/hero_brunch-mAJd5zMpNdyGhs3qbiU78p.webp",
  heroCafe:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663748210326/3rkWk59qfXE5Vj2tcVcjSw/hero_cafe-d8SM4uvfbi2vyNJdCn36Hr.webp",
  heroCocktail:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663748210326/3rkWk59qfXE5Vj2tcVcjSw/hero_cocktail-JBnTVfkkAMnkwmR3pqA9sK.webp",
  heroPattern:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663748210326/3rkWk59qfXE5Vj2tcVcjSw/hero_pattern-4cRrVPGgmXaXFWLvAP4o7j.webp",
} as const;

export type NavSection = { id: string; label: string };

export const NAV_SECTIONS: NavSection[] = [
  { id: "introduccion", label: "La Oportunidad" },
  { id: "base", label: "Lo que ya tienes" },
  { id: "objetivo", label: "El Objetivo" },
  { id: "estrategia", label: "La Estrategia" },
  { id: "sistema", label: "El Sistema" },
  { id: "contenido", label: "Contenido" },
  { id: "metaads", label: "Meta Ads" },
  { id: "googlemaps", label: "Google Maps" },
  { id: "influencers", label: "Influencers" },
  { id: "roadmap", label: "Plan 90 días" },
  { id: "stack-offer", label: "Stack Offer" },
  { id: "entregables", label: "Entregables" },
  { id: "inversion", label: "Inversión" },
  { id: "cierre", label: "El Siguiente Paso" },
];

export const MARKET_STATS = [
  {
    value: "83%",
    label: "de los puertorriqueños considera salir a comer parte esencial de su rutina",
  },
  {
    value: "55%",
    label: "de los consumidores prioriza la experiencia general sobre la comida en sí",
  },
  {
    value: "93%",
    label: "de los comensales revisa Google antes de elegir un restaurante",
  },
  {
    value: "60%",
    label: "reserva mesa después de ver contenido atractivo en redes sociales",
  },
] as const;

export const ASSETS = [
  {
    icon: "🏠",
    title: "Local sin renta",
    detail:
      "Una ventaja financiera que la mayoría de los conceptos nuevos no tiene. Eso es margen de maniobra real para invertir en lo que importa: el lanzamiento.",
  },
  {
    icon: "👨‍🍳",
    title: "Chefs con experiencia",
    detail:
      "Chef Chiara, especialista en brunch. Chef Willy. Dos caras reales detrás del concepto que generan confianza antes de que el cliente pruebe un solo plato.",
  },
  {
    icon: "📺",
    title: "25 años de producción",
    detail:
      "Saber redactar, producir, crear contenido y entender a la audiencia es exactamente lo que diferencia a los restaurantes que comunican bien de los que publican por publicar.",
  },
  {
    icon: "🎵",
    title: "Ambiente completo",
    detail:
      "Sonido, luces, decoración, plantas, barra, tarima flexible. El espacio ya tiene personalidad. Solo falta que el mercado lo sepa.",
  },
  {
    icon: "📍",
    title: "Ubicación estratégica",
    detail:
      "San Patricio es uno de los corredores más transitados del área metro. Llega gente de todos lados. El parking en fin de semana es una ventaja que pocos conceptos de brunch tienen.",
  },
  {
    icon: "💡",
    title: "Visión clara del concepto",
    detail:
      "Brunch, café, coctelería suave, música, ambiente social. No es un restaurante genérico. Es un concepto con identidad, y eso es exactamente lo que el mercado está buscando.",
  },
] as const;

export const WHAT_MATTERS = {
  not: [
    "Cantidad de seguidores",
    "Número de likes",
    "Impresiones y alcance",
    "Viralizarse",
    "Aparecer en explorar",
    "Vanity metrics",
  ],
  yes: [
    "Personas que llegan al local",
    "Reservas y lista de espera",
    "Clientes que regresan",
    "Posicionamiento en Guaynabo",
    "Aparecer en Google Maps",
    "Ventas reales y medibles",
  ],
} as const;

export const STRATEGY_PHASES = [
  {
    num: "1",
    phase: "Pre-lanzamiento",
    title: "Construir el sistema antes de abrir",
    img: IMAGES.heroPattern,
    text: "Cada semana que pasa sin Google Maps optimizado, sin funnel activo, sin pixel instalado, es demanda que se pierde. Esta etapa construye toda la infraestructura digital antes de invertir un solo dólar en anuncios.",
    items: [
      "Google Business Profile completo con fotos, menú, horarios y categorías",
      "Instagram y Facebook con identidad visual consistente",
      "Landing page con menú digital en HTML, lista de espera y pixel de Meta",
      "Día de producción: platos, chefs, barra, ambiente, cocteles",
      "Campaña de expectativa que construye audiencia antes de abrir",
    ],
  },
  {
    num: "2",
    phase: "Lanzamiento",
    title: "Convertir expectativa en reservas reales",
    img: IMAGES.heroCafe,
    text: "Primero un soft opening controlado para afinar la operación y conseguir las primeras reseñas reales. Luego el lanzamiento oficial con el sistema completo activo: Meta Ads, Google Maps, influencers locales y retargeting.",
    items: [
      "Soft opening con invitados selectos y primeras reseñas de Google",
      "Campañas de brunch, café y retargeting activas desde el día uno",
      "Influencers gastronómicos con audiencia real en el área metro",
      "Sistema de reservas o lista de espera activo",
      "Presupuesto de $25 a $50 diarios durante el lanzamiento",
    ],
  },
  {
    num: "3",
    phase: "Optimización",
    title: "Escalar lo que funciona. Cortar lo que no.",
    img: IMAGES.heroCocktail,
    text: "A partir de la semana 5 el trabajo se convierte en un ciclo de análisis y mejora. Los anuncios que convierten se escalan. Los creativos que se fatigan se reemplazan cada 3 a 5 semanas.",
    items: [
      "Auditoría semanal de Ads Manager con ajuste de creativos",
      "Rotación de material cada 3 a 5 semanas para evitar fatiga",
      "Campañas de recurrencia y fidelización activas",
      "Integración con Klients para rewards, SMS y base de datos",
      "Reporte mensual de métricas reales: ventas, tráfico, costo por reserva",
    ],
  },
] as const;

export const CHANNELS = [
  {
    icon: "📸",
    name: "Instagram",
    role: "Vitrina visual, reels, stories, social proof",
    priority: "Alta",
  },
  {
    icon: "📘",
    name: "Facebook",
    role: "Audiencia local, campañas, comunidad",
    priority: "Alta",
  },
  {
    icon: "🗺️",
    name: "Google Maps",
    role: "Búsquedas locales, reseñas, menú, reservas",
    priority: "Crítica",
  },
  {
    icon: "🌐",
    name: "Landing Page",
    role: "Menú, lista de espera, reservas, captura de leads",
    priority: "Crítica",
  },
  {
    icon: "🎯",
    name: "Meta Ads",
    role: "Awareness, tráfico, reservas, retargeting",
    priority: "Alta",
  },
  {
    icon: "🔄",
    name: "Retargeting",
    role: "Reimpactar interesados, reducir costo por conversión",
    priority: "Alta",
  },
  {
    icon: "💬",
    name: "WhatsApp / SMS",
    role: "Comunicación directa, ofertas, recurrencia",
    priority: "Media-Alta",
  },
  {
    icon: "📱",
    name: "Klients App",
    role: "Rewards, base de datos, SMS, recurrencia automatizada",
    priority: "Incluido gratis",
  },
] as const;

export const CONTENT_PILLARS = [
  {
    icon: "🍳",
    pillar: "Antojo",
    desc: "Platos de brunch bien fotografiados, café con latte art, cocteles con presentación cuidada.",
  },
  {
    icon: "✨",
    pillar: "Experiencia",
    desc: "El ambiente del local, la barra, las plantas, la luz, la música. El cliente compra un momento.",
  },
  {
    icon: "👨‍🍳",
    pillar: "Confianza",
    desc: "Chef Chiara, chef Willy, el equipo. La gente le compra a personas, no a logos.",
  },
  {
    icon: "🎬",
    pillar: "Behind the Scenes",
    desc: "La preparación del plato, el montaje, el coctel de la casa. Altamente compartible.",
  },
  {
    icon: "🏘️",
    pillar: "Comunidad",
    desc: "Contenido que conecta con San Patricio y Guaynabo. Fotos y reseñas de clientes reales.",
  },
  {
    icon: "📲",
    pillar: "Conversión",
    desc: "Reserva tu mesa para el brunch de este sábado. Acción clara para actuar ahora.",
  },
] as const;

export const META_CAMPAIGNS = [
  ["Expectativa", "Awareness local", "5 a 10 millas, 25 a 55 años", "$10 a $15/día"],
  ["Brunch fin de semana", "Reservas y mensajes", "Foodies, área metro", "$20 a $40/día"],
  ["Café y grab & go", "Tráfico semana", "Personas cerca en horario AM", "$10 a $20/día"],
  ["Retargeting", "Conversión", "Visitantes del funnel y videos", "$10 a $15/día"],
  ["Social proof", "Confianza", "Audiencia cálida existente", "$5 a $10/día"],
] as const;

export const GOOGLE_STATS = [
  { stat: "+400%", label: "en llamadas con Google Business Profile optimizado" },
  { stat: "+440%", label: "en solicitudes de direcciones" },
  { stat: "2.3x", label: "más reseñas vs. perfiles sin optimizar" },
  { stat: "+9%", label: "en ingresos por cada estrella adicional en la calificación" },
] as const;

export const INFLUENCER_CRITERIA = [
  {
    icon: "📍",
    criterion: "Audiencia geográfica",
    detail:
      "¿Sus seguidores están en el área metro de Puerto Rico? Un influencer de Miami con 100K seguidores no mueve una sola mesa en Guaynabo.",
  },
  {
    icon: "🍽️",
    criterion: "Contenido de gastronomía",
    detail:
      "¿Hace restaurantes o hace entretenimiento general? Si su contenido es chistes y bailes, no es el perfil correcto.",
  },
  {
    icon: "🎨",
    criterion: "Estilo y tono",
    detail:
      "¿Su estilo encaja con premium casual? Se busca el perfil que va a brunch los domingos y lo documenta bien.",
  },
  {
    icon: "💬",
    criterion: "Engagement real",
    detail:
      "Comentarios reales, saves, shares. Un video con 50,000 views y 12 comentarios no tiene audiencia real.",
  },
  {
    icon: "📊",
    criterion: "Historial verificable",
    detail:
      "¿Ha trabajado con restaurantes similares? ¿Generó visitas reales? Se evalúa el historial antes de cualquier acuerdo.",
  },
  {
    icon: "🔗",
    criterion: "Entregables con trazabilidad",
    detail:
      "Reel, stories, permiso de uso en ads y código o link rastreable. Si no se puede medir, no se puede saber si funcionó.",
  },
] as const;

export const ROADMAP_WEEKS = [
  { week: "Semana 1", focus: "Diagnóstico y arquitectura", actions: "Posicionamiento, accesos, calendario, estructura de canales" },
  { week: "Semana 2", focus: "Setup digital completo", actions: "Google Maps, funnel, menú HTML, pixel, perfiles sociales" },
  { week: "Semana 3", focus: "Producción de contenido", actions: "Día de producción, banco de fotos y videos, piezas para ads" },
  { week: "Semana 4", focus: "Campaña de expectativa", actions: "Primeros ads de awareness, coming soon, lista de espera activa" },
  { week: "Semana 5", focus: "Soft opening", actions: "Invitados selectos, primeras reseñas de Google, ajuste operativo" },
  { week: "Semana 6", focus: "Lanzamiento oficial", actions: "Ads de brunch, café, retargeting e influencers activados" },
  { week: "Semana 7", focus: "Optimización inicial", actions: "Revisión de métricas, ajuste de creativos, escalar ganadores" },
  { week: "Semana 8", focus: "Consolidación", actions: "Nuevos creativos, Google Posts, reseñas, base de datos" },
  { week: "Semanas 9-10", focus: "Crecimiento", actions: "Campañas de recurrencia, WhatsApp y SMS, análisis de retención" },
  { week: "Semanas 11-12", focus: "Reporte y plan siguiente", actions: "Auditoría completa, plan del próximo trimestre, Klients" },
] as const;

export const WORK_PHASES = [
  {
    num: "1",
    title: "Diagnóstico y Estrategia",
    duration: "Semana 1",
    objective: "Posicionamiento, público ideal y arquitectura de lanzamiento.",
  },
  {
    num: "2",
    title: "Setup Digital",
    duration: "Semanas 1-2",
    objective: "Infraestructura digital antes de invertir en anuncios.",
  },
  {
    num: "3",
    title: "Producción de Contenido",
    duration: "Semanas 2-3",
    objective: "Banco de material visual para expectativa y lanzamiento.",
  },
  {
    num: "4",
    title: "Lanzamiento",
    duration: "Semanas 3-8",
    objective: "Convertir expectativa en visitas y reservas reales.",
  },
  {
    num: "5",
    title: "Optimización Continua",
    duration: "Semanas 7-12",
    objective: "Escalar lo que funciona y cortar lo que no.",
  },
  {
    num: "6",
    title: "Consultoría Mensual",
    duration: "Mes 3+",
    objective: "Dirección estratégica y evolución del sistema.",
  },
] as const;

export const DELIVERABLES = [
  {
    category: "Estrategia y estructura",
    items: [
      "Documento de posicionamiento",
      "Mapa de audiencia ideal",
      "Calendario de 90 días",
      "Arquitectura de campañas",
    ],
  },
  {
    category: "Setup digital",
    items: [
      "Google Business Profile optimizado",
      "Instagram y Facebook configurados",
      "Landing page y funnel activo",
      "Menú digital en HTML",
      "Pixel de Meta y UTMs",
    ],
  },
  {
    category: "Producción y campañas",
    items: [
      "Dirección creativa del día de producción",
      "Banco de fotos y reels iniciales",
      "Piezas para Meta Ads",
      "Campañas de brunch, café y retargeting",
      "Coordinación de influencers",
    ],
  },
  {
    category: "Análisis y optimización",
    items: [
      "Auditorías semanales de Ads Manager",
      "Reportes de métricas reales",
      "Rotación de creativos",
      "Google Posts regulares",
    ],
  },
  {
    category: "Bonus: Klients App",
    highlight: true,
    items: [
      "6 meses de acceso sin costo",
      "Menú digital integrado",
      "Base de datos de clientes",
      "Programa de rewards",
      "SMS automatizado",
    ],
  },
] as const;

export const STACK_OFFER = {
  title: "Stack Offer",
  subtitle: "Todo el stack digital integrado en un solo lanzamiento",
  description:
    "No son servicios sueltos. Es un sistema donde cada canal alimenta al siguiente: contenido → ads → landing → retargeting → reservas → recurrencia con Klients.",
  layers: [
    {
      label: "Captación",
      items: ["Instagram", "Facebook", "Meta Ads", "Influencers"],
    },
    {
      label: "Conversión",
      items: ["Landing + menú HTML", "Google Maps", "Lista de espera", "Pixel + UTMs"],
    },
    {
      label: "Retención",
      items: ["Retargeting", "WhatsApp / SMS", "Klients App", "Rewards"],
    },
  ],
  includes: [
    "Setup completo de lanzamiento ($997)",
    "3 meses de ejecución y optimización ($497/mes)",
    "Klients App — 6 meses incluidos (valor $300+)",
    "Producción de contenido y coordinación de influencers",
    "Auditorías semanales y reportes de métricas reales",
  ],
  total: "$2,488",
  totalNote: "Total fase de lanzamiento · inversión publicitaria aparte",
} as const;

export const PRICING = {
  launch: {
    badge: "Pago inicial",
    title: "Fase de Lanzamiento",
    price: "$997",
    priceNote: "Pago único al inicio",
    description:
      "Activa todo el sistema antes de que abra el primer fin de semana. Diagnóstico, posicionamiento, setup digital completo y estructura de lanzamiento.",
    items: [
      "Diagnóstico estratégico y posicionamiento",
      "Google Business Profile completo",
      "Landing page con menú HTML y pixel",
      "Dirección del día de producción",
      "Campaña de expectativa activa",
    ],
  },
  execution: {
    badge: "Acompañamiento",
    title: "3 Meses de Ejecución",
    price: "$497",
    priceNote: "Por mes, durante 3 meses",
    description:
      "Ejecución de campañas, optimización semanal, coordinación de influencers y ajuste continuo durante los primeros meses críticos.",
    items: [
      "Campañas de Meta Ads activas",
      "Optimización semanal de creativos",
      "Coordinación de influencers",
      "Google Posts y gestión de reseñas",
      "Reuniones de seguimiento y reportes",
    ],
    highlighted: true,
  },
  klients: {
    badge: "Bonus incluido",
    title: "Klients App, 6 meses",
    price: "Gratis",
    priceNote: "Valor real: $300 o más",
    description:
      "Acceso completo a Klients durante los primeros 6 meses. App diseñada para restaurantes: retención y recurrencia.",
    items: [
      "Menú digital integrado",
      "Base de datos de clientes",
      "Programa de rewards",
      "SMS automatizado y notificaciones",
    ],
  },
  summary: [
    ["Pago inicial: setup, estrategia y lanzamiento", "$997"],
    ["Mes 1 de acompañamiento", "$497"],
    ["Mes 2 de acompañamiento", "$497"],
    ["Mes 3 de acompañamiento", "$497"],
    ["Klients, 6 meses de acceso completo", "Incluido sin costo"],
  ] as const,
  total: "$2,488",
} as const;
