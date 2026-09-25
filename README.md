# El-Tradicional

App de pedidos de El Tradicional (cocina típica, Envigado): app del cliente y panel del dueño.

- `app/` — la aplicación (React + Vite, PWA). Cliente en `/`, panel del dueño en `/admin`.
  - `npm install`, `npm run dev`, `npm test`, `npm run build`.
  - Sin variables de entorno funciona en el navegador (las pestañas se sincronizan en el mismo equipo).
    Con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` usa Supabase; ver `app/supabase/schema.sql` para configurarlo.
- `project/` y `chats/` — el diseño original exportado de Claude Design y sus conversaciones (ver `HANDOFF.md`).
