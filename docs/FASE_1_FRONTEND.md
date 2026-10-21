# Grano & Hoja — Fase 1: planificación del frontend

## 1. Qué se logrará

Se construirá un punto de venta de lectura rápida, con identidad visual café, verde hoja y crema. React será responsable de la experiencia, los formularios y los estados de interfaz; la API Express será la fuente de verdad para precios, inventario, confirmación, anulación, impuestos y métricas.

Esta planificación comparte el contrato propuesto en [FASE_1_BACKEND.md](FASE_1_BACKEND.md). Esas rutas se implementarán en la Parte 1 antes de conectar completamente React.

## 2. Mapa de vistas y endpoint principal

| Vista en React | Ruta de navegador | Endpoints de API propuestos | Funciones |
|---|---|---|---|
| Panel / cierre del día | `/` | `GET /api/resumen?fecha=YYYY-MM-DD` | Totales por método, total general y cinco productos más vendidos. Estados loading/error/vacío. |
| Menú de productos | `/productos` | `GET /api/productos?q=&categoria=&ordenar_por=&direccion=`; `POST /api/productos`; `PUT/PATCH/DELETE /api/productos/:id` | Búsqueda con debounce, filtro categoría, orden y CRUD. |
| Detalle y receta | `/productos/:id` | `GET /api/productos/:id` | Receta, insumos y porciones disponibles. |
| Insumos | `/insumos` | `GET /api/insumos`; `GET /api/insumos/bajo-minimo`; `POST /api/insumos`; `PUT/PATCH/DELETE /api/insumos/:id` | Inventario, alertas de mínimo y CRUD. |
| Nuevo pedido | `/pedidos/nuevo` | `GET /api/productos`; `POST /api/pedidos`; `POST /api/pedidos/:id/confirmar` | Crear pedido, mostrar subtotal/impuesto/total y visualizar `409` de stock insuficiente. |
| Historial de pedidos | `/pedidos` | `GET /api/pedidos`; `GET /api/pedidos/:id`; `POST /api/pedidos/:id/confirmar`; `POST /api/pedidos/:id/anular` | Ver detalle, estado, confirmar y anular bajo reglas del servidor. |
| Asistente de compras | `/asistente-compras` | Webhook configurado en `VITE_N8N_WEBHOOK_URL`; n8n consultará `GET /api/insumos/bajo-minimo` y `GET /api/reportes/ventas-semana` | Solicitar y mostrar sugerencias justificadas de compra. Se integra en la fase del agente. |
| No encontrada | `*` | Ninguno | Vista 404 con vínculo al inicio. |

Los endpoints anteriores son el contrato de diseño de este repositorio, no una afirmación de que el código de la API ya esté implementado.

## 3. Mapa de rutas de React Router

```text
/
├── /productos
├── /productos/:id
├── /insumos
├── /pedidos/nuevo
├── /pedidos
├── /asistente-compras
└── * (NotFoundPage)
```

Se usará `BrowserRouter`, un `Layout` común, `NavLink` para navegación y `Outlet` para las páginas.

## 4. Árbol de componentes propuesto

```text
App
└── BrowserRouter
    └── AppRouter
        └── Layout
            ├── Header (Grano & Hoja)
            ├── Navigation (NavLink)
            └── Outlet
                ├── DashboardPage
                │   ├── MetricCard
                │   └── TopProductsList
                ├── ProductosPage
                │   ├── SearchFilterSort
                │   ├── ProductList
                │   │   └── ProductItem
                │   └── ProductForm
                ├── ProductoDetallePage
                │   └── RecipeList
                ├── InsumosPage
                │   ├── InsumoList
                │   │   └── InsumoItem
                │   └── InsumoForm
                ├── NuevoPedidoPage
                │   ├── ProductSelector
                │   └── OrderSummary
                ├── PedidosPage
                │   └── OrderItem
                ├── AsistenteComprasPage
                └── NotFoundPage

Componentes compartidos: LoadingState, EmptyState, ErrorMessage,
FormField, ConfirmDialog y MetricCard.
```

## 5. Estructura de carpetas prevista

```text
frontend/
├── .env.example
├── package.json
├── index.html
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── routes/
    │   └── AppRouter.jsx
    ├── pages/
    │   ├── DashboardPage.jsx
    │   ├── ProductosPage.jsx
    │   ├── ProductoDetallePage.jsx
    │   ├── InsumosPage.jsx
    │   ├── NuevoPedidoPage.jsx
    │   ├── PedidosPage.jsx
    │   ├── AsistenteComprasPage.jsx
    │   └── NotFoundPage.jsx
    ├── components/
    │   ├── layout/
    │   ├── common/
    │   ├── products/
    │   ├── ingredients/
    │   └── orders/
    ├── hooks/
    │   └── useFetch.js
    ├── services/
    │   ├── api.js
    │   └── agent.js
    └── styles/
        ├── global.css
        └── components.css
```

## 6. Reglas de integración

- `services/api.js` será el único punto de entrada para peticiones a Express; `services/agent.js` utilizará `VITE_N8N_WEBHOOK_URL` para llamar al webhook.
- La función central de API conservará el código HTTP (`status`) y el mensaje enviado por el servidor; no reemplazará errores `400` o `409` con mensajes genéricos.
- `useFetch` gestionará `loading`, `error`, `data` y `refetch`, y cancelará peticiones obsoletas o al desmontar el componente.
- Todos los listados mostrarán tres estados distintos: cargando, error y vacío.
- El cliente validará campos básicos para ayudar a la persona usuaria, pero el backend decidirá disponibilidad, total final, descuento del stock y validez de la anulación.
- Los filtros usarán los query params propuestos por el contrato compartido. La búsqueda de productos aplicará debounce para no consultar la API en cada tecla.
- La eliminación pedirá confirmación y no estará disponible para pedidos.
- Paleta sugerida como variables CSS: café `#4A3026`, café medio `#775440`, verde hoja `#3F6B4F`, crema `#F7F1E5`, texto `#2B2926`, alerta `#A63D40`. Se ajustará con contraste legible en la Fase 2.

## 7. Comprobar API y CORS antes de conectar React

Primero inicia la API siguiendo su instrucción real de arranque y confirma el puerto. Luego prueba el endpoint del resumen:

```bash
curl -i "http://localhost:PUERTO/api/resumen"
```

Para inspeccionar CORS desde el origen que usa Vite por defecto:

```bash
curl -i -H "Origin: http://localhost:5173" "http://localhost:PUERTO/api/resumen"
```

Después prueba el preflight para una petición JSON:

```bash
curl -i -X OPTIONS "http://localhost:PUERTO/api/productos" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

Una respuesta `200` de `curl` no demuestra por sí sola que el navegador acepta CORS. Cuando se cree React, verificar DevTools → Network y Console. Un error `Failed to fetch` suele indicar conectividad/CORS; un `404` indica una URL o ruta incorrecta.

## 8. Límite de esta fase

No se crea aún el código del frontend. La implementación empieza después de que se complete el esquema y las rutas de API y se indique `continuar`, respetando el trabajo por fases. El reto de combos con 10 % de descuento no se incorpora.
