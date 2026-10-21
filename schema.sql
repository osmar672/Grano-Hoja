-- ADVERTENCIA: script de desarrollo. Borra y recrea las tablas del caso.
DROP TABLE IF EXISTS pedido_items CASCADE;
DROP TABLE IF EXISTS recetas CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS insumos CASCADE;

-- Cuentas internas. Las contraseñas se guardan únicamente como hashes bcrypt.
CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE CHECK (email = LOWER(TRIM(email))),
  display_name VARCHAR(120) NOT NULL CHECK (LENGTH(TRIM(display_name)) > 0),
  password_hash TEXT NOT NULL CHECK (LENGTH(TRIM(password_hash)) > 0),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','encargado','caja')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS app_users_role_active_idx ON app_users(role, active);

CREATE TABLE insumos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  unidad VARCHAR(20) NOT NULL CHECK (LENGTH(TRIM(unidad)) > 0),
  stock NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0)
);

CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  precio NUMERIC(12,2) NOT NULL CHECK (precio > 0),
  categoria VARCHAR(60) NOT NULL CHECK (LENGTH(TRIM(categoria)) > 0),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE recetas (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  insumo_id INTEGER NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  CONSTRAINT receta_producto_insumo_unique UNIQUE(producto_id, insumo_id)
);

CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_confirmacion TIMESTAMPTZ,
  metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('efectivo','tarjeta','sinpe_movil')),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  impuesto NUMERIC(12,2) NOT NULL CHECK (impuesto >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmado','anulado')),
  CONSTRAINT pedido_confirmacion_estado_check CHECK (estado <> 'confirmado' OR fecha_confirmacion IS NOT NULL),
  CONSTRAINT pedido_total_check CHECK (total = subtotal + impuesto)
);

CREATE TABLE pedido_items (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario > 0)
);

CREATE INDEX insumos_nombre_idx ON insumos USING btree(nombre);
CREATE INDEX productos_categoria_activo_idx ON productos(categoria, activo);
CREATE INDEX recetas_insumo_idx ON recetas(insumo_id);
CREATE INDEX pedidos_confirmacion_estado_idx ON pedidos(fecha_confirmacion, estado);
CREATE INDEX pedidos_metodo_estado_idx ON pedidos(metodo_pago, estado);
CREATE INDEX pedido_items_pedido_idx ON pedido_items(pedido_id);
CREATE INDEX pedido_items_producto_idx ON pedido_items(producto_id);

-- Insumos. Hay elementos bajo el mínimo y hielo insuficiente para preparar un frappé.
INSERT INTO insumos(id, nombre, unidad, stock, stock_minimo) VALUES
(1, 'Café en grano', 'g', 650, 500),
(2, 'Leche entera', 'ml', 4200, 2000),
(3, 'Vaso caliente', 'unidad', 25, 30),
(4, 'Tapa para vaso', 'unidad', 40, 25),
(5, 'Azúcar', 'g', 1600, 500),
(6, 'Chocolate en polvo', 'g', 150, 200),
(7, 'Hielo', 'g', 80, 300),
(8, 'Té chai', 'g', 300, 150),
(9, 'Croissant', 'unidad', 20, 8),
(10, 'Crema batida', 'ml', 500, 200);

INSERT INTO productos(id, nombre, precio, categoria, activo) VALUES
(1, 'Espresso', 1500.00, 'Bebidas calientes', TRUE),
(2, 'Americano', 1800.00, 'Bebidas calientes', TRUE),
(3, 'Capuchino', 2200.00, 'Bebidas calientes', TRUE),
(4, 'Latte', 2300.00, 'Bebidas calientes', TRUE),
(5, 'Té chai', 2100.00, 'Bebidas calientes', TRUE),
(6, 'Frappé de café', 2800.00, 'Bebidas frías', TRUE),
(7, 'Croissant', 1600.00, 'Panadería', TRUE),
(8, 'Chocolate caliente', 2200.00, 'Bebidas calientes', TRUE);

INSERT INTO recetas(id, producto_id, insumo_id, cantidad) VALUES
(1,1,1,18),(2,1,3,1),(3,1,4,1),
(4,2,1,18),(5,2,3,1),(6,2,4,1),
(7,3,1,18),(8,3,2,150),(9,3,3,1),(10,3,4,1),
(11,4,1,18),(12,4,2,200),(13,4,3,1),(14,4,4,1),
(15,5,8,12),(16,5,2,180),(17,5,3,1),(18,5,4,1),(19,5,5,5),
(20,6,1,18),(21,6,2,150),(22,6,7,120),(23,6,3,1),(24,6,4,1),(25,6,6,15),(26,6,10,20),
(27,7,9,1),
(28,8,6,25),(29,8,2,200),(30,8,3,1),(31,8,4,1),(32,8,5,5);

-- Pedidos históricos distribuidos durante los últimos 7 días para probar resumen y reporte semanal.
INSERT INTO pedidos(id, fecha, fecha_confirmacion, metodo_pago, subtotal, impuesto, total, estado) VALUES
(1, NOW()-INTERVAL '6 days', NOW()-INTERVAL '6 days'+INTERVAL '2 minutes', 'efectivo', 4900, 637, 5537, 'confirmado'),
(2, NOW()-INTERVAL '6 days 3 hours', NOW()-INTERVAL '6 days 3 hours'+INTERVAL '2 minutes', 'tarjeta', 2200, 286, 2486, 'confirmado'),
(3, NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days'+INTERVAL '2 minutes', 'sinpe_movil', 2300, 299, 2599, 'confirmado'),
(4, NOW()-INTERVAL '5 days 2 hours', NOW()-INTERVAL '5 days 2 hours'+INTERVAL '2 minutes', 'efectivo', 3200, 416, 3616, 'confirmado'),
(5, NOW()-INTERVAL '4 days', NOW()-INTERVAL '4 days'+INTERVAL '2 minutes', 'tarjeta', 4400, 572, 4972, 'confirmado'),
(6, NOW()-INTERVAL '4 days 4 hours', NOW()-INTERVAL '4 days 4 hours'+INTERVAL '2 minutes', 'sinpe_movil', 2100, 273, 2373, 'confirmado'),
(7, NOW()-INTERVAL '3 days', NOW()-INTERVAL '3 days'+INTERVAL '2 minutes', 'efectivo', 2800, 364, 3164, 'confirmado'),
(8, NOW()-INTERVAL '3 days 3 hours', NOW()-INTERVAL '3 days 3 hours'+INTERVAL '2 minutes', 'tarjeta', 5400, 702, 6102, 'confirmado'),
(9, NOW()-INTERVAL '2 days', NOW()-INTERVAL '2 days'+INTERVAL '2 minutes', 'sinpe_movil', 1600, 208, 1808, 'confirmado'),
(10, NOW()-INTERVAL '2 days 5 hours', NOW()-INTERVAL '2 days 5 hours'+INTERVAL '2 minutes', 'efectivo', 6600, 858, 7458, 'confirmado'),
(11, NOW()-INTERVAL '1 day', NOW()-INTERVAL '1 day'+INTERVAL '2 minutes', 'tarjeta', 4600, 598, 5198, 'confirmado'),
(12, NOW()-INTERVAL '5 minutes', NOW()-INTERVAL '5 minutes'+INTERVAL '2 minutes', 'sinpe_movil', 1800, 234, 2034, 'confirmado'),
(13, NOW()-INTERVAL '12 hours', NOW()-INTERVAL '12 hours'+INTERVAL '2 minutes', 'efectivo', 2200, 286, 2486, 'anulado'),
(14, NOW()-INTERVAL '8 hours', NOW()-INTERVAL '8 hours'+INTERVAL '2 minutes', 'tarjeta', 2800, 364, 3164, 'anulado'),
(15, NOW()-INTERVAL '1 hour', NULL, 'efectivo', 3000, 390, 3390, 'pendiente');

INSERT INTO pedido_items(id, pedido_id, producto_id, cantidad, precio_unitario) VALUES
(1,1,1,1,1500),(2,1,2,1,1800),(3,1,7,1,1600),
(4,2,3,1,2200),
(5,3,4,1,2300),
(6,4,7,2,1600),
(7,5,3,2,2200),
(8,6,5,1,2100),
(9,7,6,1,2800),
(10,8,1,1,1500),(11,8,4,1,2300),(12,8,7,1,1600),
(13,9,7,1,1600),
(14,10,3,3,2200),
(15,11,4,2,2300),
(16,12,2,1,1800),
(17,13,8,1,2200),
(18,14,6,1,2800),
(19,15,1,2,1500);

SELECT setval('insumos_id_seq', (SELECT MAX(id) FROM insumos));
SELECT setval('productos_id_seq', (SELECT MAX(id) FROM productos));
SELECT setval('recetas_id_seq', (SELECT MAX(id) FROM recetas));
SELECT setval('pedidos_id_seq', (SELECT MAX(id) FROM pedidos));
SELECT setval('pedido_items_id_seq', (SELECT MAX(id) FROM pedido_items));


-- Sesiones server-side para express-session / connect-pg-simple.
CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS user_sessions_expire_idx ON user_sessions(expire);
