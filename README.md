# Nautica Panel v7 — Productos + Web Design + Mensajes + cPanel Assets

Base real de esta versión: `nautica-panel-main(1).zip` (continuidad directa de v6).
Firebase existente: `nautica-ca65d`.

## Contenido y mensajes
Se conserva sin cambios de esquema:
- `newsletterSubscribers/{email}`
- `siteContent/home`
- `contactMessages/{autoId}`

La URL almacenada en los campos `imageUrl`, `logoUrl` y `videoUrl` de `siteContent/home` sigue siendo la fuente de verdad para Nautica Home.

## Nuevo storage de imágenes en cPanel
Las nuevas subidas de Web Design ya no usan Firebase Storage.

Endpoints:
- `api/upload-website-asset.php`
- `api/delete-website-asset.php`
- helper privado: `api/_asset-common.php`

Configuración central en `api/_asset-common.php`:

```php
define('ASSET_PHYSICAL_BASE', getenv('NAUTICA_ASSET_PHYSICAL_BASE') ?: '/home/gyu5la0fbzjq/public_html/assets-nautica');
define('ASSET_PUBLIC_BASE', getenv('NAUTICA_ASSET_PUBLIC_BASE') ?: 'https://assets.nauticahome.com.mx');
```

Si el Document Root real de `assets.nauticahome.com.mx` es diferente, cambia SOLO `ASSET_PHYSICAL_BASE` antes del deploy.

Estructura creada automáticamente al subir:
- `home/hero/`
- `home/products/`
- `home/about/`
- `home/stores/`
- `home/inspiration/`
- `home/newsletter/`
- `home/contact/`
- `home/catalog-products/`

## Flujo seguro de reemplazo
1. El Panel obtiene un Firebase ID token del usuario autenticado.
2. El endpoint verifica el token con Firebase Auth.
3. Se valida MIME real y tamaño.
4. Se guarda el nuevo archivo en cPanel con nombre único.
5. El endpoint devuelve la URL pública.
6. El Panel actualiza únicamente ese campo en `siteContent/home`.
7. Solo después de confirmar Firestore, solicita borrar la URL anterior.
8. El endpoint de borrado vuelve a revisar `siteContent/home` y `catalogProductOverrides` usando el token autenticado y no borra si la URL todavía está referenciada.

Si falla la subida o Firestore, la imagen anterior se conserva.
Las URLs antiguas/locales previas a v4 nunca se borran automáticamente porque el endpoint solo acepta URLs bajo `https://assets.nauticahome.com.mx/`.

## Seguridad
El backend nunca acepta rutas físicas desde el navegador.
Para borrar valida:
- dominio `ASSET_PUBLIC_BASE`;
- ausencia de `../`;
- resolución física dentro de `ASSET_PHYSICAL_BASE`;
- sesión Firebase válida;
- ausencia de referencias activas en `siteContent/home` o `catalogProductOverrides`.

Formatos soportados:
- JPG/JPEG
- PNG
- WebP
- GIF
- MP4/WebM para el campo de video ya existente

Límites:
- imágenes: 20 MB
- video: 150 MB

Opcionalmente puedes definir `NAUTICA_ADMIN_EMAILS` en el hosting como lista separada por comas para limitar los endpoints a emails específicos. Si no se define, se mantiene el mismo criterio actual del Panel/Firestore: usuario Firebase autenticado.

## Paso manual de hosting
Crear/configurar el subdominio:

`assets.nauticahome.com.mx`

con Document Root recomendado:

`/home/gyu5la0fbzjq/public_html/assets-nautica`

Confirma que PHP ejecutado bajo el usuario de cPanel tenga permiso de escritura sobre esa carpeta.

## Deploy
`.cpanel.yml` ahora despliega también `api/`.
No existe ningún comando que borre `/public_html/assets-nautica`; el storage persistente queda completamente separado del repositorio.

## v5 - cPanel upload reliability fix

- Keeps cPanel as the persistent Web Design asset storage.
- Adds authenticated `api/asset-health.php` preflight so upload failures show an explicit error instead of remaining on "Subiendo...".
- Supports Firebase token transport through `Authorization`, `X-Firebase-Token`, and multipart fallback for shared-hosting/CGI configurations that strip the standard Authorization header.
- Adds browser-side timeouts for health, upload, and delete requests.
- Does not change Firestore content paths or the public asset URL format.


## v6 — interfaz Casa Glick + contenido rotativo

- Web Design adopta el lenguaje visual y los accordions cerrados por defecto de Casa Glick Panel.
- Se conserva sin cambios la autenticación Firebase, Firestore, endpoints PHP y storage persistente en cPanel.
- Barra superior: soporta múltiples mensajes activos y `rotationSeconds`.
- Hero: soporta múltiples banners, cada uno con imagen desktop, imagen móvil y alt text.
- Cada sección incluye Reset para volver a los fallbacks de la versión estable antes de guardar.
- Los campos de imagen muestran el tamaño recomendado dentro del editor.
- El uploader y la eliminación segura siguen usando `api/upload-website-asset.php` y `api/delete-website-asset.php`.

## v7 — Productos · Segel ERP + Firebase overrides

La pestaña **Productos** queda habilitada sobre la arquitectura existente del Panel.

- Fuente de inventario: `https://segel-erp.vercel.app/api/catalogo` mediante GET directo, sin credenciales privadas en frontend.
- Normalización centralizada: `js/inventory-api.js`.
- SKU/código: se resuelve desde `codigo`, `code`, `sku`, `clave`, `idProducto`, `productId` o `id`, conservando el valor real en `code` y el payload original en memoria (`raw`).
- Stock: siempre se obtiene del payload de API; el Panel no permite editarlo. UI: Disponible (>4), Poco stock (1–4), Agotado (<=0).
- Precio base: siempre se obtiene de API. Una promoción editorial puede guardarse por separado como override.
- Overrides Firestore: `catalogProductOverrides/{encodeURIComponent(code)}`. Cada documento conserva además `code` exacto para mantener el SKU real de punta a punta.
- Campos override: `customName`, `customDescription`, `customCategory`, `customSubcategory`, `promoPrice`, `imageUrl`, `imageAlt`, `hidden`, `featured`.
- Las imágenes personalizadas siguen el flujo cPanel existente y se publican bajo `https://assets.nauticahome.com.mx/home/catalog-products/`.
- `api/delete-website-asset.php` conserva una imagen si sigue referenciada por `siteContent/home` o por algún documento de `catalogProductOverrides`.
- La tabla usa búsqueda local, filtros, stock-priority sorting y paginación de 50 productos.
- No se guarda una copia del catálogo API en Firestore.

Para activar los overrides en producción, publicar también el bloque `catalogProductOverrides` incluido en `firestore.rules`.
