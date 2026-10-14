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
  getDocFromServer,
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
    // Persist modes FIRST. Invalid endpoint values must never prevent changing Live/Mantenimiento.
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
    catalogSettingsMessage.textContent = "No se pudieron guardar los modos: " + (error?.message || String(error));
    catalogSettingsMessage.classList.add("error");
  } finally {
    saveCatalogSettingsButton.disabled = false;
  }
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
   const snap=await getDocFromServer(modeDoc());
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
   await setDoc(modeDoc(),{commerceMode,siteMode,updatedAt:serverTimestamp()});
   const snap=await getDocFromServer(modeDoc());
   if(!snap.exists()||snap.data().commerceMode!==commerceMode||snap.data().siteMode!==siteMode) throw new Error('Firebase no confirmó los modos seleccionados.');
   msg.textContent='Modos guardados correctamente.';
 }catch(e){msg.textContent='Error al guardar modos: '+e.message;throw e;}
}
async function loadWaitlist(){
  const tbody=document.getElementById('waitlistRows'),msg=document.getElementById('waitlistMessage');if(!db||!auth?.currentUser)return;
  msg.textContent='Cargando…';
  try {const snap=await getDocs(collection(db,'productWaitlist'));const filter=(document.getElementById('waitlistSearch').value||'').toLowerCase();tbody.replaceChildren();
    const entries=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).filter(v=>[v.sku,v.productName,v.email].join(' ').toLowerCase().includes(filter));
    for(const v of entries){const tr=document.createElement('tr');for(const field of ['sku','productName','email','status']){const td=document.createElement('td');td.textContent=String(v[field]||'—');tr.append(td)}const td=document.createElement('td'),btn=document.createElement('button');btn.className='secondary-button compact';btn.textContent=v.status==='notified'?'Marcar pendiente':'Marcar notificado';btn.onclick=async()=>{await updateDoc(doc(db,'productWaitlist',v.id),{status:v.status==='notified'?'pending':'notified'});loadWaitlist()};td.append(btn);tr.append(td);tbody.append(tr)}msg.textContent=entries.length+' solicitudes';
  }catch(e){msg.textContent='Error al cargar solicitudes: '+e.message}
}
document.getElementById('refreshWaitlist')?.addEventListener('click',loadWaitlist);
document.getElementById('waitlistSearch')?.addEventListener('input',loadWaitlist);
document.querySelector('[data-view="waitlist"]')?.addEventListener('click',loadWaitlist);
