# Nautica Panel v10.2

Basado en el paquete v10.1 ya probado. Solo cambia Lista de espera y la versión de caché del script.

- Estado efectivo `unsubscribed` mostrado como **Baja de usuario**.
- Enviar y Volver a enviar deshabilitados para bajas individuales/globales.
- Lectura de `waitlistEmailPreferences` al actualizar, con reglas adicionales incluidas en el paquete de integración.
- Fallo al leer preferencias conserva registros visibles y bloquea envío hasta actualizar.
- El backend es la autoridad final; se refleja su rechazo por baja en la tabla.
- Sin cambios de estilo, modos, credenciales, reglas originales ni otros módulos.

Requiere instalar primero las reglas y el backend del paquete de correo y bajas. Seguir `LEEME-INSTALACION.md` de la entrega. El antiguo `firestore.rules` incluido es una referencia conservada; no usarlo para reemplazar las reglas vigentes.

Pruebas locales: `node --test tests/waitlist.test.cjs` (22 casos). La integración real con Firebase/Brevo se valida después del deploy.
