/**
 * Apps Script Web App — escrita na planilha de miniaturas com dedupe.
 *
 * Defesa em 3 camadas contra duplicatas:
 *  1. LockService — serializa POSTs concorrentes
 *  2. submitId no CacheService — rejeita o mesmo submitId duas vezes em 60s
 *  3. Fallback de content hash — pra payloads sem submitId
 *
 * Depois de colar/editar este código:
 *   Implantar → Gerenciar implantações → editar a atual →
 *   Versão: Nova versão → Implantar.
 * A URL não muda. Se você só salvar (Ctrl+S), a versão antiga continua servindo.
 */

function doPost(e) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (err) {
    return _json({ ok: false, error: "busy" });
  }

  try {
    const data = JSON.parse(e.postData.contents);

    // ─── Dedupe ──────────────────────────────────────────────────────────
    const sig = data.submitId || _contentSig(data);
    const cache = CacheService.getScriptCache();
    if (cache.get(sig)) {
      return _json({ ok: true, deduped: true });
    }
    cache.put(sig, "1", 60); // 60s

    // ─── Header mapping ──────────────────────────────────────────────────
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

  } catch (err) {
    return _json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
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
