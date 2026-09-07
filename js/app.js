import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";
import {
  firebaseConfig,
  NEWSLETTER_COLLECTION,
  CONTACT_COLLECTION,
  SITE_CONTENT_COLLECTION,
  SITE_CONTENT_HOME_DOC
} from "./firebase-config.js";

const DEFAULT_HOME_CONTENT = {
  globalSettings: {
    facebookUrl: "https://www.facebook.com/profile.php?id=61592101483062",
    instagramUrl: "https://www.instagram.com/nauticahomemexico/",
    whatsappUrl: "https://wa.me/525513004665"
  },
  utility: {
    message: "¡Envíos gratis a CDMX y Área Metropolitana!",
    contactLabel: "Contacto"
  },
  footer: {
    copyright: "© 2026 Nautica Home México"
  },
  sections: {
    hero: {
      enabled: true,
      imageUrl: "",
      useVideo: false,
      videoUrl: ""
    },
    products: {
      enabled: true,
      items: [
        { enabled: true, label: "Indoor", imageUrl: "", link: "#colecciones" },
        { enabled: true, label: "Outdoor", imageUrl: "", link: "#colecciones" },
        { enabled: true, label: "Bedroom", imageUrl: "", link: "#colecciones" },
        { enabled: true, label: "Sanitary", imageUrl: "", link: "#colecciones" },
        { enabled: true, label: "Decor", imageUrl: "", link: "#colecciones" },
        { enabled: true, label: "Lighting", imageUrl: "", link: "#colecciones" }
      ]
    },
    about: {
      enabled: true,
      kicker: "NOSOTROS",
      title: "Inspirados por el mar.\nDiseñados para vivir.",
      paragraph1: "En Nautica Home transformamos los espacios cotidianos en refugios de bienestar, combinando la elegancia costera con un estilo contemporáneo y atemporal.",
      paragraph2: "Cada colección refleja nuestra pasión por los detalles, los materiales de calidad y la creación de ambientes que invitan a disfrutar lo esencial.",
      imageUrl: "",
      ctaLabel: "Explorar colecciones",
      ctaHref: "#colecciones"
    },
    retailers: {
      enabled: true,
      kicker: "DÓNDE ENCONTRARNOS",
      title: "Nautica Home, más cerca de ti",
      copy: "Encuentra nuestras colecciones en tiendas y plataformas seleccionadas, con presencia en los principales puntos de venta del país.",
      items: [
        { enabled: true, name: "Bed Bath & Beyond", logoUrl: "assets/retailers/bed-bath-beyond.png" },
        { enabled: true, name: "Sam's Club", logoUrl: "assets/retailers/sams-club.png" },
        { enabled: true, name: "Costco", logoUrl: "assets/retailers/costco.png" },
        { enabled: true, name: "Liverpool", logoUrl: "assets/retailers/liverpool.png" },
        { enabled: true, name: "Mercado Libre", logoUrl: "assets/retailers/mercado-libre.png" },
        { enabled: true, name: "Amazon", logoUrl: "assets/retailers/amazon.png" },
        { enabled: true, name: "The Home Depot", logoUrl: "assets/retailers/home-depot.png" },
        { enabled: true, name: "City Club", logoUrl: "assets/retailers/city-club.png" }
      ]
    },
    inspiration: {
      enabled: true,
      kicker: "INSPIRACIÓN",
      title: "Espacios que inspiran",
      copy: "Ideas, ambientes y detalles que llevan el espíritu Nautica Home a cada espacio.",
      items: Array.from({ length: 16 }, () => ({ enabled: true, imageUrl: "" }))
    },
    newsletter: {
      enabled: true,
      kicker: "NEWSLETTER",
      title: "Inspírate con\nNautica Home",
      copy: "Recibe novedades, lanzamientos, ideas para tus espacios y nuevas colecciones directamente en tu correo.",
      legal: "Al suscribirte aceptas recibir comunicaciones de Nautica Home.",
      imageUrl: ""
    },
    contact: {
      enabled: true,
      kicker: "CONTACTO",
      title: "Hablemos de\ntu espacio",
      copy: "Cuéntanos qué estás buscando y nuestro equipo te ayudará a encontrar la mejor solución para tu proyecto."
    }
  }
};

const authView = document.querySelector("#authView");
const panelView = document.querySelector("#panelView");
const loginForm = document.querySelector("#loginForm");
const loginButton = document.querySelector("#loginButton");
const loginError = document.querySelector("#loginError");
const logoutButton = document.querySelector("#logoutButton");
const userEmail = document.querySelector("#userEmail");
const viewTitle = document.querySelector("#viewTitle");
const navButtons = Array.from(document.querySelectorAll(".nav-item[data-view]"));
const viewSections = Array.from(document.querySelectorAll("[data-panel-view]"));

const refreshButton = document.querySelector("#refreshButton");
const newsletterBody = document.querySelector("#newsletterBody");
const newsletterMessage = document.querySelector("#newsletterMessage");
const subscriberCount = document.querySelector("#subscriberCount");
const todayCount = document.querySelector("#todayCount");

const messageBadge = document.querySelector("#messageBadge");
const unreadCount = document.querySelector("#unreadCount");
const messageCount = document.querySelector("#messageCount");
const messagesList = document.querySelector("#messagesList");
const messagesMessage = document.querySelector("#messagesMessage");
const messageFilterButtons = Array.from(document.querySelectorAll("[data-message-filter]"));
const messageDrawer = document.querySelector("#messageDrawer");
const messageDrawerBackdrop = document.querySelector("#messageDrawerBackdrop");
const closeMessageDrawer = document.querySelector("#closeMessageDrawer");
const archiveMessageButton = document.querySelector("#archiveMessageButton");
const drawerName = document.querySelector("#drawerName");
const drawerEmail = document.querySelector("#drawerEmail");
const drawerPhone = document.querySelector("#drawerPhone");
const drawerDate = document.querySelector("#drawerDate");
const drawerSource = document.querySelector("#drawerSource");
const drawerMessage = document.querySelector("#drawerMessage");

const webDesignForm = document.querySelector("#webDesignForm");
const saveContentButton = document.querySelector("#saveContentButton");
const contentState = document.querySelector("#contentState");

const isConfigured = !Object.values(firebaseConfig).some((value) => String(value).includes("YOUR_"));
let auth = null;
let db = null;
let storage = null;
let unsubscribeMessages = null;
let messagesCache = [];
let messageFilter = "inbox";
let selectedMessageId = null;
let contentCache = structuredClone(DEFAULT_HOME_CONTENT);

if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      authView.classList.add("is-hidden");
      panelView.classList.remove("is-hidden");
      userEmail.textContent = user.email || "Usuario";
      await Promise.all([loadNewsletter(), loadContent()]);
      startMessagesListener();
    } else {
      stopMessagesListener();
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
    await signInWithEmailAndPassword(auth, document.querySelector("#email").value.trim(), document.querySelector("#password").value);
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

navButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

function setView(view) {
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  viewSections.forEach((section) => section.classList.toggle("is-hidden", section.dataset.panelView !== view));
  viewTitle.textContent = view === "messages" ? "Mensajes" : view === "webdesign" ? "Web Design" : "Newsletter";
}

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
    const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderNewsletter(rows);
    newsletterMessage.textContent = `${rows.length} registro${rows.length === 1 ? "" : "s"}.`;
  } catch (error) {
    console.error(error);
    newsletterBody.innerHTML = `<tr><td colspan="4" class="empty-state">No fue posible cargar la lista.</td></tr>`;
    newsletterMessage.textContent = "Revisa las reglas de Firestore y el nombre de la colección.";
  }
}

function renderNewsletter(rows) {
  subscriberCount.textContent = String(rows.length);
  todayCount.textContent = String(rows.filter((item) => isToday(toDate(item.createdAt))).length);
  if (!rows.length) {
    newsletterBody.innerHTML = `<tr><td colspan="4" class="empty-state">Aún no hay suscriptores.</td></tr>`;
    return;
  }
  newsletterBody.innerHTML = rows.map((item) => `
    <tr>
      <td>${escapeHtml(item.email || "—")}</td>
      <td>${formatDate(toDate(item.createdAt))}</td>
      <td>${escapeHtml(item.source || "Landing")}</td>
      <td><span class="status-pill">${escapeHtml(item.status === "active" ? "Activo" : item.status || "—")}</span></td>
    </tr>
  `).join("");
}

function startMessagesListener() {
  stopMessagesListener();
  if (!db) return;
  const ref = collection(db, CONTACT_COLLECTION);
  const ordered = query(ref, orderBy("createdAt", "desc"));
  unsubscribeMessages = onSnapshot(ordered, (snapshot) => {
    messagesCache = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderMessages();
  }, (error) => {
    console.error(error);
    messagesMessage.textContent = "No fue posible escuchar los mensajes. Revisa las reglas de Firestore.";
  });
}

function stopMessagesListener() {
  if (typeof unsubscribeMessages === "function") unsubscribeMessages();
  unsubscribeMessages = null;
}

messageFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    messageFilter = button.dataset.messageFilter;
    messageFilterButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderMessages();
  });
});

function renderMessages() {
  const unread = messagesCache.filter((item) => item.status === "unread").length;
  unreadCount.textContent = String(unread);
  messageCount.textContent = String(messagesCache.length);
  messageBadge.textContent = String(unread);
  messageBadge.classList.toggle("is-hidden", unread === 0);

  const rows = messagesCache.filter((item) => messageFilter === "archived" ? item.status === "archived" : item.status !== "archived");
  if (!rows.length) {
    messagesList.innerHTML = `<p class="empty-state">${messageFilter === "archived" ? "No hay mensajes archivados." : "No hay mensajes en la bandeja."}</p>`;
    messagesMessage.textContent = "";
    return;
  }

  messagesList.innerHTML = rows.map((item) => {
    const unreadClass = item.status === "unread" ? " is-unread" : "";
    const preview = String(item.message || "").replace(/\s+/g, " ").trim().slice(0, 130);
    return `
      <button class="message-row${unreadClass}" type="button" data-message-id="${escapeHtml(item.id)}">
        <span class="message-row-main">
          <strong>${escapeHtml(item.name || "Sin nombre")}</strong>
          <span>${escapeHtml(item.email || "—")}</span>
          <span class="message-preview">${escapeHtml(preview || "Sin mensaje")}</span>
        </span>
        <span class="message-row-meta">
          ${item.status === "unread" ? '<span class="unread-dot" aria-label="No leído"></span>' : ""}
          <time>${formatDate(toDate(item.createdAt))}</time>
        </span>
      </button>
    `;
  }).join("");

  messagesList.querySelectorAll("[data-message-id]").forEach((button) => {
    button.addEventListener("click", () => openMessage(button.dataset.messageId));
  });
  messagesMessage.textContent = `${rows.length} mensaje${rows.length === 1 ? "" : "s"}.`;
}

async function openMessage(id) {
  const item = messagesCache.find((message) => message.id === id);
  if (!item || !db) return;
  selectedMessageId = id;
  drawerName.textContent = item.name || "Sin nombre";
  drawerEmail.textContent = item.email || "—";
  drawerPhone.textContent = item.phone || "—";
  drawerDate.textContent = formatDate(toDate(item.createdAt));
  drawerSource.textContent = item.source || "—";
  drawerMessage.textContent = item.message || "";
  archiveMessageButton.textContent = item.status === "archived" ? "Volver a bandeja" : "Archivar";
  messageDrawer.classList.remove("is-hidden");
  messageDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");

  if (item.status === "unread") {
    try {
      await updateDoc(doc(db, CONTACT_COLLECTION, id), { status: "read", readAt: serverTimestamp() });
    } catch (error) {
      console.error("Could not mark message as read", error);
    }
  }
}

function closeDrawer() {
  selectedMessageId = null;
  messageDrawer.classList.add("is-hidden");
  messageDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
}

messageDrawerBackdrop.addEventListener("click", closeDrawer);
closeMessageDrawer.addEventListener("click", closeDrawer);

archiveMessageButton.addEventListener("click", async () => {
  if (!selectedMessageId || !db) return;
  const item = messagesCache.find((message) => message.id === selectedMessageId);
  if (!item) return;
  archiveMessageButton.disabled = true;
  try {
    if (item.status === "archived") {
      await updateDoc(doc(db, CONTACT_COLLECTION, selectedMessageId), {
        status: "read",
        restoredAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, CONTACT_COLLECTION, selectedMessageId), {
        status: "archived",
        archivedAt: serverTimestamp()
      });
    }
    closeDrawer();
  } catch (error) {
    console.error(error);
  } finally {
    archiveMessageButton.disabled = false;
  }
});

function renderWebDesignForm(data) {
  contentCache = deepMerge(structuredClone(DEFAULT_HOME_CONTENT), data || {});
  delete contentCache.updatedAt;
  delete contentCache.updatedBy;
  const s = contentCache.sections;
  const g = contentCache.globalSettings;
  const u = contentCache.utility;
  const f = contentCache.footer;

  webDesignForm.innerHTML = [
    editorSection("Global / Footer", "global", [
      textField("Mensaje barra superior", "utility.message", u.message),
      textField("Label Contacto", "utility.contactLabel", u.contactLabel),
      textField("Facebook URL", "globalSettings.facebookUrl", g.facebookUrl),
      textField("Instagram URL", "globalSettings.instagramUrl", g.instagramUrl),
      textField("WhatsApp URL", "globalSettings.whatsappUrl", g.whatsappUrl),
      textField("Copyright footer", "footer.copyright", f.copyright)
    ]),
    editorSection("Hero", "hero", [
      toggleField("Sección activa", "sections.hero.enabled", s.hero.enabled),
      imageField("Imagen del hero", "sections.hero.imageUrl", s.hero.imageUrl, "hero"),
      toggleField("Usar video", "sections.hero.useVideo", s.hero.useVideo),
      imageField("URL / video del hero", "sections.hero.videoUrl", s.hero.videoUrl, "hero-video", "video/*")
    ]),
    editorSection("Productos / Categorías", "products", [
      toggleField("Sección activa", "sections.products.enabled", s.products.enabled),
      ...s.products.items.flatMap((item, index) => [
        `<div class="editor-subheading">Categoría ${index + 1}</div>`,
        toggleField("Activa", `sections.products.items.${index}.enabled`, item.enabled),
        textField("Nombre", `sections.products.items.${index}.label`, item.label),
        imageField("Imagen", `sections.products.items.${index}.imageUrl`, item.imageUrl, `products-${index}`),
        textField("Link", `sections.products.items.${index}.link`, item.link)
      ])
    ]),
    editorSection("Nosotros", "about", [
      toggleField("Sección activa", "sections.about.enabled", s.about.enabled),
      textField("Eyebrow", "sections.about.kicker", s.about.kicker),
      textareaField("Título", "sections.about.title", s.about.title),
      textareaField("Párrafo 1", "sections.about.paragraph1", s.about.paragraph1),
      textareaField("Párrafo 2", "sections.about.paragraph2", s.about.paragraph2),
      imageField("Imagen", "sections.about.imageUrl", s.about.imageUrl, "about"),
      textField("CTA", "sections.about.ctaLabel", s.about.ctaLabel),
      textField("Link CTA", "sections.about.ctaHref", s.about.ctaHref)
    ]),
    editorSection("Tiendas", "retailers", [
      toggleField("Sección activa", "sections.retailers.enabled", s.retailers.enabled),
      textField("Eyebrow", "sections.retailers.kicker", s.retailers.kicker),
      textField("Título", "sections.retailers.title", s.retailers.title),
      textareaField("Descripción", "sections.retailers.copy", s.retailers.copy),
      ...s.retailers.items.flatMap((item, index) => [
        `<div class="editor-subheading">Tienda ${index + 1}</div>`,
        toggleField("Activa", `sections.retailers.items.${index}.enabled`, item.enabled),
        textField("Nombre", `sections.retailers.items.${index}.name`, item.name),
        imageField("Logo", `sections.retailers.items.${index}.logoUrl`, item.logoUrl, `retailer-${index}`)
      ])
    ]),
    editorSection("Inspiración", "inspiration", [
      toggleField("Sección activa", "sections.inspiration.enabled", s.inspiration.enabled),
      textField("Eyebrow", "sections.inspiration.kicker", s.inspiration.kicker),
      textField("Título", "sections.inspiration.title", s.inspiration.title),
      textareaField("Descripción", "sections.inspiration.copy", s.inspiration.copy),
      ...s.inspiration.items.flatMap((item, index) => [
        `<div class="editor-subheading">Imagen ${index + 1}</div>`,
        toggleField("Activa", `sections.inspiration.items.${index}.enabled`, item.enabled),
        imageField("Imagen", `sections.inspiration.items.${index}.imageUrl`, item.imageUrl, `inspiration-${index}`)
      ])
    ]),
    editorSection("Newsletter", "newsletter", [
      toggleField("Sección activa", "sections.newsletter.enabled", s.newsletter.enabled),
      textField("Eyebrow", "sections.newsletter.kicker", s.newsletter.kicker),
      textareaField("Título", "sections.newsletter.title", s.newsletter.title),
      textareaField("Descripción", "sections.newsletter.copy", s.newsletter.copy),
      textareaField("Texto legal", "sections.newsletter.legal", s.newsletter.legal),
      imageField("Imagen", "sections.newsletter.imageUrl", s.newsletter.imageUrl, "newsletter")
    ]),
    editorSection("Contacto", "contact", [
      toggleField("Sección activa", "sections.contact.enabled", s.contact.enabled),
      textField("Eyebrow", "sections.contact.kicker", s.contact.kicker),
      textareaField("Título", "sections.contact.title", s.contact.title),
      textareaField("Descripción", "sections.contact.copy", s.contact.copy)
    ])
  ].join("");

  webDesignForm.querySelectorAll("[data-upload-button]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.closest(".image-field")?.querySelector("input[type='file']");
      field?.click();
    });
  });
  webDesignForm.querySelectorAll("input[type='file'][data-upload-path]").forEach((input) => {
    input.addEventListener("change", () => uploadAsset(input));
  });
}

function editorSection(title, key, fields) {
  return `<details class="editor-section" open>
    <summary><span>${escapeHtml(title)}</span><span class="summary-hint">Editar</span></summary>
    <div class="editor-grid" data-editor-section="${escapeHtml(key)}">${fields.join("")}</div>
  </details>`;
}

function textField(label, path, value) {
  return `<label class="editor-field"><span>${escapeHtml(label)}</span><input type="text" data-path="${escapeHtml(path)}" value="${escapeAttr(value ?? "")}" /></label>`;
}

function textareaField(label, path, value) {
  return `<label class="editor-field editor-field-wide"><span>${escapeHtml(label)}</span><textarea rows="3" data-path="${escapeHtml(path)}">${escapeHtml(value ?? "")}</textarea></label>`;
}

function toggleField(label, path, value) {
  return `<label class="editor-toggle"><input type="checkbox" data-path="${escapeHtml(path)}" ${value !== false ? "checked" : ""} /><span>${escapeHtml(label)}</span></label>`;
}

function imageField(label, path, value, uploadKey, accept = "image/*") {
  return `<div class="editor-field editor-field-wide image-field">
    <span>${escapeHtml(label)}</span>
    <div class="image-input-row">
      <input type="url" data-path="${escapeHtml(path)}" value="${escapeAttr(value ?? "")}" placeholder="https://… o assets/…" />
      <button class="secondary-button compact" type="button" data-upload-button>Subir</button>
      <input class="file-input" type="file" accept="${escapeAttr(accept)}" data-upload-path="${escapeHtml(path)}" data-upload-key="${escapeHtml(uploadKey)}" />
    </div>
    <small>URL pública o asset relativo. “Subir” usa Firebase Storage si está habilitado.</small>
  </div>`;
}

async function loadContent() {
  if (!db) return;
  contentState.textContent = "Cargando…";
  try {
    const snapshot = await getDoc(doc(db, SITE_CONTENT_COLLECTION, SITE_CONTENT_HOME_DOC));
    if (snapshot.exists()) {
      renderWebDesignForm(snapshot.data());
      contentState.textContent = "Contenido sincronizado";
    } else {
      renderWebDesignForm(DEFAULT_HOME_CONTENT);
      contentState.textContent = "Usando fallbacks actuales · guarda para crear siteContent/home";
    }
  } catch (error) {
    console.error(error);
    renderWebDesignForm(DEFAULT_HOME_CONTENT);
    contentState.textContent = "No se pudo leer Firestore · mostrando fallbacks";
    contentState.classList.add("error");
  }
}

saveContentButton.addEventListener("click", async () => {
  if (!db) return;
  saveContentButton.disabled = true;
  contentState.classList.remove("error", "success");
  contentState.textContent = "Guardando…";
  try {
    const data = collectEditorData();
    data.updatedAt = serverTimestamp();
    data.updatedBy = auth?.currentUser?.email || "authenticated-user";
    await setDoc(doc(db, SITE_CONTENT_COLLECTION, SITE_CONTENT_HOME_DOC), data, { merge: false });
    contentCache = data;
    contentState.textContent = "Guardado correctamente";
    contentState.classList.add("success");
  } catch (error) {
    console.error(error);
    contentState.textContent = "Error al guardar. Revisa permisos y conexión.";
    contentState.classList.add("error");
  } finally {
    saveContentButton.disabled = false;
  }
});

function collectEditorData() {
  const data = structuredClone(contentCache || DEFAULT_HOME_CONTENT);
  webDesignForm.querySelectorAll("[data-path]").forEach((field) => {
    const value = field.type === "checkbox" ? field.checked : field.value;
    setByPath(data, field.dataset.path, value);
  });
  delete data.updatedAt;
  delete data.updatedBy;
  return data;
}

async function uploadAsset(input) {
  const file = input.files?.[0];
  if (!file || !storage) return;
  const path = input.dataset.uploadPath;
  const key = input.dataset.uploadKey || "asset";
  const urlInput = input.closest(".image-field")?.querySelector(`[data-path="${CSS.escape(path)}"]`);
  const section = input.closest(".editor-section");
  const oldHint = section?.querySelector(".summary-hint");
  if (oldHint) oldHint.textContent = "Subiendo…";
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100);
    const ref = storageRef(storage, `siteContent/home/${key}/${Date.now()}-${safeName}`);
    await uploadBytes(ref, file, { contentType: file.type || undefined });
    const url = await getDownloadURL(ref);
    if (urlInput) {
      urlInput.value = url;
      urlInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (oldHint) oldHint.textContent = "Subido";
  } catch (error) {
    console.error("Storage upload failed", error);
    if (oldHint) oldHint.textContent = "Error de upload";
    alert("No fue posible subir el archivo. Puedes pegar una URL manualmente o revisar Firebase Storage.");
  } finally {
    input.value = "";
    setTimeout(() => { if (oldHint) oldHint.textContent = "Editar"; }, 1600);
  }
}

function setByPath(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
    cursor = cursor[part];
    if (cursor == null) return;
  }
  const last = /^\d+$/.test(parts.at(-1)) ? Number(parts.at(-1)) : parts.at(-1);
  cursor[last] = value;
}

function deepMerge(base, incoming) {
  if (Array.isArray(base)) {
    if (!Array.isArray(incoming)) return base;
    return base.map((item, index) => deepMerge(item, incoming[index])).concat(incoming.slice(base.length));
  }
  if (base && typeof base === "object") {
    const out = { ...base };
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return out;
    Object.keys(incoming).forEach((key) => {
      out[key] = key in base ? deepMerge(base[key], incoming[key]) : incoming[key];
    });
    return out;
  }
  return incoming === undefined ? base : incoming;
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
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function authErrorMessage(code = "") {
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Correo o contraseña incorrectos.";
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

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
