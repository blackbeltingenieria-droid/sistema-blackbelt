# Genera src/features/excel-data/excel-raw.ts desde el Excel «CUADRO DE COSTOS» (versión del jefe).
import openpyxl, json, sys, datetime
src, out = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(src, data_only=True)
def d(v):
    if isinstance(v, datetime.datetime):
        s = v.strftime('%Y-%m-%d')
        return '2026-10-15' if s == '2025-10-15' else s   # la empresa empezó en 2026
    if isinstance(v, str) and v.strip() == '15/010/2026': return '2026-10-15'
    if isinstance(v, str) and v.strip() == '09/092026': return '2026-09-09'
    return v
def doc(v):
    if v is None: return None
    return str(v).strip()
def txt(v): return v.strip() if isinstance(v, str) else v
def num(v): return round(float(v), 2) if v is not None else 0
def js(o): return json.dumps(o, ensure_ascii=False)
def obj(dct): return '{ ' + ', '.join(f'{k}: {js(v)}' for k, v in dct.items()) + ' }'

ing=[]; ws=wb['TABLA_INGRESOS']
for r in range(8, ws.max_row+1):
    g=lambda c: ws.cell(r,c).value
    if g(2) is None: continue
    ing.append(dict(row=r, client=txt(g(2)), doc=doc(g(3)), product=txt(g(6)), group=txt(g(7)), spec=txt(g(8)), date=d(g(9)), amount=num(g(10)), method=txt(g(11)).upper()))
eg=[]; ws=wb['TABLA_EGRESOS']
for r in range(9, ws.max_row+1):
    g=lambda c: ws.cell(r,c).value
    if g(2) is None or g(9) is None: continue
    eg.append(dict(row=r, payer=txt(g(2)), area=txt(g(3)), unit=txt(g(4)), product=txt(g(5)), group=txt(g(6)), spec=txt(g(7)), date=d(g(8)), amount=num(g(9)), method=txt(g(10)).upper()))
inv=[]; ws=wb['TABLA_INVERSIONES']
for r in range(7, ws.max_row+1):
    g=lambda c: ws.cell(r,c).value
    if g(2) is None: continue
    inv.append(dict(row=r, name=txt(g(2)), doc=doc(g(3)), spec=txt(g(4)), date=d(g(5)), amount=num(g(6)), method=txt(g(7)).upper()))
cli=[]; ws=wb['TABLA_CLIENTES']
for r in range(10, ws.max_row+1):
    g=lambda c: ws.cell(r,c).value
    if g(2) is None: continue
    extra = txt(g(14))
    service = txt(g(7)) or extra or 'POR DEFINIR'
    contracted = num(g(11)); paid = num(g(12))
    cli.append(dict(row=r, name=txt(g(2)), doc=doc(g(3)), phone=doc(g(4)), service=service, institution=txt(g(8)),
                    start=d(g(9)), end=d(g(10)), contracted=contracted, paid=paid, pending=round(contracted - paid, 2),
                    excelPending=num(g(13)), stage=(extra if txt(g(7)) else None)))
mo=[]; ws=wb['TABLA_M.O']
for r in range(11, ws.max_row+1):
    g=lambda c: ws.cell(r,c).value
    if g(2) is None: continue
    mo.append(dict(row=r, name=txt(g(2)), doc=doc(g(3)), area=txt(g(4)), unit=txt(g(5)), service=txt(g(6)) or 'POR DEFINIR', spec=txt(g(7)),
                   client=txt(g(8)) or 'BLACKBELT GROUP', term=txt(g(9)), start=d(g(10)), end=d(g(11)), required=num(g(12)), paid=num(g(13)), pending=num(g(14))))
norm0 = lambda s: (s or '').strip().upper()
# ── Decisiones de Gerencia (03/11/2026) ──────────────────────────────────────
for x in eg:
    if x['row'] == 39: x['method'] = 'YAPE'                      # Bitel 14/10 se pagó por YAPE
    if x['row'] == 42:                                            # 12.13 = comisión del banco (transferencia a Eddy)
        x.update(group='COMISION DEL BANCO', product='BBVA', area='GENERAL', unit='GENERAL',
                 spec='Comisión del banco por la transferencia al especialista de ing. mecánica (Eddy)')
for x in cli:
    if norm0(x['name']).startswith('JACKELINE'):                  # contrato 1,000; aún no paga nada
        x['contracted'] = 1000.0; x['pending'] = round(1000.0 - x['paid'], 2)
for x in mo:
    if norm0(x['name']).startswith('JEFERSON'):                   # asistente; monto referencial
        x.update(area='GENERAL', unit='GENERAL', service='ASISTENTE',
                 spec='Asistente de la empresa. Prestación de servicios (recibo por honorarios, no planilla); trabaja en sus tiempos. Monto referencial: por definir.')
r2 = lambda x: round(x + 1e-9, 2)
tot = dict(
  ingresos=r2(sum(x['amount'] for x in ing)), egresos=r2(sum(x['amount'] for x in eg)), inversion=r2(sum(x['amount'] for x in inv)),
)
tot['fondoEnCaja'] = r2(tot['ingresos'] + tot['inversion'] - tot['egresos'])
tot['contratado'] = r2(sum(x['contracted'] for x in cli)); tot['pagadoClientes'] = r2(sum(x['paid'] for x in cli))
tot['faltaCobrar'] = r2(tot['contratado'] - tot['pagadoClientes'])
tot['manoObraRequerido'] = r2(sum(x['required'] for x in mo)); tot['manoObraPagado'] = r2(sum(x['paid'] for x in mo)); tot['manoObraFalta'] = r2(tot['manoObraRequerido'] - tot['manoObraPagado'])
norm = lambda s: (s or '').upper()
tot['herramientas'] = r2(sum(x['amount'] for x in eg if norm(x['group']) == 'HERRAMIENTAS DIGITALES'))
tot['serviciosPublicidad'] = r2(sum(x['amount'] for x in eg if norm(x['group']).startswith('SERVICIO TELEF') or norm(x['product']).startswith('PUBLICIDAD')))
xl = {  # lo que dicen las celdas del Excel (para el reporte de auditoría)
  'ingresos': wb['TABLA_INGRESOS']['D5'].value, 'egresos': wb['TABLA_EGRESOS']['C4'].value, 'fondo': wb['TABLA_EGRESOS']['C6'].value,
  'contratado': wb['TABLA_CLIENTES']['C7'].value, 'pagado': wb['TABLA_CLIENTES']['C5'].value, 'falta': wb['TABLA_CLIENTES']['C3'].value,
  'mo': [wb['TABLA_M.O']['C8'].value, wb['TABLA_M.O']['C6'].value, wb['TABLA_M.O']['C4'].value],
  'serv_tab': wb['TABLA_SERVICIOS Y PUBLICIDAD']['C4'].value, 'herr_tab': wb['TABLA_HERRAMIENTAS']['C4'].value,
}
print(json.dumps({'tot': tot, 'xl': xl}, ensure_ascii=False, default=str))
L = []
L.append('// features/excel-data/excel-raw.ts')
L.append('// Filas del Excel «CUADRO DE COSTOS - PRIMER MODELO» (hojas TABLA_*), versión actualizada por Gerencia (02/11/2026).')
L.append('// Generado con /tmp/claude-0/scripts/gen_raw.py — NO editar a mano. Correcciones al leer:')
L.append('//  - 15/10/2025 → 15/10/2026 (la empresa empezó en 2026); "15/010/2026" → 2026-10-15; "09/092026" → 2026-09-09.')
L.append('//  - TABLA_CLIENTES: falta pagar = contratado − pagado ')
L.append('//  - Decisiones de Gerencia 03/11: Jackeline contrato 1,000; Bitel 14/10 por YAPE; fila 42 (12.13) = comisión del banco; Jeferson asistente (monto referencial).')
L.append('//  - Medio de pago en mayúsculas; DNI sin saltos de línea.')
L.append('')
for name, rows in [('EXCEL_INGRESOS', ing), ('EXCEL_EGRESOS', eg), ('EXCEL_INVERSIONES', inv), ('EXCEL_CLIENTES', cli), ('EXCEL_MANO_OBRA', mo)]:
    L.append(f'export const {name} = [')
    for x in rows: L.append('  ' + obj(x) + ',')
    L.append('] as const;'); L.append('')
L.append('/** Totales con los que la página y la base deben cuadrar (calculados de las filas de arriba). */')
L.append('export const EXCEL_TOTALES = {')
for k, v in tot.items(): L.append(f'  {k}: {v},')
L.append(f"  utilidadSiTodosPagan: {r2(tot['contratado'] - tot['egresos'] - tot['manoObraFalta'])}, // contratado − egresos − mano de obra por pagar")
L.append('} as const;')
open(out, 'w', encoding='utf8').write('\n'.join(L) + '\n')
