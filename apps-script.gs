/**
 * Apps Script Web App — Coleção de miniaturas.
 *
 * Ações suportadas (via data.action):
 *  - (default / "append"): grava peça nova (dedupe em 3 camadas)
 *  - "update": atualiza linha existente identificada por data.id
 *  - "delete": remove linha identificada por data.id
 *  - "upload": recebe foto em base64, salva no Drive e retorna URL pública
 *
 * Antes de usar update/delete:
 *  1. Adicione uma coluna "ID" (qualquer posição) no cabeçalho da planilha
 *  2. Rode `backfillIds()` uma vez pelo editor pra preencher UUIDs nas linhas antigas
 *
 * Depois de colar/editar este código:
 *   Implantar → Gerenciar implantações → editar a atual →
 *   Versão: Nova versão → Implantar.
 * A URL não muda.
 */

const UPLOAD_FOLDER_NAME = "Coleção - Fotos";

function doPost(e) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (err) {
    return _json({ ok: false, error: "busy" });
  }
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === "upload") return _handleUpload(data);
    if (data.action === "update") return _handleUpdate(data);
    if (data.action === "delete") return _handleDelete(data);
    return _handleAppend(data);
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ─── Append ──────────────────────────────────────────────────────────── */
function _handleAppend(data) {
  const sig = data.submitId || _contentSig(data);
  const cache = CacheService.getScriptCache();
  if (cache.get(sig)) return _json({ ok: true, deduped: true });
  cache.put(sig, "1", 60);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0].map(function(h){ return String(h || "").toLowerCase().trim(); });

  const patterns = _fieldPatterns();
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

/* ─── Update ──────────────────────────────────────────────────────────── */
function _handleUpdate(data) {
  if (!data.id) return _json({ ok: false, error: "ID obrigatório" });
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return _json({ ok: false, error: "Planilha vazia" });

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0].map(function(h){ return String(h || "").toLowerCase().trim(); });
  const idCol = _findIdColIndex(headers);
  if (idCol < 0) return _json({ ok: false, error: "Coluna ID não encontrada" });

  const ids = sheet.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
  let targetRow = -1;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(data.id).trim()) { targetRow = i + 2; break; }
  }
  if (targetRow < 0) return _json({ ok: false, error: "ID não encontrado" });

  const patterns = _fieldPatterns();
  for (let i = 0; i < headers.length; i++) {
    if (/carimbo|timestamp/.test(headers[i])) continue;  // não mexe no timestamp
    for (const field in patterns) {
      if (patterns[field].test(headers[i])) {
        if (data[field] !== undefined) {
          sheet.getRange(targetRow, i + 1).setValue(data[field]);
        }
        break;
      }
    }
  }
  return _json({ ok: true });
}

/* ─── Delete ──────────────────────────────────────────────────────────── */
function _handleDelete(data) {
  if (!data.id) return _json({ ok: false, error: "ID obrigatório" });
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return _json({ ok: false, error: "Planilha vazia" });

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0].map(function(h){ return String(h || "").toLowerCase().trim(); });
  const idCol = _findIdColIndex(headers);
  if (idCol < 0) return _json({ ok: false, error: "Coluna ID não encontrada" });

  const ids = sheet.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(data.id).trim()) {
      sheet.deleteRow(i + 2);
      return _json({ ok: true });
    }
  }
  return _json({ ok: false, error: "ID não encontrado" });
}

/* ─── Upload ──────────────────────────────────────────────────────────── */
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

/* ─── Backfill: rode UMA VEZ pra dar UUIDs nas linhas antigas ─────────── */
function backfillIds() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol)
    .getValues()[0].map(function(h){ return String(h || "").toLowerCase().trim(); });

  let idCol = _findIdColIndex(headers);
  if (idCol < 0) {
    // Cria a coluna ID no final
    idCol = lastCol;
    sheet.getRange(1, idCol + 1).setValue("ID");
    Logger.log("Coluna ID criada na posição " + (idCol + 1));
  }

  const range = sheet.getRange(2, idCol + 1, lastRow - 1, 1);
  const values = range.getValues();
  let filled = 0;
  for (let i = 0; i < values.length; i++) {
    if (!String(values[i][0]).trim()) {
      values[i][0] = Utilities.getUuid();
      filled++;
    }
  }
  range.setValues(values);
  Logger.log("UUIDs preenchidos em " + filled + " linhas");
  return filled;
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function _fieldPatterns() {
  return {
    id:           /^id$|^uuid$|identificador/,
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
}

function _findIdColIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    if (/^(id|uuid|identificador)$/i.test(headers[i])) return i;
  }
  return -1;
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
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
