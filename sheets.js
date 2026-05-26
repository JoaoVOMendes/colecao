/* sheets.js — Google Sheets read (CSV via gviz) + Apps Script webhook write */

// ─── EDITE AQUI pra deixar sua coleção pré-conectada ──────────────────────────
const DEFAULT_SHEET_ID = "";
const DEFAULT_SCRIPT_URL = "";
// ──────────────────────────────────────────────────────────────────────────────

const STORAGE = {
  sheetId: "colecao:sheetId",
  scriptUrl: "colecao:scriptUrl",
  bannerDismissed: "colecao:bannerDismissed",
};

function extractSheetId(input) {
  if (!input) return "";
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : input.trim();
}

const SheetsStore = {
  getSheetId: () => localStorage.getItem(STORAGE.sheetId) || DEFAULT_SHEET_ID || "",
  setSheetId: (v) => {
    const id = extractSheetId(v);
    if (id) localStorage.setItem(STORAGE.sheetId, id);
    else localStorage.removeItem(STORAGE.sheetId);
    return id;
  },
  getScriptUrl: () => localStorage.getItem(STORAGE.scriptUrl) || DEFAULT_SCRIPT_URL || "",
  setScriptUrl: (v) => {
    const u = (v || "").trim();
    if (u) localStorage.setItem(STORAGE.scriptUrl, u);
    else localStorage.removeItem(STORAGE.scriptUrl);
    return u;
  },
  isBannerDismissed: () => localStorage.getItem(STORAGE.bannerDismissed) === "1",
  dismissBanner: () => localStorage.setItem(STORAGE.bannerDismissed, "1"),
};

/* ───────── CSV parser ───────── */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ""));
}

/* ───────── Header mapping (PT-BR + EN tolerant) ───────── */
const HEADER_MAP = {
  name:   ["modelo", "nome", "name", "model"],
  brand:  ["marca", "brand"],
  make:   ["montadora", "fabricante", "manufacturer", "make"],
  year:   ["ano do carro", "ano carro", "car year"],
  yearReleased: ["ano de lançamento", "ano de lancamento", "lançamento", "lancamento", "release year"],
  yearFallback: ["ano", "year"],
  series: ["série", "serie", "coleção", "colecao", "series", "linha", "edição", "edicao"],
  color:  ["cor", "color", "colour"],
  shape:  ["tipo", "shape", "silhueta", "categoria"],
  price:  ["preço pago", "preco pago", "preço", "preco", "valor", "price", "custo"],
  status: ["condição", "condicao", "status", "estado"],
  rarity: ["raridade", "rarity"],
  note:   ["nota", "notas", "obs", "observação", "observacao", "note", "notes", "comentário", "comentario"],
  image:  ["foto da miniatura", "foto", "imagem", "image", "img", "url", "link"],
};
function findHeader(headers, schemaField) {
  const candidates = HEADER_MAP[schemaField] || [];
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || "").toLowerCase().trim();
    if (candidates.some(c => h === c)) return i;
  }
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || "").toLowerCase().trim();
    if (!h) continue;
    if (candidates.some(c => h.includes(c))) return i;
  }
  return -1;
}

/* ───────── Normalizers + inference ───────── */
function normalizeStatus(raw) {
  const s = (raw || "").toLowerCase().trim();
  if (!s) return "lacrado";
  if (s.includes("aberto") || s.includes("open") || s.includes("unboxed")) return "aberto";
  if (s.includes("custom")) return "customizado";
  return "lacrado";
}
function normalizeRarity(raw) {
  const s = (raw || "").toLowerCase().trim();
  if (s.includes("super") || s === "sth" || s.includes("$th")) return "sth";
  if (s.includes("treasure") || s === "th") return "th";
  if (s.includes("raro") || s.includes("rare")) return "raro";
  if (s.includes("incomum") || s.includes("uncommon")) return "incomum";
  return "comum";
}
function normalizeColor(raw, fallbackName = "") {
  const s = (raw || "").toLowerCase().trim();
  if (window.TINTS[s]) return s;
  const map = {
    vermelho: "red", laranja: "orange", amarelo: "yellow", verde: "green",
    azul: "blue", roxo: "purple", rosa: "pink", prata: "silver", prateado: "silver",
    preto: "black", branco: "white", dourado: "gold", cinza: "silver",
  };
  if (map[s]) return map[s];
  if (fallbackName) return hashColor(fallbackName);
  return "silver";
}
function hashColor(name) {
  const colors = Object.keys(window.TINTS);
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}
function normalizeShape(raw, fallbackName = "") {
  const s = (raw || "").toLowerCase().trim();
  const known = ["muscle", "jdm", "exotic", "rally", "truck"];
  if (known.includes(s)) return s;
  if (fallbackName) return inferShape(fallbackName);
  return "muscle";
}
function inferShape(name) {
  const n = (name || "").toLowerCase();
  if (/skyline|gt-?r|rx-?7|rx-?8|supra|civic|s2000|miata|nsx|integra|silvia|ae86|trueno|levin|datsun|fairlady|sentra|tsuru|mr2|prelude|del sol|wrx|impreza/.test(n)) return "jdm";
  if (/lambo|ferrari|porsche|mclaren|bugatti|pagani|aston|gt40|f40|f50|p1|huayra|chiron|countach|enzo|gallardo|aventador|huracan|spyder|cobra|stingray|viper|noble|koenigsegg|saleen|carrera|spider|spyker|veyron|maserati/.test(n)) return "exotic";
  if (/camaro|mustang|charger|challenger|chevelle|'cuda|cuda|nova|firebird|trans ?am|bel ?air|impala|gto|corvette|gasser|dragster|barracuda|road runner|hemi|fury|galaxie|fairlane|torino|boss/.test(n)) return "muscle";
  if (/bronco|f-?150|silverado|defender|tacoma|wrangler|land rover|jeep|ram|tundra|hilux|titan|sierra|colorado|ranger|pick-?up|truck|van|bus|brasilia|kombi|amarok|hilux|trooper|patrol|highlander|expedition|tahoe|escalade|suburban|cherokee/.test(n)) return "truck";
  if (/escort|delta|stratos|celica|rally|mini ?cooper|fiesta|focus|peugeot|205|polo|gti|hatch|clio|saxo|punto|swift|yaris|fit|march|sandero|gol/.test(n)) return "rally";
  return "muscle";
}
function parsePriceBR(raw) {
  if (!raw) return 0;
  const s = String(raw).trim();
  if (/rifa|brinde|gan(h|h)|premio|prêmio|grat/i.test(s)) return 0;
  const cleaned = s.replace(/[R$\s]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function normalizeImageUrl(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const driveFile = s.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFile) return `https://drive.google.com/thumbnail?id=${driveFile[1]}&sz=w800`;
  const driveOpen = s.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpen) return `https://drive.google.com/thumbnail?id=${driveOpen[1]}&sz=w800`;
  const driveUc = s.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (driveUc) return `https://drive.google.com/thumbnail?id=${driveUc[1]}&sz=w800`;
  return s;
}

function nonEmpty(v) { return v !== undefined && v !== null && String(v).trim() !== ""; }

/* ───────── Public: load sheet ───────── */
async function fetchSheet(sheetId, sheetName) {
  if (!sheetId) return null;
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : ""}`;
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error("Falha de rede ao abrir a planilha. Verifique a URL.");
  }
  if (!res.ok) {
    if (res.status === 404) throw new Error("Planilha não encontrada.");
    if (res.status === 401 || res.status === 403) {
      throw new Error("Planilha privada. Compartilhe como 'Qualquer pessoa com o link pode visualizar'.");
    }
    throw new Error("Erro ao abrir planilha: " + res.status);
  }
  const text = await res.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const idx = {};
  ["name","brand","make","year","yearReleased","yearFallback","series","color","shape","price","status","rarity","note","image"]
    .forEach(k => { idx[k] = findHeader(headers, k); });

  if (idx.name < 0) throw new Error("Planilha sem coluna 'Modelo' ou 'Nome' reconhecida.");

  return rows.slice(1)
    .filter(r => {
      const hasName = idx.name >= 0 && r[idx.name] && r[idx.name].trim();
      const hasMake = idx.make >= 0 && r[idx.make] && r[idx.make].trim();
      return hasName || hasMake;
    })
    .map((r, i) => {
      const name = (r[idx.name] || "").trim();
      const make = nonEmpty(r[idx.make]) ? r[idx.make].trim() : "";
      const displayName = name || make;
      const fullName = make && name ? `${make} ${name}` : displayName;
      const yearCar = parseInt(r[idx.year]);
      const yearRel = parseInt(r[idx.yearReleased]);
      const yearAny = parseInt(r[idx.yearFallback]);
      const year = yearCar || yearAny || yearRel || null;
      return {
        id: String(i + 1).padStart(3, "0"),
        name: displayName,
        make,
        fullName,
        brand: (idx.brand >= 0 && r[idx.brand]) || "Hot Wheels",
        year,
        yearReleased: yearRel || null,
        series: (idx.series >= 0 && r[idx.series]) || "Mainline",
        color: normalizeColor(idx.color >= 0 ? r[idx.color] : "", fullName),
        shape: normalizeShape(idx.shape >= 0 ? r[idx.shape] : "", fullName),
        price: parsePriceBR(idx.price >= 0 ? r[idx.price] : 0),
        priceRaw: (idx.price >= 0 ? r[idx.price] : "") || "",
        status: normalizeStatus(idx.status >= 0 ? r[idx.status] : ""),
        rarity: normalizeRarity(idx.rarity >= 0 ? r[idx.rarity] : ""),
        note: (idx.note >= 0 && r[idx.note]) || "",
        image: normalizeImageUrl(idx.image >= 0 ? r[idx.image] : ""),
      };
    });
}

/* ───────── Public: append row via Apps Script webhook ─────────
   Defense layer 1 (client): tracks submitId in-flight. If the same submitId
   shows up twice within 10s (rapid re-render, doubletap, etc.) the second
   call is silently dropped. The real dedupe lives server-side in Apps Script
   — this is just to save the round-trip. */
const _inFlight = new Set();

async function appendToSheet(scriptUrl, row) {
  if (!scriptUrl) return false;

  // Prefer the explicit submitId already minted in AddDrawer. Fall back to a
  // content hash for any caller that doesn't supply one.
  const key = row.submitId || [
    row.make || "", row.name || "", row.brand || "",
    row.year || "", row.series || "", row.price || "",
  ].join("|").toLowerCase();

  if (_inFlight.has(key)) {
    console.warn("appendToSheet: duplicate call blocked client-side", key);
    return false;
  }

  _inFlight.add(key);
  setTimeout(() => _inFlight.delete(key), 10000);

  try {
    await fetch(scriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(row),
    });
    return true;
  } catch (e) {
    console.error("Sheets append failed:", e);
    _inFlight.delete(key);
    return false;
  }
}

/* ───────── Public: upload photo via Apps Script ─────────
   Reads the File as base64, POSTs to the Apps Script web app with
   action="upload". Apps Script salva no Drive (pasta "Coleção - Fotos"),
   marca como público e devolve URL pública pra usar em <img src="">.

   Diferente de appendToSheet, esse fetch usa mode: "cors" porque a gente
   precisa LER a resposta. Funciona com Apps Script web app deployado
   com acesso "Anyone" + Content-Type: text/plain (simple CORS request). */
async function uploadPhoto(scriptUrl, file, onProgress) {
  if (!scriptUrl) throw new Error("Apps Script não configurado. Conecte na engrenagem.");
  if (!file) throw new Error("Nenhum arquivo");
  if (!/^image\//i.test(file.type)) throw new Error("Arquivo precisa ser imagem");

  // Limite client-side pra não estourar quota do Apps Script (50MB POST limit).
  // Base64 infla ~33%, então 30MB raw é o teto seguro.
  const MAX_BYTES = 30 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    throw new Error("Imagem muito grande (" + (file.size/1024/1024).toFixed(1) + "MB). Máximo 30MB.");
  }

  if (onProgress) onProgress({ phase: "reading" });
  const dataUrl = await new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = function() { reject(new Error("Falha lendo arquivo")); };
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(",");
  const meta = dataUrl.slice(0, comma);
  const base64 = dataUrl.slice(comma + 1);
  const mimeMatch = meta.match(/data:([^;]+)/);
  const mimeType = (mimeMatch && mimeMatch[1]) || file.type || "image/jpeg";

  const ext = mimeType.split("/")[1] || "jpg";
  const fileName = file.name || ("colecao-" + Date.now() + "." + ext);

  if (onProgress) onProgress({ phase: "uploading" });
  const res = await fetch(scriptUrl, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "upload",
      fileName: fileName,
      mimeType: mimeType,
      data: base64,
    }),
  });
  if (!res.ok) throw new Error("Apps Script respondeu " + res.status);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); }
  catch (e) { throw new Error("Resposta do Apps Script não é JSON: " + text.slice(0, 200)); }

  if (!json.ok) throw new Error(json.error || "Upload falhou");
  if (onProgress) onProgress({ phase: "done", url: json.url });
  return json.url;
}

/* ───────── Apps Script template for the setup wizard ─────────
   Server-side dedupe via submitId + LockService + CacheService.
   This is the authoritative defense against duplicates — it works regardless
   of what the client does (doubletap, fire-and-forget, two paths, page reload
   mid-request, etc.). */
const APPS_SCRIPT_TEMPLATE = `const UPLOAD_FOLDER_NAME = "Coleção - Fotos";

function doPost(e) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (err) {
    return _json({ ok: false, error: "busy" });
  }
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === "upload") return _handleUpload(data);
    return _handleAppend(data);
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function _handleAppend(data) {
  const sig = data.submitId || _contentSig(data);
  const cache = CacheService.getScriptCache();
  if (cache.get(sig)) return _json({ ok: true, deduped: true });
  cache.put(sig, "1", 60);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0].map(h => String(h || "").toLowerCase().trim());

  const patterns = {
    name:         /modelo|^nome|^name|^model$/,
    brand:        /^marca|^brand/,
    make:         /montadora|fabricante|manufact/,
    year:         /ano do carro|^ano$|^year$|car year/,
    yearReleased: /lançamento|lancamento|release/,
    series:       /série|^serie|coleção|colecao|^series$|linha/,
    color:        /^cor$|^color/,
    price:        /preço|preco|valor|^price/,
    status:       /condição|condicao|status|estado/,
    rarity:       /raridade|rarity/,
    note:         /nota|obs|observ|coment/,
    image:        /foto|imagem|image|url|link/,
  };

  const row = new Array(headers.length).fill("");
  if (/carimbo|timestamp|data/.test(headers[0])) row[0] = new Date();
  for (let i = 0; i < headers.length; i++) {
    for (const field in patterns) {
      if (patterns[field].test(headers[i])) {
        row[i] = data[field] !== undefined ? data[field] : "";
        break;
      }
    }
  }
  sheet.appendRow(row);
  return _json({ ok: true });
}

function _handleUpload(data) {
  if (!data.data) return _json({ ok: false, error: "Sem dados de imagem" });
  const mimeType = data.mimeType || "image/jpeg";
  const fileName = data.fileName || ("colecao-" + Date.now() + ".jpg");
  const folder = _getUploadFolder();
  const blob = Utilities.newBlob(Utilities.base64Decode(data.data), mimeType, fileName);
  const file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    return _json({ ok: false, error: "Salvei mas não consegui marcar como público: " + String(err), fileId: file.getId() });
  }
  const fileId = file.getId();
  return _json({
    ok: true,
    fileId: fileId,
    url: "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w800",
    rawUrl: "https://drive.google.com/uc?export=view&id=" + fileId,
  });
}

function _getUploadFolder() {
  const folders = DriveApp.getFoldersByName(UPLOAD_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(UPLOAD_FOLDER_NAME);
}

function _contentSig(data) {
  const key = [
    data.make || "", data.name || "", data.brand || "",
    data.year || "", data.series || "", data.price || "",
  ].join("|").toLowerCase();
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, key);
  return bytes.map(function(b){ return (b < 0 ? b + 256 : b).toString(16); }).join("");
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

window.Sheets = {
  SheetsStore, fetchSheet, appendToSheet, uploadPhoto, APPS_SCRIPT_TEMPLATE,
};
