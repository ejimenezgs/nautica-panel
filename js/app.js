import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {
  firebaseConfig,
  NEWSLETTER_COLLECTION,
  CONTACT_COLLECTION,
  SITE_CONTENT_COLLECTION,
  SITE_CONTENT_HOME_DOC,
  PRODUCT_OVERRIDES_COLLECTION,
  CATALOG_SETTINGS_COLLECTION,
  CATALOG_SETTINGS_DOC
} from "./firebase-config.js";
import {
  INVENTORY_API_URL,
  fetchInventoryProducts
} from "./inventory-api.js";
import {
  PRODUCT_TAXONOMY,
  classifyProduct,
  taxonomySubcategories
} from "./product-classification.js";

const DEFAULT_HOME_CONTENT = {
  globalSettings: {
    facebookUrl: "https://www.facebook.com/profile.php?id=61592101483062",
    instagramUrl: "https://www.instagram.com/nauticahomemexico/",
    whatsappUrl: "https://wa.me/525513004665"
  },
  utility: {
    message: "¡Envíos gratis a CDMX y Área Metropolitana!",
    messages: [
      { enabled: true, text: "¡Envíos gratis a CDMX y Área Metropolitana!" }
    ],
    rotationSeconds: 5,
    contactLabel: "Contacto"
  },
  footer: {
    copyright: "© 2026 Nautica Home México"
  },
  sections: {
    hero: {
      enabled: true,
      rotationSeconds: 6,
      categories: [
        { key: "indoor", label: "INTERIOR", enabled: true, imageUrl: "", mobileImageUrl: "", useVideo: false, videoUrl: "", mobileVideoUrl: "", alt: "Nautica Home Interior" },
        { key: "outdoor", label: "EXTERIOR", enabled: true, imageUrl: "", mobileImageUrl: "", useVideo: false, videoUrl: "", mobileVideoUrl: "", alt: "Nautica Home Exterior" },
        { key: "decor", label: "DECORACIÓN", enabled: true, imageUrl: "", mobileImageUrl: "", useVideo: false, videoUrl: "", mobileVideoUrl: "", alt: "Nautica Home Decoración" },
        { key: "sanitary", label: "BAÑOS", enabled: true, imageUrl: "", mobileImageUrl: "", useVideo: false, videoUrl: "", mobileVideoUrl: "", alt: "Nautica Home Baños" },
        { key: "lighting", label: "ILUMINACIÓN", enabled: true, imageUrl: "", mobileImageUrl: "", useVideo: false, videoUrl: "", mobileVideoUrl: "", alt: "Nautica Home Iluminación" }
      ]
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
      kicker: "HISTORIA",
      title: "Inspirados por el mar.\nDiseñados para vivir.",
      paragraph1: "En Nautica Home transformamos los espacios cotidianos en refugios de bienestar, combinando la elegancia costera con un estilo contemporáneo y atemporal.",
      paragraph2: "Cada colección refleja nuestra pasión por los detalles, los materiales de calidad y la creación de ambientes que invitan a disfrutar lo esencial.",
      imageUrl: "",
      ctaLabel: "Explorar colecciones",
      ctaHref: "productos.html"
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
      items: [
        { enabled: true, category: "indoor", imageUrl: "", alt: "Inspiración Indoor" },
        { enabled: true, category: "indoor", imageUrl: "", alt: "Inspiración Indoor" },
        { enabled: true, category: "outdoor", imageUrl: "", alt: "Inspiración Outdoor" },
        { enabled: true, category: "outdoor", imageUrl: "", alt: "Inspiración Outdoor" },
        { enabled: true, category: "decor", imageUrl: "", alt: "Inspiración Decor" },
        { enabled: true, category: "decor", imageUrl: "", alt: "Inspiración Decor" },
        { enabled: true, category: "bedroom", imageUrl: "", alt: "Inspiración Bedroom" },
        { enabled: true, category: "bath", imageUrl: "", alt: "Inspiración Bath" }
      ]
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
      title: "¿Necesitas ayuda?",
      copy: "Estamos aquí para ayudarte con información de producto, disponibilidad, puntos de venta y cualquier detalle relacionado con tu experiencia Nautica Home.",
      imageUrl: ""
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
const sidebarUserEmail = document.querySelector("#sidebarUserEmail");
const sidebarToggle = document.querySelector("#sidebarToggle");
const sidebarBackdrop = document.querySelector("#sidebarBackdrop");
const viewTitle = document.querySelector("#viewTitle");
const navButtons = Array.from(document.querySelectorAll(".nav-item[data-view]"));
const viewSections = Array.from(document.querySelectorAll("[data-panel-view]"));

const refreshButton = document.querySelector("#refreshButton");
const newsletterBody = document.querySelector("#newsletterBody");
const newsletterMessage = document.querySelector("#newsletterMessage");
const subscriberCount = document.querySelector("#subscriberCount");
const todayCount = document.querySelector("#todayCount");

const refreshProductsButton = document.querySelector("#refreshProductsButton");
const retryProductsButton = document.querySelector("#retryProductsButton");
const productSearch = document.querySelector("#productSearch");
const productCategoryFilter = document.querySelector("#productCategoryFilter");
const productSubcategoryFilter = document.querySelector("#productSubcategoryFilter");
const productStatusFilter = document.querySelector("#productStatusFilter");
const toggleAllProducts = document.querySelector("#toggleAllProducts");
const productsLoading = document.querySelector("#productsLoading");
const productsError = document.querySelector("#productsError");
const productsErrorText = document.querySelector("#productsErrorText");
const productsTableWrap = document.querySelector("#productsTableWrap");
const productsBody = document.querySelector("#productsBody");
const productsPageInfo = document.querySelector("#productsPageInfo");
const productsPrevPage = document.querySelector("#productsPrevPage");
const productsNextPage = document.querySelector("#productsNextPage");
const productTotalCount = document.querySelector("#productTotalCount");
const productAvailableCount = document.querySelector("#productAvailableCount");
const productLowStockCount = document.querySelector("#productLowStockCount");
const productOutCount = document.querySelector("#productOutCount");
const productsWarning = document.querySelector("#productsWarning");
const catalogApiUrlInput = document.querySelector("#catalogApiUrl");
const saveCatalogSettingsButton = document.querySelector("#saveCatalogSettings");
const resetCatalogApiUrlButton = document.querySelector("#resetCatalogApiUrl");
const catalogSettingsMessage = document.querySelector("#catalogSettingsMessage");

const productDrawer = document.querySelector("#productDrawer");
const productDrawerBackdrop = document.querySelector("#productDrawerBackdrop");
const closeProductDrawerButton = document.querySelector("#closeProductDrawer");
const productDrawerTitle = document.querySelector("#productDrawerTitle");
const productDrawerCode = document.querySelector("#productDrawerCode");
const productDrawerImage = document.querySelector("#productDrawerImage");
const productApiSku = document.querySelector("#productApiSku");
const productApiName = document.querySelector("#productApiName");
const productApiPrice = document.querySelector("#productApiPrice");
const productApiStock = document.querySelector("#productApiStock");
const productApiCategory = document.querySelector("#productApiCategory");
const productApiSubcategory = document.querySelector("#productApiSubcategory");
const productApiClassification = document.querySelector("#productApiClassification");
const productFinalCategory = document.querySelector("#productFinalCategory");
const productFinalSubcategory = document.querySelector("#productFinalSubcategory");
const productCustomName = document.querySelector("#productCustomName");
const productPromoPrice = document.querySelector("#productPromoPrice");
const productCustomCategory = document.querySelector("#productCustomCategory");
const productCustomSubcategory = document.querySelector("#productCustomSubcategory");
const productCustomDescription = document.querySelector("#productCustomDescription");
const productImageUrl = document.querySelector("#productImageUrl");
const productImageAlt = document.querySelector("#productImageAlt");
const productVisible = document.querySelector("#productVisible");
const productFeatured = document.querySelector("#productFeatured");
const productUploadButton = document.querySelector("#productUploadButton");
const productImageFile = document.querySelector("#productImageFile");
const saveProductOverrideButton = document.querySelector("#saveProductOverride");
const resetProductOverrideButton = document.querySelector("#resetProductOverride");
const productSaveMessage = document.querySelector("#productSaveMessage");

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
let unsubscribeMessages = null;
let messagesCache = [];
let messageFilter = "inbox";
let selectedMessageId = null;
let contentCache = structuredClone(DEFAULT_HOME_CONTENT);

const PRODUCT_PAGE_SIZE = 50;
let productsCache = [];
let productsFiltered = [];
let productOverrides = {};
let productPage = 1;
let productsLoaded = false;
let productsLoadingNow = false;
let selectedProductCode = null;
let catalogApiUrl = INVENTORY_API_URL;
let productClassificationFilter = { category: "all", subcategory: "all" };

if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      authView.classList.add("is-hidden");
      panelView.classList.remove("is-hidden");
      userEmail.textContent = user.email || "Usuario";
      if (sidebarUserEmail) sidebarUserEmail.textContent = user.email || "Usuario";
      await Promise.all([loadNewsletter(), loadContent(), loadCatalogSettings(), loadSiteModes()]);
      startMessagesListener();
    } else {
      stopMessagesListener();
      resetWaitlistState();
      panelView.classList.add("is-hidden");
      authView.classList.remove("is-hidden");
      userEmail.textContent = "—";
      if (sidebarUserEmail) sidebarUserEmail.textContent = "Usuario";
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

function closeSidebar() {
  panelView.classList.remove("sidebar-open");
  sidebarBackdrop?.classList.add("is-hidden");
}
sidebarToggle?.addEventListener("click", () => {
  const open = !panelView.classList.contains("sidebar-open");
  panelView.classList.toggle("sidebar-open", open);
  sidebarBackdrop?.classList.toggle("is-hidden", !open);
});
sidebarBackdrop?.addEventListener("click", closeSidebar);
window.addEventListener("resize", () => { if (window.innerWidth > 860) closeSidebar(); });

function setView(view) {
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  viewSections.forEach((section) => section.classList.toggle("is-hidden", section.dataset.panelView !== view));
  const titles = { newsletter: "Newsletter", messages: "Mensajes", webdesign: "Web Design", products: "Productos", settings: "Configuración", waitlist: "Lista de espera" };
  viewTitle.textContent = titles[view] || "Nautica Panel";
  if (view === "products" && !productsLoaded && !productsLoadingNow) loadProducts();
  if (window.innerWidth <= 860) closeSidebar();
}

async function loadCatalogSettings() {
  catalogApiUrl = INVENTORY_API_URL;
  if (catalogApiUrlInput) catalogApiUrlInput.value = catalogApiUrl;
  if (!db || !auth?.currentUser) return;
  try {
    const snapshot = await getDoc(doc(db, CATALOG_SETTINGS_COLLECTION, CATALOG_SETTINGS_DOC));
    const savedUrl = String(snapshot.data()?.apiUrl || "").trim();
    if (savedUrl) catalogApiUrl = savedUrl;
    if (catalogApiUrlInput) catalogApiUrlInput.value = catalogApiUrl;
  } catch (error) {
    console.warn("Could not load catalog settings; using default endpoint", error);
    if (catalogSettingsMessage) {
      catalogSettingsMessage.textContent = "No se pudo leer la configuración guardada. Se usará el endpoint predeterminado.";
      catalogSettingsMessage.classList.add("error");
    }
  }
}

async function saveCatalogSettings() {
  if (!db || !auth?.currentUser || !catalogApiUrlInput) return;
  saveCatalogSettingsButton.disabled = true;
  catalogSettingsMessage.classList.remove("error");
  catalogSettingsMessage.textContent = "Guardando configuración…";
  try {
    // Guardar los modos sin depender de la validez del endpoint de inventario.
    await saveSiteModes();
    const value = catalogApiUrlInput.value.trim() || INVENTORY_API_URL;
    let parsed;
    try {
      parsed = new URL(value);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("URL inválida");
    } catch (_) {
      catalogSettingsMessage.textContent = "Modos guardados. El endpoint no se actualizó porque la URL no es válida.";
      catalogSettingsMessage.classList.add("error");
      return;
    }
    await setDoc(doc(db, CATALOG_SETTINGS_COLLECTION, CATALOG_SETTINGS_DOC), {
      apiUrl: parsed.href,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.email || auth.currentUser.uid
    }, { merge: true });
    catalogApiUrl = parsed.href;
    catalogApiUrlInput.value = catalogApiUrl;
    productsLoaded = false;
    catalogSettingsMessage.textContent = "Configuración guardada correctamente: modos y endpoint.";
  } catch (error) {
    console.error("Error al guardar configuración", error);
    catalogSettingsMessage.textContent = "No se pudo guardar la configuración: " + (error?.message || String(error));
    catalogSettingsMessage.classList.add("error");
  } finally {
    saveCatalogSettingsButton.disabled = false;
  }
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


function overrideDocId(code) {
  return encodeURIComponent(String(code || "").trim());
}

function stockState(stock) {
  const value = Number(stock) || 0;
  if (value <= 0) return { key: "out", label: "Agotado", rank: 2 };
  if (value <= 4) return { key: "low", label: "Poco stock", rank: 1 };
  return { key: "available", label: "Disponible", rank: 0 };
}

function parseOptionalMoney(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function money(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(Number(value));
}

function effectiveProduct(product) {
  const override = productOverrides[product.code] || {};
  const overridePromo = parseOptionalMoney(override.promoPrice);
  const apiPromo = parseOptionalMoney(product.promoPrice);
  const promoPrice = overridePromo ?? apiPromo;
  const classification = classifyProduct(product, override);
  return {
    ...product,
    displayName: String(override.customName || product.name || product.code),
    displayDescription: String(override.customDescription || product.description || ""),
    displayCategory: classification.category,
    displaySubcategory: classification.subcategory,
    classification,
    displayImageUrl: String(override.imageUrl || product.imageUrl || ""),
    imageAlt: String(override.imageAlt || ""),
    featured: Boolean(override.featured),
    hidden: Boolean(override.hidden),
    displayPromoPrice: promoPrice,
    hasPromotion: promoPrice !== null && product.price !== null && Number(promoPrice) < Number(product.price),
    override
  };
}

async function loadProductOverrides() {
  if (!db) return {};
  const snapshot = await getDocs(collection(db, PRODUCT_OVERRIDES_COLLECTION));
  const map = {};
  snapshot.docs.forEach((item) => {
    const data = item.data() || {};
    let code = String(data.code || "").trim();
    if (!code) {
      try { code = decodeURIComponent(item.id); } catch { code = item.id; }
    }
    if (code) map[code] = { ...data, id: item.id };
  });
  return map;
}

async function loadProducts() {
  if (!db || productsLoadingNow) return;
  productsLoadingNow = true;
  productsLoading?.classList.remove("is-hidden");
  productsError?.classList.add("is-hidden");
  productsTableWrap?.classList.add("is-hidden");
  refreshProductsButton.disabled = true;
  retryProductsButton.disabled = true;
  try {
    productsWarning?.classList.add("is-hidden");
    if (productsWarning) productsWarning.textContent = "";

    const apiProducts = await fetchInventoryProducts({ url: catalogApiUrl });
    productsCache = apiProducts;

    try {
      productOverrides = await loadProductOverrides();
    } catch (overrideError) {
      console.warn("Inventory loaded but product overrides could not be read", overrideError);
      productOverrides = {};
      if (productsWarning) {
        productsWarning.textContent = "El inventario se cargó correctamente, pero Firebase no permitió leer los overrides. Publica las reglas incluidas en esta versión para habilitar edición y promociones.";
        productsWarning.classList.remove("is-hidden");
      }
    }

    productsLoaded = true;
    productPage = 1;
    rebuildProductClassificationTree();
    applyProductFilters();
  } catch (error) {
    console.error("Could not load inventory", error);
    productsLoaded = false;
    productsCache = [];
    productsFiltered = [];
    productsErrorText.textContent = `${error?.message || "Error desconocido"} Endpoint: ${catalogApiUrl}`;
    productsError?.classList.remove("is-hidden");
    productsBody.innerHTML = "";
    renderProductStats();
    renderProductPagination();
  } finally {
    productsLoadingNow = false;
    productsLoading?.classList.add("is-hidden");
    refreshProductsButton.disabled = false;
    retryProductsButton.disabled = false;
  }
}

function rebuildProductClassificationTree() {
  const views = productsCache.map(effectiveProduct);
  const counts = new Map();

  views.forEach((product) => {
    const category = product.displayCategory || "Sin clasificar";
    const subcategory = product.displaySubcategory || (category === "Sin clasificar" ? "Sin clasificar" : "Otros");
    if (!counts.has(category)) counts.set(category, { total: 0, subcategories: new Map() });
    const entry = counts.get(category);
    entry.total += 1;
    entry.subcategories.set(subcategory, (entry.subcategories.get(subcategory) || 0) + 1);
  });

  const orderedCategories = [...Object.keys(PRODUCT_TAXONOMY)].filter((category) => counts.has(category));

  if (productCategoryFilter) {
    productCategoryFilter.innerHTML = [
      `<option value="all">Todas las categorías (${views.length})</option>`,
      ...orderedCategories.map((category) => `<option value="${escapeAttr(category)}">${escapeHtml(category)} (${counts.get(category).total})</option>`)
    ].join("");
    productCategoryFilter.value = orderedCategories.includes(productClassificationFilter.category) ? productClassificationFilter.category : "all";
    productClassificationFilter.category = productCategoryFilter.value;
  }

  if (productSubcategoryFilter) {
    const selectedCategory = productClassificationFilter.category;
    let subcategories = [];
    if (selectedCategory !== "all" && counts.has(selectedCategory)) {
      subcategories = taxonomySubcategories(selectedCategory).filter((subcategory) => counts.get(selectedCategory).subcategories.has(subcategory));
    } else {
      const merged = new Map();
      counts.forEach((entry) => entry.subcategories.forEach((count, subcategory) => merged.set(subcategory, (merged.get(subcategory) || 0) + count)));
      subcategories = [...merged.keys()].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    }

    const totalForLabel = selectedCategory === "all" ? views.length : (counts.get(selectedCategory)?.total || 0);
    productSubcategoryFilter.innerHTML = [
      `<option value="all">Todas las subcategorías (${totalForLabel})</option>`,
      ...subcategories.map((subcategory) => {
        const count = selectedCategory === "all"
          ? views.filter((product) => product.displaySubcategory === subcategory).length
          : (counts.get(selectedCategory)?.subcategories.get(subcategory) || 0);
        return `<option value="${escapeAttr(subcategory)}">${escapeHtml(subcategory)} (${count})</option>`;
      })
    ].join("");

    if (!subcategories.includes(productClassificationFilter.subcategory)) productClassificationFilter.subcategory = "all";
    productSubcategoryFilter.value = productClassificationFilter.subcategory;
  }
}

function applyProductFilters() {
  const queryText = String(productSearch?.value || "").trim().toLocaleLowerCase("es");
  const category = productClassificationFilter.category;
  const subcategory = productClassificationFilter.subcategory;
  const status = productStatusFilter?.value || "all";

  productsFiltered = productsCache.map(effectiveProduct).filter((product) => {
    const haystack = [product.name, product.displayName, product.code, product.category, product.displayCategory, product.subcategory, product.displaySubcategory]
      .filter(Boolean).join(" ").toLocaleLowerCase("es");
    if (queryText && !haystack.includes(queryText)) return false;
    if (category !== "all" && product.displayCategory !== category) return false;
    if (subcategory !== "all" && product.displaySubcategory !== subcategory) return false;
    const stock = stockState(product.stock);
    if (status === "available" && stock.key !== "available") return false;
    if (status === "low" && stock.key !== "low") return false;
    if (status === "out" && stock.key !== "out") return false;
    if (status === "promo" && !product.hasPromotion) return false;
    if (status === "hidden" && !product.hidden) return false;
    return true;
  }).sort((a, b) => {
    const categoryOrder = Object.keys(PRODUCT_TAXONOMY);
    const categoryDiff = categoryOrder.indexOf(a.displayCategory) - categoryOrder.indexOf(b.displayCategory);
    if (categoryDiff) return categoryDiff;
    const subcategoryOrder = taxonomySubcategories(a.displayCategory);
    const subcategoryDiff = subcategoryOrder.indexOf(a.displaySubcategory) - subcategoryOrder.indexOf(b.displaySubcategory);
    if (subcategoryDiff) return subcategoryDiff;
    const rankDiff = stockState(a.stock).rank - stockState(b.stock).rank;
    if (rankDiff) return rankDiff;
    return a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base", numeric: true });
  });

  const maxPage = Math.max(1, Math.ceil(productsFiltered.length / PRODUCT_PAGE_SIZE));
  productPage = Math.min(productPage, maxPage);
  renderProductStats();
  renderProductsTable();
  renderProductPagination();
  updateProductVisibilityMaster();
}

function renderProductStats() {
  const views = productsCache.map(effectiveProduct);
  productTotalCount.textContent = String(views.length);
  productAvailableCount.textContent = String(views.filter((product) => stockState(product.stock).key === "available").length);
  productLowStockCount.textContent = String(views.filter((product) => stockState(product.stock).key === "low").length);
  productOutCount.textContent = String(views.filter((product) => stockState(product.stock).key === "out").length);
}

function productPriceMarkup(product) {
  if (product.hasPromotion) return `<strong class="product-price product-price--promo">${escapeHtml(money(product.displayPromoPrice))}</strong><del>${escapeHtml(money(product.price))}</del>`;
  return `<strong class="product-price">${escapeHtml(money(product.price))}</strong>`;
}

function renderProductsTable() {
  if (!productsBody) return;
  productsTableWrap?.classList.remove("is-hidden");
  if (!productsCache.length) {
    productsBody.innerHTML = `<tr><td colspan="8" class="empty-state">No hay productos disponibles.</td></tr>`;
    return;
  }
  if (!productsFiltered.length) {
    productsBody.innerHTML = `<tr><td colspan="8" class="empty-state">No hay resultados para esta búsqueda.</td></tr>`;
    return;
  }
  const start = (productPage - 1) * PRODUCT_PAGE_SIZE;
  const pageRows = productsFiltered.slice(start, start + PRODUCT_PAGE_SIZE);
  const html = [];
  pageRows.forEach((product) => {
    const stock = stockState(product.stock);
    const category = [product.displayCategory, product.displaySubcategory].filter(Boolean).join(" / ") || "—";
    const image = product.displayImageUrl;
    html.push(`<tr>
      <td>${image ? `<img class="product-thumb" src="${escapeAttr(image)}" alt="${escapeAttr(product.imageAlt || product.displayName)}" loading="lazy">` : `<div class="product-thumb product-thumb--empty">—</div>`}</td>
      <td><strong class="product-sku">${escapeHtml(product.code)}</strong></td>
      <td><div class="product-name-cell"><strong>${escapeHtml(product.displayName)}</strong><small>${escapeHtml(product.displayDescription || product.name || "")}</small></div></td>
      <td>${escapeHtml(category)}</td>
      <td><div class="product-price-cell">${productPriceMarkup(product)}</div></td>
      <td><span class="stock-pill stock-pill--${stock.key}">${escapeHtml(stock.label)}</span><small class="stock-number">${escapeHtml(String(product.stock))}</small></td>
      <td><div class="product-visibility-cell"><label class="visibility-toggle" title="${product.hidden ? "Mostrar producto en la web" : "Ocultar producto de la web"}"><input type="checkbox" data-product-visibility="${escapeAttr(product.code)}" ${product.hidden ? "" : "checked"} aria-label="Visibilidad de ${escapeAttr(product.displayName)}"><span class="visibility-toggle__track"></span></label>${product.featured ? '<span class="featured-pill">Destacado</span>' : ""}</div></td>
      <td><button class="row-action product-edit-button" type="button" data-product-code="${escapeAttr(product.code)}" aria-label="Editar ${escapeAttr(product.displayName)}">•••</button></td>
    </tr>`);
  });
  productsBody.innerHTML = html.join("");
}

function updateProductVisibilityMaster() {
  if (!toggleAllProducts) return;
  const views = productsCache.map(effectiveProduct);
  const visibleCount = views.filter((product) => !product.hidden).length;
  toggleAllProducts.checked = views.length > 0 && visibleCount === views.length;
  toggleAllProducts.indeterminate = visibleCount > 0 && visibleCount < views.length;
  toggleAllProducts.disabled = productsLoadingNow || views.length === 0;
}

async function setProductVisibility(code, visible, input = null) {
  const product = productsCache.find((item) => item.code === code);
  if (!product) return;
  const previous = productOverrides[code] || {};
  const next = { ...previous, hidden: !visible };
  if (input) input.disabled = true;
  try {
    await persistProductOverride(code, next);
    applyProductFilters();
  } catch (error) {
    console.error("No se pudo actualizar la visibilidad del producto.", error);
    if (input) input.checked = !visible;
  } finally {
    if (input) input.disabled = false;
    updateProductVisibilityMaster();
  }
}

async function setAllProductVisibility(visible) {
  if (!toggleAllProducts || !db || !auth?.currentUser || !productsCache.length) return;
  const desiredHidden = !visible;
  toggleAllProducts.disabled = true;
  const wrapper = toggleAllProducts.closest(".visibility-toggle");
  wrapper?.classList.add("is-saving");

  const entries = productsCache.map((product) => ({
    code: product.code,
    override: { ...(productOverrides[product.code] || {}), hidden: desiredHidden }
  }));

  try {
    // Firestore batches are limited to 500 writes. Keep headroom for future additions.
    for (let start = 0; start < entries.length; start += 450) {
      const batch = writeBatch(db);
      entries.slice(start, start + 450).forEach(({ code, override }) => {
        const payload = {
          ...override,
          code,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser.email || "authenticated-user"
        };
        batch.set(doc(db, PRODUCT_OVERRIDES_COLLECTION, overrideDocId(code)), payload);
      });
      await batch.commit();
    }
    entries.forEach(({ code, override }) => {
      productOverrides[code] = { ...override, code };
    });
    applyProductFilters();
  } catch (error) {
    console.error("No se pudo actualizar la visibilidad global.", error);
    toggleAllProducts.checked = !visible;
  } finally {
    wrapper?.classList.remove("is-saving");
    toggleAllProducts.disabled = false;
    updateProductVisibilityMaster();
  }
}

function renderProductPagination() {
  const total = productsFiltered.length;
  const maxPage = Math.max(1, Math.ceil(total / PRODUCT_PAGE_SIZE));
  const start = total ? (productPage - 1) * PRODUCT_PAGE_SIZE + 1 : 0;
  const end = total ? Math.min(productPage * PRODUCT_PAGE_SIZE, total) : 0;
  productsPageInfo.textContent = total ? `${start}–${end} de ${total} productos` : "0 productos";
  productsPrevPage.disabled = productPage <= 1;
  productsNextPage.disabled = productPage >= maxPage || total === 0;
}

function openProductEditor(code) {
  const product = productsCache.find((item) => item.code === code);
  if (!product) return;
  const view = effectiveProduct(product);
  selectedProductCode = code;
  productDrawerTitle.textContent = view.displayName;
  productDrawerCode.textContent = `SKU ${code}`;
  productDrawerImage.src = view.displayImageUrl || "";
  productDrawerImage.alt = view.imageAlt || view.displayName;
  productDrawerImage.classList.toggle("is-empty", !view.displayImageUrl);
  productApiSku.textContent = product.code || "—";
  productApiName.textContent = product.name || "—";
  productApiPrice.textContent = money(product.price);
  productApiStock.textContent = `${product.stock} · ${stockState(product.stock).label}`;
  productApiCategory.textContent = product.category || "—";
  productApiSubcategory.textContent = product.subcategory || "—";
  const automatic = classifyProduct(product, {});
  productApiClassification.textContent = `${automatic.category} / ${automatic.subcategory}`;
  productFinalCategory.textContent = view.displayCategory || "Sin clasificar";
  productFinalSubcategory.textContent = view.displaySubcategory || "Sin clasificar";
  productCustomName.value = view.override.customName || "";
  productPromoPrice.value = view.override.promoPrice ?? "";
  populateProductCategorySelect(view.override.categoryOverride || view.override.customCategory || "");
  populateProductSubcategorySelect(productCustomCategory.value || view.displayCategory, view.override.subcategoryOverride || view.override.customSubcategory || "");
  productCustomDescription.value = view.override.customDescription || "";
  productImageUrl.value = view.override.imageUrl || "";
  productImageAlt.value = view.override.imageAlt || "";
  productVisible.checked = !view.hidden;
  productFeatured.checked = view.featured;
  productSaveMessage.textContent = "";
  productDrawer.classList.remove("is-hidden");
  productDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
}


function populateProductCategorySelect(selected = "") {
  if (!productCustomCategory) return;
  const options = Object.keys(PRODUCT_TAXONOMY).filter((category) => category !== "Sin clasificar");
  productCustomCategory.innerHTML = `<option value="">Automática</option>${options.map((category) => `<option value="${escapeAttr(category)}">${escapeHtml(category)}</option>`).join("")}`;
  productCustomCategory.value = options.includes(selected) ? selected : "";
}

function populateProductSubcategorySelect(category, selected = "") {
  if (!productCustomSubcategory) return;
  const options = taxonomySubcategories(category).filter((subcategory) => subcategory !== "Sin clasificar");
  productCustomSubcategory.innerHTML = `<option value="">Automática</option>${options.map((subcategory) => `<option value="${escapeAttr(subcategory)}">${escapeHtml(subcategory)}</option>`).join("")}`;
  productCustomSubcategory.value = options.includes(selected) ? selected : "";
}

function closeProductEditor() {
  selectedProductCode = null;
  productDrawer.classList.add("is-hidden");
  productDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
}

function collectProductOverride() {
  return {
    customName: productCustomName.value.trim(),
    customDescription: productCustomDescription.value.trim(),
    categoryOverride: productCustomCategory.value.trim(),
    subcategoryOverride: productCustomSubcategory.value.trim(),
    customCategory: productCustomCategory.value.trim(),
    customSubcategory: productCustomSubcategory.value.trim(),
    promoPrice: parseOptionalMoney(productPromoPrice.value),
    imageUrl: productImageUrl.value.trim(),
    imageAlt: productImageAlt.value.trim(),
    hidden: !productVisible.checked,
    featured: productFeatured.checked
  };
}

async function persistProductOverride(code, override) {
  if (!db || !auth?.currentUser) throw new Error("No hay una sesión activa.");
  const payload = {
    ...override,
    code,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser.email || "authenticated-user"
  };
  await setDoc(doc(db, PRODUCT_OVERRIDES_COLLECTION, overrideDocId(code)), payload);
  productOverrides[code] = { ...override, code };
}

async function saveCurrentProductOverride() {
  if (!selectedProductCode) return;
  const code = selectedProductCode;
  const previous = productOverrides[code] || {};
  const next = collectProductOverride();
  const promo = next.promoPrice;
  const product = productsCache.find((item) => item.code === code);
  if (promo !== null && product?.price !== null && Number(promo) >= Number(product.price)) {
    productSaveMessage.textContent = "El precio promocional debe ser menor al precio base de la API.";
    productSaveMessage.classList.add("error");
    return;
  }
  saveProductOverrideButton.disabled = true;
  productSaveMessage.classList.remove("error");
  productSaveMessage.textContent = "Guardando…";
  try {
    await persistProductOverride(code, next);
    const oldUrl = String(previous.imageUrl || "");
    const newUrl = String(next.imageUrl || "");
    if (isManagedCpanelAsset(oldUrl) && oldUrl !== newUrl) {
      try {
        const token = await auth.currentUser.getIdToken();
        await requestAssetDelete(oldUrl, token);
      } catch (error) { console.warn("Old product asset was preserved", error); }
    }
    rebuildProductClassificationTree();
    applyProductFilters();
    openProductEditor(code);
    productSaveMessage.textContent = "Cambios guardados en Firebase.";
  } catch (error) {
    console.error(error);
    productSaveMessage.textContent = error?.message || "No fue posible guardar los overrides.";
    productSaveMessage.classList.add("error");
  } finally {
    saveProductOverrideButton.disabled = false;
  }
}

async function resetCurrentProductOverride() {
  if (!selectedProductCode || !db || !auth?.currentUser) return;
  const code = selectedProductCode;
  const previous = productOverrides[code] || {};
  if (!confirm(`¿Restablecer todos los overrides de ${code}? Los datos de inventario no se modificarán.`)) return;
  resetProductOverrideButton.disabled = true;
  productSaveMessage.textContent = "Restableciendo…";
  try {
    await deleteDoc(doc(db, PRODUCT_OVERRIDES_COLLECTION, overrideDocId(code)));
    delete productOverrides[code];
    if (isManagedCpanelAsset(previous.imageUrl)) {
      try {
        const token = await auth.currentUser.getIdToken();
        await requestAssetDelete(previous.imageUrl, token);
      } catch (error) { console.warn("Product asset was preserved", error); }
    }
    rebuildProductClassificationTree();
    applyProductFilters();
    openProductEditor(code);
    productSaveMessage.textContent = "Overrides restablecidos.";
  } catch (error) {
    console.error(error);
    productSaveMessage.textContent = error?.message || "No fue posible restablecer los overrides.";
    productSaveMessage.classList.add("error");
  } finally {
    resetProductOverrideButton.disabled = false;
  }
}

async function uploadCurrentProductImage() {
  const file = productImageFile.files?.[0];
  const code = selectedProductCode;
  if (!file || !code || !auth?.currentUser) return;
  const previous = productOverrides[code] || {};
  productUploadButton.disabled = true;
  productSaveMessage.classList.remove("error");
  productSaveMessage.textContent = "Comprobando storage…";
  let uploadedUrl = "";
  try {
    const token = await auth.currentUser.getIdToken();
    await checkAssetHealth(token);
    productSaveMessage.textContent = "Subiendo imagen…";
    const body = new FormData();
    body.append("file", file);
    body.append("key", `catalog-product-${code}`);
    body.append("_firebaseToken", token);
    const response = await fetchWithTimeout("api/upload-website-asset.php", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "X-Firebase-Token": token },
      body
    }, 45000);
    const result = await safeJson(response);
    if (!response.ok || !result?.ok || !result?.url) throw new Error(result?.error || `Upload failed (${response.status})`);
    uploadedUrl = result.url;
    const next = { ...previous, imageUrl: uploadedUrl };
    delete next.id;
    delete next.updatedAt;
    delete next.updatedBy;
    await persistProductOverride(code, next);
    productImageUrl.value = uploadedUrl;
    productDrawerImage.src = uploadedUrl;
    productDrawerImage.alt = productImageAlt.value.trim() || effectiveProduct(productsCache.find((item) => item.code === code)).displayName;
    applyProductFilters();
    if (isManagedCpanelAsset(previous.imageUrl) && previous.imageUrl !== uploadedUrl) {
      try { await requestAssetDelete(previous.imageUrl, token); } catch (error) { console.warn("Old product image preserved", error); }
    }
    productSaveMessage.textContent = "Imagen guardada en cPanel y Firebase.";
  } catch (error) {
    console.error("Product image upload failed", error);
    productSaveMessage.textContent = error?.message || "No fue posible subir la imagen.";
    productSaveMessage.classList.add("error");
    if (uploadedUrl && isManagedCpanelAsset(uploadedUrl)) {
      try {
        const token = await auth.currentUser.getIdToken();
        await requestAssetDelete(uploadedUrl, token);
      } catch (cleanupError) { console.warn("Orphan product image preserved", cleanupError); }
    }
  } finally {
    productImageFile.value = "";
    productUploadButton.disabled = false;
  }
}

saveCatalogSettingsButton?.addEventListener("click", saveCatalogSettings);
resetCatalogApiUrlButton?.addEventListener("click", () => {
  if (!catalogApiUrlInput) return;
  catalogApiUrlInput.value = INVENTORY_API_URL;
  catalogSettingsMessage?.classList.remove("error");
  if (catalogSettingsMessage) catalogSettingsMessage.textContent = "Endpoint predeterminado preparado. Pulsa Guardar configuración para aplicarlo.";
});

refreshProductsButton?.addEventListener("click", loadProducts);
retryProductsButton?.addEventListener("click", loadProducts);
productSearch?.addEventListener("input", () => { productPage = 1; applyProductFilters(); });
productCategoryFilter?.addEventListener("change", () => {
  productClassificationFilter.category = productCategoryFilter.value || "all";
  productClassificationFilter.subcategory = "all";
  productPage = 1;
  rebuildProductClassificationTree();
  applyProductFilters();
});
productSubcategoryFilter?.addEventListener("change", () => {
  productClassificationFilter.subcategory = productSubcategoryFilter.value || "all";
  productPage = 1;
  applyProductFilters();
});
productStatusFilter?.addEventListener("change", () => { productPage = 1; applyProductFilters(); });
productsPrevPage?.addEventListener("click", () => { if (productPage > 1) { productPage -= 1; renderProductsTable(); renderProductPagination(); } });
productsNextPage?.addEventListener("click", () => { const max = Math.ceil(productsFiltered.length / PRODUCT_PAGE_SIZE); if (productPage < max) { productPage += 1; renderProductsTable(); renderProductPagination(); } });
productsBody?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-product-code]");
  if (button) openProductEditor(button.dataset.productCode);
});

productsBody?.addEventListener("change", (event) => {
  const input = event.target.closest("[data-product-visibility]");
  if (!input) return;
  setProductVisibility(input.dataset.productVisibility, input.checked, input);
});

toggleAllProducts?.addEventListener("change", () => {
  setAllProductVisibility(toggleAllProducts.checked);
});
productDrawerBackdrop?.addEventListener("click", closeProductEditor);
closeProductDrawerButton?.addEventListener("click", closeProductEditor);
saveProductOverrideButton?.addEventListener("click", saveCurrentProductOverride);
resetProductOverrideButton?.addEventListener("click", resetCurrentProductOverride);
productUploadButton?.addEventListener("click", () => productImageFile?.click());
productImageFile?.addEventListener("change", uploadCurrentProductImage);
productCustomCategory?.addEventListener("change", () => {
  const product = productsCache.find((item) => item.code === selectedProductCode);
  const fallbackCategory = product ? classifyProduct(product, {}).category : "";
  populateProductSubcategorySelect(productCustomCategory.value || fallbackCategory, "");
});

productImageUrl?.addEventListener("input", () => {
  const value = productImageUrl.value.trim();
  if (value) productDrawerImage.src = value;
  else if (selectedProductCode) {
    const product = productsCache.find((item) => item.code === selectedProductCode);
    productDrawerImage.src = product?.imageUrl || "";
  }
});

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

function normalizeEditorContent(data) {
  const merged = deepMerge(structuredClone(DEFAULT_HOME_CONTENT), data || {});
  // Backward compatibility with the v5 single-message and single-hero fields.
  if (!Array.isArray(data?.utility?.messages) || !data.utility.messages.length) {
    merged.utility.messages = [{ enabled: true, text: data?.utility?.message || merged.utility.message }];
  }
  if (!Array.isArray(data?.sections?.hero?.categories) || !data.sections.hero.categories.length) {
    const legacyProducts = Array.isArray(data?.sections?.products?.items) ? data.sections.products.items : [];
    const byIndex = { indoor: 0, outdoor: 1, decor: 4, sanitary: 3, lighting: 5 };
    merged.sections.hero.categories = DEFAULT_HOME_CONTENT.sections.hero.categories.map((item) => {
      const legacy = legacyProducts[byIndex[item.key]] || {};
      return { ...item, imageUrl: legacy.imageUrl || "", mobileImageUrl: legacy.mobileImageUrl || "" };
    });
  }
  merged.sections.inspiration.items = (merged.sections.inspiration.items || []).map((item, index) => ({
    enabled: item?.enabled !== false,
    category: item?.category || ["indoor","indoor","outdoor","outdoor","decor","decor","bedroom","bath"][index % 8],
    imageUrl: item?.imageUrl || "",
    alt: item?.alt || "Inspiración Nautica Home"
  }));
  return merged;
}

function renderWebDesignForm(data, reopenKey = "") {
  contentCache = normalizeEditorContent(data);
  delete contentCache.updatedAt;
  delete contentCache.updatedBy;
  const s = contentCache.sections;
  const g = contentCache.globalSettings;
  const u = contentCache.utility;
  const f = contentCache.footer;

  webDesignForm.innerHTML = [
    editorSection("Global / Footer", "global", "Configuración general, redes y barra superior.", [
      nestedEditor("Mensajes de barra superior", "Agrega varios avisos y define su rotación.", [
        numberField("Cambio automático (segundos)", "utility.rotationSeconds", u.rotationSeconds || 5, 2, 30),
        ...u.messages.flatMap((item, index) => [
          `<div class="repeatable-card" data-repeatable="utility-message" data-index="${index}"><div class="repeatable-card__head"><strong>Mensaje ${index + 1}</strong><button class="text-button danger-text" type="button" data-remove-utility-message="${index}">Eliminar</button></div>`,
          toggleField("Activo", `utility.messages.${index}.enabled`, item.enabled),
          textField("Texto", `utility.messages.${index}.text`, item.text),
          `</div>`
        ]),
        `<button class="secondary-button compact add-item-button" type="button" data-add-utility-message>+ Agregar mensaje</button>`
      ]),
      textField("Label Contacto", "utility.contactLabel", u.contactLabel),
      textField("Facebook URL", "globalSettings.facebookUrl", g.facebookUrl),
      textField("Instagram URL", "globalSettings.instagramUrl", g.instagramUrl),
      textField("WhatsApp URL", "globalSettings.whatsappUrl", g.whatsappUrl),
      textField("Copyright footer", "footer.copyright", f.copyright)
    ]),
    editorSection("Hero por categorías", "hero", "Media del hero editorial. Cada categoría puede usar imagen o video; el tiempo controla también la barra de progreso.", [
      toggleField("Sección activa", "sections.hero.enabled", s.hero.enabled),
      numberField("Cambio automático (segundos)", "sections.hero.rotationSeconds", s.hero.rotationSeconds || 6, 3, 30),
      ...s.hero.categories.flatMap((item, index) => [
        nestedEditor(item.label || item.key.toUpperCase(), "Imagen/video de esta categoría en el hero.", [
          `<div class="repeatable-card repeatable-card--plain" data-repeatable="hero-category" data-index="${index}">`,
          toggleField("Activa", `sections.hero.categories.${index}.enabled`, item.enabled),
          textField("Label", `sections.hero.categories.${index}.label`, item.label),
          textField("Alt text", `sections.hero.categories.${index}.alt`, item.alt || `Nautica Home ${item.label || ""}`),
          imageField("Imagen desktop", `sections.hero.categories.${index}.imageUrl`, item.imageUrl, `hero-${item.key}-desktop`, "image/*", "1920 × 1080 px", "desktop"),
          imageField("Imagen móvil", `sections.hero.categories.${index}.mobileImageUrl`, item.mobileImageUrl, `hero-${item.key}-mobile`, "image/*", "1080 × 1350 px", "mobile"),
          toggleField("Usar video", `sections.hero.categories.${index}.useVideo`, item.useVideo),
          imageField("Video desktop", `sections.hero.categories.${index}.videoUrl`, item.videoUrl, `hero-${item.key}-video`, "video/*", "MP4/WebM · máx. 150 MB"),
          imageField("Video móvil", `sections.hero.categories.${index}.mobileVideoUrl`, item.mobileVideoUrl, `hero-${item.key}-video-mobile`, "video/*", "MP4/WebM · máx. 150 MB"),
          `</div>`
        ])
      ])
    ]),
    editorSection("Historia", "about", "Contenido editorial del bloque Historia en el landing.", [
      toggleField("Sección activa", "sections.about.enabled", s.about.enabled),
      textField("Eyebrow", "sections.about.kicker", s.about.kicker),
      textareaField("Título", "sections.about.title", s.about.title),
      textareaField("Párrafo 1", "sections.about.paragraph1", s.about.paragraph1),
      textareaField("Párrafo 2", "sections.about.paragraph2", s.about.paragraph2),
      imageField("Imagen", "sections.about.imageUrl", s.about.imageUrl, "about", "image/*", "1600 × 1200 px · relación 4:3"),
      textField("CTA", "sections.about.ctaLabel", s.about.ctaLabel),
      textField("Link CTA", "sections.about.ctaHref", s.about.ctaHref)
    ]),
    editorSection("Tiendas", "retailers", "Textos y logos de distribuidores.", [
      toggleField("Sección activa", "sections.retailers.enabled", s.retailers.enabled),
      textField("Eyebrow", "sections.retailers.kicker", s.retailers.kicker),
      textField("Título", "sections.retailers.title", s.retailers.title),
      textareaField("Descripción", "sections.retailers.copy", s.retailers.copy),
      ...s.retailers.items.flatMap((item, index) => [
        nestedEditor(`Tienda ${index + 1} · ${escapeHtml(item.name || "Sin nombre")}`, "Logo y visibilidad del retailer.", [
          toggleField("Activa", `sections.retailers.items.${index}.enabled`, item.enabled),
          textField("Nombre", `sections.retailers.items.${index}.name`, item.name),
          imageField("Logo", `sections.retailers.items.${index}.logoUrl`, item.logoUrl, `retailer-${index}`, "image/*", "1200 × 600 px · PNG/WebP recomendado")
        ])
      ])
    ]),
    editorSection("Inspiración", "inspiration", "Carrusel editorial horizontal. Cada imagen puede clasificarse para los filtros inferiores.", [
      toggleField("Sección activa", "sections.inspiration.enabled", s.inspiration.enabled),
      ...s.inspiration.items.flatMap((item, index) => [
        `<div class="repeatable-card" data-repeatable="inspiration-item" data-index="${index}"><div class="repeatable-card__head"><strong>Imagen ${index + 1}</strong><button class="text-button danger-text" type="button" data-remove-inspiration-item="${index}">Eliminar</button></div>`,
        toggleField("Activa", `sections.inspiration.items.${index}.enabled`, item.enabled),
        selectField("Categoría", `sections.inspiration.items.${index}.category`, item.category || "indoor", [["indoor","INDOOR"],["outdoor","OUTDOOR"],["decor","DECOR"],["bedroom","BEDROOM"],["bath","BATH"]]),
        textField("Alt text", `sections.inspiration.items.${index}.alt`, item.alt || "Inspiración Nautica Home"),
        imageField("Imagen", `sections.inspiration.items.${index}.imageUrl`, item.imageUrl, `inspiration-${index}`, "image/*", "Vertical / editorial · 1600 px o más"),
        `</div>`
      ]),
      `<button class="secondary-button compact add-item-button" type="button" data-add-inspiration-item>+ Agregar imagen</button>`
    ]),
    editorSection("Newsletter", "newsletter", "Contenido visual y editorial del newsletter.", [
      toggleField("Sección activa", "sections.newsletter.enabled", s.newsletter.enabled),
      textField("Eyebrow", "sections.newsletter.kicker", s.newsletter.kicker),
      textareaField("Título", "sections.newsletter.title", s.newsletter.title),
      textareaField("Descripción", "sections.newsletter.copy", s.newsletter.copy),
      textareaField("Texto legal", "sections.newsletter.legal", s.newsletter.legal),
      imageField("Imagen", "sections.newsletter.imageUrl", s.newsletter.imageUrl, "newsletter", "image/*", "1600 × 1100 px")
    ]),
    editorSection("Contacto", "contact", "Contenido de la sección y formulario de contacto.", [
      toggleField("Sección activa", "sections.contact.enabled", s.contact.enabled),
      textField("Eyebrow", "sections.contact.kicker", s.contact.kicker),
      textareaField("Título", "sections.contact.title", s.contact.title),
      textareaField("Descripción", "sections.contact.copy", s.contact.copy),
      imageField("Imagen", "sections.contact.imageUrl", s.contact.imageUrl, "contact", "image/*", "1600 × 1200 px · relación 4:3")
    ])
  ].join("");

  if (reopenKey) webDesignForm.querySelector(`[data-section-key="${CSS.escape(reopenKey)}"]`)?.classList.add("is-open");
  bindWebDesignControls();
}

function bindWebDesignControls() {
  webDesignForm.querySelectorAll("[data-toggle-editor-section]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (event.target.closest("[data-reset-section]")) return;
      button.closest(".editor-section")?.classList.toggle("is-open");
    });
  });
  webDesignForm.querySelectorAll("[data-toggle-nested]").forEach((button) => {
    button.addEventListener("click", () => button.closest(".nested-editor")?.classList.toggle("is-open"));
  });
  webDesignForm.querySelectorAll("[data-upload-button]").forEach((button) => {
    button.addEventListener("click", () => button.closest(".image-field")?.querySelector("input[type='file']")?.click());
  });
  webDesignForm.querySelectorAll("input[type='file'][data-upload-path]").forEach((input) => input.addEventListener("change", () => uploadAsset(input)));

  webDesignForm.querySelectorAll("[data-reset-section]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const key = button.dataset.resetSection;
      const current = collectEditorData();
      if (key === "global") {
        current.globalSettings = structuredClone(DEFAULT_HOME_CONTENT.globalSettings);
        current.utility = structuredClone(DEFAULT_HOME_CONTENT.utility);
        current.footer = structuredClone(DEFAULT_HOME_CONTENT.footer);
      } else if (DEFAULT_HOME_CONTENT.sections[key]) {
        current.sections[key] = structuredClone(DEFAULT_HOME_CONTENT.sections[key]);
      }
      renderWebDesignForm(current, key);
      markContentDirty("Vista default aplicada · guarda para publicar");
    });
  });

  webDesignForm.querySelector("[data-add-utility-message]")?.addEventListener("click", () => {
    const data = collectEditorData();
    data.utility.messages = Array.isArray(data.utility.messages) ? data.utility.messages : [];
    data.utility.messages.push({ enabled: true, text: "Nuevo mensaje" });
    renderWebDesignForm(data, "global");
    webDesignForm.querySelector('[data-section-key="global"] .nested-editor')?.classList.add("is-open");
    markContentDirty();
  });
  webDesignForm.querySelectorAll("[data-remove-utility-message]").forEach((button) => button.addEventListener("click", () => {
    const data = collectEditorData();
    if ((data.utility.messages?.length || 0) <= 1) return;
    data.utility.messages.splice(Number(button.dataset.removeUtilityMessage), 1);
    renderWebDesignForm(data, "global");
    markContentDirty();
  }));

  webDesignForm.querySelector("[data-add-hero-banner]")?.addEventListener("click", () => {
    const data = collectEditorData();
    data.sections.hero.banners = Array.isArray(data.sections.hero.banners) ? data.sections.hero.banners : [];
    data.sections.hero.banners.push({ enabled: true, imageUrl: "", mobileImageUrl: "", alt: "Nautica Home" });
    renderWebDesignForm(data, "hero");
    markContentDirty();
  });
  webDesignForm.querySelectorAll("[data-remove-hero-banner]").forEach((button) => button.addEventListener("click", () => {
    const data = collectEditorData();
    if ((data.sections.hero.banners?.length || 0) <= 1) return;
    data.sections.hero.banners.splice(Number(button.dataset.removeHeroBanner), 1);
    renderWebDesignForm(data, "hero");
    markContentDirty();
  }));

  webDesignForm.querySelector("[data-add-inspiration-item]")?.addEventListener("click", () => {
    const data = collectEditorData();
    data.sections.inspiration.items = Array.isArray(data.sections.inspiration.items) ? data.sections.inspiration.items : [];
    data.sections.inspiration.items.push({ enabled: true, category: "indoor", imageUrl: "", alt: "Inspiración Nautica Home" });
    renderWebDesignForm(data, "inspiration");
    markContentDirty();
  });
  webDesignForm.querySelectorAll("[data-remove-inspiration-item]").forEach((button) => button.addEventListener("click", () => {
    const data = collectEditorData();
    data.sections.inspiration.items.splice(Number(button.dataset.removeInspirationItem), 1);
    renderWebDesignForm(data, "inspiration");
    markContentDirty();
  }));

  webDesignForm.querySelectorAll("input[data-path],textarea[data-path],select[data-path]").forEach((field) => {
    field.addEventListener("input", () => markContentDirty());
    field.addEventListener("change", () => markContentDirty());
  });
}

function markContentDirty(message = "Cambios sin guardar") {
  contentState.classList.remove("error", "success");
  contentState.textContent = message;
}

function editorSection(title, key, description, fields) {
  return `<section class="editor-section" data-section-key="${escapeHtml(key)}">
    <div class="editor-section__header" data-toggle-editor-section role="button" tabindex="0" aria-label="Editar ${escapeAttr(title)}">
      <div class="editor-section__identity"><span class="editor-section__icon">${sectionIcon(key)}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></div></div>
      <div class="editor-section__controls"><button class="text-button" type="button" data-reset-section="${escapeHtml(key)}">Reset</button><svg class="editor-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></div>
    </div>
    <div class="editor-section__body"><div class="editor-grid" data-editor-section="${escapeHtml(key)}">${fields.join("")}</div></div>
  </section>`;
}

function nestedEditor(title, description, fields) {
  return `<section class="nested-editor"><button class="nested-editor__header" type="button" data-toggle-nested><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="nested-editor__body"><div class="editor-grid">${fields.join("")}</div></div></section>`;
}

function sectionIcon(key) {
  const paths = {
    global: '<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="8"/>',
    hero: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 15 5-5 4 4 3-3 6 6"/>',
    products: '<path d="M4 7h16v13H4zM7 7V4h10v3"/>',
    about: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    retailers: '<path d="M3 9h18l-2-5H5zM5 9v11h14V9M9 20v-6h6v6"/>',
    inspiration: '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="4"/>',
    newsletter: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    contact: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[key] || paths.global}</svg>`;
}

function textField(label, path, value) {
  return `<label class="editor-field"><span>${escapeHtml(label)}</span><input type="text" data-path="${escapeHtml(path)}" value="${escapeAttr(value ?? "")}" /></label>`;
}
function numberField(label, path, value, min, max) {
  return `<label class="editor-field"><span>${escapeHtml(label)}</span><input type="number" min="${min}" max="${max}" step="1" data-path="${escapeHtml(path)}" value="${escapeAttr(value ?? min)}" /></label>`;
}
function textareaField(label, path, value) {
  return `<label class="editor-field editor-field-wide"><span>${escapeHtml(label)}</span><textarea rows="3" data-path="${escapeHtml(path)}">${escapeHtml(value ?? "")}</textarea></label>`;
}
function selectField(label, path, value, options) {
  return `<label class="editor-field"><span>${escapeHtml(label)}</span><select data-path="${escapeHtml(path)}">${options.map(([optionValue, optionLabel]) => `<option value="${escapeAttr(optionValue)}" ${String(value) === String(optionValue) ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`).join("")}</select></label>`;
}
function toggleField(label, path, value) {
  return `<label class="editor-toggle"><span>${escapeHtml(label)}</span><span class="toggle-control"><input type="checkbox" data-path="${escapeHtml(path)}" ${value !== false ? "checked" : ""} /><span class="toggle-track"></span></span></label>`;
}
function imageField(label, path, value, uploadKey, accept = "image/*", sizeHint = "", variant = "") {
  const current = String(value ?? "");
  const isVideo = accept.startsWith("video/");
  const preview = current
    ? (isVideo ? `<video class="asset-preview" src="${escapeAttr(current)}" muted playsinline preload="metadata"></video>` : `<img class="asset-preview" src="${escapeAttr(current)}" alt="" loading="lazy" />`)
    : `<div class="asset-preview asset-preview-empty">Sin archivo</div>`;
  return `<div class="editor-field editor-field-wide image-field${variant ? ` image-field--${variant}` : ""}">
    <div class="image-field__label"><span>${escapeHtml(label)}</span>${sizeHint ? `<small class="image-size-hint">Tamaño recomendado: ${escapeHtml(sizeHint)}</small>` : ""}</div>
    <div class="image-field__content"><div class="asset-preview-wrap" data-asset-preview>${preview}</div><div class="image-field__fields">
      <input type="url" data-path="${escapeHtml(path)}" value="${escapeAttr(current)}" placeholder="https://assets.nauticahome.com.mx/…" />
      <button class="secondary-button compact" type="button" data-upload-button>Subir / reemplazar</button>
      <input class="file-input" type="file" accept="${escapeAttr(accept)}" data-upload-path="${escapeHtml(path)}" data-upload-key="${escapeHtml(uploadKey)}" />
      <small>La URL guardada en Firebase es la fuente de verdad. Las nuevas subidas se almacenan en cPanel.</small>
    </div></div>
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
    // Keep legacy single fields synchronized so older public builds remain compatible.
    data.utility.message = data.utility.messages?.find((item) => item?.enabled !== false && item?.text)?.text || data.utility.message || "";
    const heroCategories = Array.isArray(data.sections?.hero?.categories) ? data.sections.hero.categories : [];
    const firstHero = heroCategories.find((item) => item?.enabled !== false) || heroCategories[0];
    if (firstHero) {
      data.sections.hero.imageUrl = firstHero.imageUrl || "";
      data.sections.hero.mobileImageUrl = firstHero.mobileImageUrl || "";
    }
    const legacyMap = { indoor: 0, outdoor: 1, sanitary: 3, decor: 4, lighting: 5 };
    data.sections.products = data.sections.products || structuredClone(DEFAULT_HOME_CONTENT.sections.products);
    data.sections.products.items = Array.isArray(data.sections.products.items) ? data.sections.products.items : structuredClone(DEFAULT_HOME_CONTENT.sections.products.items);
    heroCategories.forEach((item) => {
      const legacyIndex = legacyMap[item.key];
      if (legacyIndex === undefined) return;
      data.sections.products.items[legacyIndex] = { ...(data.sections.products.items[legacyIndex] || {}), enabled: item.enabled !== false, imageUrl: item.imageUrl || "", mobileImageUrl: item.mobileImageUrl || "" };
    });
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
    const value = field.type === "checkbox" ? field.checked : field.type === "number" ? Number(field.value) : field.value;
    setByPath(data, field.dataset.path, value);
  });
  delete data.updatedAt;
  delete data.updatedBy;
  return data;
}

async function uploadAsset(input) {
  const file = input.files?.[0];
  if (!file || !auth?.currentUser || !db) return;

  const path = input.dataset.uploadPath;
  const key = input.dataset.uploadKey || "asset";
  const field = input.closest(".image-field");
  const urlInput = field?.querySelector(`[data-path="${CSS.escape(path)}"]`);
  const previewWrap = field?.querySelector("[data-asset-preview]");
  const section = input.closest(".editor-section");
  const oldHint = section?.querySelector(".summary-hint");
  const oldUrl = String(urlInput?.value || getByPath(contentCache, path) || "").trim();

  if (oldHint) oldHint.textContent = "Comprobando storage…";
  input.disabled = true;

  let uploadedUrl = "";
  try {
    const token = await auth.currentUser.getIdToken();

    // Fail fast with a useful message instead of leaving the UI at "Subiendo…"
    // when PHP cannot write to the persistent cPanel asset directory.
    await checkAssetHealth(token);

    if (oldHint) oldHint.textContent = "Subiendo…";

    const body = new FormData();
    body.append("file", file);
    body.append("key", key);
    // Fallback for cPanel/CGI installations that strip Authorization headers.
    body.append("_firebaseToken", token);

    const uploadResponse = await fetchWithTimeout("api/upload-website-asset.php", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Firebase-Token": token
      },
      body
    }, 45000);

    const uploadResult = await safeJson(uploadResponse);
    if (!uploadResponse.ok || !uploadResult?.ok || !uploadResult?.url) {
      throw new Error(uploadResult?.error || `Upload failed (${uploadResponse.status})`);
    }
    uploadedUrl = uploadResult.url;

    // Persist the narrowest safe Firestore field. Firestore cannot update a
    // single array element by numeric dotted path, so image fields inside
    // arrays save only their containing array. All other images still save
    // only the exact field. This keeps unrelated unsaved edits untouched.
    const nextContent = structuredClone(contentCache);
    setByPath(nextContent, path, uploadedUrl);
    const arrayRoot = arrayRootForPath(path);
    const patch = arrayRoot
      ? { [arrayRoot]: getByPath(nextContent, arrayRoot) }
      : { [path]: uploadedUrl };
    patch.updatedAt = serverTimestamp();
    patch.updatedBy = auth.currentUser.email || "authenticated-user";
    await updateDoc(doc(db, SITE_CONTENT_COLLECTION, SITE_CONTENT_HOME_DOC), patch);

    contentCache = nextContent;
    if (urlInput) urlInput.value = uploadedUrl;
    renderAssetPreview(previewWrap, uploadedUrl, input.accept);
    if (oldHint) oldHint.textContent = "Guardado";

    // Delete only AFTER Firestore confirms the new URL. The PHP endpoint
    // independently verifies that the old URL belongs to our asset domain and
    // is no longer referenced anywhere in siteContent/home.
    if (isManagedCpanelAsset(oldUrl) && oldUrl !== uploadedUrl) {
      try {
        await requestAssetDelete(oldUrl, token);
      } catch (deleteError) {
        console.warn("Old asset was preserved:", deleteError);
      }
    }
  } catch (error) {
    console.error("cPanel website asset upload failed", error);
    if (oldHint) oldHint.textContent = "Error de upload";

    // If upload succeeded but Firestore failed, clean only the newly uploaded
    // orphan. The previous image is intentionally preserved.
    if (uploadedUrl && isManagedCpanelAsset(uploadedUrl)) {
      try {
        const token = await auth.currentUser.getIdToken();
        await requestAssetDelete(uploadedUrl, token);
      } catch (cleanupError) {
        console.warn("New orphan asset could not be cleaned automatically:", cleanupError);
      }
    }
    alert(error?.message || "No fue posible subir y guardar el archivo.");
  } finally {
    input.value = "";
    input.disabled = false;
    setTimeout(() => { if (oldHint) oldHint.textContent = "Editar"; }, 2200);
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("El servidor tardó demasiado en responder. Revisa el endpoint PHP y permisos de la carpeta assets-nautica.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function checkAssetHealth(token) {
  const response = await fetchWithTimeout("api/asset-health.php", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Firebase-Token": token
    },
    cache: "no-store"
  }, 12000);
  const result = await safeJson(response);
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || `El storage de cPanel no está disponible (${response.status}).`);
  }
  return result;
}

function arrayRootForPath(path) {
  const parts = String(path || "").split(".");
  const index = parts.findIndex((part) => /^\d+$/.test(part));
  return index > 0 ? parts.slice(0, index).join(".") : "";
}

function getByPath(target, path) {
  return path.split(".").reduce((cursor, part) => cursor?.[/^\d+$/.test(part) ? Number(part) : part], target);
}

function isManagedCpanelAsset(url) {
  return typeof url === "string" && url.startsWith("https://assets.nauticahome.com.mx/");
}

async function safeJson(response) {
  try { return await response.json(); } catch { return null; }
}

async function requestAssetDelete(url, token) {
  const response = await fetchWithTimeout("api/delete-website-asset.php", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Firebase-Token": token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url })
  }, 20000);
  const result = await safeJson(response);
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || `Delete failed (${response.status})`);
  }
  return result;
}

function renderAssetPreview(container, url, accept = "image/*") {
  if (!container) return;
  container.innerHTML = "";
  if (!url) {
    const empty = document.createElement("div");
    empty.className = "asset-preview asset-preview-empty";
    empty.textContent = "Sin archivo";
    container.appendChild(empty);
    return;
  }
  if (accept.startsWith("video/")) {
    const video = document.createElement("video");
    video.className = "asset-preview";
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    container.appendChild(video);
  } else {
    const image = document.createElement("img");
    image.className = "asset-preview";
    image.src = url;
    image.alt = "";
    image.loading = "lazy";
    container.appendChild(image);
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

// Oaxsun Technologies — website modes and product waitlist
const modeDoc = () => doc(db, 'siteSettings', 'public');
let siteModesReady = false;
function syncModeDescriptions(){
 const commerce=document.getElementById('commerceMode')?.value;
 const site=document.getElementById('siteMode')?.value;
 document.getElementById('commerceModeDescription').textContent=commerce==='catalog'?'Catálogo: sin compras, con lista de espera.':'Tienda: compras y Stripe habilitados.';
 document.getElementById('siteModeDescription').textContent=site==='maintenance'?'Mantenimiento: intro y newsletter; acceso público restringido.':'Live: el público puede ingresar.';
}
for(const id of ['commerceMode','siteMode']) document.getElementById(id)?.addEventListener('change',syncModeDescriptions);
async function loadSiteModes(){
 const msg=document.getElementById('siteModesMessage');
 siteModesReady=false;
 try{
   const snap=await getDoc(modeDoc());
   const v=snap.exists()?snap.data():{commerceMode:'store',siteMode:'live'};
   if(!['store','catalog'].includes(v.commerceMode)||!['live','maintenance'].includes(v.siteMode)) throw new Error('Valores de modos no válidos en Firestore.');
   document.getElementById('commerceMode').value=v.commerceMode;
   document.getElementById('siteMode').value=v.siteMode;
   syncModeDescriptions();
   siteModesReady=true;
   msg.textContent='';
 }catch(e){msg.textContent='No se pudieron cargar los modos. Recarga el panel antes de guardar. '+(e?.message||'');}
}
async function saveSiteModes(){
 const msg=document.getElementById('siteModesMessage');
 if(!siteModesReady) throw new Error('No se pudieron cargar los modos desde Firebase; se canceló el guardado para evitar sobrescribirlos.');
 const commerceMode=document.getElementById('commerceMode').value;
 const siteMode=document.getElementById('siteMode').value;
 if(!['store','catalog'].includes(commerceMode)||!['live','maintenance'].includes(siteMode)) throw new Error('Selecciona modos válidos.');
 msg.textContent='Guardando modos…';
 try{
   await setDoc(modeDoc(),{commerceMode,siteMode,updatedAt:serverTimestamp()},{merge:true});
   const snap=await getDoc(modeDoc());
   if(!snap.exists()||snap.data().commerceMode!==commerceMode||snap.data().siteMode!==siteMode) throw new Error('Firebase no confirmó los modos seleccionados.');
   msg.textContent='Modos guardados correctamente.';
 }catch(e){msg.textContent='Error al guardar modos: '+e.message;throw e;}
}
const WAITLIST_SEND_URL = 'https://www.nauticahome.com.mx/api/brevo/send-waitlist.php';
const WAITLIST_ADMIN_UID = '5vwUKOwvdfQsmnLRhoJCEs9Rqyg1';
const WAITLIST_STATUS_LABELS = { pending: 'Registrado', sent: 'Enviado', visited: 'Visitó producto', notified: 'Estado anterior: notificado' };
let waitlistEntries = [];
let waitlistRequestId = 0;
let waitlistSessionId = 0;
let waitlistLoadError = '';
const waitlistSending = new Set();

function resetWaitlistState() {
  waitlistRequestId++;
  waitlistSessionId++;
  waitlistEntries = [];
  waitlistLoadError = '';
  waitlistSending.clear();
  document.getElementById('waitlistRows')?.replaceChildren();
  for (const id of ['waitlistMessage', 'waitlistSendMessage']) {
    const message = document.getElementById(id);
    if (message) {
      message.textContent = '';
      if (id === 'waitlistSendMessage') message.hidden = true;
    }
  }
}

function waitlistAdmin() {
  const user = auth?.currentUser;
  if (!user) throw new Error('Inicia sesión nuevamente.');
  if (user.uid !== WAITLIST_ADMIN_UID) throw new Error('Esta función requiere el administrador autorizado.');
  return user;
}

function renderWaitlist() {
  const tbody = document.getElementById('waitlistRows');
  const msg = document.getElementById('waitlistMessage');
  if (!tbody || !msg) return;
  if (auth?.currentUser?.uid !== WAITLIST_ADMIN_UID) {
    tbody.replaceChildren();
    msg.textContent = 'Inicia sesión con el administrador autorizado.';
    return;
  }
  const filter = (document.getElementById('waitlistSearch')?.value || '').trim().toLowerCase();
  const entries = waitlistEntries.filter(entry => [entry.sku, entry.productName, entry.email].join(' ').toLowerCase().includes(filter));
  const rows = entries.map(entry => {
    const tr = document.createElement('tr');
    for (const field of ['sku', 'productName', 'email', 'status']) {
      const td = document.createElement('td');
      td.textContent = field === 'status' ? (WAITLIST_STATUS_LABELS[entry.status] || entry.status || '—') : String(entry[field] || '—');
      tr.append(td);
    }
    const td = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'secondary-button compact';
    btn.type = 'button';
    btn.disabled = waitlistSending.has(entry.id);
    btn.textContent = btn.disabled ? 'Enviando…' : (entry.status === 'pending' ? 'Enviar email' : 'Volver a enviar');
    btn.addEventListener('click', () => sendWaitlistEmail(entry, btn));
    td.append(btn);
    tr.append(td);
    return tr;
  });
  // Build rows before replacing the table; a refresh failure retains the last successful result.
  tbody.replaceChildren(...rows);
  const count = entries.length + ' solicitudes';
  msg.textContent = waitlistLoadError ? waitlistLoadError + ' Se conservan los últimos datos cargados. ' + count : count;
}

async function loadWaitlist() {
  const msg = document.getElementById('waitlistMessage');
  const requestId = ++waitlistRequestId;
  const sessionId = waitlistSessionId;
  try {
    const user = waitlistAdmin();
    if (!db) throw new Error('Firebase no está disponible.');
    msg.textContent = 'Cargando…';
    const snap = await getDocs(collection(db, 'productWaitlist'));
    if (requestId !== waitlistRequestId || sessionId !== waitlistSessionId || auth?.currentUser !== user) return false;
    waitlistEntries = snap.docs.map(item => ({ ...item.data(), id: item.id }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    waitlistLoadError = '';
    renderWaitlist();
    return true;
  } catch (error) {
    if (requestId !== waitlistRequestId || sessionId !== waitlistSessionId) return false;
    waitlistLoadError = error?.code === 'permission-denied'
      ? 'Firestore no autorizó la lectura de la lista de espera.'
      : 'No se pudo actualizar la lista de espera. Comprueba la sesión y la conexión con Firebase.';
    console.warn('No se pudo cargar productWaitlist', error);
    renderWaitlist();
    return false;
  }
}

async function sendWaitlistEmail(entry, button) {
  if (waitlistSending.has(entry.id)) return;
  const msg = document.getElementById('waitlistSendMessage');
  const sessionId = waitlistSessionId;
  let accepted = false;
  try {
    const user = waitlistAdmin();
    if (window.location.origin !== 'https://panel.nauticahome.com.mx') {
      throw new Error('Abre https://panel.nauticahome.com.mx e inicia sesión allí para enviar correos.');
    }
    if (!confirm(`¿Enviar notificación a ${entry.email} sobre ${entry.productName}?`)) return;
    waitlistSending.add(entry.id);
    button.disabled = true;
    button.textContent = 'Enviando…';
    msg.hidden = false;
    msg.textContent = 'Enviando solicitud…';
    const jwt = await user.getIdToken();
    if (sessionId !== waitlistSessionId || auth?.currentUser !== user) return;
    const res = await fetch(WAITLIST_SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt },
      body: JSON.stringify({ id: entry.id })
    });
    const data = await res.json().catch(() => ({}));
    if (sessionId !== waitlistSessionId || auth?.currentUser !== user) return;
    if (!res.ok || !data.ok) throw new Error(data.error || 'El servidor no confirmó el envío.');
    accepted = true;
    const refreshed = await loadWaitlist();
    if (sessionId !== waitlistSessionId || auth?.currentUser !== user) return;
    msg.textContent = 'Brevo aceptó el envío a ' + entry.email + '.' + (refreshed ? '' : ' No se pudo actualizar la tabla; usa Actualizar antes de reenviar.');
  } catch (error) {
    if (sessionId !== waitlistSessionId) return;
    console.warn('No se pudo confirmar el envío de Lista de espera', error);
    msg.hidden = false;
    msg.textContent = accepted
      ? 'Brevo aceptó el envío, pero no se pudo actualizar la vista. No vuelvas a enviar sin revisar el estado.'
      : error instanceof TypeError
        ? 'No se pudo confirmar el envío: comprueba la conexión y el acceso HTTPS al backend. Revisa el estado antes de volver a enviar; no se reintentó automáticamente.'
        : 'No se pudo confirmar el envío: ' + error.message;
  } finally {
    if (sessionId === waitlistSessionId && waitlistSending.delete(entry.id)) renderWaitlist();
  }
}

document.getElementById('refreshWaitlist')?.addEventListener('click', loadWaitlist);
document.getElementById('waitlistSearch')?.addEventListener('input', renderWaitlist);
document.querySelector('[data-view="waitlist"]')?.addEventListener('click', () => {
  const msg = document.getElementById('waitlistSendMessage');
  msg.textContent = '';
  msg.hidden = true;
  loadWaitlist();
});
