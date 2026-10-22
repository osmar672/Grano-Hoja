import { AppError } from '../utils/AppError.js';

const round3 = (value) => Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;

/**
 * Calcula insumos requeridos por un pedido sin I/O ni mutación de entradas.
 * orderItems: [{ producto_id, cantidad }]
 * recipes: [{ producto_id, insumo_id, cantidad, nombre?, unidad? }], cantidad es por unidad de producto.
 * Los productos sin receta no consumen insumos.
 */
export function calcularConsumoInsumos(orderItems = [], recipes = []) {
  const recipesByProduct = new Map();
  for (const recipe of recipes) {
    const productId = Number(recipe.producto_id);
    const insumoId = Number(recipe.insumo_id);
    const amount = Number(recipe.cantidad);
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(insumoId) || insumoId <= 0
        || !Number.isFinite(amount) || amount <= 0) {
      throw new AppError(400, 'La receta contiene una cantidad o un identificador no válido');
    }
    if (!recipesByProduct.has(productId)) recipesByProduct.set(productId, []);
    recipesByProduct.get(productId).push({
      producto_id: productId,
      insumo_id: insumoId,
      cantidad: amount,
      nombre: recipe.nombre,
      unidad: recipe.unidad,
      insumo_activo: recipe.insumo_activo,
    });
  }

  const totals = new Map();
  for (const item of orderItems) {
    const productId = Number(item.producto_id);
    const quantity = Number(item.cantidad);
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      throw new AppError(400, 'El pedido contiene un producto o una cantidad no válida');
    }
    for (const recipe of recipesByProduct.get(productId) || []) {
      const amount = round3(recipe.cantidad * quantity);
      const previous = totals.get(recipe.insumo_id);
      totals.set(recipe.insumo_id, {
        insumo_id: recipe.insumo_id,
        cantidad: round3((previous?.cantidad || 0) + amount),
        nombre: recipe.nombre || previous?.nombre,
        unidad: recipe.unidad || previous?.unidad,
        insumo_activo: recipe.insumo_activo ?? previous?.insumo_activo,
      });
    }
  }
  return [...totals.values()].sort((a, b) => a.insumo_id - b.insumo_id);
}

/** Comprueba stock en memoria; la transacción debe haber bloqueado las filas antes de llamarla. */
export function validarStockDeConsumo(consumo = [], inventario = []) {
  const stockById = new Map(inventario.map((item) => [Number(item.id), item]));
  for (const needed of consumo) {
    const item = stockById.get(Number(needed.insumo_id));
    if (!item || item.activo === false || item.activo === 0) {
      throw new AppError(409, `El insumo ${item?.nombre || needed.nombre || needed.insumo_id} no está activo o no existe`);
    }
    const stock = Number(item.stock_actual ?? item.stock);
    if (!Number.isFinite(stock) || stock + 1e-9 < Number(needed.cantidad)) {
      const name = item.nombre || needed.nombre || `ID ${needed.insumo_id}`;
      const unit = item.unidad || needed.unidad || '';
      throw new AppError(409, `Insumo insuficiente: ${name}. Se necesitan ${needed.cantidad} ${unit} y quedan ${Number.isFinite(stock) ? stock : 0} ${unit}.`);
    }
  }
  return true;
}
