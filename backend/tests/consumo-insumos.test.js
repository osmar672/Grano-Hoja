import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularConsumoInsumos, validarStockDeConsumo } from '../src/services/consumo-insumos.js';

test('suma un mismo insumo usado por productos distintos y líneas repetidas', () => {
  const orderItems = [{ producto_id: 1, cantidad: 2 }, { producto_id: 2, cantidad: 1 }, { producto_id: 1, cantidad: 1 }];
  const recipes = [{ producto_id: 1, insumo_id: 5, cantidad: 18 }, { producto_id: 2, insumo_id: 5, cantidad: 12 }];
  assert.deepEqual(calcularConsumoInsumos(orderItems, recipes).map(({ insumo_id, cantidad }) => ({ insumo_id, cantidad })), [{ insumo_id: 5, cantidad: 66 }]);
});

test('mantiene cantidades decimales con precisión máxima de tres decimales', () => {
  const result = calcularConsumoInsumos([{ producto_id: 1, cantidad: 3 }], [{ producto_id: 1, insumo_id: 2, cantidad: 0.125 }]);
  assert.equal(result[0].cantidad, 0.375);
});

test('producto sin receta no consume ingredientes', () => {
  assert.deepEqual(calcularConsumoInsumos([{ producto_id: 99, cantidad: 7 }], []), []);
});

test('stock insuficiente devuelve AppError 409 con nombre del insumo', () => {
  const consumo = [{ insumo_id: 3, cantidad: 18, nombre: 'Café en grano', unidad: 'g' }];
  assert.throws(() => validarStockDeConsumo(consumo, [{ id: 3, nombre: 'Café en grano', unidad: 'g', stock_actual: 12, activo: true }]), (error) => {
    assert.equal(error.status, 409);
    assert.match(error.message, /Café en grano/);
    assert.match(error.message, /18/);
    return true;
  });
});

test('insumo inactivo no puede consumirse', () => {
  assert.throws(() => validarStockDeConsumo([{ insumo_id: 4, cantidad: 1 }], [{ id: 4, nombre: 'Leche', stock_actual: 10, activo: false }]), { status: 409 });
});
