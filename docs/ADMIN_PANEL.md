# Panel de administración — Raíz & Madera

## Funciones

- Resumen de usuarios, administradores activos, productos publicados y stock bajo.
- Creación de cuentas locales con bcrypt y política de contraseña del servidor.
- Búsqueda por nombre/correo, filtros por rol/estado y edición de rol/estado.
- Restablecimiento de contraseña sin mostrar la contraseña actual.
- Historial de acciones administrativas, catálogo y ventas. La bitácora guarda IDs, tipos de acción y metadatos permitidos, nunca contraseñas, tokens ni correos.
- Accesos rápidos a catálogo, inventario, ventas y asistente de reposición.

## Seguridad del servidor

Todas las rutas `/api/admin` aplican `requireAuth` y `requireRole('admin')`. React también protege `/admin`, pero esa protección visual no sustituye al middleware del backend. Las solicitudes que cambian datos siguen requiriendo el token CSRF de la sesión.

No se permite a un administrador cambiar su propio rol/estado desde este panel. La API bloquea degradar/desactivar al último administrador activo y ejecuta el cambio y la fila de auditoría en una misma transacción. Las cuentas se desactivan en vez de eliminarse para conservar trazabilidad. Los correos duplicados responden `409`; IDs inexistentes responden `404`; datos inválidos responden `400`.

## Migración de una base existente

En PowerShell desde la raíz del proyecto, con Docker Compose activo:

```powershell
Get-Content backend/migrations/003_admin_tools.sql | docker compose exec -T db mysql -u raiz_app -p raiz_madera
```

Si usas otro nombre de base o usuario, reemplázalo. En una base nueva inicializada desde `schema.sql` no hace falta correr esta migración.

## Endpoints

| Método | Ruta | Objetivo |
|---|---|---|
| GET | `/api/admin/overview` | Métricas administrativas |
| GET | `/api/admin/users?q=&role=&status=&limit=` | Lista filtrada de cuentas |
| POST | `/api/admin/users` | Crear cuenta local |
| PATCH | `/api/admin/users/:id` | Actualizar rol/estado o contraseña |
| GET | `/api/admin/audit?limit=` | Auditoría más reciente |

## Pruebas recomendadas

1. Iniciar como `admin` y entrar a `/admin`.
2. Crear una cuenta de caja con contraseña fuerte; verificar que aparece en la tabla.
3. Intentar crear el mismo correo y comprobar `409`.
4. Cambiar un usuario entre `caja` y `encargado`; comprobar los accesos con cada sesión.
5. Desactivar otro usuario y comprobar que su próxima petición protegida devuelve `401`.
6. Intentar cambiar el propio rol o desactivar al último administrador: debe responder `409`.
7. Iniciar como `encargado` y llamar directamente a `GET /api/admin/users`: debe responder `403`.
8. Crear/editar un producto o registrar una venta y verificar que se refleja en Actividad reciente tras aplicar la migración.
