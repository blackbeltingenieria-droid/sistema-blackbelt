// ─── Database types aligned to the real Supabase schema (Modelo C) ───────────
// Source of truth: BLACKBELT_GROUP_Estructura_Financiera_Modelo_C.xlsx
// Keep in sync with 03-modelo-de-datos.md. Never redefine in individual features.

// ─── 01_UNIDADES: business_units ─────────────────────────────────────────────
export interface DbBusinessUnit {
  id: number;
  code: BusinessUnitCode;
  name: string;
  color: string;       // Hex oficial: #E67E22, #1677FF, etc.
  status: string;      // 'Activo' | 'Inactivo'
  scope: string | null;// Alcance y descripción oficial
}

export const BUSINESS_UNIT_CODE = {
  UN01: 'UN01', // Ingeniería y Productividad (#E67E22)
  UN02: 'UN02', // Tecnología y Transformación Digital (#1677FF)
  UN03: 'UN03', // Investigación y Desarrollo (#6C3FC5)
  UN04: 'UN04', // Ingeniería Especializada (#159957)
  UN05: 'UN05', // Emprendimiento y Desarrollo Empresarial (#007080)
  CORP: 'CORP', // Corporativo / General (#C9A23A)
} as const;

export type BusinessUnitCode = (typeof BUSINESS_UNIT_CODE)[keyof typeof BUSINESS_UNIT_CODE];

// ─── 02_AREAS: areas (tabla nueva) ───────────────────────────────────────────
export interface DbArea {
  id: number;
  code: string;                  // 'DIR', 'MKT', 'U01-OPS', etc.
  name: string;                  // Área / subárea
  type: AreaType;                // 'General' | 'Específica'
  business_unit_id: number | null; // FK a business_units.id (null si es General)
  description: string | null;    // Función y criterio de uso
  created_at?: string;
}

export const AREA_TYPE = {
  GENERAL:    'General',
  ESPECIFICA: 'Específica',
} as const;

export type AreaType = (typeof AREA_TYPE)[keyof typeof AREA_TYPE];

// ─── 03_CATEGORIAS: cost_categories (17 categorías fijas Modelo C) ───────────
export interface DbCostCategory {
  id: number;
  code: CostCategoryCode;
  name: string;
  description: string | null;    // Ejemplos
  main_rule?: string | null;     // Regla principal
}

export const COST_CATEGORY_CODE = {
  MO:   'MO',   // Mano de obra y especialistas
  PUB:  'PUB',  // Publicidad y captación
  SOFT: 'SOFT', // Software y herramientas digitales
  SERV: 'SERV', // Servicios y telecomunicaciones
  MAT:  'MAT',  // Materiales e insumos
  MAQ:  'MAQ',  // Maquinaria y equipos
  MOV:  'MOV',  // Transporte y viáticos
  TERC: 'TERC', // Servicios tercerizados
  ADM:  'ADM',  // Administración y trámites
  CAP:  'CAP',  // Capacitación
  BAN:  'BAN',  // Comisiones bancarias
  MANT: 'MANT', // Mantenimiento
  ACT:  'ACT',  // Adquisición de activos
  CXC:  'CXC',  // Cobros de clientes
  CXP:  'CXP',  // Pagos a proveedores
  SOC:  'SOC',  // Aportes y retiros de socios
  OTR:  'OTR',  // Otros
} as const;

export type CostCategoryCode = (typeof COST_CATEGORY_CODE)[keyof typeof COST_CATEGORY_CODE];

// ─── 04_CLIENTES: clients ────────────────────────────────────────────────────
export interface DbClient {
  id: number;
  name: string;                 // Nombre / razón social
  client_type?: string | null;  // 'Persona' | 'Empresa'
  doc_number: string | null;    // DNI/RUC
  phone?: string | null;        // WhatsApp
  email?: string | null;        // Correo
  location?: string | null;     // Ubicación
  notes?: string | null;        // Observaciones
  created_at: string;
}

// ─── 05_PROYECTOS: projects ──────────────────────────────────────────────────
export interface DbProject {
  id: number;
  code?: string | null;         // ID proyecto (ej. PRY-2026-001)
  client_id: number;
  business_unit_id: number;     // FK a business_units (UN01-UN05 / CORP)
  area_id?: number | null;      // FK a areas (área gestora si aplica)
  name: string;                 // Nombre descriptivo / Servicio
  service: string | null;       // Servicio contratado
  manager?: string | null;      // Responsable asignado
  start_date: string | null;    // date → ISO string
  end_date: string | null;      // date → ISO string
  contracted_amount: number;    // Monto contratado (S/.)
  status: ProjectStatus;        // 'activo' | 'finalizado' | 'cancelado'
  notes?: string | null;        // Observación / alcance
  contract_url?: string | null; // Enlace al contrato
}

export interface DbProjectPayment {
  id: number;
  project_id: number;
  amount: number;
  payment_date: string;         // date → ISO string
  payment_method: string | null;
}

// Project status values — catalog constant, never raw string
export const PROJECT_STATUS = {
  ACTIVO:     'activo',
  FINALIZADO: 'finalizado',
  CANCELADO:  'cancelado',
} as const;

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

// ─── Herramientas y Transacciones (compatibilidad) ───────────────────────────
export interface DbTool {
  id: number;
  name: string;
  scope: ToolScope;
  exclusive_business_unit_id: number | null;
  monthly_reference_cost: number | null;
  notes: string | null;
  created_at: string;
}

export const TOOL_SCOPE = {
  EXCLUSIVE: 'exclusive',
  SHARED:    'shared',
  GENERAL:   'general',
} as const;

export type ToolScope = (typeof TOOL_SCOPE)[keyof typeof TOOL_SCOPE];

export interface DbToolBusinessUnit {
  id: number;
  tool_id: number;
  business_unit_id: number;
  default_pct: number;
}

export interface DbTransaction {
  id: number;
  description: string;
  amount: number;
  transaction_date: string;
  payment_method: string | null;
  cost_category_id: number;
  tool_id: number | null;
  project_id: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface DbTransactionAllocation {
  id: number;
  transaction_id: number;
  business_unit_id: number;
  pct: number;
}

// ─── Kanban/Scrum: specialists, sprints, tasks ───────────────────────────────
export interface DbSpecialist {
  id: number;
  full_name: string;
  email?: string | null;
  specialty?: string | null;
  active: boolean;
  created_at?: string;
}

export const SPRINT_STATUS = {
  PLANIFICADO: 'planificado',
  ACTIVO:      'activo',
  CERRADO:     'cerrado',
} as const;

export type SprintStatus = (typeof SPRINT_STATUS)[keyof typeof SPRINT_STATUS];

export interface DbSprint {
  id: number;
  project_id: number;
  name: string;
  goal: string | null;
  start_date: string | null;   // date → ISO string
  end_date: string | null;
  status: SprintStatus;
  created_at?: string;
}

// Estados de tarea = motivo belt-stripe oficial (mismos valores que StatusChip)
export const TASK_STATUS = {
  BACKLOG:     'backlog',
  POR_HACER:   'por_hacer',
  EN_CURSO:    'en_curso',
  EN_REVISION: 'en_revision',
  HECHO:       'hecho',
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export interface DbTask {
  id: number;
  project_id: number;
  sprint_id: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee_id: number | null;  // FK a specialists
  due_date: string | null;
  created_at?: string;
  updated_at?: string | null;
}

// ─── Database shape for supabase-js generic typing ──────────────────────────
export interface Database {
  public: {
    Tables: {
      business_units: {
        Row: DbBusinessUnit;
        Insert: Omit<DbBusinessUnit, 'id'> & { id?: number };
        Update: Partial<DbBusinessUnit>;
      };
      areas: {
        Row: DbArea;
        Insert: Omit<DbArea, 'id'> & { id?: number };
        Update: Partial<DbArea>;
      };
      cost_categories: {
        Row: DbCostCategory;
        Insert: Omit<DbCostCategory, 'id'> & { id?: number };
        Update: Partial<DbCostCategory>;
      };
      clients: {
        Row: DbClient;
        Insert: Omit<DbClient, 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<DbClient>;
      };
      projects: {
        Row: DbProject;
        Insert: Omit<DbProject, 'id'> & { id?: number };
        Update: Partial<DbProject>;
      };
      project_payments: {
        Row: DbProjectPayment;
        Insert: Omit<DbProjectPayment, 'id'> & { id?: number };
        Update: Partial<DbProjectPayment>;
      };
      tools: {
        Row: DbTool;
        Insert: Omit<DbTool, 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<DbTool>;
      };
      tool_business_units: {
        Row: DbToolBusinessUnit;
        Insert: Omit<DbToolBusinessUnit, 'id'> & { id?: number };
        Update: Partial<DbToolBusinessUnit>;
      };
      transactions: {
        Row: DbTransaction;
        Insert: Omit<DbTransaction, 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<DbTransaction>;
      };
      transaction_allocations: {
        Row: DbTransactionAllocation;
        Insert: Omit<DbTransactionAllocation, 'id'> & { id?: number };
        Update: Partial<DbTransactionAllocation>;
      };
      specialists: {
        Row: DbSpecialist;
        Insert: Omit<DbSpecialist, 'id'> & { id?: number };
        Update: Partial<DbSpecialist>;
      };
      sprints: {
        Row: DbSprint;
        Insert: Omit<DbSprint, 'id'> & { id?: number };
        Update: Partial<DbSprint>;
      };
      tasks: {
        Row: DbTask;
        Insert: Omit<DbTask, 'id'> & { id?: number };
        Update: Partial<DbTask>;
      };
    };
  };
}
