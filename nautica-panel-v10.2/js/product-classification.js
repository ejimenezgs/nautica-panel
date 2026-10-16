const normalizeKey = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

export const normalizeClassificationText = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/\s+/g, " ");

export const PRODUCT_TAXONOMY = {
  "Indoor": [
    "Sofás", "Sillones", "Sillas", "Bancos", "Mesas de comedor", "Mesas de centro",
    "Mesas auxiliares", "Comedores", "Recámaras", "Camas", "Mesas de noche",
    "Buffets y consolas", "Escritorios", "Bares", "Otros"
  ],
  "Outdoor": [
    "Salas exteriores", "Sillas exteriores", "Mesas exteriores", "Camastros",
    "Comedores exteriores", "Bancos exteriores", "Otros"
  ],
  "Decoración": [
    "Accesorios", "Espejos", "Lámparas", "Cuadros", "Mesas decorativas",
    "Objetos decorativos", "Otros"
  ],
  "Baño": [
    "Lavabos", "Grifería", "Regaderas", "Accesorios de baño", "Muebles de baño", "Otros"
  ],
  "Sin clasificar": ["Sin clasificar"]
};

const MAIN_CATEGORY_RULES = [
  { category: "Baño", patterns: [
    /(^|\b)(bano|bath|bathroom|sanitary|sanitario|sanitarios)(\b|$)/,
    /\b(lavabo|lavatory|sink|basin|faucet|grifo|griferia|mixer|regadera|shower|vanity)\b/
  ]},
  { category: "Outdoor", patterns: [
    /(^|\b)(outdoor|exterior|jardin|garden|terraza|patio)(\b|$)/,
    /\b(camastro|lounger|sunbed|tumbona|chaise longue)\b/
  ]},
  { category: "Decoración", patterns: [
    /(^|\b)(decor|decoration|decoracion|decorativo|decorative)(\b|$)/,
    /\b(espejo|mirror|cuadro|wall art|florero|vase|ornamento|figurine|escultura)\b/
  ]},
  { category: "Indoor", patterns: [
    /(^|\b)(indoor|interior|furniture|mobiliario|living|comedor|dining|recamara|bedroom)(\b|$)/,
    /\b(sofa|sillon|armchair|chair|silla|mesa|table|cama|bed|buro|nightstand|buffet|consola|escritorio|desk|bar|banco|stool)\b/
  ]}
];

const SUBCATEGORY_RULES = {
  "Indoor": [
    ["Mesas de noche", [/\b(mesa de noche|nightstand|bedside table|bur[oó]|buro)\b/]],
    ["Mesas auxiliares", [/\b(mesa auxiliar|mesa lateral|side table|end table|accent table)\b/]],
    ["Mesas de centro", [/\b(mesa de centro|coffee table|cocktail table)\b/]],
    ["Mesas de comedor", [/\b(mesa de comedor|dining table)\b/]],
    ["Comedores", [/\b(antecomedor|comedor|dining set|dining room|juego de comedor)\b/]],
    ["Bancos", [/\b(banco|bar stool|counter stool|stool|taburete)\b/]],
    ["Sillones", [/\b(sillon|poltrona|armchair|accent chair|butaca|recliner)\b/]],
    ["Sofás", [/\b(sofa|sectional|seccional|loveseat|love seat)\b/]],
    ["Sillas", [/\b(silla|chair)\b/]],
    ["Camas", [/\b(cama|bed|cabecera|headboard)\b/]],
    ["Recámaras", [/\b(recamara|bedroom set|juego de recamara)\b/]],
    ["Buffets y consolas", [/\b(buffet|consola|console|credenza|aparador|sideboard)\b/]],
    ["Escritorios", [/\b(escritorio|desk)\b/]],
    ["Bares", [/\b(bar|bar cabinet|cantina)\b/]]
  ],
  "Outdoor": [
    ["Camastros", [/\b(camastro|sunbed|lounger|tumbona|chaise longue)\b/]],
    ["Comedores exteriores", [/\b(comedor exterior|outdoor dining|dining set|juego de comedor)\b/]],
    ["Salas exteriores", [/\b(sala exterior|outdoor sofa|outdoor sectional|patio set|conversation set)\b/]],
    ["Sillas exteriores", [/\b(silla exterior|outdoor chair|patio chair|garden chair|chair)\b/]],
    ["Bancos exteriores", [/\b(banco exterior|outdoor stool|bar stool|counter stool|stool|banco)\b/]],
    ["Mesas exteriores", [/\b(mesa exterior|outdoor table|patio table|garden table|side table|coffee table|dining table|mesa)\b/]]
  ],
  "Decoración": [
    ["Espejos", [/\b(espejo|mirror)\b/]],
    ["Lámparas", [/\b(lampara|lamp|lighting|luminaria|candil|chandelier|pendant)\b/]],
    ["Cuadros", [/\b(cuadro|wall art|canvas|painting|pintura)\b/]],
    ["Mesas decorativas", [/\b(side table|accent table|decorative furniture|mesa auxiliar|mesa lateral|mesa decorativa)\b/]],
    ["Accesorios", [/\b(accesorio|accessory|bandeja|tray|candelabro|candle holder|bookend)\b/]],
    ["Objetos decorativos", [/\b(decorativo|decorative|ornamento|figurine|escultura|sculpture|florero|vase|jarron|objeto decorativo)\b/]]
  ],
  "Baño": [
    ["Grifería", [/\b(griferia|grifo|faucet|mixer|mezcladora|llave)\b/]],
    ["Regaderas", [/\b(regadera|shower|showerhead|shower head)\b/]],
    ["Lavabos", [/\b(lavabo|sink|basin|lavatory)\b/]],
    ["Muebles de baño", [/\b(mueble de bano|bathroom furniture|vanity|gabinete de bano|bath cabinet)\b/]],
    ["Accesorios de baño", [/\b(accesorio de bano|bath accessory|toallero|towel bar|jabonera|soap dish|portarrollo|toilet paper holder)\b/]]
  ]
};

const EXPLICIT_FIELD_SCORES = new Map([
  ["categoria", 100], ["category", 100], ["categorianombre", 98], ["categoryname", 98],
  ["subcategoria", 96], ["subcategory", 96], ["subcategorianombre", 95], ["subcategoryname", 95],
  ["familia", 90], ["family", 90], ["subfamilia", 89], ["subfamily", 89],
  ["linea", 86], ["line", 86], ["sublinea", 85], ["grupo", 82], ["group", 82],
  ["rubro", 80], ["clasificacion", 78], ["classification", 78],
  ["tipoproducto", 76], ["producttype", 76], ["tipo", 70], ["type", 70]
]);

function valueToText(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join(" / ");
  if (typeof value === "object") {
    for (const key of ["nombre", "name", "label", "title", "value", "descripcion", "description"]) {
      const match = Object.entries(value).find(([candidate]) => normalizeKey(candidate) === normalizeKey(key));
      if (match) {
        const resolved = valueToText(match[1]);
        if (resolved) return resolved;
      }
    }
    return Object.values(value).map(valueToText).filter(Boolean).join(" / ");
  }
  return String(value).trim();
}

export function getExplicitClassificationSignals(raw) {
  if (!raw || typeof raw !== "object") return [];
  const signals = [];
  const queue = [{ value: raw, depth: 0, path: "" }];
  const seen = new Set();
  while (queue.length) {
    const { value, depth, path } = queue.shift();
    if (!value || typeof value !== "object" || seen.has(value) || depth > 5) continue;
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      const normalizedKey = normalizeKey(key);
      const score = EXPLICIT_FIELD_SCORES.get(normalizedKey) || 0;
      if (score && child !== null && child !== undefined && child !== "") {
        const text = valueToText(child).replace(/\s+/g, " ").trim();
        if (text) signals.push({ key: path ? `${path}.${key}` : key, text, score: score - depth * 4 });
      }
      if (child && typeof child === "object") queue.push({ value: child, depth: depth + 1, path: path ? `${path}.${key}` : key });
    }
  }
  return signals.sort((a, b) => b.score - a.score || a.text.length - b.text.length);
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function canonicalCategory(value) {
  const text = normalizeClassificationText(value);
  if (!text) return "";
  for (const rule of MAIN_CATEGORY_RULES) if (matchesAny(text, rule.patterns)) return rule.category;
  return "";
}

export function canonicalSubcategory(category, value) {
  const text = normalizeClassificationText(value);
  if (!text || !SUBCATEGORY_RULES[category]) return "";
  for (const [label, patterns] of SUBCATEGORY_RULES[category]) if (matchesAny(text, patterns)) return label;
  return "";
}

function automaticClassification(product) {
  const signals = getExplicitClassificationSignals(product.raw);
  const explicitText = signals.map((signal) => signal.text).join(" / ");
  const normalizedApiCategory = String(product.category || "");
  const normalizedApiSubcategory = String(product.subcategory || "");

  // Respect a main category explicitly supplied by the API before evaluating
  // more specific type/family/name signals.
  let category = canonicalCategory(normalizedApiCategory);
  if (!category) {
    for (const signal of signals) {
      category = canonicalCategory(signal.text);
      if (category) break;
    }
  }
  if (!category) category = canonicalCategory(normalizedApiSubcategory);

  let subcategory = category ? canonicalSubcategory(category, [normalizedApiSubcategory, explicitText, normalizedApiCategory].filter(Boolean).join(" / ")) : "";
  let source = category ? "api" : "rules";

  const nameText = normalizeClassificationText(product.name);
  if (!category) category = canonicalCategory(nameText);
  if (category && !subcategory) subcategory = canonicalSubcategory(category, nameText);

  if (!category) {
    const descriptionText = normalizeClassificationText([product.description, product.raw?.tags, product.raw?.etiquetas].filter(Boolean).join(" "));
    category = canonicalCategory(descriptionText);
    if (category && !subcategory) subcategory = canonicalSubcategory(category, descriptionText);
  }

  if (!category) return {
    category: "Sin clasificar",
    subcategory: "Sin clasificar",
    source: "unclassified",
    explicitSignals: signals
  };

  if (!subcategory) subcategory = "Otros";
  return { category, subcategory, source, explicitSignals: signals };
}

export function classifyProduct(product, override = {}) {
  const automatic = automaticClassification(product);
  const overrideCategoryRaw = override.categoryOverride || override.customCategory || "";
  const categoryOverride = canonicalCategory(overrideCategoryRaw) || (PRODUCT_TAXONOMY[overrideCategoryRaw] ? overrideCategoryRaw : "");
  const category = categoryOverride || automatic.category;

  const overrideSubRaw = override.subcategoryOverride || override.customSubcategory || "";
  let subcategoryOverride = "";
  if (overrideSubRaw) {
    subcategoryOverride = PRODUCT_TAXONOMY[category]?.includes(overrideSubRaw)
      ? overrideSubRaw
      : canonicalSubcategory(category, overrideSubRaw);
  }
  const subcategory = subcategoryOverride || (category === automatic.category ? automatic.subcategory : (category === "Sin clasificar" ? "Sin clasificar" : "Otros"));

  return {
    category,
    subcategory,
    source: categoryOverride || subcategoryOverride ? "override" : automatic.source,
    categoryOverride,
    subcategoryOverride,
    automaticCategory: automatic.category,
    automaticSubcategory: automatic.subcategory,
    explicitSignals: automatic.explicitSignals
  };
}

export function taxonomySubcategories(category) {
  return PRODUCT_TAXONOMY[category] || [];
}
