-- Raíz & Madera: inventario minorista de plantas, muebles y decoración.
-- Solo para desarrollo: elimina y recrea los datos demo de esta base.
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS pedido_items CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;

CREATE TABLE app_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE CHECK (email = LOWER(TRIM(email))),
  display_name VARCHAR(120) NOT NULL CHECK (LENGTH(TRIM(display_name)) > 0),
  password_hash TEXT CHECK (password_hash IS NULL OR LENGTH(TRIM(password_hash)) > 0),
  google_sub VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','encargado','caja')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX app_users_role_active_idx ON app_users(role, active);
CREATE UNIQUE INDEX app_users_google_sub_uq ON app_users(google_sub) WHERE google_sub IS NOT NULL;

CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(140) NOT NULL UNIQUE CHECK (LENGTH(TRIM(nombre)) > 0),
  descripcion VARCHAR(1200) NOT NULL DEFAULT '',
  precio NUMERIC(12,2) NOT NULL CHECK (precio > 0),
  categoria VARCHAR(24) NOT NULL CHECK (categoria IN ('plantas','muebles','decoracion')),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX productos_categoria_activo_idx ON productos(categoria, activo);
CREATE INDEX productos_stock_idx ON productos(stock, stock_minimo);
CREATE INDEX productos_nombre_idx ON productos USING btree(nombre);

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
CREATE INDEX pedidos_fecha_estado_idx ON pedidos(fecha, estado);
CREATE INDEX pedidos_confirmacion_estado_idx ON pedidos(fecha_confirmacion, estado);
CREATE INDEX pedidos_metodo_estado_idx ON pedidos(metodo_pago, estado);

CREATE TABLE pedido_items (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario > 0)
);
CREATE INDEX pedido_items_pedido_idx ON pedido_items(pedido_id);
CREATE INDEX pedido_items_producto_idx ON pedido_items(producto_id);

CREATE TABLE user_sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX user_sessions_expire_idx ON user_sessions(expire);

-- Productos de demostración; stock mínimo habilita alertas reales de reposición.
INSERT INTO productos(id, nombre, descripcion, precio, categoria, stock, stock_minimo, activo) VALUES
(1, 'Monstera deliciosa', 'Planta tropical de hojas grandes y recortadas. Ideal para espacios luminosos sin sol directo.', 12500.00, 'plantas', 8, 4, TRUE),
(2, 'Sansevieria', 'Planta resistente y de bajo mantenimiento en maceta de vivero.', 7800.00, 'plantas', 3, 5, TRUE),
(3, 'Ficus lyrata', 'Ficus decorativo de porte vertical, pensado para salas y recibidores.', 28500.00, 'plantas', 4, 2, TRUE),
(4, 'Suculenta en maceta cerámica', 'Suculenta pequeña en maceta de acabado mate.', 4200.00, 'plantas', 14, 6, TRUE),
(5, 'Mesa auxiliar Roble', 'Mesa lateral compacta de madera tono roble con acabado natural.', 45900.00, 'muebles', 2, 3, TRUE),
(6, 'Silla Nórdica', 'Silla de líneas limpias, asiento cómodo y patas de madera.', 38500.00, 'muebles', 6, 2, TRUE),
(7, 'Estante Botánico', 'Estante de madera con tres niveles para plantas y objetos decorativos.', 62900.00, 'muebles', 1, 2, TRUE),
(8, 'Banco de madera', 'Banco versátil para entrada, balcón techado o pie de cama.', 34900.00, 'muebles', 5, 2, TRUE),
(9, 'Maceta Arena', 'Maceta cerámica color arena con orificio de drenaje.', 6500.00, 'decoracion', 12, 5, TRUE),
(10, 'Jarrón Orgánico', 'Jarrón decorativo de silueta orgánica en tono crema.', 9800.00, 'decoracion', 2, 4, TRUE),
(11, 'Canasto de fibra natural', 'Canasto artesanal para cubremaceta, textiles u organización.', 8900.00, 'decoracion', 7, 3, TRUE),
(12, 'Lámpara de mesa Lino', 'Lámpara de mesa con pantalla textil en color natural.', 27900.00, 'decoracion', 3, 2, TRUE),
(13, 'Pothos colgante', 'Planta colgante de fácil cuidado para repisas y soportes altos.', 5900.00, 'plantas', 0, 4, TRUE),
(14, 'Mesa de centro Bruma', 'Mesa baja de madera con acabado mate y proporciones minimalistas.', 78900.00, 'muebles', 0, 1, TRUE),
(15, 'Cojín lino oliva', 'Cojín decorativo color oliva con funda texturizada.', 11900.00, 'decoracion', 9, 4, TRUE);

INSERT INTO pedidos(id, fecha, fecha_confirmacion, metodo_pago, subtotal, impuesto, total, estado) VALUES
(1, NOW()-INTERVAL '6 days', NOW()-INTERVAL '6 days'+INTERVAL '2 minutes', 'efectivo', 23200, 3016, 26216, 'confirmado'),
(2, NOW()-INTERVAL '6 days 3 hours', NOW()-INTERVAL '6 days 3 hours'+INTERVAL '2 minutes', 'tarjeta', 12500, 1625, 14125, 'confirmado'),
(3, NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days'+INTERVAL '2 minutes', 'sinpe_movil', 45900, 5967, 51867, 'confirmado'),
(4, NOW()-INTERVAL '5 days 2 hours', NOW()-INTERVAL '5 days 2 hours'+INTERVAL '2 minutes', 'efectivo', 19600, 2548, 22148, 'confirmado'),
(5, NOW()-INTERVAL '4 days', NOW()-INTERVAL '4 days'+INTERVAL '2 minutes', 'tarjeta', 28500, 3705, 32205, 'confirmado'),
(6, NOW()-INTERVAL '4 days 4 hours', NOW()-INTERVAL '4 days 4 hours'+INTERVAL '2 minutes', 'sinpe_movil', 7800, 1014, 8814, 'confirmado'),
(7, NOW()-INTERVAL '3 days', NOW()-INTERVAL '3 days'+INTERVAL '2 minutes', 'efectivo', 62900, 8177, 71077, 'confirmado'),
(8, NOW()-INTERVAL '3 days 3 hours', NOW()-INTERVAL '3 days 3 hours'+INTERVAL '2 minutes', 'tarjeta', 56900, 7397, 64297, 'confirmado'),
(9, NOW()-INTERVAL '2 days', NOW()-INTERVAL '2 days'+INTERVAL '2 minutes', 'sinpe_movil', 6500, 845, 7345, 'confirmado'),
(10, NOW()-INTERVAL '2 days 5 hours', NOW()-INTERVAL '2 days 5 hours'+INTERVAL '2 minutes', 'efectivo', 70300, 9139, 79439, 'confirmado'),
(11, NOW()-INTERVAL '1 day', NOW()-INTERVAL '1 day'+INTERVAL '2 minutes', 'tarjeta', 44000, 5720, 49720, 'confirmado'),
(12, NOW()-INTERVAL '5 minutes', NOW()-INTERVAL '5 minutes'+INTERVAL '2 minutes', 'sinpe_movil', 18500, 2405, 20905, 'confirmado'),
(13, NOW()-INTERVAL '12 hours', NOW()-INTERVAL '12 hours'+INTERVAL '2 minutes', 'efectivo', 27900, 3627, 31527, 'anulado'),
(14, NOW()-INTERVAL '8 hours', NOW()-INTERVAL '8 hours'+INTERVAL '2 minutes', 'tarjeta', 9800, 1274, 11074, 'anulado'),
(15, NOW()-INTERVAL '1 hour', NULL, 'efectivo', 22700, 2951, 25651, 'pendiente');

INSERT INTO pedido_items(id, pedido_id, producto_id, cantidad, precio_unitario) VALUES
(1,1,1,1,12500),(2,1,4,1,4200),(3,1,9,1,6500),
(4,2,1,1,12500),
(5,3,5,1,45900),
(6,4,4,1,4200),(7,4,11,1,8900),(8,4,9,1,6500),
(9,5,3,1,28500),
(10,6,2,1,7800),
(11,7,7,1,62900),
(12,8,6,1,38500),(13,8,9,1,6500),(14,8,15,1,11900),
(15,9,9,1,6500),
(16,10,8,1,34900),(17,10,10,1,9800),(18,10,4,1,4200),(19,10,11,1,8900),(20,10,1,1,12500),
(21,11,12,1,27900),(22,11,15,1,11900),(23,11,4,1,4200),
(24,12,1,1,12500),(25,12,4,1,4200),(26,12,9,1,1800),
(27,13,12,1,27900),
(28,14,10,1,9800),
(29,15,2,1,7800),(30,15,9,1,6500),(31,15,4,2,4200);

SELECT setval('app_users_id_seq', 1, false);
SELECT setval('productos_id_seq', (SELECT MAX(id) FROM productos));
SELECT setval('pedidos_id_seq', (SELECT MAX(id) FROM pedidos));
SELECT setval('pedido_items_id_seq', (SELECT MAX(id) FROM pedido_items));
