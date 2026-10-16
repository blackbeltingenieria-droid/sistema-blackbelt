// features/excel-data/excel-raw.ts
// Filas tal cual del Excel «CUADRO DE COSTOS - PRIMER MODELO» (hojas TABLA_*). NO editar a mano:
// es la fuente real. Las fechas 15/10/2025 de TABLA_INGRESOS filas 12 y 13 son ADELANTOS y se dejan tal cual.
// Solo se corrigen textos mal escritos: "15/010/2026" → 2026-10-15; "09/092026" → 2026-09-09.

export const EXCEL_INGRESOS = [
  { row: 8, client: "WILMER SANCHEZ MAMANI", doc: "45410158", product: "DESARROLLO DE TESIS", group: "DESARROLLO DE TESIS COMPLETA", spec: "Pago de Tesis primera entrega", date: "2026-09-24", amount: 800, method: "YAPE" },
  { row: 9, client: "CASTRO ESTFHANY DIAZ", doc: "60555252", product: "TESINA", group: "ORDENAR A FORMATO APA Y LEVANTAR OBSERVACIONES", spec: "Pago por culminacion", date: "2026-10-07", amount: 90, method: "YAPE" },
  { row: 10, client: "ANTHENOL BENITO FARROMEQUE MUTTO", doc: "44850179", product: "PROYECTO DE INVESTIGACION", group: "REALIZAR LA PARTE DE INTRODUCCION", spec: "Pago por la elaboracion de la Introduccion", date: "2026-10-10", amount: 400, method: "YAPE" },
  { row: 11, client: "ERIKA MERINO ROÑA", doc: null, product: "PROYECTO DE INVESTIGACION", group: "REALIZAR LA PARTE DE INTRODUCCION", spec: "Pago por la elaboracion de la Introduccion", date: "2026-10-10", amount: 400, method: "YAPE" },
  { row: 12, client: "WILMER SANCHEZ MAMANI", doc: "45410158", product: "DESARROLLO DE TESIS", group: "DESARROLLO DE TESIS COMPLETA", spec: "Pago de Tesis primera entrega", date: "2025-10-15", amount: 1500, method: "YAPE" },
  { row: 13, client: "TANIA LUCIA AROS RENGIFO", doc: "41705907", product: "DESARROLLO DE TESIS", group: "DESARROLLO DE TESIS COMPLETA", spec: "Pago de Tesis primera entrega", date: "2025-10-15", amount: 2050, method: "YAPE" },
] as const;

export const EXCEL_EGRESOS = [
  { row: 9, payer: "TEDDY GARCIA MURRIETA", area: "DIRECCION ESTRATEGICA", unit: "GENERAL", product: "OBTENCION DE RUC", group: "TRANSPORTES Y TRAMITES", spec: "Se hizo un pago para poner 100 soles como socios como registro de Blackbelt", date: "2026-09-04", amount: 100, method: "YAPE" },
  { row: 10, payer: "TEDDY GARCIA MURRIETA", area: "DIRECCION ESTRATEGICA", unit: "GENERAL", product: "OBTENCION DE RUC", group: "TRANSPORTES Y TRAMITES", spec: "Pago por el servicio a la notaria", date: "2026-09-04", amount: 150, method: "BBVA" },
  { row: 11, payer: "TEDDY GARCIA MURRIETA", area: "DIRECCION ESTRATEGICA", unit: "GENERAL", product: "OBTENCION DE RUC", group: "TRANSPORTES Y TRAMITES", spec: "Pago por el transporte a la transporte", date: "2026-09-04", amount: 57.1, method: "YAPE" },
  { row: 12, payer: "TEDDY GARCIA MURRIETA", area: "DIRECCION ESTRATEGICA", unit: "GENERAL", product: "OBTENCION DE RUC", group: "TRANSPORTES Y TRAMITES", spec: "Pago por tramite en la sunarp", date: "2026-09-04", amount: 26.6, method: "BBVA" },
  { row: 13, payer: "HENRY TORRES RIVERA", area: "MARKETING", unit: "GENERAL", product: "CANVA", group: "HERRAMIENTAS DIGITALES", spec: "Herramienta que sirve para el diseño y publicidad", date: "2026-08-18", amount: 40, method: "BBVA" },
  { row: 14, payer: "HENRY TORRES RIVERA", area: "GENERAL", unit: "GENERAL", product: "GOOGLE MEET", group: "HERRAMIENTAS DIGITALES", spec: "Herramienta que sirve para crear reuniones", date: "2026-08-16", amount: 36, method: "BBVA" },
  { row: 15, payer: "HENRY TORRES RIVERA", area: "GENERAL", unit: "GENERAL", product: "CLAUDE AI", group: "HERRAMIENTAS DIGITALES", spec: "Herramienta que ayuda a mejorar la efectividad de decisiones", date: "2026-08-16", amount: 80, method: "BBVA" },
  { row: 16, payer: "HENRY TORRES RIVERA", area: "GENERAL", unit: "GENERAL", product: "BITEL", group: "SERVICIO TELEFÓNICO", spec: "servicio telefonico para los mensajes y llamadas de la empresa", date: "2026-08-18", amount: 39.9, method: "YAPE" },
  { row: 17, payer: "HENRY TORRES RIVERA", area: "GENERAL", unit: "GENERAL", product: "CHAT GPT GO", group: "HERRAMIENTAS DIGITALES", spec: "Herramienta que ayuda a mejorar la efectividad de decisiones", date: "2026-08-15", amount: 20, method: "BBVA" },
  { row: 18, payer: "HENRY TORRES RIVERA", area: "GENERAL", unit: "GENERAL", product: "GOOGLE ONE", group: "HERRAMIENTAS DIGITALES", spec: "Herramienta AI para la velocidad de informacion", date: "2026-08-14", amount: 10, method: "BBVA" },
  { row: 19, payer: "TEDDY GARCIA MURRIETA", area: "MARKETING", unit: "GENERAL", product: "PAGINA WEB", group: "HERRAMIENTAS DIGITALES", spec: "Herramienta que ayudará a dar una base en la web", date: "2026-08-21", amount: 200, method: "YAPE" },
  { row: 20, payer: "HENRY TORRES RIVERA", area: "MARKETING", unit: "GENERAL", product: "CANVA", group: "HERRAMIENTAS DIGITALES", spec: "Herramienta que sirve para el diseño y publicidad", date: "2026-09-18", amount: 40, method: "BBVA" },
  { row: 21, payer: "HENRY TORRES RIVERA", area: "GENERAL", unit: "GENERAL", product: "GOOGLE MEET", group: "HERRAMIENTAS DIGITALES", spec: "Herramienta que sirve para crear reuniones", date: "2026-09-16", amount: 36, method: "BBVA" },
  { row: 22, payer: "HENRY TORRES RIVERA", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", product: "QUILLBOT", group: "HERRAMIENTAS DIGITALES", spec: "Herramienta util para el desarrollo de investigaciones", date: "2026-09-20", amount: 33.9, method: "BBVA" },
  { row: 23, payer: "HENRY TORRES RIVERA", area: "DIRECCION ESTRATEGICA", unit: "GENERAL", product: "BITEL", group: "SERVICIO TELEFÓNICO", spec: "servicio telefonico para los mensajes y llamadas de la empresa", date: "2026-09-18", amount: 39.9, method: "BBVA" },
  { row: 24, payer: "HENRY TORRES RIVERA", area: "DIRECCION ESTRATEGICA", unit: "GENERAL", product: "CHAT GPT GO", group: "HERRAMIENTAS DIGITALES", spec: "Herramienta que ayuda a mejorar la efectividad de decisiones", date: "2026-09-15", amount: 20, method: "BBVA" },
  { row: 25, payer: "HENRY TORRES RIVERA", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", product: "ESPECIALISTA", group: "SERVICIOS DE INVESTIGACION", spec: "Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)", date: "2026-09-15", amount: 200, method: "BBVA" },
  { row: 26, payer: "HENRY TORRES RIVERA", area: "MARKETING", unit: "INVESTIGACION Y DESARROLLO", product: "PUBLICIDAD EN FB", group: "MARKETING DIGITAL", spec: "Marketeo que ayudara a conseguir mas clientes", date: "2026-09-21", amount: 250.06, method: "BBVA" },
  { row: 27, payer: "HENRY TORRES RIVERA", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", product: "ESPECIALISTA", group: "SERVICIOS DE INVESTIGACION", spec: "Servicio de desarrollo de tesis a Wilmer(henry)", date: "2026-10-02", amount: 80, method: "YAPE" },
  { row: 28, payer: "HENRY TORRES RIVERA", area: "GENERAL", unit: "GENERAL", product: "CHAT GPT PLUS", group: "HERRAMIENTAS DIGITALES", spec: "Herramienta que ayuda a mejorar la efectividad de decisiones", date: "2026-10-02", amount: 86, method: "BBVA" },
  { row: 29, payer: "HENRY TORRES RIVERA", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", product: "ESPECIALISTA", group: "SERVICIOS DE INVESTIGACION", spec: "Asesoramiento de Investigacion", date: "2026-10-04", amount: 40, method: "BCP" },
  { row: 30, payer: "HENRY TORRES RIVERA", area: "MARKETING", unit: "GENERAL", product: "ESPECIALISTA", group: "MARKETING DIGITAL", spec: "Marketeo que ayudara a conseguir mas clientes (Alanis)", date: "2026-10-04", amount: 100, method: "YAPE" },
  { row: 31, payer: "HENRY TORRES RIVERA", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", product: "ESPECIALISTA", group: "SERVICIOS DE INVESTIGACION", spec: "Servicio de desarrollo de tesis a teddy", date: "2026-10-06", amount: 10, method: "YAPE" },
  { row: 32, payer: "HENRY TORRES RIVERA", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", product: "ESPECIALISTA", group: "SERVICIOS DE INVESTIGACION", spec: "Servicio de desarrollo de tesis a Jhimmy Cortez", date: "2026-10-06", amount: 175, method: "YAPE" },
  { row: 33, payer: "HENRY TORRES RIVERA", area: "MARKETING", unit: "INVESTIGACION Y DESARROLLO", product: "PUBLICIDAD EN FB", group: "MARKETING DIGITAL", spec: "Marketeo que ayudara a conseguir mas clientes", date: "2026-10-08", amount: 76.34, method: "BBVA" },
  { row: 34, payer: "HENRY TORRES RIVERA", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", product: "ESPECIALISTA", group: "SERVICIOS DE INVESTIGACION", spec: "Servicio de desarrollo de tesis a Jhimmy Cortez", date: "2026-10-12", amount: 125, method: "YAPE" },
  { row: 35, payer: "TEDDY GARCIA MURRIETA", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", product: "ESPECIALISTA", group: "SERVICIOS DE INVESTIGACION", spec: "Servicio de desarrollo de tesis a Teddy", date: "2026-10-12", amount: 20, method: "YAPE" },
  { row: 36, payer: "TEDDY GARCIA MURRIETA", area: "GENERAL", unit: "GENERAL", product: "EXTENSION DE CORRIENTE", group: "HERRAMIENTA", spec: "Se requiere una extension para una mejor conectividad de las PC´s y laptops", date: "2026-10-12", amount: 15, method: "YAPE" },
  { row: 37, payer: "HENRY TORRES RIVERA", area: "GENERAL", unit: "GENERAL", product: "TRANSPORTE", group: "TRANSPORTES Y TRAMITES", spec: "Se pago el pasaje para la obtencion del RUC", date: "2026-10-12", amount: 8, method: "YAPE" },
  { row: 38, payer: "HENRY TORRES RIVERA", area: "GENERAL", unit: "GENERAL", product: "CENA", group: "REUNIONES EJECUTIVAS", spec: "Se pago una cena por la celebracion de la obtención del RUC", date: "2026-10-13", amount: 77.9, method: "YAPE" },
  { row: 39, payer: "HENRY TORRES RIVERA", area: "MARKETING", unit: "GENERAL", product: "ESPECIALISTA", group: "MARKETING DIGITAL", spec: "Marketeo que ayudara a conseguir mas clientes  (Alanis)", date: "2026-10-13", amount: 250, method: "YAPE" },
  { row: 40, payer: "HENRY TORRES RIVERA", area: "DIRECCION ESTRATEGICA", unit: "GENERAL", product: "BITEL", group: "SERVICIO TELEFÓNICO", spec: "servicio telefonico para los mensajes y llamadas de la empresa", date: "2026-10-14", amount: 39.9, method: "BBVA" },
  { row: 41, payer: "HENRY TORRES RIVERA", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", product: "ESPECIALISTA", group: "SERVICIOS DE INVESTIGACION", spec: "Servicio de desarrollo de tesis a Jhimmy Cortez", date: "2026-10-15", amount: 900, method: "YAPE" },
  { row: 42, payer: "HENRY TORRES RIVERA", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", product: "ESPECIALISTA", group: "SERVICIOS DE INVESTIGACION", spec: "Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)", date: "2026-10-15", amount: 1300, method: "BBVA" },
  { row: 43, payer: "HENRY TORRES RIVERA", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", product: "ESPECIALISTA", group: "SERVICIOS DE INVESTIGACION", spec: "Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)", date: "2026-10-15", amount: 12.13, method: "BBVA" },
  { row: 44, payer: "HENRY TORRES RIVERA", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", product: "ESPECIALISTA", group: "SERVICIOS DE INVESTIGACION", spec: "Servicio de desarrollo de tesis a Wilmer(henry)", date: "2026-10-15", amount: 100, method: "YAPE" },
  { row: 45, payer: "HENRY TORRES RIVERA", area: "GENERAL", unit: "GENERAL", product: "IA VIDEO", group: "HERRAMIENTAS DIGITALES", spec: "Servicio de desarrollo de tesis a Wilmer(henry)", date: "2026-10-15", amount: 45, method: "YAPE" },
] as const;

export const EXCEL_INVERSIONES = [
  { row: 7, name: "HANS CARLOS TORRES MURRIETA", doc: "10244394", spec: "Inversion como socio", date: "2026-08-16", amount: 1000, method: "YAPE" },
  { row: 8, name: "HANS CARLOS TORRES MURRIETA", doc: "10244394", spec: "Inversion como socio", date: "2026-09-18", amount: 500, method: "YAPE" },
] as const;

export const EXCEL_CLIENTES = [
  { row: 10, name: "WILMER WILFREDO SANCHEZ MAMANI", doc: "45410158", phone: "979343755", service: "DESARROLLO DE TESIS COMPLETO", institution: "UNIVERSIDAD CONTINENTAL DEL PERÚ", start: "2026-09-09", end: "2026-10-18", contracted: 3000, paid: 2300, pending: 700 },
  { row: 11, name: "ERIKA MERINO ROÑA", doc: null, phone: "951903351", service: "DESARROLLO DE TESIS COMPLETO", institution: "UNIVERSIDAD DE CIENCIAS Y HUMANIDADES", start: "2026-10-04", end: "2026-10-31", contracted: 2000, paid: 400, pending: 1600 },
  { row: 12, name: "TANIA LUCIA AROS RENGIFO", doc: "41705907", phone: "970474152", service: "DESARROLLO DE TESIS COMPLETO", institution: "NEWMAN ESCUELA DE POSGRADO", start: "2026-10-04", end: "2026-10-15", contracted: 2050, paid: 2050, pending: 0 },
  { row: 13, name: "DIAZ CASTRO STHEFANY", doc: "60555252", phone: "953807468", service: "CORRECCION Y FORMATO APA", institution: "UNIVERSIDAD DE HUÁNUCO", start: "2026-10-07", end: "2026-10-07", contracted: 90, paid: 90, pending: 0 },
  { row: 14, name: "ANTHENOL BENITO FARROMEQUE MUTTO", doc: "44850179", phone: "993708737", service: "PROYECTO DE TESIS", institution: "UNIVERSIDAD CÉSAR VALLEJO", start: "2026-10-09", end: "2026-12-22", contracted: 1200, paid: 400, pending: 800 },
] as const;

export const EXCEL_MANO_OBRA = [
  { row: 11, name: "EDDY RENATO VIVANCO NÚÑEZ", doc: "74994929", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", service: "ASESORAMIENTO EN ING. MECÁNICA", spec: "DESARROLLARÁ EL MODELAMIENTO DE LA PLATAFORMA DEL MOLINO DE BOLAS", client: "WILMER SANCHEZ MAMANI", term: "POR PROYECTO", start: "2026-09-18", end: "2026-10-18", required: 1500, paid: 1500, pending: 0 },
  { row: 12, name: "JHIMMY CORTÉZ RUIZ", doc: "40098380", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", service: "ASESORAMIENTO DE TESIS EN GENERAL", spec: "DESARROLLARA PARTE DE LA INVESTIGACION DE TANIA AROS", client: "TANIA AROS RENGIFO", term: "POR PROYECTO", start: "2026-10-03", end: "2026-10-13", required: 1200, paid: 1200, pending: 0 },
  { row: 13, name: "MANUEL ENRIQUE PANDURO RENGIFO", doc: "40443237", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", service: "ASESORAMIENTO DE TESIS DE DERECHO", spec: "ASESORAR LA INVESTIGACION DE MARISOL FLORES", client: "MARISOL FLORES", term: "POR PROYECTO", start: "2026-10-03", end: "2026-10-04", required: 40, paid: 40, pending: 0 },
  { row: 14, name: "TEDDY GARCIA MURRIETA", doc: "10250610", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", service: "ASESORAMIENTO DE TESIS EN GENERAL", spec: "ASESORAR LA INVESTIGACION DE WILMER", client: "WILMER SANCHEZ MAMANI", term: "POR PROYECTO", start: "2026-09-18", end: "2026-10-18", required: 280, paid: 30, pending: 250 },
  { row: 15, name: "HENRY TORRES RIVERA", doc: "73972788", area: "INVESTIGACION Y DESARROLLO", unit: "INVESTIGACION Y DESARROLLO", service: "ASESORAMIENTO DE TESIS EN GENERAL", spec: "ASESORAR LA INVESTIGACION DE WILMER", client: "WILMER SANCHEZ MAMANI", term: "POR PROYECTO", start: "2026-09-18", end: "2026-10-18", required: 280, paid: 180, pending: 100 },
  { row: 16, name: "ALANIS PARDAVÉ", doc: "61467305", area: "INVESTIGACION Y DESARROLLO", unit: "MARKETING DIGITAL", service: "MARKETEO DE REDES SOCIALES", spec: "ACTIVAR Y MEJORAR LAS REDES SOCIALES, PUBLICITAR Y REALIZAR DISEÑOS", client: "BLACKBELT GROUP", term: "MENSUAL", start: "2026-10-04", end: "2026-10-05", required: 700, paid: 350, pending: 350 },
  { row: 17, name: "JOHANN IMANOL HERRERA RAMOS", doc: "73515597", area: "TECNOLOGIA Y DESARROLLO", unit: "GENERAL", service: "PRACTICANTE", spec: "MEJORAR EL SISTEMA DE BLACKBELT, ASI TAMBIEN COMO EL DESARROLLO DE ALGUNAS ACTIVIDADES", client: "BLACKBELT GROUP", term: "MENSUAL", start: "2026-10-08", end: "2026-11-08", required: 700, paid: 0, pending: 700 },
] as const;

/** Totales del Excel con los que la página debe cuadrar. */
export const EXCEL_TOTALES = {
  ingresos: 5240,          // TABLA_INGRESOS D5
  egresos: 4839.73,        // TABLA_EGRESOS C4
  inversion: 1500,         // TABLA_INVERSIONES C4
  fondoEnCaja: 1900.27,    // TABLA_EGRESOS C6 = ingresos + inversión − egresos
  contratado: 8340,        // TABLA_CLIENTES C7
  pagadoClientes: 5240,    // TABLA_CLIENTES C5
  faltaCobrar: 3100,       // TABLA_CLIENTES C3
  manoObraRequerido: 4700, // TABLA_M.O C8
  manoObraPagado: 3300,    // TABLA_M.O C6
  manoObraFalta: 1400,     // TABLA_M.O C4
  herramientas: 601.9,     // TABLA_HERRAMIENTAS C4
  serviciosPublicidad: 329.86, // TABLA_SERVICIOS Y PUBLICIDAD C4
} as const;
