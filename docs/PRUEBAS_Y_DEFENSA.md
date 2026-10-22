# Pruebas y defensa — Raíz & Madera

## Checklist funcional

- [ ] `schema.sql` carga en una base de demostración limpia.
- [ ] Login crea cookie HttpOnly; `/api/auth/me` lee la sesión; logout destruye la sesión.
- [ ] Sin sesión: `GET /api/productos` devuelve `401`.
- [ ] Rol `caja`: `POST /api/productos` devuelve `403`.
- [ ] CRUD de producto funciona con precio, descripción, categoría, stock, mínimo y activo.
- [ ] Buscar por texto, filtrar categoría y ordenar por nombre/precio/categoría/stock funciona.
- [ ] Crear venta conserva el precio por línea y calcula 13 % de impuesto.
- [ ] Confirmar venta con stock suficiente descuenta existencias y pasa a `confirmado`.
- [ ] Confirmar venta con stock insuficiente devuelve `409` y el stock no cambia.
- [ ] Confirmar la misma venta dos veces devuelve `409`.
- [ ] Dos ventas simultáneas que consumen el mismo producto no permiten stock negativo.
- [ ] Anular pendiente conserva stock; anular confirmada antes de 15 minutos repone stock.
- [ ] Anular tras 16 minutos devuelve `409`.
- [ ] Resumen suma solo ventas confirmadas; las anuladas no cuentan.
- [ ] Reportes de bajo stock y ventas de siete días devuelven productos y cantidades correctas.
- [ ] El agente solo se llama a través del backend protegido y responde `{ok,data,error}`.

## Comandos

```powershell
cd backend
npm install
npm run check
npm test
npm audit
```

Importa `tests/Raiz-y-Madera.postman_collection.json` en Postman; configura `adminPassword` solo como variable local y ejecuta `Login admin` antes de los endpoints protegidos.

## Defensa individual

- **¿Por qué una transacción?** La confirmación cambia varias existencias y estado de venta; si una validación falla, todo debe retroceder.
- **¿Cómo evita el stock negativo con ventas simultáneas?** Bloquea las filas de producto con `SELECT ... FOR UPDATE` en orden estable, valida disponibilidad después del bloqueo y descuenta antes de hacer `COMMIT`.
- **¿Por qué guardar `precio_unitario` en `pedido_items`?** Una venta debe conservar el precio en el instante en que se creó, aunque el catálogo cambie después.
- **¿Cuándo empieza el plazo de anulación?** Desde `fecha_confirmacion`, no desde la creación de la venta pendiente.
- **¿Por qué la interfaz no define permisos?** Los permisos de verdad se aplican en las rutas Express; ocultar un botón no impide que alguien haga una petición HTTP directa.
- **¿Cómo funciona el asistente?** n8n consulta reportes read-only y devuelve una recomendación JSON; el flujo no puede cambiar existencias.

## Estado honesto de pruebas

El proyecto está estructurado para las pruebas listadas, pero se debe ejecutar contra MySQL 8.4 y las dependencias reales en el equipo. No afirmes que se pasó una prueba hasta registrar su resultado observado.


## Pruebas adicionales de Google OAuth

1. Con `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y el URI exacto configurados en backend, entra a `/login` y pulsa **Crear usuario con Google**.
2. Autoriza con un usuario de prueba permitido por la pantalla de consentimiento. Debe volver a `/` con sesión activa.
3. Comprueba en MySQL 8.4 que `google_sub` es único y el nuevo usuario tiene rol `caja`, `password_hash IS NULL` y `active = TRUE`.
4. Cierra sesión y pulsa **Continuar con Google**; la cuenta registrada debe volver a iniciar sesión.
5. Intenta registrar la misma cuenta otra vez: debe mostrar mensaje de cuenta existente.
6. Inicia el login Google con un correo no registrado: debe sugerir el registro.
7. Cambia state/nonce en una solicitud o usa un callback caducado: el callback debe rechazarlo y no crear una sesión.
8. Sin credenciales configuradas, la UI debe mostrar que Google OAuth aún no está configurado; el login con contraseña sigue disponible.
