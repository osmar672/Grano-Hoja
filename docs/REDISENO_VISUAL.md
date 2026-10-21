# Rediseño visual — Grano & Hoja

## Dirección visual
La interfaz toma como referencia la presentación forestal adjunta: verde bosque oscuro, verdes hoja, tonos crema, títulos editoriales de alto contraste y una ilustración botánica en capas. Se adapta esa dirección a una herramienta de caja e inventario: la decoración se concentra en la navegación y las cabeceras; los formularios, precios y métricas mantienen fondos claros para que se puedan leer rápidamente.

## Cambios
- Navegación lateral en verde bosque, que se convierte en navegación horizontal adaptable en pantallas pequeñas.
- Barra superior translúcida con desenfoque, llamada principal para crear un pedido y contexto de operación.
- Cabeceras de página con fondo forestal, capas de luz y la ilustración vectorial `frontend/public/forest-canopy.svg`.
- Tarjetas de métricas con borde sutil, profundidad y entrada escalonada.
- Estados hover en botones, navegación, listas e items de pedido.
- Campos de formulario con indicador de foco visible y consistente.
- Reglas responsive para escritorio, tablet y móvil.
- `@media (prefers-reduced-motion: reduce)` reduce el movimiento para usuarios que lo soliciten en sus preferencias del sistema.

## Archivos modificados
- `frontend/src/components/Layout.jsx`
- `frontend/src/styles.css`
- `frontend/index.html`
- `frontend/public/forest-canopy.svg`
- `BITACORA_IA.md`

## Cómo revisar
1. Inicia PostgreSQL y el backend según `README.md`.
2. En `frontend/`, ejecuta `npm install` y `npm run dev`.
3. Abre la URL de Vite en escritorio y reduce el ancho del navegador para comprobar la navegación móvil.
4. Cambia entre Panel, Productos, Insumos, Pedidos y Asistente IA; revisa foco de teclado, hover, entrada de contenido y formularios.
5. Activa la opción del sistema para reducir movimiento y verifica que las animaciones queden minimizadas.

## Alcance
Este cambio es visual. No modifica la estructura de datos, las rutas de API, los cálculos, las transacciones ni las reglas de los pedidos. Las pruebas estáticas de CSS, JSX y SVG pasan; la prueba interactiva completa requiere ejecutar Vite en un entorno con las dependencias instaladas.


## Ajuste solicitado después de la captura (Fase 1)

- En pantallas de hasta 900 px, la navegación se transforma en una barra inferior de cinco opciones para evitar scrollbars verticales y horizontales dentro del menú.
- Se añadió `/login` con fondo bosque, líneas botánicas animadas, tarjeta crema y controles de acceso claros.
- El área privada muestra el nombre/rol de la cuenta y un botón de cierre de sesión que destruye la sesión en el servidor.
- Se respetan las preferencias `prefers-reduced-motion`.
