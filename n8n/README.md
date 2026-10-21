# Workflow de compras n8n

1. Importa `workflow_grano_hoja.json` desde el editor n8n.
2. Abre **OpenAI Chat Model** y selecciona tu credencial. No hay tokens ni credenciales guardados en el JSON.
3. Verifica las URLs de los dos nodos HTTP Request Tool.
   - n8n instalado directamente en el mismo equipo: `http://localhost:3001/api`
   - n8n en Docker Desktop: `http://host.docker.internal:3001/api` (la API debe escuchar en una interfaz alcanzable desde el contenedor).
   - n8n Cloud: URL HTTPS pública de tu API; la API local no es accesible directamente desde cloud.
   También se admite la variable de entorno `GRANO_HOJA_API_BASE_URL`, si la política de despliegue de n8n permite variables `$env`.
4. En el nodo Webhook el método es POST, la ruta es `grano-hoja/asistente-compras` y Allowed Origins permite `http://localhost:5173`. Cambia ese origen al desplegar.
5. Activa el workflow y copia la Production URL a `VITE_N8N_WEBHOOK_URL` en `frontend/.env`; reinicia Vite después de cambiar variables.

## Contrato

Éxito (`200`):

```json
{
  "ok": true,
  "data": {
    "resumen": "El chocolate y el hielo requieren atención...",
    "sugerencias": [
      {
        "insumo": "Chocolate en polvo",
        "cantidad_sugerida": 250,
        "unidad": "g",
        "justificacion": "El stock está por debajo del mínimo y el consumo de la semana aconseja reponer..."
      }
    ]
  },
  "error": null
}
```

Error (`400`):

```json
{ "ok": false, "data": null, "error": "El campo solicitud es obligatorio." }
```

## Prueba con curl

Usa la URL de test `/webhook-test/grano-hoja/asistente-compras` mientras el editor escucha una prueba, o la Production URL con el workflow activo:

```bash
curl -i -X POST http://localhost:5678/webhook-test/grano-hoja/asistente-compras \
  -H 'Content-Type: application/json' \
  -d '{"solicitud":"Sugiere compras justificadas con stock, mínimo y consumo semanal."}'
```

Prueba de entrada inválida (debe devolver `400` y el contrato completo):

```bash
curl -i -X POST http://localhost:5678/webhook-test/grano-hoja/asistente-compras \
  -H 'Content-Type: application/json' -d '{}'
```

El contrato normaliza errores de validación y errores del AI Agent. Si un servidor remoto corta la conexión antes de que n8n ejecute la rama, revisa el registro de ejecución de n8n.
