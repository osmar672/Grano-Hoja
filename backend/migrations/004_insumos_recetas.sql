-- Grano & Hoja: ingredientes, recetas y trazabilidad del consumo.
-- Migración aditiva. No elimina filas existentes. Requiere MySQL 8.0+ e InnoDB.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS insumos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  unidad VARCHAR(20) NOT NULL,
  stock_actual DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  stock_minimo DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT insumos_nombre_nonempty CHECK (CHAR_LENGTH(TRIM(nombre)) > 0),
  CONSTRAINT insumos_unidad_nonempty CHECK (CHAR_LENGTH(TRIM(unidad)) > 0),
  CONSTRAINT insumos_stock_nonnegative CHECK (stock_actual >= 0),
  CONSTRAINT insumos_stock_min_nonnegative CHECK (stock_minimo >= 0),
  UNIQUE KEY insumos_nombre_uq (nombre),
  KEY insumos_bajo_minimo_idx (activo, stock_actual, stock_minimo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS recetas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  producto_id INT UNSIGNED NOT NULL,
  insumo_id INT UNSIGNED NOT NULL,
  cantidad DECIMAL(12,3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT recetas_cantidad_positive CHECK (cantidad > 0),
  CONSTRAINT recetas_producto_fk FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  CONSTRAINT recetas_insumo_fk FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE RESTRICT,
  UNIQUE KEY recetas_producto_insumo_uq (producto_id, insumo_id),
  KEY recetas_insumo_idx (insumo_id, producto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  insumo_id INT UNSIGNED NOT NULL,
  pedido_id INT UNSIGNED NULL,
  tipo ENUM('consumo','restitucion','ajuste') NOT NULL,
  cantidad DECIMAL(12,3) NOT NULL,
  fecha DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT movimientos_cantidad_positive CHECK (cantidad > 0),
  CONSTRAINT movimientos_insumo_fk FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE RESTRICT,
  CONSTRAINT movimientos_pedido_fk FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE RESTRICT,
  UNIQUE KEY movimientos_pedido_insumo_tipo_uq (pedido_id, insumo_id, tipo),
  KEY movimientos_insumo_fecha_idx (insumo_id, fecha DESC),
  KEY movimientos_pedido_idx (pedido_id, tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Conserva categorías antiguas para no invalidar registros de instalaciones existentes.
-- La aplicación y los nuevos datos de demostración usan las categorías de cafetería.
ALTER TABLE productos DROP CHECK productos_category_allowed;
ALTER TABLE productos ADD CONSTRAINT productos_category_allowed
  CHECK (categoria IN ('bebidas_calientes','bebidas_frias','reposteria','comida','plantas','muebles','decoracion'));
