// DashboardSede.tsx — dashboard ejecutivo de BlackBelt Institute (sede Pucallpa), estilo «tablero de Excel»:
// panel de filtros a la izquierda (Año, Mes, Programa), banner, tarjetas de cifras y una grilla de gráficos.
// Mismo vocabulario que el Dashboard general (Vendió, Gastó, Ganó, Dinero en caja, Le deben, Debe).
// CARPETA COPIADA IDÉNTICA en ambas apps (ver la cabecera de sede.ts): no importa nada propio de una app,
// solo React, recharts y las clases de Tailwind que comparten (paleta BlackBelt).

import { useMemo, useState, type ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  TODO, aniosDisponibles, cartera, cobrosPorMedio, filtrarPrograma, gastosPorCategoria, mesesDisponibles,
  morosos, programasDisponibles, proximosVencimientos, resumen, serieMensual, ventasPorPrograma,
  type Alerta, type Barra, type DatosSede,
} from './sede';

// Paleta BlackBelt (mismos valores que tailwind.config de ambas apps).
const C = {
  ink: '#15130F', canvas: '#F6F3EC', paper: '#FFFFFF', gold: '#C79A3A', rust: '#B0532A',
  inkSoft: '#6B6659', line: '#E4DFD3', verde: '#6E8B55', ambar: '#D8B13A', naranja: '#C9742E',
} as const;
const SERIE = [C.gold, C.verde, C.rust, C.ink, C.naranja, C.ambar, C.inkSoft];
const COLOR_CARTERA: Record<string, string> = { Cobrado: C.verde, 'Por vencer': C.gold, Vencido: C.rust };

const PEN = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const soles = (n: number) => PEN.format(n);
const corto = (n: number) => {
  const a = Math.abs(n); const s = n < 0 ? '-' : '';
  return a >= 1000 ? `${s}${(a / 1000).toFixed(a % 1000 === 0 ? 0 : 1)}k` : `${s}${Math.round(a)}`;
};
const pct = (n: number) => `${Math.round(n)} %`;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mesLargo = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const mesCorto = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1].slice(0, 3)} ${m.slice(2, 4)}`;
const recorta = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const EJE = { fontSize: 10, fill: C.inkSoft, fontFamily: '"IBM Plex Mono", monospace' } as const;
const EJE_TXT = { fontSize: 10, fill: C.inkSoft, fontFamily: '"IBM Plex Sans", sans-serif' } as const;

// ── Piezas ───────────────────────────────────────────────────────────

interface TipProps { active?: boolean; label?: string | number; payload?: { name?: string; value?: number | string; color?: string; payload?: { fill?: string } }[] }
function Tip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-paper border border-line rounded-card px-3 py-2 shadow-sm">
      {label !== undefined && <p className="bb-label-xs text-ink-soft mb-1">{label}</p>}
      {payload.filter((p) => typeof p.value === 'number').map((p) => (
        <p key={p.name} className="bb-mono text-xs text-ink flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: p.color ?? p.payload?.fill ?? C.gold }} />
          {p.name}: <strong>{soles(p.value as number)}</strong>
        </p>
      ))}
    </div>
  );
}

function Panel({ titulo, children, className = '', testId }: { titulo: string; children: ReactNode; className?: string; testId?: string }) {
  return (
    <section className={`bg-paper rounded-card border border-line shadow-sm p-3 min-w-0 ${className}`} data-testid={testId}>
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-ink text-center mb-2">{titulo}</h3>
      {children}
    </section>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="text-xs text-ink-soft text-center py-12">{texto}</p>;
}

function Kpi({ etiqueta, valor, color, nota }: { etiqueta: string; valor: string; color: string; nota?: string }) {
  return (
    <div className="bg-paper rounded-card border border-line shadow-sm px-3 py-2.5 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.rust }}>{etiqueta}</p>
      <p className="bb-mono text-base sm:text-lg 2xl:text-xl font-semibold text-right whitespace-nowrap" style={{ color }}>{valor}</p>
      {nota && <p className="text-[10px] text-ink-soft text-right truncate">{nota}</p>}
    </div>
  );
}

/** Segmentador estilo Excel: lista de botones, uno elegido. */
function Segmentador({ titulo, opciones, valor, onCambio }: {
  titulo: string; opciones: { valor: string; etiqueta: string }[]; valor: string; onCambio: (v: string) => void;
}) {
  return (
    <div className="bg-paper rounded-card p-2">
      <p className="text-[11px] font-semibold text-ink mb-1.5">{titulo}</p>
      <div className="space-y-1 max-h-48 overflow-y-auto" role="listbox" aria-label={titulo}>
        {opciones.map((o) => (
          <button key={o.valor} type="button" role="option" aria-selected={valor === o.valor} onClick={() => onCambio(o.valor)}
            className={`w-full text-left text-xs px-2 py-1.5 rounded-sm truncate transition-colors ${valor === o.valor ? 'bg-gold text-ink font-semibold' : 'bg-canvas text-ink-soft hover:text-ink'}`}>
            {o.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}

function Dona({ data, colores, vacio }: { data: Barra[]; colores: (b: Barra, i: number) => string; vacio: string }) {
  const total = data.reduce((a, b) => a + b.monto, 0);
  if (total <= 0) return <Vacio texto={vacio} />;
  return (
    <>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie isAnimationActive={false} data={data.filter((b) => b.monto > 0)} dataKey="monto" nameKey="nombre" innerRadius="55%" outerRadius="95%" paddingAngle={2} stroke={C.paper}>
              {data.filter((b) => b.monto > 0).map((b) => <Cell key={b.nombre} fill={colores(b, data.indexOf(b))} />)}
            </Pie>
            <Tooltip content={<Tip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 space-y-0.5">
        {data.map((b, i) => (
          <li key={b.nombre} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-ink truncate"><span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ background: colores(b, i) }} />{b.nombre}</span>
            <span className="bb-mono text-ink whitespace-nowrap">{soles(b.monto)} <span className="text-ink-soft">{pct((b.monto / total) * 100)}</span></span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Alertas({ filas, vacio, conFecha }: { filas: Alerta[]; vacio: string; conFecha?: boolean }) {
  if (filas.length === 0) return <p className="text-xs text-ink-soft py-2">{vacio}</p>;
  return (
    <ul className="divide-y divide-line">
      {filas.map((f) => (
        <li key={`${f.contrato}-${f.fecha ?? ''}`} className="py-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="min-w-0"><span className="block text-ink truncate">{f.alumno}</span><span className="block text-[10px] text-ink-soft truncate">{f.contrato} · {f.programa}</span></span>
          {conFecha && f.fecha && <span className="bb-mono text-[10px] text-ink-soft whitespace-nowrap">{f.fecha.split('-').reverse().join('/')}</span>}
          <span className="bb-mono whitespace-nowrap">{soles(f.monto)}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────

export function DashboardSede({ datos, hoy, titulo = 'Dashboard · BlackBelt Institute' }: { datos: DatosSede; hoy: string; titulo?: string }) {
  const [anio, setAnio] = useState<string>(TODO);
  const [mes, setMes] = useState<string>(TODO);
  const [programa, setPrograma] = useState<string>(TODO);

  const anios = useMemo(() => aniosDisponibles(datos, hoy), [datos, hoy]);
  const programas = useMemo(() => programasDisponibles(datos), [datos]);
  const meses = useMemo(() => mesesDisponibles(datos, hoy).filter((m) => anio === TODO || m.startsWith(anio)).sort(), [datos, hoy, anio]);
  const periodo = mes !== TODO ? mes : anio;
  const prog = programa === TODO ? null : programa;

  const v = useMemo(() => {
    const d = filtrarPrograma(datos, prog);
    return {
      r: resumen(d, periodo, hoy),
      serie: serieMensual(d, hoy, periodo).map((p) => ({ ...p, label: mesCorto(p.mes) })),
      categorias: gastosPorCategoria(d, periodo, hoy),
      programas: ventasPorPrograma(d, periodo, hoy),
      medios: cobrosPorMedio(d, periodo, hoy),
      cartera: cartera(d, hoy),
      morosos: morosos(d, hoy),
      proximos: proximosVencimientos(d, hoy),
    };
  }, [datos, prog, periodo, hoy]);

  const todos = mesesDisponibles(datos, hoy);
  const primero = todos[todos.length - 1];
  const cuando = mes !== TODO ? mesLargo(mes)
    : anio !== TODO ? `Año ${anio} (hasta hoy)`
    : primero ? `Desde ${mesLargo(primero)} hasta hoy` : 'Desde el inicio hasta hoy';
  const filtrado = anio !== TODO || mes !== TODO || programa !== TODO;
  const r = v.r;
  const verde = (n: number) => (n >= 0 ? C.verde : C.rust);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)] gap-3" data-testid="dashboard-sede">
      {/* Panel de filtros (segmentadores) */}
      <aside className="bg-ink rounded-card p-2.5 space-y-2.5 lg:self-start" aria-label="Filtros">
        <p className="bg-gold text-ink text-xs font-bold uppercase tracking-widest text-center rounded-sm py-1.5">Filtrar por</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5">
          <Segmentador titulo="Año" valor={anio} onCambio={(x) => { setAnio(x); setMes(TODO); }}
            opciones={[{ valor: TODO, etiqueta: 'Todos' }, ...anios.map((a) => ({ valor: a, etiqueta: a }))]} />
          <Segmentador titulo="Mes" valor={mes} onCambio={setMes}
            opciones={[{ valor: TODO, etiqueta: 'Todos' }, ...meses.map((m) => ({ valor: m, etiqueta: mesLargo(m) }))]} />
          <Segmentador titulo="Programa" valor={programa} onCambio={setPrograma}
            opciones={[{ valor: TODO, etiqueta: 'Todos' }, ...programas.map((p) => ({ valor: p, etiqueta: p }))]} />
        </div>
        {filtrado && (
          <button type="button" onClick={() => { setAnio(TODO); setMes(TODO); setPrograma(TODO); }}
            className="w-full text-xs text-paper/80 hover:text-paper underline underline-offset-2 py-1">Quitar filtros</button>
        )}
      </aside>

      <div className="space-y-3 min-w-0">
        {/* Banner */}
        <header className="bg-ink rounded-card px-4 py-3 text-center shadow-sm">
          <h2 className="bb-display text-paper text-xl sm:text-2xl font-bold uppercase tracking-wide">{titulo}</h2>
          <p className="text-gold text-xs mt-0.5">{cuando}{prog ? ` · ${prog}` : ''}</p>
        </header>

        <p className="text-sm text-ink bg-paper border border-line rounded-card px-3 py-2" data-testid="dashboard-frase">
          <strong style={{ color: verde(r.gano) }}>
            {r.gano >= 0 ? `El instituto ${mes === TODO ? 'ha ganado' : 'ganó'} ${soles(r.gano)}` : `El instituto ${mes === TODO ? 'ha perdido' : 'perdió'} ${soles(Math.abs(r.gano))}`}.
          </strong>{' '}
          Vendió {soles(r.vendio)} y gastó {soles(r.gasto)}{r.margenPct !== null && <> (margen {pct(r.margenPct)})</>}.{' '}
          {mes === TODO && anio === TODO ? <>Hoy hay {soles(r.caja)} en caja.</> : <>Al cierre del periodo había {soles(r.caja)} en caja.</>}
          {r.proyectado !== null && (r.leDeben > 0 || r.debe > 0) && <> Si cobra lo que le deben y paga lo que debe, quedaría con {soles(r.proyectado)} de ganancia.</>}
          {r.vencido > 0 && <> Hay <strong style={{ color: C.rust }}>{soles(r.vencido)} vencidos</strong> sin cobrar.</>}
          {prog && <span className="text-ink-soft"> Con un programa elegido solo cuentan los gastos asignados a ese programa.</span>}
        </p>

        {/* Tarjetas de cifras */}
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3" data-testid="dashboard-kpis">
          <Kpi etiqueta="Vendió" valor={soles(r.vendio)} color={C.verde} nota="Cuotas que vencieron" />
          <Kpi etiqueta="Gastó" valor={soles(r.gasto)} color={C.rust} nota="Gastos del instituto" />
          <Kpi etiqueta={r.gano >= 0 ? 'Ganó' : 'Perdió'} valor={soles(Math.abs(r.gano))} color={verde(r.gano)}
            nota={r.margenPct !== null ? `Margen ${pct(r.margenPct)}` : 'Sin ventas'} />
          <Kpi etiqueta="Dinero en caja" valor={soles(r.caja)} color={r.caja < 0 ? C.rust : C.ink} nota={`Entró ${soles(r.entro)} · salió ${soles(r.salio)}`} />
          <Kpi etiqueta="Le deben" valor={soles(r.leDeben)} color={r.vencido > 0 ? C.rust : C.ink}
            nota={r.vencido > 0 ? `${soles(r.vencido)} vencido` : 'Nada vencido'} />
          <Kpi etiqueta="Alumnos activos" valor={String(r.alumnosActivos)} color={C.ink}
            nota={r.ticket !== null ? `Ticket ${soles(r.ticket)}` : `${r.nuevas} inscripciones nuevas`} />
        </div>

        {/* Fila 1 de gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Panel titulo="Vendió por mes" testId="graf-vendio">
            {v.serie.length === 0 ? <Vacio texto="Sin meses con movimiento." /> : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={v.serie} margin={{ top: 6, right: 6, bottom: 0, left: -10 }}>
                  <CartesianGrid vertical={false} stroke={C.line} />
                  <XAxis dataKey="label" tick={EJE_TXT} tickLine={false} axisLine={{ stroke: C.line }} />
                  <YAxis tick={EJE} tickFormatter={corto} tickLine={false} axisLine={false} width={40} />
                  <Tooltip cursor={{ fill: C.canvas }} content={<Tip />} />
                  <Bar isAnimationActive={false} dataKey="vendio" name="Vendió" radius={[3, 3, 0, 0]} maxBarSize={34}>
                    {v.serie.map((p, i) => <Cell key={p.mes} fill={SERIE[i % SERIE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel titulo="Ganancia por mes" testId="graf-ganancia">
            {v.serie.length === 0 ? <Vacio texto="Sin meses con movimiento." /> : (
              <ResponsiveContainer width="100%" height={190}>
                <ComposedChart data={v.serie} margin={{ top: 6, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid vertical={false} stroke={C.line} />
                  <XAxis dataKey="label" tick={EJE_TXT} tickLine={false} axisLine={{ stroke: C.line }} />
                  <YAxis tick={EJE} tickFormatter={corto} tickLine={false} axisLine={false} width={40}
                    domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]} />
                  <ReferenceLine y={0} stroke={C.inkSoft} strokeDasharray="2 2" />
                  <Tooltip cursor={{ fill: C.canvas }} content={<Tip />} />
                  <Bar isAnimationActive={false} dataKey="gano" name="Ganó / perdió" radius={[3, 3, 0, 0]} maxBarSize={34}>
                    {v.serie.map((p) => <Cell key={p.mes} fill={p.gano >= 0 ? C.verde : C.rust} />)}
                  </Bar>
                  <Line isAnimationActive={false} type="linear" dataKey="gano" name="Tendencia" stroke={C.ink} strokeWidth={2}
                    dot={{ r: 3.5, fill: C.gold, stroke: C.paper, strokeWidth: 2 }} legendType="none" tooltipType="none" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel titulo="Gastos por las 5M" testId="graf-categorias">
            {v.categorias.length === 0 ? <Vacio texto="Sin gastos en el periodo." /> : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={v.categorias} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }} barCategoryGap="25%">
                  <CartesianGrid horizontal={false} stroke={C.line} />
                  <XAxis type="number" tick={EJE} tickFormatter={corto} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="nombre" tick={EJE_TXT} tickFormatter={(s: string) => recorta(s, 14)} width={88} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: C.canvas }} content={<Tip />} />
                  <Bar isAnimationActive={false} dataKey="monto" name="Gastó" fill={C.rust} radius={[0, 3, 3, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel titulo="Cobros por medio de pago" testId="graf-medios">
            <Dona data={v.medios} colores={(_, i) => SERIE[i % SERIE.length]} vacio="Sin cobros en el periodo." />
          </Panel>
        </div>

        {/* Fila 2 de gráficos */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <Panel titulo="Vendió por programa" testId="graf-programas">
            {v.programas.length === 0 ? <Vacio texto="Sin ventas en el periodo." /> : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={v.programas} margin={{ top: 6, right: 6, bottom: 0, left: -10 }}>
                  <CartesianGrid vertical={false} stroke={C.line} />
                  <XAxis dataKey="nombre" tick={EJE_TXT} tickFormatter={(s: string) => recorta(s, 22)} tickLine={false} axisLine={{ stroke: C.line }} interval={0} />
                  <YAxis tick={EJE} tickFormatter={corto} tickLine={false} axisLine={false} width={40} />
                  <Tooltip cursor={{ fill: C.canvas }} content={<Tip />} />
                  <Bar isAnimationActive={false} dataKey="monto" name="Vendió" radius={[3, 3, 0, 0]} maxBarSize={44}>
                    {v.programas.map((p, i) => <Cell key={p.nombre} fill={SERIE[i % SERIE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel titulo="Caja: entró, salió y saldo al cierre de cada mes" testId="graf-caja">
            {v.serie.length === 0 ? <Vacio texto="Sin meses con movimiento." /> : (
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={v.serie} margin={{ top: 6, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid vertical={false} stroke={C.line} />
                  <XAxis dataKey="label" tick={EJE_TXT} tickLine={false} axisLine={{ stroke: C.line }} />
                  <YAxis tick={EJE} tickFormatter={corto} tickLine={false} axisLine={false} width={40}
                    domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]} />
                  <ReferenceLine y={0} stroke={C.inkSoft} strokeDasharray="2 2" />
                  <Tooltip content={<Tip />} />
                  <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                  <Bar isAnimationActive={false} dataKey="entro" name="Entró en el mes" fill={C.verde} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar isAnimationActive={false} dataKey="salio" name="Salió en el mes" fill={C.rust} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Line isAnimationActive={false} type="monotone" dataKey="caja" name="Dinero en caja al cierre" stroke={C.gold} strokeWidth={2.5}
                    dot={{ r: 5, fill: C.gold, stroke: C.ink, strokeWidth: 1.5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>

        {/* Fila 3: cartera y cobranza */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Panel titulo="Todo lo contratado (a hoy)" testId="graf-cartera">
            <Dona data={v.cartera} colores={(b) => COLOR_CARTERA[b.nombre] ?? C.inkSoft} vacio="Aún no hay cuotas." />
          </Panel>
          <Panel titulo="Alumnos con cuotas vencidas" testId="lista-morosos">
            <p className="text-[10px] text-ink-soft text-center -mt-1 mb-1">Sin pago no hay entrega</p>
            <Alertas filas={v.morosos} vacio="Nadie tiene cuotas vencidas. ✓" />
          </Panel>
          <Panel titulo="Cobros de los próximos 30 días" testId="lista-proximos">
            <Alertas filas={v.proximos} conFecha vacio="No vence nada en los próximos 30 días." />
          </Panel>
        </div>

        <p className="text-[10px] text-ink-soft">
          Mismo criterio que el Dashboard general: «Todos» es desde el inicio hasta hoy; las cuotas de meses que aún no llegan
          no son venta todavía (están en «Le deben»). Cada mes coincide con la fila «BlackBelt Institute» de Consolidado. No cuentan
          inscripciones, pagos ni gastos anulados.
        </p>
      </div>
    </div>
  );
}
