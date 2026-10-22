# Identidad visual — Grano & Hoja

- Marca activa: **Grano & Hoja**.
- Eslogan: **Buen café, buenos ingredientes.**
- Negocio: cafetería con bebidas calientes/frías y repostería.
- Paleta: café tostado, crema, verde hoja y terracota suave.
- Marca gráfica React: `frontend/src/components/LogoMark.jsx`; recurso SVG: `frontend/public/grano-hoja-logo.svg` (taza de café, vapor y hoja).
- El antiguo SVG se conserva bajo `legacy/frontend/public/` como referencia de la marca anterior.
- Estética: cálida, limpia y editorial, con fondos crema, paneles suaves y navegación de contraste alto.
- Movimiento: entradas sutiles y feedback hover; `prefers-reduced-motion` debe desactivar animaciones para quienes lo soliciten.
- Responsive: el layout adapta la navegación al rol y al ancho; verifica escritorio y móvil antes de publicar.

Verifica contraste, foco visible por teclado, mensajes de error de formularios y navegación a insumos/recetas. El parser JSX confirma sintaxis, pero no sustituye una comprobación visual en un navegador real.
