import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig, NEWSLETTER_COLLECTION } from "./firebase-config.js";

const authView = document.querySelector("#authView");
const panelView = document.querySelector("#panelView");
const loginForm = document.querySelector("#loginForm");
const loginButton = document.querySelector("#loginButton");
const loginError = document.querySelector("#loginError");
const logoutButton = document.querySelector("#logoutButton");
const refreshButton = document.querySelector("#refreshButton");
const newsletterBody = document.querySelector("#newsletterBody");
const newsletterMessage = document.querySelector("#newsletterMessage");
const subscriberCount = document.querySelector("#subscriberCount");
const todayCount = document.querySelector("#todayCount");
const userEmail = document.querySelector("#userEmail");

const isConfigured = !Object.values(firebaseConfig).some((value) => String(value).includes("YOUR_"));

let auth = null;
let db = null;

if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      authView.classList.add("is-hidden");
      panelView.classList.remove("is-hidden");
      userEmail.textContent = user.email || "Usuario";
      await loadNewsletter();
    } else {
      panelView.classList.add("is-hidden");
      authView.classList.remove("is-hidden");
      userEmail.textContent = "—";
    }
  });
} else {
  loginError.textContent = "Falta configurar Firebase en js/firebase-config.js";
  loginButton.disabled = true;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!auth) return;

  loginError.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Ingresando…";

  try {
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    loginError.textContent = authErrorMessage(error?.code);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Iniciar sesión";
  }
});

logoutButton.addEventListener("click", async () => {
  if (auth) await signOut(auth);
});

refreshButton.addEventListener("click", loadNewsletter);

async function loadNewsletter() {
  if (!db) return;
  newsletterMessage.textContent = "Actualizando…";

  try {
    const ref = collection(db, NEWSLETTER_COLLECTION);
    let snapshot;

    try {
      snapshot = await getDocs(query(ref, orderBy("createdAt", "desc")));
    } catch {
      snapshot = await getDocs(ref);
    }

    const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderNewsletter(rows);
    newsletterMessage.textContent = `${rows.length} registro${rows.length === 1 ? "" : "s"}.`;
  } catch (error) {
    console.error(error);
    newsletterBody.innerHTML = `
      <tr><td colspan="4" class="empty-state">No fue posible cargar la lista.</td></tr>
    `;
    newsletterMessage.textContent = "Revisa las reglas de Firestore y el nombre de la colección.";
  }
}

function renderNewsletter(rows) {
  subscriberCount.textContent = String(rows.length);
  todayCount.textContent = String(rows.filter((item) => isToday(toDate(item.createdAt))).length);

  if (!rows.length) {
    newsletterBody.innerHTML = `
      <tr><td colspan="4" class="empty-state">Aún no hay suscriptores.</td></tr>
    `;
    return;
  }

  newsletterBody.innerHTML = rows.map((item) => {
    const email = escapeHtml(item.email || "—");
    const date = formatDate(toDate(item.createdAt));
    const source = escapeHtml(item.source || "Landing");
    const status = escapeHtml(item.status || "active");

    return `
      <tr>
        <td>${email}</td>
        <td>${date}</td>
        <td>${source}</td>
        <td><span class="status-pill">${status === "active" ? "Activo" : status}</span></td>
      </tr>
    `;
  }).join("");
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function isToday(date) {
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function authErrorMessage(code = "") {
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Correo o contraseña incorrectos.";
  }
  if (code.includes("too-many-requests")) return "Demasiados intentos. Intenta nuevamente más tarde.";
  if (code.includes("network-request-failed")) return "No hay conexión con Firebase.";
  return "No fue posible iniciar sesión.";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
