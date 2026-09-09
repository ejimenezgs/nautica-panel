export const INVENTORY_API_URL = "https://segel-erp.vercel.app/api/catalogo";

const normalizeKey = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

export function findDeep(source, keys) {
  const wanted = new Set(keys.map(normalizeKey));
  const queue = [source];
  const seen = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    for (const [key, value] of Object.entries(current)) {
      if (wanted.has(normalizeKey(key)) && value !== undefined && value !== null && value !== "") return value;
    }
    for (const value of Object.values(current)) {
      if (value && typeof value === "object") queue.push(value);
    }
  }
  return undefined;
}

function directField(source, keys) {
  if (!source || typeof source !== "object") return undefined;
  const wanted = new Set(keys.map(normalizeKey));
  for (const [key, value] of Object.entries(source)) {
    if (wanted.has(normalizeKey(key)) && value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function toText(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(" / ");
  if (isObject(value)) {
    const label = directField(value, ["nombre", "name", "label", "title", "descripcion", "description", "value"]);
    if (label !== undefined && label !== value) return toText(label);
    return Object.values(value).map(toText).filter(Boolean).join(" / ");
  }
  return String(value).trim();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  if (typeof value === "string") {
    const clean = value.trim();
    if (!clean) return [];
    if (/^https?:\/\//i.test(clean)) return [clean];
    return clean.split(/[,;|\n]/).map((item) => item.trim()).filter(Boolean);
  }
  if (isObject(value)) return Object.values(value);
  return [value];
}

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value === null || value === undefined || value === "") return null;
  if (isObject(value)) {
    const preferred = findDeep(value, [
      "total", "cantidad", "stock", "existencia", "existencias", "disponible", "disponibles",
      "available", "quantity", "qty", "onHand", "saldo", "unidades", "price", "precio", "amount", "monto"
    ]);
    if (preferred !== undefined && preferred !== value) return parseNumber(preferred);
    return null;
  }
  const original = String(value).trim();
  if (!original) return null;
  if (/^(si|sí|yes|available|disponible|en stock)$/i.test(original)) return 1;
  if (/^(no|not available|sin stock|agotado)$/i.test(original)) return 0;
  let text = original.replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  if (!text) return null;
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma > lastDot) text = text.replace(/\./g, "").replace(",", ".");
  else text = text.replace(/,/g, "");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

const STOCK_EXACT_KEYS = new Set([
  "stock", "stocktotal", "totalstock", "stockactual", "stockdisponible", "availablestock",
  "existencia", "existencias", "existenciatotal", "totalexistencia", "totalexistencias",
  "existenciaactual", "existenciasactuales", "existenciadisponible", "existenciasdisponibles",
  "cantidadexistencia", "cantidadexistente", "cantidadactual", "cantidaddisponible",
  "disponible", "disponibles", "available", "availability", "quantity", "qty", "onhand",
  "saldo", "saldodisponible", "inventarioactual", "inventariodisponible", "unidadesdisponibles"
]);

function isStockKey(key) {
  const normalized = normalizeKey(key);
  if (STOCK_EXACT_KEYS.has(normalized)) return true;
  return /(stock|existenc|inventari|onhand)/.test(normalized)
    || /(cantidad|unidades).*(dispon|actual|exist)/.test(normalized)
    || /(dispon|available).*(cantidad|stock|exist|unidades)/.test(normalized);
}

function numericStockLeaves(value, seen = new Set()) {
  if (value === null || value === undefined || value === "") return [];
  if (typeof value !== "object") {
    const parsed = parseNumber(value);
    return Number.isFinite(parsed) ? [parsed] : [];
  }
  if (seen.has(value)) return [];
  seen.add(value);
  const values = [];
  for (const [key, child] of Object.entries(value)) {
    if (isStockKey(key)) {
      if (child && typeof child === "object") values.push(...numericStockLeaves(child, seen));
      else {
        const parsed = parseNumber(child);
        if (Number.isFinite(parsed)) values.push(parsed);
      }
    } else if (child && typeof child === "object") values.push(...numericStockLeaves(child, seen));
  }
  return values;
}

function parseStock(raw) {
  const total = findDeep(raw, [
    "stockTotal", "totalStock", "existenciaTotal", "totalExistencia", "totalExistencias",
    "stockActual", "existenciaActual", "existenciaDisponible", "stockDisponible",
    "cantidadDisponible", "cantidadExistencia", "saldoDisponible", "onHand"
  ]);
  const parsedTotal = parseNumber(total);
  if (Number.isFinite(parsedTotal)) return Math.max(0, parsedTotal);

  const candidates = numericStockLeaves(raw).filter(Number.isFinite);
  if (candidates.length) {
    const positives = candidates.filter((value) => value > 0);
    if (positives.length) {
      const unique = [...new Set(positives)];
      return Math.max(0, unique.reduce((sum, value) => sum + value, 0));
    }
    return 0;
  }

  const direct = findDeep(raw, [
    "stock", "existencia", "existencias", "cantidad", "disponible", "disponibles",
    "available", "availability", "quantity", "qty", "saldo", "inventario", "inventory", "unidades"
  ]);
  const parsed = parseNumber(direct);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function extractImages(raw) {
  const source = findDeep(raw, ["imagenes", "images", "fotos", "photos", "imageUrls", "galeria", "gallery"]);
  const direct = findDeep(raw, ["imagen", "image", "foto", "photo", "imageUrl", "urlImagen", "portada", "thumbnail"]);
  const images = asArray(source).map((item) => {
    if (typeof item === "string") return item;
    return toText(directField(item, ["url", "src", "imageUrl", "imagen", "foto"]));
  }).filter((item) => /^https?:\/\//i.test(item));
  if (typeof direct === "string" && /^https?:\/\//i.test(direct) && !images.includes(direct)) images.unshift(direct);
  return images;
}

function extractVariants(raw) {
  const source = findDeep(raw, ["variantes", "variants", "presentaciones", "presentations", "opciones", "options"]);
  return asArray(source);
}

function extractPrices(raw) {
  const promotionNode = findDeep(raw, ["promocion", "promotion", "promo", "oferta", "sale", "descuento", "discount"]);
  const promotionObject = isObject(promotionNode) ? promotionNode : null;

  const directPromo = parseNumber(findDeep(raw, [
    "precioPromocion", "precioPromo", "promotionPrice", "promotionalPrice", "promoPrice",
    "precioOferta", "offerPrice", "salePrice", "discountPrice", "precioDescuento",
    "precioEspecial", "specialPrice", "precioConDescuento", "finalPrice", "precioFinal"
  ]));
  const nestedPromo = promotionObject ? parseNumber(findDeep(promotionObject, [
    "precioPromocion", "precioPromo", "promotionPrice", "promoPrice", "precioOferta", "offerPrice",
    "salePrice", "discountPrice", "precioDescuento", "precioEspecial", "specialPrice", "precioConDescuento",
    "finalPrice", "precioFinal", "precio", "price", "monto", "amount"
  ])) : null;
  const listPrice = parseNumber(findDeep(raw, [
    "precioLista", "listPrice", "regularPrice", "precioRegular", "precioPublico", "msrp",
    "precioOriginal", "originalPrice", "precioAntes", "beforePrice", "basePrice", "precioBase"
  ]));
  const fallbackPrice = parseNumber(findDeep(raw, ["precio", "price", "precioVenta", "sellingPrice", "precioPublico", "precioLista"]));
  const nestedOriginal = promotionObject ? parseNumber(findDeep(promotionObject, [
    "precioOriginal", "originalPrice", "precioAntes", "beforePrice", "precioLista", "listPrice",
    "regularPrice", "precioRegular", "basePrice", "precioBase"
  ])) : null;

  let promoPrice = directPromo ?? nestedPromo;
  let basePrice = listPrice ?? nestedOriginal;
  if (promoPrice !== null && basePrice === null && fallbackPrice !== null && fallbackPrice > promoPrice) basePrice = fallbackPrice;
  if (basePrice === null) basePrice = fallbackPrice ?? promoPrice;
  if (promoPrice !== null && basePrice !== null && promoPrice >= basePrice) promoPrice = null;
  return { price: basePrice, promoPrice };
}

export function normalizeProduct(raw, index = 0) {
  const rawCode = findDeep(raw, ["codigo", "code", "sku", "clave", "idProducto", "productId", "id"]);
  const code = rawCode === undefined || rawCode === null ? "" : String(rawCode).trim();
  const sourceIdValue = findDeep(raw, ["idProducto", "productId", "id"]);
  const sourceId = sourceIdValue === undefined || sourceIdValue === null ? "" : String(sourceIdValue).trim();
  const name = toText(findDeep(raw, ["nombre", "name", "titulo", "title", "descripcionCorta"])) || (code ? `Producto ${code}` : `Producto ${index + 1}`);
  const category = toText(findDeep(raw, ["categoria", "category", "categoriaNombre", "categoryName", "familia", "family", "linea", "line"]));
  const subcategory = toText(findDeep(raw, ["subcategoria", "subcategory", "subcategoriaNombre", "subcategoryName", "subfamilia", "subfamily", "sublinea"]));
  const { price, promoPrice } = extractPrices(raw);
  const images = extractImages(raw);
  return {
    id: sourceId || code || `product-${index + 1}`,
    sourceId,
    code,
    name,
    category,
    subcategory,
    price,
    promoPrice,
    stock: parseStock(raw),
    imageUrl: images[0] || "",
    images,
    description: toText(findDeep(raw, ["descripcion", "description", "detalle", "details", "descripcionLarga"])),
    variants: extractVariants(raw),
    raw
  };
}

export function unwrapPayload(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["productos", "products", "data", "catalogo", "items", "result", "results"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  return [];
}

export async function fetchInventoryProducts({ signal, timeoutMs = 20000 } = {}) {
  const controller = signal ? null : new AbortController();
  const activeSignal = signal || controller.signal;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(INVENTORY_API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: activeSignal
    });
    if (!response.ok) throw new Error(`La API respondió HTTP ${response.status}.`);
    const payload = await response.json();
    const rows = unwrapPayload(payload);
    return rows.map(normalizeProduct).filter((product) => product.code);
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("La API de inventario tardó demasiado en responder.");
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
