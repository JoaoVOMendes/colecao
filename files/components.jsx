/* Components: shared UI building blocks */
const { useState, useMemo, useEffect, useRef } = React;

/* ───────── Car artwork ───────── */
function CarArt({ tint, shape = "muscle", brand, image }) {
  // If we have a real image URL, render it on top of the stage background.
  // Drive thumbnails sometimes fail (private, rate-limited) — fall back to SVG.
  const [imgFailed, setImgFailed] = React.useState(false);
  const carTint = window.TINTS[tint] || window.TINTS.silver;
  const svg = window.SILHOUETTES[shape] || window.SILHOUETTES.muscle;

  const hasImg = image && !imgFailed;

  return (
    <div className="car-art" style={{ "--car-tint": carTint }}>
      <div className="car-art__floor" />
      {hasImg ? (
        <img
          className="car-art__photo"
          src={image}
          alt={brand || ""}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="car-art__svg" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
      {brand && !hasImg && <div className="car-art__brand">{brand}</div>}
    </div>
  );
}

/* ───────── Status badge ───────── */
function StatusBadge({ status }) {
  const cls =
    status === "lacrado" ? "badge--lacrado" :
    status === "aberto"  ? "badge--aberto"  :
    "badge--custom";
  return <span className={`badge ${cls}`}>{status}</span>;
}

/* ───────── Rarity ───────── */
const RARITY_LEVELS = {
  comum:    { dots: 1, label: "Comum",       cls: "" },
  incomum:  { dots: 2, label: "Incomum",     cls: "" },
  raro:     { dots: 3, label: "Raro",        cls: "" },
  th:       { dots: 3, label: "Treasure Hunt", cls: "rarity--th" },
  sth:      { dots: 4, label: "Super TH",    cls: "rarity--sth" },
};
function Rarity({ rarity }) {
  const r = RARITY_LEVELS[rarity] || RARITY_LEVELS.comum;
  return (
    <span className={`rarity ${r.cls}`}>
      <span className="rarity__dots">
        {[0,1,2,3].map(i => <i key={i} className={i < r.dots ? "on" : ""} />)}
      </span>
      {r.label}
    </span>
  );
}

/* ───────── Price formatter ───────── */
function formatBRL(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(v);
}
function formatBRLShort(v) {
  if (v >= 1000) return "R$" + (v/1000).toFixed(v >= 10000 ? 0 : 1).replace(".", ",") + "k";
  return formatBRL(v);
}

/* ───────── Top bar ───────── */
function TopBar({ search, onSearch, onAdd, onSettings, sheetConfigured }) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <div className="topbar__brand-mark">JM</div>
        Coleção
      </div>
      <label className="topbar__search">
        <SearchIcon />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Buscar por modelo, marca, série…"
        />
        {search && (
          <button onClick={() => onSearch("")} style={{ color: "var(--text-3)" }}>×</button>
        )}
      </label>
      <div className="topbar__actions">
        <button className="btn btn--ghost btn--icon" onClick={onSettings} aria-label="Configurações" title="Conectar planilha">
          <GearIcon />
          {!sheetConfigured && <span className="btn__dot" />}
        </button>
        <button className="btn btn--flame" onClick={onAdd}>
          <PlusIcon /><span className="btn__label">Adicionar peça</span>
        </button>
      </div>
    </header>
  );
}

/* ───────── Hero ───────── */
function Hero({ items, total, invested, lacradas, featured, onFeaturedClick }) {
  return (
    <section className="hero">
      <div className="hero__left">
        <div className="hero__eyebrow">Garage · 1:64 · São Paulo</div>
        <h1 className="hero__title">
          Minha<br/><em>coleção</em>
        </h1>
        <p className="hero__sub">
          Hot Wheels, Matchbox, Mini GT, Tarmac Works. Mainline a Red Line Club —
          catalogadas, lacradas e contabilizadas até o último centavo.
        </p>
        <div className="hero__stats">
          <div>
            <div className="stat__label">Peças</div>
            <div className="stat__value">
              {total}
              <small>{lacradas} lacradas</small>
            </div>
          </div>
          <div>
            <div className="stat__label">Investido</div>
            <div className="stat__value">
              {formatBRLShort(invested)}
              <small>em {total} unidades</small>
            </div>
          </div>
        </div>
      </div>

      {featured && (
        <div className="hero__featured" onClick={() => onFeaturedClick(featured)} style={{ cursor: "pointer" }}>
          <div className="hero__featured-img">
            <span className="hero__featured-tag">★ Destaque</span>
            <CarArt tint={featured.color} shape={featured.shape} brand={featured.brand} image={featured.image} />
          </div>
          <div className="hero__featured-body">
            <div>
              <div className="hero__featured-name">{featured.fullName || featured.name}</div>
            </div>
            <div className="hero__featured-meta">
              <span>{featured.series}{featured.year ? ` · ${featured.year}` : ""}</span>
              <strong>{featured.price > 0 ? formatBRL(featured.price) : (featured.priceRaw || "—")}</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ───────── List row ───────── */
function Row({ item, index, onClick }) {
  const displayName = item.fullName || item.name;
  return (
    <div className="row" onClick={() => onClick(item)} role="button" tabIndex={0}
         onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick(item)}>
      <div className="row__index">{String(index + 1).padStart(3, "0")}</div>
      <div className="row__img"><CarArt tint={item.color} shape={item.shape} image={item.image} /></div>
      <div className="row__name-col">
        <div className="row__name">{displayName}</div>
        <div className="row__sub">
          <span>{item.series}</span>
          {item.year && <span>{item.year}</span>}
        </div>
      </div>
      <div className="row__brand">{item.brand}</div>
      <div className="row__year">{item.year || "—"}</div>
      <div className="row__badges" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <StatusBadge status={item.status} />
      </div>
      <div className="row__price">
        {item.price > 0 ? formatBRL(item.price) :
          (item.priceRaw && /rifa|brinde|premio|pr\u00eamio/i.test(item.priceRaw) ?
            <span style={{ color: "var(--gold)", fontStyle: "italic", fontFamily: "var(--serif)" }}>{item.priceRaw}</span> :
            <span style={{ color: "var(--text-4)" }}>—</span>)
        }
        <div><Rarity rarity={item.rarity} /></div>
      </div>
      <div className="row__arrow"><ArrowIcon /></div>
    </div>
  );
}

/* ───────── Icons ───────── */
function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="7" r="5"/><path d="m11 11 3 3"/>
  </svg>;
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3v10M3 8h10"/>
  </svg>;
}
function ArrowIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="m6 3 5 5-5 5"/>
  </svg>;
}
function CloseIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="m4 4 8 8M12 4l-8 8"/>
  </svg>;
}
function ChevronIcon() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="m3 6 5 5 5-5"/>
  </svg>;
}
function GearIcon() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="8" cy="8" r="2.2"/>
    <path d="M8 1.5v1.8M8 12.7v1.8M3.4 3.4l1.27 1.27M11.33 11.33l1.27 1.27M1.5 8h1.8M12.7 8h1.8M3.4 12.6l1.27-1.27M11.33 4.67l1.27-1.27"/>
  </svg>;
}

Object.assign(window, {
  CarArt, StatusBadge, Rarity, RARITY_LEVELS,
  formatBRL, formatBRLShort,
  TopBar, Hero, Row,
  SearchIcon, PlusIcon, ArrowIcon, CloseIcon, ChevronIcon, GearIcon,
});
