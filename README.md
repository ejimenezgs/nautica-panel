# Nautica Panel v10 — Productos + Web Design + Mensajes + cPanel Assets

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

## v8 · Productos / configuración de API

- La URL del catálogo ahora se puede editar desde **Configuración**, igual que en la referencia funcional de Casa Glick Panel, pero usando el endpoint de Nautica/Segel ERP.
- La configuración se guarda en `catalogSettings/admin` y requiere reglas autenticadas.
- El endpoint predeterminado es `https://segel-erp.vercel.app/api/catalogo`.
- Productos carga primero la API y después los overrides. Si Firestore no permite leer `catalogProductOverrides`, el inventario sigue visible y se muestra una advertencia en lugar de bloquear toda la pestaña.
- `firestore.rules` incluye permisos autenticados para `catalogProductOverrides` y `catalogSettings`.
- El contador textual de Newsletter quedó centrado y con mayor padding vertical.

## v9 — Visibilidad directa de productos

- La columna Estado ahora usa un toggle individual por producto, igual al flujo de Casa Glick Panel.
- El encabezado Estado incluye un toggle master que activa/desactiva la visibilidad de todo el catálogo cargado.
- Los cambios guardan exclusivamente el override `hidden` en `catalogProductOverrides`; SKU, precio y stock continúan viniendo de Segel ERP.
- El toggle master soporta estado intermedio cuando solo una parte del catálogo está visible y usa batches de Firestore para catálogos grandes.

## v10 — Categorías y subcategorías de Productos

- Productos deja de depender de una categoría plana y pasa a una taxonomía reutilizable por Panel/Home/Shop: `Categoría -> Subcategoría -> Producto`.
- Categorías principales: `Indoor`, `Outdoor`, `Decoración`, `Baño`; cuando no existe evidencia suficiente se usa `Sin clasificar`.
- La clasificación está centralizada en `js/product-classification.js` y nunca modifica el payload original de Segel ERP.
- Prioridad: override manual -> campos explícitos de API -> nombre -> descripción/tags como último fallback.
- El clasificador inspecciona campos explícitos del payload como `categoria/category`, `subcategoria/subcategory`, `familia/family`, `linea/line`, `grupo/group`, `rubro`, `clasificacion/classification` y `tipo/productType`, incluso cuando aparecen anidados.
- En el catálogo actual aparecen rutas descriptivas compuestas (por ejemplo valores tipo `Decor / Side Table / Accent Table`), por lo que se preserva la señal explícita completa y se evalúa antes de inferir por nombre.
- Subcategorías implementadas:
  - Indoor: Sofás, Sillones, Sillas, Bancos, Mesas de comedor, Mesas de centro, Mesas auxiliares, Comedores, Recámaras, Camas, Mesas de noche, Buffets y consolas, Escritorios, Bares, Otros.
  - Outdoor: Salas exteriores, Sillas exteriores, Mesas exteriores, Camastros, Comedores exteriores, Bancos exteriores, Otros.
  - Decoración: Accesorios, Espejos, Lámparas, Cuadros, Mesas decorativas, Objetos decorativos, Otros.
  - Baño: Lavabos, Grifería, Regaderas, Accesorios de baño, Muebles de baño, Otros.
- El filtro de Productos es jerárquico, muestra contadores por categoría/subcategoría y conserva búsqueda, estado, paginación y orden por stock.
- El editor muestra categoría/subcategoría original de API, clasificación automática y clasificación final; los overrides se seleccionan con selects dependientes.
- Overrides canónicos: `categoryOverride` y `subcategoryOverride`. Por compatibilidad con la versión pública existente también se mantienen sincronizados `customCategory` y `customSubcategory`.
- No cambia SKU, stock, precio, imágenes, Auth, Newsletter, Web Design, assets, endpoints ni deploy.
