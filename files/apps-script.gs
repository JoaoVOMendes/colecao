/**
 * Apps Script Web App — Coleção de miniaturas.
 *
 * Suporta duas ações:
 *  - (default) appendRow: grava uma peça nova na planilha (dedupe em 3 camadas)
 *  - action: "upload"  : recebe foto em base64, salva no Drive e retorna URL pública
 *
 * Defesa em 3 camadas contra duplicatas (só no append):
 *  1. LockService — serializa POSTs concorrentes
 *  2. submitId no CacheService — rejeita o mesmo submitId duas vezes em 60s
 *  3. Fallback de content hash — pra payloads sem submitId
 *
 * Depois de colar/editar este código:
 *   Implantar → Gerenciar implantações → editar a atual →
 *   Versão: Nova versão → Implantar.
 * A URL não muda. Se você só salvar (Ctrl+S), a versão antiga continua servindo.
 */

// Nome da pasta no Drive onde as fotos enviadas via app vão parar.
// Se não existir, o script cria automaticamente na raiz do seu Drive.
const UPLOAD_FOLDER_NAME = "Coleção - Fotos";

function doPost(e) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (err) {
    return _json({ ok: false, error: "busy" });
  }

  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === "upload") {
      return _handleUpload(data);
    }
    return _handleAppend(data);

  } catch (err) {
    return _json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ─── Append: grava nova peça na planilha ──────────────────────────────── */
function _handleAppend(data) {
  const sig = data.submitId || _contentSig(data);
  const cache = CacheService.getScriptCache();
  if (cache.get(sig)) {
    return _json({ ok: true, deduped: true });
  }
  cache.put(sig, "1", 60);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0].map(function(h){ return String(h || "").toLowerCase().trim(); });

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

/* ─── Upload: salva imagem em base64 no Drive e devolve URL ────────────── */
function _handleUpload(data) {
  if (!data.data) {
    return _json({ ok: false, error: "Sem dados de imagem" });
  }
  const mimeType = data.mimeType || "image/jpeg";
  const fileName = data.fileName || ("colecao-" + Date.now() + ".jpg");

  const folder = _getUploadFolder();
  const blob = Utilities.newBlob(
    Utilities.base64Decode(data.data),
    mimeType,
    fileName
  );
  const file = folder.createFile(blob);

  // Torna público (qualquer pessoa com link consegue visualizar).
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // Se a conta for Workspace e o admin bloquear sharing público,
    // a foto fica salva mas não acessível pela URL pública. Aviso retornado.
    return _json({
      ok: false,
      error: "Arquivo salvo no Drive, mas não consegui marcar como público: " + String(err),
      fileId: file.getId(),
    });
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
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
