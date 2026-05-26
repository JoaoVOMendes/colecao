/* Views: Filters, Detail drawer, Add drawer */
const { useState: useStateV, useMemo: useMemoV, useEffect: useEffectV } = React;

/* ───────── Photo field (URL input + camera/file upload + preview) ───────── */
function PhotoField({ value, onChange, normalize }) {
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState("");
  const cameraInputRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const normalized = normalize ? normalize(value) : value;
  const scriptUrl = window.Sheets.SheetsStore.getScriptUrl();
  const canUpload = !!scriptUrl;

  React.useEffect(() => {
    setFailed(false);
    if (normalized) setLoading(true);
  }, [normalized]);

  const handleFile = async (file) => {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const url = await window.Sheets.uploadPhoto(scriptUrl, file);
      onChange(url);
    } catch (err) {
      console.error("Upload falhou:", err);
      setUploadError(String(err.message || err));
    } finally {
      setUploading(false);
    }
  };

  const onCameraChange = (e) => {
    const f = e.target.files && e.target.files[0];
    handleFile(f);
    e.target.value = ""; // permite re-selecionar a mesma foto
  };
  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    handleFile(f);
    e.target.value = "";
  };

  return (
    <div className="photo-field">
      <div className="photo-field__preview">
        {normalized && !failed ? (
          <img
            src={normalized}
            alt=""
            referrerPolicy="no-referrer"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setFailed(true); }}
            style={{ opacity: loading || uploading ? 0.3 : 1 }}
          />
        ) : (
          <div className="photo-field__placeholder">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="3" y="5" width="18" height="14" rx="2"/>
              <circle cx="8.5" cy="10" r="1.5"/>
              <path d="M3 17l5-5 5 5 3-3 5 5"/>
            </svg>
            <span>Pré-visualização da foto</span>
          </div>
        )}
        {uploading && (
          <div className="photo-field__overlay">
            <div className="photo-field__spinner" />
            <span>Enviando ao Drive…</span>
          </div>
        )}
        {failed && !uploading && (
          <div className="photo-field__error">Não consegui carregar — verifique se o Drive está público.</div>
        )}
      </div>
      <div className="photo-field__body">
        <label className="field__label">Foto da miniatura</label>

        <div className="photo-field__actions">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={onCameraChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={onFileChange}
          />
          <button
            type="button"
            className="btn btn--ghost btn--upload"
            onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
            disabled={!canUpload || uploading}
            title={canUpload ? "Tirar foto com a câmera" : "Conecte o Apps Script primeiro"}
          >
            <CameraIcon />
            <span>Tirar foto</span>
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--upload"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={!canUpload || uploading}
            title={canUpload ? "Escolher arquivo da galeria" : "Conecte o Apps Script primeiro"}
          >
            <FolderIcon />
            <span>Arquivo</span>
          </button>
        </div>

        <input
          className="field__input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="…ou cole o link do Drive / URL da imagem"
          disabled={uploading}
        />

        {uploadError && (
          <div className="photo-field__hint" style={{ color: "var(--flame)" }}>
            {uploadError}
          </div>
        )}
        {!canUpload && (
          <div className="photo-field__hint">
            Upload direto fica disponível depois que você conectar o Apps Script
            (engrenagem no topo).
          </div>
        )}
        {canUpload && !uploadError && (
          <div className="photo-field__hint">
            Tira foto ou escolhe um arquivo — vai pro seu Drive (pasta "Coleção - Fotos")
            e a URL aparece aqui automaticamente.
          </div>
        )}
      </div>
    </div>
  );
}

function CameraIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 7h3l2-3h8l2 3h3v13H3z"/>
    <circle cx="12" cy="13" r="3.5"/>
  </svg>;
}
function FolderIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 6h6l2 2h10v11H3z"/>
  </svg>;
}

/* ───────── Filters bar (chips + advanced) ───────── */
function FiltersBar({
  items, filters, setFilters, counts, sort, setSort, totalShown, totalAll,
  advancedOpen, setAdvancedOpen,
}) {
  // Derive rarity options from actual data — hide ones with zero items
  const rarityCounts = React.useMemo(() => {
    const c = {};
    items.forEach(i => { c[i.rarity] = (c[i.rarity] || 0) + 1; });
    return c;
  }, [items]);

  const statusOptions = [
    { v: "all", label: "Todos", count: totalAll },
    { v: "lacrado", label: "Lacrados", count: counts.lacrado },
    { v: "aberto", label: "Abertos", count: counts.aberto },
  ].filter(o => o.v === "all" || o.count > 0);

  const allRarityChips = [
    { v: "th", label: "Treasure Hunt" },
    { v: "sth", label: "Super TH" },
    { v: "raro", label: "Raros" },
    { v: "incomum", label: "Incomuns" },
  ];
  const rarityChips = allRarityChips.filter(o => (rarityCounts[o.v] || 0) > 0);
  const showRarity = rarityChips.length > 0;

  return (
    <>
      <div className="filters-bar">
        <div className="chips">
          {statusOptions.map(o => (
            <button
              key={o.v}
              className="chip"
              aria-pressed={filters.status === o.v}
              onClick={() => setFilters({ ...filters, status: o.v })}
            >
              {o.label}
              <span className="chip__count">{o.count}</span>
            </button>
          ))}
          {/* Rarity chips desativadas — campo segue no dado/filtro, só removido da UI */}
        </div>
        <button
          className="advanced-toggle"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen(!advancedOpen)}
        >
          Filtros avançados <ChevronIcon />
        </button>
        <select
          className="sort-select"
          value={sort}
          onChange={e => setSort(e.target.value)}
        >
          <option value="recent">Ordenar: mais recentes</option>
          <option value="price-desc">Maior preço</option>
          <option value="price-asc">Menor preço</option>
          <option value="name-asc">A–Z</option>
          <option value="year-desc">Ano (novo→velho)</option>
        </select>
      </div>

      {advancedOpen && (
        <AdvancedPanel items={items} filters={filters} setFilters={setFilters} />
      )}
    </>
  );
}

function AdvancedPanel({ items, filters, setFilters }) {
  const brands = React.useMemo(() => {
    return ["Todas", ...new Set(items.map(i => i.brand).filter(Boolean))].sort((a, b) =>
      a === "Todas" ? -1 : b === "Todas" ? 1 : a.localeCompare(b)
    );
  }, [items]);
  const series = React.useMemo(() => {
    return ["Todas", ...new Set(items.map(i => i.series).filter(Boolean))].sort((a, b) =>
      a === "Todas" ? -1 : b === "Todas" ? 1 : a.localeCompare(b)
    );
  }, [items]);
  const years = React.useMemo(() => {
    const ys = [...new Set(items.map(i => i.year).filter(Boolean))]
      .sort((a, b) => b - a);
    return ys;
  }, [items]);

  return (
    <div className="advanced-panel">
      <div className="field">
        <label className="field__label">Marca</label>
        <select
          className="field__select"
          value={filters.brand}
          onChange={e => setFilters({ ...filters, brand: e.target.value })}
        >
          {brands.map(b => <option key={b} value={b === "Todas" ? "all" : b}>{b}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="field__label">Série</label>
        <select
          className="field__select"
          value={filters.series}
          onChange={e => setFilters({ ...filters, series: e.target.value })}
        >
          {series.map(s => <option key={s} value={s === "Todas" ? "all" : s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="field__label">Ano</label>
        <select
          className="field__select"
          value={filters.year}
          onChange={e => setFilters({ ...filters, year: e.target.value })}
        >
          <option value="all">Todos</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="field__label">Faixa de preço (R$)</label>
        <div className="range">
          <input
            className="field__input"
            type="number"
            placeholder="min"
            value={filters.priceMin}
            onChange={e => setFilters({ ...filters, priceMin: e.target.value })}
          />
          <span style={{ color: "var(--text-4)" }}>—</span>
          <input
            className="field__input"
            type="number"
            placeholder="max"
            value={filters.priceMax}
            onChange={e => setFilters({ ...filters, priceMax: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

/* ───────── Detail drawer ───────── */
function DetailDrawer({ item, onClose, onEdit, onDelete }) {
  const open = !!item;
  // Keep last item visible while closing animation runs
  const [cached, setCached] = React.useState(item);
  React.useEffect(() => { if (item) setCached(item); }, [item]);
  const data = item || cached;

  // ESC to close
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

  if (!data) return null;

  return (
    <>
      <div className="drawer-backdrop" data-open={open} onClick={onClose} />
      <aside className="drawer" data-open={open} aria-hidden={!open}>
        <div className="drawer__head">
          <div className="drawer__title">Peça {data.id}</div>
          <button className="drawer__close" onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </button>
        </div>
        <div className="drawer__body">
          <div className="detail__art">
            <CarArt tint={data.color} shape={data.shape} brand={data.brand} image={data.image} />
          </div>
          <div className="detail__head">
            <div className="detail__series">{data.series}</div>
            <h2 className="detail__name">{data.fullName || data.name}</h2>
            <div className="detail__brand">{data.brand}{data.year ? ` · ${data.year}` : ""}</div>
            <div className="detail__badges">
              <StatusBadge status={data.status} />
            </div>
          </div>
          <div className="detail__grid">
            <div>
              <div className="field__label">Preço pago</div>
              <div className="field__value mono">
                {data.price > 0 ? formatBRL(data.price) : (data.priceRaw || "—")}
              </div>
            </div>
            <div>
              <div className="field__label">Ano do carro</div>
              <div className="field__value mono">{data.year || "—"}</div>
            </div>
            {data.make && (
              <div>
                <div className="field__label">Montadora</div>
                <div className="field__value">{data.make}</div>
              </div>
            )}
            <div>
              <div className="field__label">Marca</div>
              <div className="field__value">{data.brand}</div>
            </div>
            <div>
              <div className="field__label">Série</div>
              <div className="field__value">{data.series}</div>
            </div>
            {data.yearReleased && (
              <div>
                <div className="field__label">Ano de lançamento</div>
                <div className="field__value mono">{data.yearReleased}</div>
              </div>
            )}
            <div>
              <div className="field__label">Cor base</div>
              <div className="field__value" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  display: "inline-block", width: 18, height: 18, borderRadius: 999,
                  background: window.TINTS[data.color] || "#888",
                  border: "1px solid var(--border-2)",
                }} />
                <span style={{ textTransform: "capitalize" }}>{data.color}</span>
              </div>
            </div>
            <div>
              <div className="field__label">Status</div>
              <div className="field__value" style={{ textTransform: "capitalize" }}>{data.status}</div>
            </div>
          </div>
          {data.note && (
            <div className="detail__notes">
              <em>“{data.note}”</em>
            </div>
          )}
          {(onEdit || onDelete) && (
            <div className="detail__actions">
              {onEdit && (
                <button
                  className="btn btn--ghost"
                  onClick={() => onEdit(data)}
                  disabled={!data.hasStableId}
                  title={data.hasStableId ? "Editar peça" : "Faltam IDs antigos — rode backfillIds() no Apps Script"}
                >Editar</button>
              )}
              {onDelete && (
                <button
                  className="btn btn--danger"
                  onClick={() => {
                    if (window.confirm(`Excluir "${data.fullName || data.name}"? Não dá pra desfazer.`)) {
                      onDelete(data);
                    }
                  }}
                  disabled={!data.hasStableId}
                  title={data.hasStableId ? "Excluir peça" : "Faltam IDs antigos — rode backfillIds() no Apps Script"}
                >Excluir</button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ───────── Add drawer (cria + edita) ───────── */
function AddDrawer({ open, onClose, onAdd, onUpdate, writeConfigured, editing }) {
  const isEditing = !!editing;
  const blank = {
    name: "", make: "", brand: "Hot Wheels",
    year: "", yearReleased: "",
    series: "", color: "",
    price: "", status: "lacrado",
    image: "",
    id: "",
  };
  const buildInitial = () => editing ? {
    name: editing.name || "",
    make: editing.make || "",
    brand: editing.brand || "Hot Wheels",
    year: editing.year || "",
    yearReleased: editing.yearReleased || "",
    series: editing.series || "",
    color: editing.colorRaw || editing.color || "",
    price: editing.price || "",
    status: editing.status || "lacrado",
    image: editing.image || "",
    id: editing.id || "",
  } : blank;
  const [form, setForm] = React.useState(buildInitial);
  const [syncing, setSyncing] = React.useState(false);
  const submittingRef = React.useRef(false);

  React.useEffect(() => {
    if (open) { setForm(buildInitial()); setSyncing(false); submittingRef.current = false; }
  }, [open, editing && editing.id]);

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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Normalize Drive share links to embeddable thumbnail URLs as the user types
  const normalizeImage = (raw) => {
    if (!raw) return "";
    const s = raw.trim();
    const driveFile = s.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFile) return `https://drive.google.com/thumbnail?id=${driveFile[1]}&sz=w800`;
    const driveOpen = s.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (driveOpen) return `https://drive.google.com/thumbnail?id=${driveOpen[1]}&sz=w800`;
    return s;
  };

  const submit = () => {
    if (submittingRef.current) return;
    if (!form.name && !form.make) return;
    submittingRef.current = true;
    setSyncing(true);
    const fullName = form.make ? `${form.make.trim()} ${form.name.trim()}`.trim() : form.name.trim();
    const pieceId = isEditing ? form.id : window.Sheets.generatePieceId();
    const payload = {
      ...form,
      id: pieceId,
      submitId: pieceId,
      fullName,
      name: form.name || form.make,
      image: normalizeImage(form.image),
      price: parseFloat(form.price) || 0,
      year: parseInt(form.year) || null,
      yearReleased: parseInt(form.yearReleased) || null,
      shape: editing ? editing.shape : "muscle",
      rarity: editing ? editing.rarity : "comum",
      note: editing ? editing.note : "",
    };
    const scriptUrl = window.Sheets.SheetsStore.getScriptUrl();
    const doneWrite = scriptUrl
      ? (isEditing
          ? window.Sheets.updatePiece(scriptUrl, payload)
          : window.Sheets.appendToSheet(scriptUrl, payload))
      : Promise.resolve(false);

    Promise.resolve(doneWrite).then(() => {
      if (isEditing) onUpdate(payload);
      else onAdd(payload);
      setSyncing(false);
      onClose();
      window.dispatchEvent(new CustomEvent("sheets-synced", {
        detail: { name: fullName, action: isEditing ? "update" : "add" }
      }));
    });
  };

  return (
    <>
      <div className="drawer-backdrop" data-open={open} onClick={onClose} />
      <aside className="drawer" data-open={open} aria-hidden={!open}>
        <div className="drawer__head">
          <div className="drawer__title">{isEditing ? "Editar peça" : "Nova peça"}</div>
          <button className="drawer__close" onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </button>
        </div>

        <div className="form-body">
          <PhotoField value={form.image} onChange={v => set("image", v)} normalize={normalizeImage} />

          <div className="form-row">
            <div className="field">
              <label className="field__label">Marca</label>
              <select className="field__select" value={form.brand} onChange={e => set("brand", e.target.value)}>
                {["Hot Wheels","MiniGT","Mini GT","Matchbox","Tarmac Works","Greenlight","Outra"].map(b =>
                  <option key={b} value={b}>{b}</option>
                )}
              </select>
            </div>
            <div className="field">
              <label className="field__label">Montadora</label>
              <input className="field__input" value={form.make}
                onChange={e => set("make", e.target.value)}
                placeholder="Ferrari, Mazda, BMW…" />
            </div>
          </div>

          <div className="form-row form-row--full">
            <div className="field">
              <label className="field__label">Modelo</label>
              <input className="field__input" value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="Ex: F40, RX-7, M3" />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label className="field__label">Ano do carro</label>
              <input className="field__input" type="number" value={form.year}
                onChange={e => set("year", e.target.value)} placeholder="1989" />
            </div>
            <div className="field">
              <label className="field__label">Ano de lançamento</label>
              <input className="field__input" type="number" value={form.yearReleased}
                onChange={e => set("yearReleased", e.target.value)} placeholder="2024" />
            </div>
          </div>

          <div className="form-row form-row--full">
            <div className="field">
              <label className="field__label">Série</label>
              <input className="field__input" value={form.series}
                onChange={e => set("series", e.target.value)}
                placeholder="Mainline · Boulevard · Car Culture…" />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label className="field__label">Cor</label>
              <input className="field__input" value={form.color}
                onChange={e => set("color", e.target.value)}
                placeholder="Vermelho, Preto, Azul…" />
            </div>
            <div className="field">
              <label className="field__label">Condição</label>
              <select className="field__select" value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="lacrado">Lacrado</option>
                <option value="aberto">Aberto</option>
                <option value="customizado">Customizado</option>
              </select>
            </div>
          </div>

          <div className="form-row form-row--full">
            <div className="field">
              <label className="field__label">Preço pago (R$)</label>
              <input className="field__input" type="number" step="0.01" value={form.price}
                onChange={e => set("price", e.target.value)} placeholder="0,00" />
            </div>
          </div>
        </div>

        <div className="form-foot">
          <div className="sheets-status" data-state={syncing ? "syncing" : (writeConfigured ? "connected" : "")}>
            <span className="sheets-status__dot" />
            {syncing ? "Enviando ao Sheets…" : (writeConfigured ? "Sheets · escrita ativa" : "Sheets · só local")}
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn--ghost" onClick={onClose} disabled={syncing}>Cancelar</button>
          <button
            className="btn btn--flame"
            onClick={submit}
            disabled={syncing || (!form.name && !form.make)}
            style={{ opacity: (syncing || (!form.name && !form.make)) ? 0.5 : 1 }}
          >
            {syncing ? "Salvando…" : (isEditing ? "Salvar alterações" : "Adicionar à coleção")}
          </button>
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { FiltersBar, AdvancedPanel, DetailDrawer, AddDrawer, PhotoField });
