# Nautica Panel v10.1 — Lista de espera

Fecha: 16 de octubre de 2026 (Ciudad de México).
Base: nautica-panel-v10-brevo-waitlist.zip entregado por el usuario.
Este paquete no se ha desplegado. No se enviaron correos ni se modificó Firebase durante la validación.

## Diagnóstico y evidencia

1. En v10, el texto exacto `Error: Load failed` procede del catch de `sendWaitlistEmail`, que escribe `Error: ` + error.message en `waitlistMessage`. La carga de Firestore escribe un mensaje distinto (`Error al cargar solicitudes: ...`). El mensaje de envío comparte el mismo párrafo que el estado de carga.
2. En la sesión real de Safari se observó ese texto y dos filas en la tabla. El navegador mostraba el panel como `No seguro`. Al pulsar Actualizar en la versión original se leyeron dos solicitudes y desapareció el error. Se confirma que la lectura autenticada de Firestore funciona en esa sesión.
3. El panel real responde 200 a HTTP, sin redirigir a HTTPS. Su directorio en cPanel no contiene .htaccess (se mostraban archivos ocultos como .well-known).
4. Prueba real de preflight a `https://www.nauticahome.com.mx/api/brevo/send-waitlist.php`, con `Origin: http://panel.nauticahome.com.mx`: HTTP 403 y `Origen no autorizado.`. No autoriza el origen con CORS. Desde `Origin: https://panel.nauticahome.com.mx`: HTTP 204 y Access-Control-Allow-Origin correcto. Esto demuestra un fallo de compatibilidad entre el origen HTTP del panel y la política HTTPS del backend, capaz de causar el TypeError de red de Safari. No se realizó el POST fallido original; no se atribuye retrospectivamente cada aviso a una única petición. La ausencia previa de DNS de la web también podía impedir ese fetch, pero ya fue reparada fuera de este ZIP.
5. El archivo público app.js del panel tiene la misma lógica de Lista de espera que el ZIP. Al abrir ese módulo solo se consulta `productWaitlist` mediante Firebase SDK. No hay peticiones a Brevo durante la carga. El buscador v10 repite getDocs por cada pulsación y permite respuestas fuera de orden.
6. El arranque general inicia Firebase Auth y, al recuperar usuario, carga Newsletter, contenido, configuración de catálogo y modos; luego inicia el listener de mensajes. Ninguna de esas operaciones invoca la función de envío de Lista de espera. Se conservaron.
7. La URL sin www original responde correctamente a OPTIONS desde HTTPS. Se cambia a www para ajustarse al contrato solicitado, no porque se haya demostrado que el alias sin www esté roto.

Conclusión: no se encontró un fallo de Firestore que explique el texto exacto. Se comprobó un rechazo CORS para el panel HTTP y una gestión de mensajes que confundía un fallo de envío con la carga de la tabla. El error histórico no apareció durante la recarga real realizada en esta revisión. No hay evidencia de que v10 envíe correos al abrirse.

## Cambios mínimos

- `.htaccess` nuevo: redirige HTTP al origen fijo `https://panel.nauticahome.com.mx`, conservando ruta y query string; no amplía CORS.
- `.cpanel.yml`: añade únicamente la copia de .htaccess al despliegue existente. Los comandos originales del proyecto se conservan; no se ejecutaron.
- `index.html`: añade feedback independiente de envío (oculto hasta utilizarse, con los estilos existentes) y cambia la versión del script a `v=10.1` para evitar caché antigua.
- `js/app.js`: cambios limitados al módulo Lista de espera y a limpiar sus datos al cerrar sesión. Búsqueda local sobre el último resultado; Actualizar consulta Firestore; una respuesta antigua no sustituye la más reciente; los errores de actualización conservan las filas disponibles; feedback de envío separado; control del UID administrador y del origen HTTPS; una petición POST por envío manual confirmado, sin reintentos automáticos. Un correo aceptado seguido de fallo de lectura se informa como aceptado y se pide actualizar antes de reenviar.
- Las etiquetas pending/sent/visited y la etiqueta heredada notified se conservan. No se migran estados ni se escribe en Firestore desde el frontend de este módulo. La compatibilidad del estado heredado `notified` depende del backend existente y no se ha probado un reenvío real para ese estado.
- No se modifican backend de Brevo, enlaces de seguimiento, usuario técnico, credenciales, configuración Firebase, reglas, CSS ni lógica de Productos, Newsletter, Web Design o Configuración/modos.

## Validación ejecutada

- 18 pruebas automatizadas con DOM, Firebase y fetch simulados: `node --test tests/waitlist.test.cjs`.
- Casos: abrir/actualizar sin POST; búsqueda sin red; fallo de lectura con conservación de datos; recuperación; respuestas fuera de orden; permisos denegados; usuario no autorizado; cierre de sesión durante lectura/token; etiquetas y acciones pending/sent/visited; envío con Bearer e ID correcto a www; cancelación; bloqueo del origen HTTP; fallo de red sin reintentos; error de backend; aceptación del envío con fallo posterior de Firestore; bloqueo de doble clic incluso después de filtrar; ID documental no reemplazable por datos; render como texto; inclusión de redirección y cache busting.
- Sintaxis de todos los archivos JS comprobada con `node --input-type=module --check`.
- HTML: IDs únicos y referencias locales a scripts válidas.
- Comparación byte a byte con el ZIP original: solo cambian js/app.js, index.html y .cpanel.yml; se añaden .htaccess, este informe y tests/waitlist.test.cjs. Todos los demás archivos originales se conservan.
- Producción, solo lectura: comprobada carga original de dos registros y preflights CORS HTTPS 204 / HTTP 403. No se imprimen claves privadas en el informe.
- PHP no se cambió. No había intérprete PHP local para lint; el endpoint real respondió con PHP 8.2.33 en las comprobaciones previas.

Las pruebas simuladas validan el código corregido; no equivalen a validar el nuevo paquete desplegado ni la entrega de un correo real.

## Despliegue y pruebas pendientes

1. Guardar una copia del panel actual. Mantener fuera del directorio público las credenciales del backend, tal como están.
2. Descomprimir el ZIP y colocar el CONTENIDO de `nautica-panel-main/` en la raíz del repositorio del panel. No anidar otra carpeta con ese nombre. Conservar archivos ocultos .cpanel.yml y .htaccess.
3. Desplegar con el flujo habitual Git/cPanel del panel. Este paquete no requiere publicar reglas Firebase ni desplegar Nautica Web; el backend de Web v41 sigue siendo externo y no forma parte del ZIP del panel.
4. Verificar que `http://panel.nauticahome.com.mx/` devuelve 301 hacia HTTPS y que HTTPS responde 200 sin bucles. Si alguien crea otro .htaccess antes del despliegue, conciliar sus reglas en lugar de perderlas.
5. Entrar a HTTPS e iniciar sesión con el administrador autorizado. HTTP y HTTPS pueden mantener sesiones de navegador distintas; la redirección no transfiere tokens de HTTP.
6. Abrir Lista de espera, buscar por SKU/producto/correo, limpiar búsqueda y pulsar Actualizar. Revisar que la apertura y búsqueda no generen POST al backend Brevo. La búsqueda no debe generar nuevas lecturas Firestore.
7. Con un registro de prueba y autorización explícita de envío, probar Enviar email y luego Volver a enviar; comprobar en Brevo la aceptación/entrega y en Firestore el estado sent. Seguir el enlace Ver producto de ese correo y comprobar visited. Este flujo real NO se ejecutó durante esta entrega porque produce correos y cambios de datos.
8. Verificar en esa prueba el usuario técnico backend@nauticahome.com.mx y sus permisos efectivos; la mera carga de la tabla y el preflight no los validan.
9. Validar una interrupción de red en el navegador después de cargar datos: la tabla disponible debe conservarse y un error de envío debe quedar separado del estado de carga. No reenviar sin revisar un envío de resultado incierto.

No se afirma que la incidencia esté resuelta en producción antes de desplegar y completar estas pruebas.
