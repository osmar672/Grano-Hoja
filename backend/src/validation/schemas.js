import { z } from 'zod';

const safeText = (max, label) => z.string().trim().min(1, `${label} es obligatorio`).max(max, `${label} no puede superar ${max} caracteres`)
  .refine((value) => !/[<>]/.test(value), `${label} no puede contener marcado HTML`)
  .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), `${label} contiene caracteres no permitidos`);
const searchText = (max = 100) => z.string().max(max, `La búsqueda no puede superar ${max} caracteres`).refine((value) => !/[\u0000-\u001F\u007F]/.test(value), 'La búsqueda contiene caracteres de control');
const positiveId = z.string().regex(/^[1-9]\d{0,9}$/, 'debe ser un ID entero positivo').refine((value) => Number(value) <= 2147483647, 'supera el máximo permitido');
const nonNegativeStock = z.number().int().min(0).max(1000000);
const cafeCategory = z.enum(['bebidas_calientes', 'bebidas_frias', 'reposteria', 'comida']);
// Las tres categorías anteriores se conservan temporalmente para leer/editar datos que ya existían.
const category = z.enum(['bebidas_calientes', 'bebidas_frias', 'reposteria', 'comida', 'plantas', 'muebles', 'decoracion']);

export const idParamsSchema = z.object({ id: positiveId }).strict();
export const emptyQuerySchema = z.object({}).strict();
export const loginBodySchema = z.object({
  email: z.string().trim().email('Debe ser un correo válido').max(254, 'El correo es demasiado largo'),
  password: z.string().min(1, 'La contraseña es obligatoria').max(256, 'La contraseña es demasiado larga').refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña supera el límite admitido'),
}).strict();

const productShape = {
  nombre: safeText(140, 'El nombre'),
  descripcion: z.string().trim().max(1200, 'La descripción no puede superar 1200 caracteres').refine((value) => !/[<>]/.test(value), 'La descripción no puede contener marcado HTML').default(''),
  precio: z.number().positive().max(9999999999.99),
  categoria: category,
  stock: nonNegativeStock,
  stock_minimo: nonNegativeStock,
  activo: z.boolean().optional(),
};
export const productCreateBodySchema = z.object(productShape).strict();
export const productPutBodySchema = z.object(productShape).strict();
// Esquema PATCH separado: los defaults de creación/PUT no deben convertir {} en un cambio válido.
const productPatchShape = {
  nombre: productShape.nombre,
  descripcion: z.string().trim().max(1200, 'La descripción no puede superar 1200 caracteres')
    .refine((value) => !/[<>]/.test(value), 'La descripción no puede contener marcado HTML'),
  precio: productShape.precio,
  categoria: productShape.categoria,
  stock: productShape.stock,
  stock_minimo: productShape.stock_minimo,
  activo: productShape.activo,
};
export const productPatchBodySchema = z.object(productPatchShape).partial().strict()
  .refine((value) => Object.keys(value).length > 0, 'Debes enviar al menos un campo para modificar');
export const productListQuerySchema = z.object({
  q: searchText().optional(), categoria: category.optional(),
  orden: z.enum(['nombre', 'precio', 'categoria', 'stock']).optional(), direccion: z.enum(['asc', 'desc']).optional(),
  activo: z.enum(['true', 'false']).optional(), bajo_stock: z.enum(['true', 'false']).optional(),
}).strict();

const quantity3 = z.number().finite().min(0).max(999999999.999)
  .refine((value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-7, 'Usa como máximo tres decimales');
const positiveQuantity3 = quantity3.refine((value) => value > 0, 'La cantidad debe ser mayor que cero');
const insumoShape = {
  nombre: safeText(120, 'El nombre del insumo'),
  unidad: safeText(20, 'La unidad'),
  stock: quantity3,
  stock_minimo: quantity3,
  activo: z.boolean().optional(),
};
export const insumoCreateBodySchema = z.object(insumoShape).strict();
export const insumoPutBodySchema = z.object(insumoShape).strict();
const insumoPatchShape = { ...insumoShape };
export const insumoPatchBodySchema = z.object(insumoPatchShape).partial().strict()
  .refine((value) => Object.keys(value).length > 0, 'Debes enviar al menos un campo para modificar');
export const insumoListQuerySchema = z.object({
  q: searchText(120).optional(),
  bajo_minimo: z.enum(['true', 'false']).optional(),
  orden: z.enum(['nombre', 'stock', 'stock_actual', 'stock_minimo', 'unidad']).optional(),
  direccion: z.enum(['asc', 'desc']).optional(),
}).strict();
const recipeLineSchema = z.object({ insumo_id: z.number().int().positive().max(2147483647), cantidad: positiveQuantity3 }).strict();
export const recetaReplaceBodySchema = z.object({ items: z.array(recipeLineSchema).max(100, 'Una receta no puede superar 100 ingredientes') }).strict()
  .refine((value) => new Set(value.items.map((item) => item.insumo_id)).size === value.items.length, 'No repitas un insumo dentro de la misma receta');

export const orderListQuerySchema = z.object({
  estado: z.union([z.enum(['pendiente', 'confirmado', 'anulado']), z.literal('')]).optional(),
  metodo_pago: z.union([z.enum(['efectivo', 'tarjeta', 'sinpe_movil']), z.literal('')]).optional(),
}).strict();
const orderItemSchema = z.object({ producto_id: z.number().int().positive().max(2147483647), cantidad: z.number().int().positive().max(999) }).strict();
export const orderCreateBodySchema = z.object({
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'sinpe_movil']),
  items: z.array(orderItemSchema).min(1, 'El pedido debe contener al menos un producto').max(50, 'Un pedido no puede tener más de 50 líneas'),
}).strict();
function isValidCalendarDate(value) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(`${value}T00:00:00.000Z`); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; }
export const summaryQuerySchema = z.object({ fecha: z.string().refine(isValidCalendarDate, 'debe ser una fecha válida con formato YYYY-MM-DD').optional() }).strict();
export const optionalEmptyBodySchema = z.object({}).strict().optional();
export const agentBodySchema = z.object({ solicitud: safeText(1000, 'La solicitud del asistente') }).strict();

export const googleStartQuerySchema = z.object({ intent: z.enum(['login', 'register']) }).strict();


const adminRole = z.enum(['admin', 'encargado', 'caja']);
const adminPassword = z.string().min(12, 'La contraseña debe tener al menos 12 caracteres')
  .max(72, 'La contraseña supera el máximo admitido por bcrypt')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña supera el máximo admitido por bcrypt')
  .refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value), 'Usa mayúsculas, minúsculas y números');
export const adminUsersQuerySchema = z.object({
  q: searchText(100).optional(),
  role: adminRole.optional(),
  status: z.enum(['active', 'inactive']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).strict();
export const adminAuditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).strict();
export const adminUserCreateBodySchema = z.object({
  email: z.string().trim().email('Debe ser un correo válido').max(254).transform((value) => value.toLowerCase()),
  displayName: safeText(120, 'El nombre'),
  password: adminPassword,
  role: adminRole,
}).strict();
export const adminUserPatchBodySchema = z.object({
  role: adminRole.optional(),
  active: z.boolean().optional(),
  password: adminPassword.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Debes enviar al menos un cambio');
