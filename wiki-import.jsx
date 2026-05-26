/* Wiki Hot Wheels — real Fandom MediaWiki API + blister fallback for offline/typo cases */

const WIKI_API_BASE = "https://hotwheels.fandom.com/api.php";

/* Heuristic: on Hot Wheels Wiki the page-image is usually the loose showcase
   shot, while images in the "Versions" table are named with a year prefix
   (e.g. "2013 Nissan Skyline.jpg", "2021HWPremium...jpg", "21F&F03.JPG") and
   are nearly always carded blister photos. */
const YEAR_RX     = /\b(19|20)\d{2}\b/;
const YEAR2_RX    = /^(\d{2})[A-Z]/i;                    // "21F&F", "14hwnsr34"
const CARD_RX     = /\bcard(ed)?\b/i;
const CATALOG_RX  = /catalog(ue)?/i;
const HW_TAG_RX   = /\b(hw|f&f|matchbox|premium|mainline|boulevard|nightburn|treasure|sth|rlc|hotwheels)\b/i;
const LOOSE_RX    = /loose|out[- _]?of[- _]?packag|unpackag|prototype|showcase/i;
const DETAIL_RX   = /wheelerror|flaw|sketch|proto|detail|rear|side|interior|undercarriage|chassis|bottom|wheel[- _]?close/i;
const IMG_EXT_RX  = /\.(jpe?g|png|webp|gif)$/i;
const SKIP_RX     = /-logo|wiki-?wordmark|community|placeholder|favicon|sprite|^Icon|button|Image_Not_Available|^Hero|spinner|banner|^Logo|^Background/i;

async function wikiApi(params) {
  const url = new URL(WIKI_API_BASE);
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  for (const k in params) url.searchParams.set(k, params[k]);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Wiki API ${res.status}`);
  return res.json();
}

async function searchWikiReal(query) {
  // 1) Search for matching casting pages + grab the page-image (usually loose)
  const json = await wikiApi({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "15",
    gsrnamespace: "0",
    prop: "pageimages|info",
    pithumbsize: "500",
    inprop: "url",
  });
  if (!json.query || !json.query.pages) return [];

  const pages = Object.values(json.query.pages)
    .sort((a, b) => (a.index || 0) - (b.index || 0));

  const results = pages.map(p => ({
    wikiId: `wiki-${p.pageid}`,
    pageTitle: p.title,
    name: p.title,
    brand: "Hot Wheels",
    year: null,
    series: "—",
    color: "silver",
    shape: inferShapeFromName(p.title),
    thumb: p.thumbnail?.source || null,
    thumbType: p.thumbnail?.source ? "loose" : null,  // page-image is usually loose
    fullurl: p.fullurl,
    blister: "mainline",
  }));

  // 2) Try to upgrade each result to a "carded" image if one exists on its page
  await upgradeToCardedThumbs(results);

  return results;
}

async function upgradeToCardedThumbs(results) {
  if (!results.length) return;
  try {
    // For each result, hit action=parse — it sees images included through templates
    // (the {{Versions}} template stores all the carded blister photos).
    const parsePromises = results.map(r =>
      wikiApi({
        action: "parse",
        page: r.pageTitle,
        prop: "images",
        redirects: "1",
        disablelimitreport: "1",
        disableeditsection: "1",
      }).then(j => ({ result: r, images: j.parse?.images || [] }))
        .catch(() => ({ result: r, images: [] }))
    );
    const parsed = await Promise.all(parsePromises);

    const wantedFiles = [];           // unique "File:Name.jpg" titles
    const pageToFile = {};            // pageTitle -> chosen file title

    for (const { result, images } of parsed) {
      // images come as bare filenames like "2013 Nissan Skyline GT-R R34.jpg"
      const candidates = images
        .filter(name => IMG_EXT_RX.test(name) && !SKIP_RX.test(name) && !LOOSE_RX.test(name));
      if (!candidates.length) continue;

      const scored = candidates.map(name => {
        let score = 0;
        const m4 = name.match(YEAR_RX);
        const m2 = name.match(YEAR2_RX);
        if (m4) {
          score += 100;
          score += parseInt(m4[0], 10);                  // newer year = higher
        } else if (m2) {
          score += 80;
          score += 2000 + parseInt(m2[1], 10);
        }
        if (CARD_RX.test(name))    score += 60;
        if (CATALOG_RX.test(name)) score += 30;
        if (HW_TAG_RX.test(name))  score += 10;
        if (DETAIL_RX.test(name))  score -= 80;          // strongly penalize detail shots
        return { name, score };
      });
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      if (!best || best.score < 60) continue;            // require at least a "card" or year hit

      const fileTitle = "File:" + best.name;
      pageToFile[result.pageTitle] = fileTitle;
      if (!wantedFiles.includes(fileTitle)) wantedFiles.push(fileTitle);
    }
    if (!wantedFiles.length) return;

    // Resolve file titles to direct image URLs (thumb at width 500), batching
    // in chunks of 30 since MediaWiki limits titles per query.
    const fileUrlByTitle = {};
    for (let i = 0; i < wantedFiles.length; i += 30) {
      const slice = wantedFiles.slice(i, i + 30);
      const fileJson = await wikiApi({
        action: "query",
        titles: slice.join("|"),
        prop: "imageinfo",
        iiprop: "url",
        iiurlwidth: "500",
        redirects: "1",
      });
      if (fileJson.query?.pages) {
        for (const fp of Object.values(fileJson.query.pages)) {
          const info = fp.imageinfo?.[0];
          if (info) fileUrlByTitle[fp.title] = info.thumburl || info.url;
        }
      }
      // Also map any normalized titles back to originals
      const norm = fileJson.query?.normalized || [];
      norm.forEach(n => {
        if (fileUrlByTitle[n.to]) fileUrlByTitle[n.from] = fileUrlByTitle[n.to];
      });
    }

    // Apply: replace loose thumb with carded thumb where we found one
    for (const r of results) {
      const fileTitle = pageToFile[r.pageTitle];
      if (!fileTitle) continue;
      const url = fileUrlByTitle[fileTitle];
      if (url) {
        r.thumb = url;
        r.thumbType = "carded";
      }
    }
  } catch (e) {
    console.warn("Carded upgrade failed (keeping loose thumbs):", e);
  }
}

function inferShapeFromName(name) {
  const n = (name || "").toLowerCase();
  if (/skyline|gt-?r|rx-?7|rx-?8|supra|civic|ae86|silvia|miata|nsx|integra|s2000|fairlady|datsun|wrx|impreza|evo|lancer|trueno|levin|del sol|prelude|mr2|tsuru|sentra/.test(n)) return "jdm";
  if (/ferrari|lambo|porsche|mclaren|bugatti|pagani|aston|gt40|f40|f50|p1|huayra|chiron|countach|enzo|gallardo|aventador|huracan|spyder|cobra|stingray|viper|carrera|maserati|koenigsegg|saleen|noble|veyron/.test(n)) return "exotic";
  if (/camaro|mustang|charger|challenger|chevelle|'cuda|cuda|nova|firebird|trans ?am|bel ?air|impala|gto|corvette|gasser|dragster|barracuda|road runner|hemi|fury|galaxie|fairlane|torino|boss/.test(n)) return "muscle";
  if (/bronco|f-?150|silverado|defender|tacoma|wrangler|land rover|jeep|ram|tundra|hilux|titan|sierra|colorado|ranger|pick-?up|truck|van|bus|brasilia|kombi|highlander|expedition|tahoe|escalade|suburban|cherokee/.test(n)) return "truck";
  if (/escort|delta|stratos|celica|rally|mini ?cooper|fiesta|focus|peugeot|205|polo|gti|hatch|clio|saxo|punto|swift|yaris|fit|march|sandero|gol/.test(n)) return "rally";
  return "muscle";
}

const WIKI_CATALOG = [
  { wikiId: "hw-amg-gt",    name: "Mercedes-AMG GT",          brand: "Hot Wheels", year: 2024, series: "Boulevard",                    color: "silver", shape: "exotic", blister: "boulevard" },
  { wikiId: "hw-db5",       name: "Aston Martin DB5",         brand: "Hot Wheels", year: 2023, series: "Premium · Pop Culture",        color: "silver", shape: "exotic", blister: "premium" },
  { wikiId: "hw-trueno",    name: "Toyota Sprinter Trueno (AE86)", brand: "Hot Wheels", year: 2024, series: "Mainline · HW J-Imports", color: "white", shape: "jdm", blister: "mainline" },
  { wikiId: "hw-cuda",      name: "'70 Plymouth Hemi 'Cuda",  brand: "Hot Wheels", year: 2024, series: "Mainline · Muscle Mania",      color: "purple", shape: "muscle", blister: "mainline" },
  { wikiId: "hw-r32",       name: "Nissan Skyline GT-R (R32)", brand: "Hot Wheels", year: 2024, series: "Car Culture · JDM",           color: "red", shape: "jdm", blister: "carculture" },
  { wikiId: "hw-deltahf",   name: "Lancia Delta HF Integrale", brand: "Hot Wheels", year: 2024, series: "Car Culture · Rally Legends", color: "red", shape: "rally", blister: "carculture" },
  { wikiId: "hw-fxx",       name: "Ferrari FXX",              brand: "Hot Wheels", year: 2023, series: "Premium Forza",                color: "red", shape: "exotic", blister: "premium" },
  { wikiId: "hw-fd-rx7",    name: "Mazda RX-7 (FD3S) Spirit R", brand: "Hot Wheels", year: 2024, series: "Boulevard",                  color: "blue", shape: "jdm", blister: "boulevard" },
  { wikiId: "hw-911-930",   name: "Porsche 911 Turbo (930)",  brand: "Hot Wheels", year: 2023, series: "Car Culture · Porsche",        color: "orange", shape: "exotic", blister: "carculture" },
  { wikiId: "hw-truck-cl",  name: "'83 Chevy Silverado",      brand: "Hot Wheels", year: 2024, series: "Mainline · HW Hot Trucks",     color: "teal", shape: "truck", blister: "mainline" },
  { wikiId: "hw-st185",     name: "Toyota Celica GT-Four (ST185)", brand: "Hot Wheels", year: 2024, series: "Car Culture · Rally",     color: "white", shape: "rally", blister: "carculture" },
  { wikiId: "hw-jag",       name: "Jaguar D-Type",            brand: "Hot Wheels", year: 2023, series: "Premium · Modern Classics",    color: "green", shape: "exotic", blister: "premium" },
  { wikiId: "hw-charger",   name: "'69 Dodge Charger R/T",    brand: "Hot Wheels", year: 2024, series: "Fast & Furious",               color: "black", shape: "muscle", blister: "ff" },
  { wikiId: "hw-gtr-r35",   name: "Nissan GT-R (R35)",        brand: "Hot Wheels", year: 2024, series: "Fast & Furious",               color: "blue", shape: "exotic", blister: "ff" },
  { wikiId: "hw-450ss",     name: "Chevrolet Bel Air '57",    brand: "Hot Wheels", year: 2024, series: "RLC Exclusive",                color: "gold", shape: "muscle", blister: "rlc" },
  { wikiId: "hw-vw-bug",    name: "Volkswagen Fusca",         brand: "Hot Wheels", year: 2023, series: "Mainline · HW J-Imports",      color: "yellow", shape: "jdm", blister: "mainline" },
  { wikiId: "hw-f50",       name: "Ferrari F50",              brand: "Hot Wheels", year: 2024, series: "Car Culture · Modern Classics", color: "red", shape: "exotic", blister: "carculture" },
];

/* Blister card visual — stylized Hot Wheels packaging.
   Uses different palettes per series family so the card LOOKS like the wiki
   image even though we generate it. */
const BLISTER_PRESETS = {
  mainline:   { bg: "oklch(0.4 0.2 260)",  band: "oklch(0.72 0.19 45)", logo: "HW", label: "Mainline" },
  boulevard:  { bg: "oklch(0.25 0.05 250)", band: "oklch(0.78 0.14 90)", logo: "BLVD", label: "Boulevard" },
  premium:    { bg: "oklch(0.2 0.005 250)", band: "oklch(0.8 0.005 250)", logo: "HW", label: "Premium" },
  carculture: { bg: "oklch(0.22 0.07 35)", band: "oklch(0.75 0.16 60)", logo: "CC", label: "Car Culture" },
  ff:         { bg: "oklch(0.18 0.005 250)", band: "oklch(0.65 0.22 25)", logo: "F&F", label: "Fast & Furious" },
  rlc:        { bg: "oklch(0.28 0.18 25)", band: "oklch(0.85 0.1 90)", logo: "RLC", label: "Red Line Club" },
};

function Blister({ item, compact = false }) {
  const p = BLISTER_PRESETS[item.blister] || BLISTER_PRESETS.mainline;
  const carTint = window.TINTS[item.color] || window.TINTS.silver;
  const svg = window.SILHOUETTES[item.shape] || window.SILHOUETTES.muscle;
  return (
    <div
      className="blister"
      style={{
        "--blister-bg": p.bg,
        "--blister-band": p.band,
        "--car-tint": carTint,
      }}
    >
      <div className="blister__top">
        <div className="blister__logo">{p.logo}</div>
        <div className="blister__year">'{String(item.year).slice(-2)}</div>
      </div>
      <div className="blister__window">
        <div
          className="blister__car"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="blister__shine" />
      </div>
      <div className="blister__band">
        <div className="blister__band-name">{item.name}</div>
        {!compact && <div className="blister__band-series">{p.label}</div>}
      </div>
    </div>
  );
}

/* ───────── Wiki search panel ───────── */
function WikiSearch({ onPick }) {
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const [source, setSource] = React.useState("wiki"); // "wiki" | "mock"

  React.useEffect(() => {
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const real = await searchWikiReal(q);
        if (real.length > 0) {
          setResults(real);
          setSource("wiki");
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Wiki API falhou, usando catalogo offline:", e);
      }
      // Fallback to bundled catalog if API fails or has no hits
      const needle = q.toLowerCase();
      setResults(
        WIKI_CATALOG.filter(c =>
          c.name.toLowerCase().includes(needle) ||
          c.series.toLowerCase().includes(needle) ||
          c.brand.toLowerCase().includes(needle)
        ).slice(0, 6)
      );
      setSource("mock");
      setLoading(false);
    }, 380);
    return () => clearTimeout(t);
  }, [q]);

  const popularQueries = ["Skyline", "Mustang", "Treasure", "Rally", "Premium"];

  return (
    <div className="wiki">
      <div className="wiki__searchbar">
        <SearchIcon />
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar modelo no Wiki Hot Wheels…"
        />
        {q && <button className="wiki__clear" onClick={() => setQ("")}>×</button>}
      </div>

      <div className="wiki__hint">
        <span className="wiki__dot" /> {source === "mock" && results.length > 0 ? "Catálogo offline" : "Conectado"} · <strong>hotwheels.fandom.com</strong>
      </div>

      {!q && (
        <div className="wiki__suggest">
          <div className="field__label">Sugestões</div>
          <div className="chips" style={{ marginTop: 8 }}>
            {popularQueries.map(s => (
              <button key={s} className="chip" onClick={() => setQ(s)}>{s}</button>
            ))}
          </div>
          <div className="wiki__empty-illustration">
            <div className="wiki__empty-text">
              Cole um nome de modelo e a gente puxa<br/>foto do blister, ano e série do Wiki.
            </div>
          </div>
        </div>
      )}

      {q && loading && (
        <div className="wiki__loading">
          <div className="wiki__skeleton" />
          <div className="wiki__skeleton" />
          <div className="wiki__skeleton" />
          <div className="wiki__skeleton" />
        </div>
      )}

      {q && !loading && results.length === 0 && (
        <div className="wiki__no-results">
          <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: "var(--text-2)" }}>
            Nada encontrado pra "{q}"
          </div>
          <div style={{ marginTop: 6, color: "var(--text-3)", fontSize: 13 }}>
            Tente outro nome, ou cadastre manualmente.
          </div>
        </div>
      )}

      {q && !loading && results.length > 0 && (
        <div className="wiki__results">
          <div className="field__label">{results.length} resultado{results.length > 1 ? "s" : ""}</div>
          <div className="wiki__grid">
            {results.map(r => (
              <button key={r.wikiId} className="wiki-card" onClick={() => onPick(r)}>
                {r.thumb ? (
                  <div className="wiki-card__photo">
                    <img src={r.thumb} alt={r.name} referrerPolicy="no-referrer" loading="lazy" />
                    {r.thumbType && (
                      <span className={`wiki-card__type wiki-card__type--${r.thumbType}`}>
                        {r.thumbType === "carded" ? "Carded" : "Loose"}
                      </span>
                    )}
                  </div>
                ) : (
                  <Blister item={r} />
                )}
                <div className="wiki-card__body">
                  <div className="wiki-card__name">{r.name}</div>
                  <div className="wiki-card__meta">
                    {r.year ? `${r.year} · ` : ""}{r.series}
                  </div>
                </div>
                <div className="wiki-card__use">Usar este <ArrowIcon /></div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { WikiSearch, Blister, WIKI_CATALOG, BLISTER_PRESETS });
