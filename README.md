# Nautica Panel v3 — Web Design + Mensajes

Base inspeccionada: `nautica-panel-beta-v2-firebase(2).zip`.
Firebase: proyecto existente `nautica-ca65d`.

## Colecciones / documentos

### `newsletterSubscribers/{email}`
Se conserva la integración existente.

### `siteContent/home`
Fuente de verdad del contenido administrable de `nauticahome.com.mx`.

Campos raíz:
- `globalSettings.facebookUrl`
- `globalSettings.instagramUrl`
- `globalSettings.whatsappUrl`
- `utility.message`
- `utility.contactLabel`
- `footer.copyright`
- `sections.hero`
- `sections.products`
- `sections.about`
- `sections.retailers`
- `sections.inspiration`
- `sections.newsletter`
- `sections.contact`
- `updatedAt`
- `updatedBy`

Cada sección incluye `enabled`. La web pública conserva el HTML actual como fallback si el documento o un campo no existe.

### `contactMessages/{autoId}`
Creado por el formulario público.

Campos de creación:
- `name`
- `email`
- `phone`
- `message`
- `source` = `nauticahome.com.mx`
- `status` = `unread`
- `createdAt`

El panel puede añadir al gestionar:
- `readAt`
- `archivedAt`
- `restoredAt`
- `status` = `read` / `archived`

## Firebase Storage (opcional pero integrado)
El editor acepta URL manual siempre. El botón **Subir** usa el bucket existente y guarda archivos bajo:

`siteContent/home/...`

Publica `storage.rules` si quieres usar upload directo desde el panel. Si Storage no está habilitado, los campos URL siguen funcionando.

## Seguridad
Publica `firestore.rules` de este paquete en el proyecto `nautica-ca65d`.
No hay permisos globales abiertos:
- público: lectura de `siteContent/home`, creación validada de mensajes y flujo existente de newsletter;
- autenticado: gestión de contenido, mensajes y newsletter.

## Deploy
Mantén el flujo Git/cPanel actual de `panel.nauticahome.com.mx`.
