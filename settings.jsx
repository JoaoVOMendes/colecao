/* settings.jsx — Settings drawer (Sheets URL + Apps Script setup) and Onboarding */

function SettingsDrawer({ open, onClose, onSave }) {
  const [sheetIdInput, setSheetIdInput] = React.useState("");
  const [scriptUrlInput, setScriptUrlInput] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState(null);
  const [step2Open, setStep2Open] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setSheetIdInput(window.Sheets.SheetsStore.getSheetId());
      setScriptUrlInput(window.Sheets.SheetsStore.getScriptUrl());
      setTestResult(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const id = sheetIdInput && sheetIdInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || sheetIdInput.trim();
      const data = await window.Sheets.fetchSheet(id);
      setTestResult({ ok: true, count: data.length });
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    }
    setTesting(false);
  };

  const save = () => {
    window.Sheets.SheetsStore.setSheetId(sheetIdInput);
    window.Sheets.SheetsStore.setScriptUrl(scriptUrlInput);
    onSave();
    onClose();
  };

  const copyScript = () => {
    navigator.clipboard.writeText(window.Sheets.APPS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <div className="drawer-backdrop" data-open={open} onClick={onClose} />
      <aside className="drawer" data-open={open} aria-hidden={!open}>
        <div className="drawer__head">
          <div className="drawer__title">Conectar planilha</div>
          <button className="drawer__close" onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </button>
        </div>
        <div className="settings">
          {/* STEP 1 — Read */}
          <section className="settings__step">
            <div className="settings__step-head">
              <div className="settings__step-num">01</div>
              <div>
                <div className="settings__step-title">Ler sua coleção</div>
                <div className="settings__step-sub">
                  Cole o link da sua planilha do Google Sheets. Ela precisa
                  estar pública (qualquer pessoa com o link pode visualizar).
                </div>
              </div>
            </div>
            <div className="settings__field">
              <label className="field__label">URL ou ID da planilha</label>
              <input
                className="field__input"
                value={sheetIdInput}
                onChange={e => setSheetIdInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
              />
            </div>
            <div className="settings__row">
              <button className="btn btn--ghost" onClick={testConnection} disabled={testing || !sheetIdInput}>
                {testing ? "Testando…" : "Testar conexão"}
              </button>
              {testResult && testResult.ok && (
                <div className="settings__result settings__result--ok">
                  ✓ Conectada · {testResult.count} {testResult.count === 1 ? "linha lida" : "linhas lidas"}
                </div>
              )}
              {testResult && !testResult.ok && (
                <div className="settings__result settings__result--err">
                  ✕ {testResult.error}
                </div>
              )}
            </div>
            <details className="settings__details">
              <summary>Colunas que a gente reconhece</summary>
              <div className="settings__cols">
                <div><strong>Nome / Modelo</strong> — obrigatório</div>
                <div><strong>Marca</strong> · <strong>Ano</strong> · <strong>Série</strong> · <strong>Preço</strong></div>
                <div><strong>Status</strong> (lacrado / aberto / customizado)</div>
                <div><strong>Raridade</strong> (comum, incomum, raro, TH, STH)</div>
                <div><strong>Cor</strong> · <strong>Tipo</strong> · <strong>Nota</strong> · <strong>Imagem</strong></div>
                <div className="settings__cols-foot">
                  Nomes em PT-BR ou EN, ordem livre. Falta de coluna = inferido do nome ou padrão.
                </div>
              </div>
            </details>
          </section>

          {/* STEP 2 — Write */}
          <section className="settings__step">
            <div className="settings__step-head">
              <div className="settings__step-num">02</div>
              <div>
                <div className="settings__step-title">Salvar automático <span className="settings__step-opt">opcional</span></div>
                <div className="settings__step-sub">
                  Pra que "Adicionar peça" grave direto na planilha — sem
                  copiar e colar. Setup uma vez, funciona pra sempre.
                </div>
              </div>
            </div>

            <div className="settings__field">
              <label className="field__label">URL do Apps Script (Web App)</label>
              <input
                className="field__input"
                value={scriptUrlInput}
                onChange={e => setScriptUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/…/exec"
              />
            </div>

            <button
              className="settings__toggle"
              onClick={() => setStep2Open(!step2Open)}
              aria-expanded={step2Open}
            >
              {step2Open ? "Esconder" : "Como fazer isso? (1 min)"} <ChevronIcon />
            </button>

            {step2Open && (
              <div className="settings__howto">
                <ol className="howto-list">
                  <li>Na sua planilha, abra <strong>Extensões → Apps Script</strong>.</li>
                  <li>Apague o código padrão e cole este:
                    <div className="codeblock">
                      <button className="codeblock__copy" onClick={copyScript}>
                        {copied ? "✓ Copiado" : "Copiar"}
                      </button>
                      <pre>{window.Sheets.APPS_SCRIPT_TEMPLATE}</pre>
                    </div>
                  </li>
                  <li>Clique em <strong>Implantar → Nova implantação</strong>.</li>
                  <li>Tipo: <strong>App da Web</strong>. Executar como: <strong>Eu mesmo</strong>. Quem pode acessar: <strong>Qualquer pessoa</strong>.</li>
                  <li>Copie a URL gerada e cole no campo acima.</li>
                </ol>
              </div>
            )}
          </section>
        </div>

        <div className="form-foot">
          <div style={{ flex: 1 }} />
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--flame" onClick={save}>Salvar e sincronizar</button>
        </div>
      </aside>
    </>
  );
}

/* ───────── Demo banner ───────── */
function DemoBanner({ onConnect, onDismiss }) {
  return (
    <div className="demo-banner">
      <div className="demo-banner__dot" />
      <div className="demo-banner__text">
        Você está vendo <strong>dados de exemplo</strong>. Conecte sua planilha pra ver sua coleção de verdade.
      </div>
      <button className="demo-banner__cta" onClick={onConnect}>
        Conectar planilha <ArrowIcon />
      </button>
      <button className="demo-banner__close" onClick={onDismiss} aria-label="Dispensar">
        <CloseIcon />
      </button>
    </div>
  );
}

Object.assign(window, { SettingsDrawer, DemoBanner });
