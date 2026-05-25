# Coleção — setup local

## Rodar

O `index.html` faz `fetch` pra planilha do Google, então precisa servir por HTTP — abrir o arquivo direto (`file://`) não funciona.

**Opção 1 — VS Code Live Server (mais fácil):**
1. Instala a extensão "Live Server" (Ritwick Dey)
2. Clica com botão direito no `index.html` → "Open with Live Server"
3. Abre em `http://127.0.0.1:5500`

**Opção 2 — Python (se já tiver):**
```bash
cd colecao
python3 -m http.server 8000
# abre http://localhost:8000
```

**Opção 3 — Node:**
```bash
npx serve .
```

## O que mudou (debug da duplicata)

- **`app.jsx`** — `addItem` não chama mais `appendToSheet`. Era o segundo POST.
- **`sheets.js`** — `appendToSheet` agora tem guard de in-flight usando `submitId`. Defesa client-side.
- **`apps-script.gs`** — nova versão com dedupe via `submitId` + `LockService` + `CacheService`. Defesa server-side (a que realmente conta).

## Pra ativar o dedupe no Sheets

1. Abre a planilha → **Extensões → Apps Script**
2. Cola o conteúdo de `apps-script.gs` substituindo o código que tá lá
3. Salva (Ctrl+S)
4. **Implantar → Gerenciar implantações**
5. Na implantação ativa, clica no lápis (editar)
6. Em **Versão**, escolhe **Nova versão**
7. **Implantar** — a URL não muda

> ⚠️ Se você só salvar com Ctrl+S sem fazer Nova versão, a Web App continua servindo a versão antiga.

Se tiver mais de uma implantação ativa na lista, arquive as extras — cada uma é uma URL viva que pode estar duplicando.

## Verificar que tá rodando

No console do navegador com o app aberto:
```js
// 1. Qual URL tá salva
localStorage.getItem("colecao:scriptUrl")

// 2. Stress test — manda o mesmo submitId duas vezes
const url = localStorage.getItem("colecao:scriptUrl");
const payload = { submitId: "teste-" + Date.now(), name: "Teste Dedupe", brand: "Hot Wheels" };
await fetch(url, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
await fetch(url, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
```

Olha a planilha — tem que aparecer **uma** linha "Teste Dedupe", não duas.
