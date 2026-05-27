/* Main App */
const { useState: useS, useMemo: useM, useEffect: useE } = React;

function App() {
  const [items, setItems] = useS([]);
  const [loading, setLoading] = useS(true);
  const [search, setSearch] = useS("");
  const [filters, setFilters] = useS({
    status: "all", rarity: "all", brand: "all",
    series: "all", year: "all", priceMin: "", priceMax: "",
  });
  const [sort, setSort] = useS("recent");
  const [advancedOpen, setAdvancedOpen] = useS(false);
  const [view, setView] = useS(() => {
    try { return localStorage.getItem("colecao.view") || "list"; }
    catch (e) { return "list"; }
  });
  useE(() => {
    try { localStorage.setItem("colecao.view", view); } catch (e) {}
  }, [view]);
  const [selected, setSelected] = useS(null);
  const [addOpen, setAddOpen] = useS(false);
  const [editingPiece, setEditingPiece] = useS(null);
  const [settingsOpen, setSettingsOpen] = useS(false);
  const [toast, setToast] = useS(null);
  const [usingDemo, setUsingDemo] = useS(false);
  const [bannerDismissed, setBannerDismissed] = useS(window.Sheets.SheetsStore.isBannerDismissed());
  const [lastSync, setLastSync] = useS(null);

  /* Load from Sheets (or fall back to demo data) */
  const loadData = async () => {
    setLoading(true);
    const sheetId = window.Sheets.SheetsStore.getSheetId();
    if (sheetId) {
      try {
        const rows = await window.Sheets.fetchSheet(sheetId);
        if (rows && rows.length > 0) {
          setItems(rows);
          setUsingDemo(false);
          setLastSync(new Date());
        } else {
          setItems([]);
          setUsingDemo(false);
          setLastSync(new Date());
        }
      } catch (e) {
        console.error("Sheet fetch failed:", e);
        setItems(window.COLLECTION);
        setUsingDemo(true);
      }
    } else {
      setItems(window.COLLECTION);
      setUsingDemo(true);
    }
    setLoading(false);
  };

  useE(() => { loadData(); }, []);

  /* Toast feedback after sheets sync */
  useE(() => {
    const handler = (e) => {
      setToast({ name: e.detail.name, action: e.detail.action || "add" });
      setTimeout(() => setToast(null), 3200);
    };
    window.addEventListener("sheets-synced", handler);
    return () => window.removeEventListener("sheets-synced", handler);
  }, []);

  const featured = useM(() => {
    if (!items.length) return null;
    return [...items].sort((a,b) => b.price - a.price)[0];
  }, [items]);

  const statusCounts = useM(() => ({
    lacrado: items.filter(i => i.status === "lacrado").length,
    aberto: items.filter(i => i.status === "aberto").length,
  }), [items]);

  const filtered = useM(() => {
    const s = search.trim().toLowerCase();
    let out = items.filter(i => {
      if (s) {
        const hay = `${i.fullName || ""} ${i.name} ${i.make || ""} ${i.brand} ${i.series} ${i.year || ""} ${i.color}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (filters.status !== "all" && i.status !== filters.status) return false;
      if (filters.rarity !== "all" && i.rarity !== filters.rarity) return false;
      if (filters.brand !== "all" && i.brand !== filters.brand) return false;
      if (filters.series !== "all" && i.series !== filters.series) return false;
      if (filters.year !== "all" && String(i.year) !== String(filters.year)) return false;
      if (filters.priceMin && i.price < parseFloat(filters.priceMin)) return false;
      if (filters.priceMax && i.price > parseFloat(filters.priceMax)) return false;
      return true;
    });
    const sorters = {
      "recent":     (a,b) => parseInt(b.id) - parseInt(a.id),
      "price-desc": (a,b) => b.price - a.price,
      "price-asc":  (a,b) => a.price - b.price,
      "name-asc":   (a,b) => a.name.localeCompare(b.name, "pt-BR"),
      "year-desc":  (a,b) => b.year - a.year || parseInt(b.id) - parseInt(a.id),
    };
    out.sort(sorters[sort] || sorters.recent);
    return out;
  }, [items, search, filters, sort]);

  const totalInvested = useM(() => items.reduce((s, i) => s + i.price, 0), [items]);

  /* IMPORTANT: addItem/updateItem são updates LOCAIS otimistas.
     AddDrawer é o único dono da escrita no Sheets — só chama onAdd/onUpdate
     depois que appendToSheet/updatePiece resolveram. */
  const addItem = (item) => {
    setItems(prev => [{ ...item, hasStableId: true }, ...prev]);
  };
  const updateItem = (item) => {
    setItems(prev => prev.map(p => p.id === item.id ? { ...p, ...item, hasStableId: true } : p));
    if (selected && selected.id === item.id) setSelected({ ...selected, ...item });
  };
  const openEdit = (piece) => {
    setSelected(null);
    setEditingPiece(piece);
    setAddOpen(true);
  };
  const handleDelete = async (piece) => {
    const scriptUrl = window.Sheets.SheetsStore.getScriptUrl();
    if (scriptUrl && piece.hasStableId) {
      await window.Sheets.deletePiece(scriptUrl, piece.id);
    }
    setItems(prev => prev.filter(p => p.id !== piece.id));
    setSelected(null);
    window.dispatchEvent(new CustomEvent("sheets-synced", {
      detail: { name: piece.fullName || piece.name, action: "delete" }
    }));
  };

  const sheetConfigured = !!window.Sheets.SheetsStore.getSheetId();
  const writeConfigured = !!window.Sheets.SheetsStore.getScriptUrl();

  /* Onboarding view when no sheet is configured AND user wants to start fresh */
  const showOnboarding = !sheetConfigured && !usingDemo;

  return (
    <div className="app" data-screen-label="01 Home">
      <TopBar
        search={search}
        onSearch={setSearch}
        onAdd={() => setAddOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        sheetConfigured={sheetConfigured}
      />

      {usingDemo && !bannerDismissed && (
        <DemoBanner
          onConnect={() => setSettingsOpen(true)}
          onDismiss={() => {
            window.Sheets.SheetsStore.dismissBanner();
            setBannerDismissed(true);
          }}
        />
      )}

      {loading ? (
        <div className="empty" style={{ paddingTop: 160 }}>Carregando coleção…</div>
      ) : showOnboarding ? (
        <div className="onboarding">
          <div className="onboarding__pre">Minha Coleção · Hot Wheels</div>
          <h1 className="onboarding__title">
            Sua garagem,<br/><em>catalogada.</em>
          </h1>
          <p className="onboarding__sub">
            Conecte sua planilha do Google Sheets e a gente faz o resto —
            cada peça vira uma ficha, contabilizada, filtrável, lacrada.
          </p>
          <div className="onboarding__cta-row">
            <button className="btn btn--flame" onClick={() => setSettingsOpen(true)}>
              Conectar planilha
            </button>
            <button className="btn btn--ghost" onClick={() => { setItems(window.COLLECTION); setUsingDemo(true); }}>
              Ver demo primeiro
            </button>
          </div>
        </div>
      ) : (
        <>
          <Hero
            items={items}
            total={items.length}
            invested={totalInvested}
            lacradas={statusCounts.lacrado}
            featured={featured}
            onFeaturedClick={setSelected}
          />

          <div className="section-head">
            <h2 className="section-head__title">Catálogo</h2>
            <div className="section-head__right">
              <ViewToggle view={view} onChange={setView} />
              <div className="section-head__count">
                {filtered.length} {filtered.length === 1 ? "peça" : "peças"}
                {filtered.length !== items.length && ` de ${items.length}`}
              </div>
            </div>
          </div>

          <FiltersBar
            items={items}
            filters={filters} setFilters={setFilters}
            counts={statusCounts}
            sort={sort} setSort={setSort}
            totalShown={filtered.length} totalAll={items.length}
            advancedOpen={advancedOpen} setAdvancedOpen={setAdvancedOpen}
          />

          {filtered.length === 0 ? (
            <div className="empty">Nenhuma peça encontrada com esses filtros.</div>
          ) : view === "grid" ? (
            <div className="grid">
              {filtered.map((item) => (
                <Card key={item.id} item={item} onClick={setSelected} />
              ))}
            </div>
          ) : (
            <div className="list">
              {filtered.map((item, idx) => (
                <Row key={item.id} item={item} index={idx} onClick={setSelected} />
              ))}
            </div>
          )}
        </>
      )}

      <footer className="foot">
        <div>© 2026 · João V. Mendes · 1:64 forever</div>
        <div>
          {sheetConfigured ? (
            <>Sheets · {lastSync ? `sincronizado às ${lastSync.toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}` : "carregando…"}
              {writeConfigured && " · escrita ativa"}
            </>
          ) : (
            "Sheets · não conectado"
          )}
        </div>
      </footer>

      {/* FAB — só aparece no mobile via CSS @media */}
      <button
        type="button"
        className="fab"
        aria-label="Adicionar peça"
        onClick={() => setAddOpen(true)}
      >
        <PlusIcon />
      </button>

      <DetailDrawer
        item={selected}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
      <AddDrawer
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditingPiece(null); }}
        onAdd={addItem}
        onUpdate={updateItem}
        editing={editingPiece}
        writeConfigured={writeConfigured}
      />
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={() => loadData()}
      />

      <div className="toast" data-open={!!toast}>
        <div className="toast__icon">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m3 8 4 4 6-8" />
          </svg>
        </div>
        <div>
          <div className="toast__title">
            {toast && toast.name} {toast && (
              toast.action === "delete" ? "excluído" :
              toast.action === "update" ? "atualizado" : "adicionado"
            )}
          </div>
          <div className="toast__sub">
            {writeConfigured ? "Linha gravada no Sheets" : "Atualizado localmente"}
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
