-- Grano & Hoja: MySQL 8.4, esquema de producción sin datos de demostración.
-- Se crea una vez al inicializar una base nueva; no borra ni migra una base PostgreSQL existente.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS app_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NULL,
  google_sub VARCHAR(255) NULL,
  role VARCHAR(20) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME(3) NULL,
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT app_users_email_normalized CHECK (email = LOWER(TRIM(email))),
  CONSTRAINT app_users_name_nonempty CHECK (CHAR_LENGTH(TRIM(display_name)) > 0),
  CONSTRAINT app_users_role_allowed CHECK (role IN ('admin','encargado','caja')),
  CONSTRAINT app_users_failed_attempts_nonnegative CHECK (failed_login_attempts >= 0),
  UNIQUE KEY app_users_google_sub_uq (google_sub),
  KEY app_users_role_active_idx (role, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  resource_type VARCHAR(40) NOT NULL,
  resource_id VARCHAR(80) NULL,
  details JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT audit_actor_fk FOREIGN KEY (actor_user_id) REFERENCES app_users(id) ON DELETE SET NULL,
  KEY admin_audit_events_created_idx (created_at DESC, id DESC),
  KEY admin_audit_events_actor_idx (actor_user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  session_id VARCHAR(128) NOT NULL PRIMARY KEY,
  expires INT UNSIGNED NOT NULL,
  data MEDIUMTEXT NULL,
  KEY user_sessions_expire_idx (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS productos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(140) NOT NULL UNIQUE,
  descripcion VARCHAR(1200) NOT NULL DEFAULT '',
  precio DECIMAL(12,2) NOT NULL,
  categoria VARCHAR(24) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  stock_minimo INT UNSIGNED NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT productos_nombre_nonempty CHECK (CHAR_LENGTH(TRIM(nombre)) > 0),
  CONSTRAINT productos_price_positive CHECK (precio > 0),
  CONSTRAINT productos_category_allowed CHECK (categoria IN ('bebidas_calientes','bebidas_frias','reposteria','comida','plantas','muebles','decoracion')),
  CONSTRAINT productos_stock_nonnegative CHECK (stock >= 0),
  CONSTRAINT productos_stock_min_nonnegative CHECK (stock_minimo >= 0),
  KEY productos_categoria_activo_idx (categoria, activo),
  KEY productos_stock_idx (stock, stock_minimo),
  KEY productos_nombre_idx (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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

CREATE TABLE IF NOT EXISTS pedidos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fecha_confirmacion DATETIME(3) NULL,
  metodo_pago VARCHAR(20) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  impuesto DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  CONSTRAINT pedidos_payment_allowed CHECK (metodo_pago IN ('efectivo','tarjeta','sinpe_movil')),
  CONSTRAINT pedidos_subtotal_nonnegative CHECK (subtotal >= 0),
  CONSTRAINT pedidos_tax_nonnegative CHECK (impuesto >= 0),
  CONSTRAINT pedidos_total_nonnegative CHECK (total >= 0),
  CONSTRAINT pedidos_state_allowed CHECK (estado IN ('pendiente','confirmado','anulado')),
  CONSTRAINT pedidos_confirmed_has_date CHECK (estado <> 'confirmado' OR fecha_confirmacion IS NOT NULL),
  CONSTRAINT pedidos_total_matches CHECK (total = subtotal + impuesto),
  KEY pedidos_fecha_estado_idx (fecha, estado),
  KEY pedidos_confirmacion_estado_idx (fecha_confirmacion, estado),
  KEY pedidos_metodo_estado_idx (metodo_pago, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS pedido_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT UNSIGNED NOT NULL,
  producto_id INT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  CONSTRAINT pedido_items_qty_positive CHECK (cantidad > 0),
  CONSTRAINT pedido_items_price_positive CHECK (precio_unitario > 0),
  CONSTRAINT pedido_items_order_fk FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT pedido_items_product_fk FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
  KEY pedido_items_pedido_idx (pedido_id),
  KEY pedido_items_producto_idx (producto_id)
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

