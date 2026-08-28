# Nautica Panel Beta v2

Primera beta funcional del panel administrativo de Nautica Home.

## Incluye
- Firebase Authentication con email/password.
- Sesion persistente mediante Firebase Auth.
- Modulo Newsletter conectado a Firestore.
- Coleccion esperada: `newsletterSubscribers`.
- Contadores de suscriptores totales y altas del dia.
- Archivo `firestore.rules` con una base de reglas para la beta.
- Estructura preparada para Productos, Ventas, Leads y Contacto.

## Firebase
El proyecto ya esta configurado en `js/firebase-config.js` para `nautica-ca65d`.

En Firebase Console confirma:
1. Authentication > Sign-in method > Email/Password habilitado.
2. El usuario administrador creado en Authentication > Users.
3. Firestore Database creada.
4. Publicar las reglas incluidas en `firestore.rules`.

## Estructura de Newsletter
Cada documento de `newsletterSubscribers` puede usar:

- `email`: string
- `createdAt`: Firestore Timestamp
- `source`: string, recomendado `Landing`
- `status`: string, actualmente `active`

El landing podra escribir documentos nuevos sin iniciar sesion. La lectura de la lista queda limitada a usuarios autenticados del panel.

## Desarrollo local
Al usar ES modules, abrir mediante un servidor HTTP local en lugar de `file://`.
Ejemplos: VS Code Live Server, `python3 -m http.server`, GitHub Pages o hosting web.
