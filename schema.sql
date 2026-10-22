-- Raíz & Madera: MySQL 8.4, esquema de desarrollo con datos demostrativos.
-- IMPORTANTE: este archivo borra las tablas de desarrollo si se vuelve a importar.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS admin_audit_events;
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
  CONSTRAINT productos_category_allowed CHECK (categoria IN ('plantas','muebles','decoracion')),
  CONSTRAINT productos_stock_nonnegative CHECK (stock >= 0),
  CONSTRAINT productos_stock_min_nonnegative CHECK (stock_minimo >= 0),
  KEY productos_categoria_activo_idx (categoria, activo),
  KEY productos_stock_idx (stock, stock_minimo),
  KEY productos_nombre_idx (nombre)
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

INSERT INTO productos(id,nombre,descripcion,precio,categoria,stock,stock_minimo,activo) VALUES
(1,'Monstera deliciosa','Planta tropical de hojas grandes y recortadas. Ideal para espacios luminosos sin sol directo.',12500.00,'plantas',8,4,1),
(2,'Sansevieria','Planta resistente y de bajo mantenimiento en maceta de vivero.',7800.00,'plantas',3,5,1),
(3,'Ficus lyrata','Ficus decorativo de porte vertical, pensado para salas y recibidores.',28500.00,'plantas',4,2,1),
(4,'Suculenta en maceta cerámica','Suculenta pequeña en maceta de acabado mate.',4200.00,'plantas',14,6,1),
(5,'Mesa auxiliar Roble','Mesa lateral compacta de madera tono roble con acabado natural.',45900.00,'muebles',2,3,1),
(6,'Silla Nórdica','Silla de líneas limpias, asiento cómodo y patas de madera.',38500.00,'muebles',6,2,1),
(7,'Estante Botánico','Estante de madera con tres niveles para plantas y objetos decorativos.',62900.00,'muebles',1,2,1),
(8,'Banco de madera','Banco versátil para entrada, balcón techado o pie de cama.',34900.00,'muebles',5,2,1),
(9,'Maceta Arena','Maceta cerámica color arena con orificio de drenaje.',6500.00,'decoracion',12,5,1),
(10,'Jarrón Orgánico','Jarrón decorativo de silueta orgánica en tono crema.',9800.00,'decoracion',2,4,1),
(11,'Canasto de fibra natural','Canasto artesanal para cubremaceta, textiles u organización.',8900.00,'decoracion',7,3,1),
(12,'Lámpara de mesa Lino','Lámpara de mesa con pantalla textil en color natural.',27900.00,'decoracion',3,2,1),
(13,'Pothos colgante','Planta colgante de fácil cuidado para repisas y soportes altos.',5900.00,'plantas',0,4,1),
(14,'Mesa de centro Bruma','Mesa baja de madera con acabado mate y proporciones minimalistas.',78900.00,'muebles',0,1,1),
(15,'Cojín lino oliva','Cojín decorativo color oliva con funda texturizada.',11900.00,'decoracion',9,4,1);

INSERT INTO pedidos(id,fecha,fecha_confirmacion,metodo_pago,subtotal,impuesto,total,estado) VALUES
(1,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 6 DAY),DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 6 DAY)+INTERVAL 2 MINUTE,'efectivo',23200,3016,26216,'confirmado'),
(2,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 6 DAY)+INTERVAL 3 HOUR,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 6 DAY)+INTERVAL 3 HOUR+INTERVAL 2 MINUTE,'tarjeta',12500,1625,14125,'confirmado'),
(3,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 5 DAY),DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 5 DAY)+INTERVAL 2 MINUTE,'sinpe_movil',45900,5967,51867,'confirmado'),
(4,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 5 DAY)+INTERVAL 2 HOUR,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 5 DAY)+INTERVAL 2 HOUR+INTERVAL 2 MINUTE,'efectivo',19600,2548,22148,'confirmado'),
(5,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 4 DAY),DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 4 DAY)+INTERVAL 2 MINUTE,'tarjeta',28500,3705,32205,'confirmado'),
(6,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 4 DAY)+INTERVAL 4 HOUR,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 4 DAY)+INTERVAL 4 HOUR+INTERVAL 2 MINUTE,'sinpe_movil',7800,1014,8814,'confirmado'),
(7,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 3 DAY),DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 3 DAY)+INTERVAL 2 MINUTE,'efectivo',62900,8177,71077,'confirmado'),
(8,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 3 DAY)+INTERVAL 3 HOUR,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 3 DAY)+INTERVAL 3 HOUR+INTERVAL 2 MINUTE,'tarjeta',56900,7397,64297,'confirmado'),
(9,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 2 DAY),DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 2 DAY)+INTERVAL 2 MINUTE,'sinpe_movil',6500,845,7345,'confirmado'),
(10,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 2 DAY)+INTERVAL 5 HOUR,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 2 DAY)+INTERVAL 5 HOUR+INTERVAL 2 MINUTE,'efectivo',70300,9139,79439,'confirmado'),
(11,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 DAY),DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 DAY)+INTERVAL 2 MINUTE,'tarjeta',44000,5720,49720,'confirmado'),
(12,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 5 MINUTE),DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 5 MINUTE)+INTERVAL 2 MINUTE,'sinpe_movil',18500,2405,20905,'confirmado'),
(13,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 12 HOUR),DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 12 HOUR)+INTERVAL 2 MINUTE,'efectivo',27900,3627,31527,'anulado'),
(14,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 8 HOUR),DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 8 HOUR)+INTERVAL 2 MINUTE,'tarjeta',9800,1274,11074,'anulado'),
(15,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 HOUR),NULL,'efectivo',22700,2951,25651,'pendiente');

INSERT INTO pedido_items(id,pedido_id,producto_id,cantidad,precio_unitario) VALUES
(1,1,1,1,12500),(2,1,4,1,4200),(3,1,9,1,6500),(4,2,1,1,12500),(5,3,5,1,45900),
(6,4,4,1,4200),(7,4,11,1,8900),(8,4,9,1,6500),(9,5,3,1,28500),(10,6,2,1,7800),
(11,7,7,1,62900),(12,8,6,1,38500),(13,8,9,1,6500),(14,8,15,1,11900),(15,9,9,1,6500),
(16,10,8,1,34900),(17,10,10,1,9800),(18,10,4,1,4200),(19,10,11,1,8900),(20,10,1,1,12500),
(21,11,12,1,27900),(22,11,15,1,11900),(23,11,4,1,4200),(24,12,1,1,12500),(25,12,4,1,4200),
(26,12,9,1,1800),(27,13,12,1,27900),(28,14,10,1,9800),(29,15,2,1,7800),(30,15,9,1,6500),(31,15,4,2,4200);
