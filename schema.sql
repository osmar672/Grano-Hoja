-- Grano & Hoja: MySQL 8.4, esquema de desarrollo con datos de demostración de cafetería.
-- IMPORTANTE: este archivo borra las tablas de desarrollo si se vuelve a importar.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS admin_audit_events;
DROP TABLE IF EXISTS movimientos_inventario;
DROP TABLE IF EXISTS recetas;
DROP TABLE IF EXISTS insumos;
DROP TABLE IF EXISTS pedido_items;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS app_users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE app_users (
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

CREATE TABLE admin_audit_events (
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

CREATE TABLE productos (
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

CREATE TABLE pedidos (
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

CREATE TABLE pedido_items (
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


INSERT INTO productos(id,nombre,descripcion,precio,categoria,stock,stock_minimo,activo) VALUES
(1,'Espresso','Café espresso de tueste medio, preparado al momento.',1500.00,'bebidas_calientes',0,0,1),
(2,'Americano','Espresso con agua caliente filtrada.',1800.00,'bebidas_calientes',0,0,1),
(3,'Cappuccino','Espresso con leche vaporizada y espuma.',2200.00,'bebidas_calientes',0,0,1),
(4,'Latte','Espresso con leche cremosa vaporizada.',2500.00,'bebidas_calientes',0,0,1),
(5,'Mocaccino','Espresso, leche y chocolate.',2700.00,'bebidas_calientes',0,0,1),
(6,'Cold brew','Café extraído en frío, servido con hielo.',2600.00,'bebidas_frias',0,0,1),
(7,'Té chai','Té chai especiado con leche.',2300.00,'bebidas_calientes',0,0,1),
(8,'Té verde','Té verde de infusión suave.',1800.00,'bebidas_calientes',0,0,1),
(9,'Croissant','Croissant de mantequilla horneado del día.',1800.00,'reposteria',0,0,1),
(10,'Brownie','Brownie de chocolate con centro húmedo.',1700.00,'reposteria',0,0,1),
(11,'Galleta de avena','Galleta casera de avena.',1200.00,'reposteria',0,0,1),
(12,'Sándwich caprese','Pan, tomate, queso y albahaca.',3500.00,'comida',0,0,1),
(13,'Roll de canela','Roll suave con canela y glaseado.',1700.00,'reposteria',0,0,1),
(14,'Chocolate caliente','Chocolate con leche vaporizada.',2300.00,'bebidas_calientes',0,0,1),
(15,'Agua embotellada','Agua embotellada individual.',1000.00,'bebidas_frias',0,0,1);

INSERT INTO insumos(id,nombre,unidad,stock_actual,stock_minimo,activo) VALUES
(1,'Café en grano','g',4500.000,500.000,1),(2,'Leche','ml',12000.000,3000.000,1),
(3,'Agua filtrada','ml',20000.000,5000.000,1),(4,'Azúcar','g',2000.000,500.000,1),
(5,'Chocolate','g',1000.000,300.000,1),(6,'Té chai','g',600.000,150.000,1),
(7,'Té verde','g',450.000,100.000,1),(8,'Vaso compostable','unidad',200.000,50.000,1),
(9,'Croissant','unidad',40.000,10.000,1),(10,'Brownie','unidad',30.000,8.000,1),
(11,'Galleta de avena','unidad',50.000,12.000,1),(12,'Pan para sándwich','unidad',24.000,6.000,1),
(13,'Roll de canela','unidad',25.000,6.000,1),(14,'Agua embotellada','unidad',36.000,10.000,1);

INSERT INTO recetas(producto_id,insumo_id,cantidad) VALUES
(1,1,18.000),(2,1,18.000),(2,3,180.000),(3,1,18.000),(3,2,140.000),
(4,1,18.000),(4,2,220.000),(5,1,18.000),(5,2,160.000),(5,4,8.000),(5,5,20.000),
(6,1,30.000),(6,3,250.000),(6,8,1.000),(7,2,180.000),(7,4,8.000),(7,6,5.000),(7,8,1.000),
(8,3,250.000),(8,7,3.000),(8,8,1.000),(9,9,1.000),(10,10,1.000),(11,11,1.000),
(12,12,1.000),(13,13,1.000),(14,2,200.000),(14,4,10.000),(14,5,25.000),(14,8,1.000),(15,14,1.000);

INSERT INTO pedidos(id,fecha,fecha_confirmacion,metodo_pago,subtotal,impuesto,total,estado) VALUES
(1,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 6 DAY),DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 6 DAY)+INTERVAL 2 MINUTE,'efectivo',3300.00,429.00,3729.00,'confirmado'),
(2,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 3 DAY),DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 3 DAY)+INTERVAL 2 MINUTE,'tarjeta',6100.00,793.00,6893.00,'confirmado'),
(3,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 DAY),DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 DAY)+INTERVAL 2 MINUTE,'sinpe_movil',7300.00,949.00,8249.00,'confirmado'),
(4,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 HOUR),NULL,'efectivo',3800.00,494.00,4294.00,'pendiente'),
(5,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 2 DAY),DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 2 DAY)+INTERVAL 2 MINUTE,'tarjeta',3500.00,455.00,3955.00,'anulado');

INSERT INTO pedido_items(id,pedido_id,producto_id,cantidad,precio_unitario) VALUES
(1,1,1,1,1500.00),(2,1,9,1,1800.00),(3,2,3,2,2200.00),(4,2,10,1,1700.00),
(5,3,4,2,2500.00),(6,3,7,1,2300.00),(7,4,6,1,2600.00),(8,4,11,1,1200.00),(9,5,12,1,3500.00);

INSERT INTO movimientos_inventario(insumo_id,pedido_id,tipo,cantidad) VALUES
(1,1,'consumo',18.000),(9,1,'consumo',1.000),(1,2,'consumo',36.000),(2,2,'consumo',280.000),
(10,2,'consumo',1.000),(1,3,'consumo',36.000),(2,3,'consumo',620.000),(4,3,'consumo',8.000),
(6,3,'consumo',5.000),(8,3,'consumo',1.000);
