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

// ─── 06_MOVIMIENTOS: movements (libro único — tabla central del Modelo C) ─────
// `mes` y `control` NO son columnas: se calculan en el dominio (ver features/movements/domain).
export const RECORD_TYPE = {
  INGRESO_RECONOCIDO: 'INGRESO_RECONOCIDO',
  COSTO_RECONOCIDO:   'COSTO_RECONOCIDO',
  COBRO:              'COBRO',
  PAGO:               'PAGO',
  APORTE_SOCIO:       'APORTE_SOCIO',
  RETIRO_SOCIO:       'RETIRO_SOCIO',
  COMPRA_ACTIVO:      'COMPRA_ACTIVO',
} as const;

export type RecordType = (typeof RECORD_TYPE)[keyof typeof RECORD_TYPE];

export const EXPENSE_CLASS = {
  DIRECTO:    'DIRECTO',
  ATRIBUIBLE: 'ATRIBUIBLE',
  COMPARTIDO: 'COMPARTIDO',
  NO_APLICA:  'NO_APLICA',
} as const;

export type ExpenseClass = (typeof EXPENSE_CLASS)[keyof typeof EXPENSE_CLASS];

export const MOVEMENT_STATUS = {
  BORRADOR: 'BORRADOR',
  VALIDADO: 'VALIDADO',
} as const;

export type MovementStatus = (typeof MOVEMENT_STATUS)[keyof typeof MOVEMENT_STATUS];

export interface DbMovement {
  id: number;
  movement_code: string;            // ID movimiento visible: MOV-AAAA-NNNN (trazabilidad)
  movement_date: string;            // date → ISO string
  record_type: RecordType;
  amount: number;                   // Importe (S/), siempre > 0
  business_unit_id: number;         // unidad BENEFICIARIA (default CORP)
  area_id: number;                  // área GESTORA (≠ beneficiaria)
  responsible: string | null;
  cost_category_id: number;
  expense_class: ExpenseClass;
  project_id: number | null;
  counterparty: string | null;      // tercero / proveedor
  detail: string | null;            // detalle / concepto
  payment_method: string | null;
  voucher_number: string | null;
  status: MovementStatus;
  notes: string | null;
  created_at?: string;
  updated_at?: string | null;
}

// ─── 07_PRESUPUESTOS: budgets (una fila por mes + unidad + área + categoría) ──
export interface DbBudget {
  id: number;
  month: string;                    // 'AAAA-MM'
  business_unit_id: number;
  area_id: number;
  cost_category_id: number;
  income_target: number;
  cost_target: number;
  comment: string | null;
}

// ─── 08_REPARTO: corp_allocation (mes → % por UN01–UN05; 0 = sin repartir) ────
export interface DbCorpAllocation {
  id: number;
  month: string;                    // 'AAAA-MM'
  business_unit_id: number;         // solo UN01–UN05 (nunca CORP)
  pct: number;                      // porcentaje 0–100
  note: string | null;              // criterio documentado
}

// ─── Configuración (saldo inicial de caja del Modelo C) ──────────────────────
export const SETTING_KEY = {
  OPENING_CASH: 'opening_cash',
} as const;

export interface DbAppSetting {
  key: string;
  value: string;
}

// ─── Roles y usuarios ────────────────────────────────────────────────────────
export const ROLE_CODE = {
  ADMIN:       'admin',
  COLABORADOR: 'colaborador',
} as const;

export type RoleCode = (typeof ROLE_CODE)[keyof typeof ROLE_CODE];

export interface DbRole {
  id: number;
  code: RoleCode;
  name: string;
}

export interface DbUser {
  id: number;
  email: string;
  full_name: string;
  role_id: number;
  specialist_id: number | null;     // vínculo con el especialista (Kanban / horas propias)
  active: boolean;
}

// ─── Horas-hombre: work_hours ────────────────────────────────────────────────
export interface DbWorkHour {
  id: number;
  specialist_id: number;            // persona
  project_id: number;
  task_id: number | null;
  work_date: string;                // date → ISO string
  hours: number;                    // 0 < horas ≤ 24 (= fin − inicio − descansos)
  description: string | null;
  // Migración 20261016000001 (opcionales: registros antiguos sin horario)
  start_time?: string | null;       // 'HH:MM' (Postgres TIME devuelve 'HH:MM:SS')
  end_time?: string | null;         // 'HH:MM'; menor que start_time = cruzó la medianoche
  break_minutes?: number;           // minutos de descanso descontados
  breaks?: string | null;           // "13:00-14:00, 16:00-16:15"
  created_at?: string;
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
      movements: {
        Row: DbMovement;
        Insert: Omit<DbMovement, 'id'> & { id?: number };
        Update: Partial<DbMovement>;
      };
      budgets: {
        Row: DbBudget;
        Insert: Omit<DbBudget, 'id'> & { id?: number };
        Update: Partial<DbBudget>;
      };
      corp_allocation: {
        Row: DbCorpAllocation;
        Insert: Omit<DbCorpAllocation, 'id'> & { id?: number };
        Update: Partial<DbCorpAllocation>;
      };
      app_settings: {
        Row: DbAppSetting;
        Insert: DbAppSetting;
        Update: Partial<DbAppSetting>;
      };
      roles: {
        Row: DbRole;
        Insert: Omit<DbRole, 'id'> & { id?: number };
        Update: Partial<DbRole>;
      };
      users: {
        Row: DbUser;
        Insert: Omit<DbUser, 'id'> & { id?: number };
        Update: Partial<DbUser>;
      };
      work_hours: {
        Row: DbWorkHour;
        Insert: Omit<DbWorkHour, 'id'> & { id?: number };
        Update: Partial<DbWorkHour>;
      };
    };
  };
}
