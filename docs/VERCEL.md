# Vercel — Grano & Hoja

Esta publicación usa **Vercel Services**, no el empaquetado SPA anterior. La configuración vigente es `vercel.json` de la carpeta principal: `/api/*` se dirige al servicio `backend/` y las demás rutas al servicio `frontend/` (Vite/React). Consulta `VERCEL_SERVICES.md` y `../PUBLICAR_EN_VERCEL.md` para pasos detallados.

No configures comandos globales de build/instalación que sustituyan a los definidos por servicio. El paquete backend y el frontend se instalan por separado; cada uno mantiene su `package-lock.json`. En esta auditoría no se pudieron regenerar los locks ni confirmar un build limpio porque el entorno no podía resolver el registro de npm.

MySQL y n8n son servicios externos, no servicios de Vercel en este proyecto. Debes configurar sus URLs, credenciales y TLS desde Settings → Environment Variables, y volver a desplegar tras los cambios. La lista está en `../.env.vercel.example`.
