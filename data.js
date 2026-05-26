// Sample miniatures collection (Hot Wheels-style)
// Schema mirrors a typical Google Sheets layout so the real loader can swap in seamlessly.

const TINTS = {
  red: "oklch(0.65 0.22 25)",
  orange: "oklch(0.72 0.19 45)",
  yellow: "oklch(0.85 0.18 90)",
  green: "oklch(0.65 0.18 145)",
  teal: "oklch(0.65 0.13 195)",
  blue: "oklch(0.6 0.2 250)",
  purple: "oklch(0.55 0.22 295)",
  pink: "oklch(0.7 0.2 0)",
  silver: "oklch(0.72 0.01 250)",
  black: "oklch(0.3 0.005 250)",
  white: "oklch(0.92 0.005 250)",
  gold: "oklch(0.78 0.14 90)",
};

// SVG car silhouettes — simple side-profile shapes that read as "car"
// without trying to be photoreal. Each is normalized to a 320×120 viewBox.
const SILHOUETTES = {
  muscle: `<svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="white" stop-opacity="0.18"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient></defs>
    <g fill="var(--car-tint)">
      <path d="M18 88 C 20 78, 38 76, 50 76 L 70 60 C 78 50, 102 44, 130 44 L 200 44 C 220 44, 240 50, 252 60 L 274 76 C 290 78, 302 80, 304 88 L 304 96 C 304 100, 300 102, 296 102 L 270 102 C 268 110, 258 116, 248 116 C 238 116, 230 110, 228 102 L 100 102 C 98 110, 88 116, 78 116 C 68 116, 60 110, 58 102 L 26 102 C 22 102, 18 100, 18 96 Z" />
    </g>
    <path d="M80 60 L 100 50 L 200 50 L 220 60 L 220 74 L 80 74 Z" fill="oklch(0 0 0 / 0.35)"/>
    <path d="M86 62 L 102 54 L 198 54 L 214 62 L 214 70 L 86 70 Z" fill="url(#g1)"/>
    <circle cx="78" cy="102" r="14" fill="oklch(0.15 0 0)"/>
    <circle cx="78" cy="102" r="6" fill="oklch(0.4 0 0)"/>
    <circle cx="248" cy="102" r="14" fill="oklch(0.15 0 0)"/>
    <circle cx="248" cy="102" r="6" fill="oklch(0.4 0 0)"/>
    <rect x="20" y="86" width="14" height="4" fill="oklch(0.85 0.15 80)" opacity="0.7"/>
    <rect x="290" y="86" width="12" height="4" fill="oklch(0.6 0.22 25)" opacity="0.7"/>
  </svg>`,

  jdm: `<svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="white" stop-opacity="0.18"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient></defs>
    <g fill="var(--car-tint)">
      <path d="M14 92 C 16 80, 30 76, 44 76 L 64 52 C 74 40, 100 36, 130 36 L 200 36 C 224 36, 244 42, 254 56 L 276 76 C 294 78, 306 82, 308 92 L 308 100 C 308 104, 304 106, 300 106 L 274 106 C 272 113, 262 118, 252 118 C 242 118, 234 113, 232 106 L 96 106 C 94 113, 84 118, 74 118 C 64 118, 56 113, 54 106 L 22 106 C 18 106, 14 104, 14 100 Z"/>
    </g>
    <path d="M74 56 L 96 42 L 200 42 L 224 56 L 230 76 L 70 76 Z" fill="oklch(0 0 0 / 0.35)"/>
    <path d="M82 56 L 100 46 L 198 46 L 218 56 L 222 72 L 78 72 Z" fill="url(#g2)"/>
    <rect x="142" y="60" width="2" height="14" fill="oklch(0 0 0 / 0.4)"/>
    <circle cx="74" cy="106" r="14" fill="oklch(0.15 0 0)"/>
    <circle cx="74" cy="106" r="6" fill="oklch(0.45 0 0)"/>
    <circle cx="252" cy="106" r="14" fill="oklch(0.15 0 0)"/>
    <circle cx="252" cy="106" r="6" fill="oklch(0.45 0 0)"/>
    <rect x="16" y="88" width="14" height="4" fill="oklch(0.85 0.15 80)" opacity="0.7"/>
  </svg>`,

  truck: `<svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg">
    <g fill="var(--car-tint)">
      <path d="M16 88 C 18 76, 34 72, 50 72 L 90 36 C 94 32, 102 30, 110 30 L 180 30 C 188 30, 196 34, 196 42 L 196 72 L 290 72 C 300 72, 306 78, 306 88 L 306 100 C 306 104, 302 106, 298 106 L 272 106 C 270 113, 260 118, 250 118 C 240 118, 232 113, 230 106 L 96 106 C 94 113, 84 118, 74 118 C 64 118, 56 113, 54 106 L 22 106 C 18 106, 14 104, 14 100 Z"/>
    </g>
    <path d="M100 42 L 184 42 L 184 70 L 100 70 Z" fill="oklch(0 0 0 / 0.4)"/>
    <path d="M104 44 L 180 44 L 180 68 L 104 68 Z" fill="white" fill-opacity="0.1"/>
    <rect x="138" y="44" width="2" height="24" fill="oklch(0 0 0 / 0.4)"/>
    <circle cx="74" cy="106" r="14" fill="oklch(0.15 0 0)"/>
    <circle cx="74" cy="106" r="6" fill="oklch(0.45 0 0)"/>
    <circle cx="250" cy="106" r="14" fill="oklch(0.15 0 0)"/>
    <circle cx="250" cy="106" r="6" fill="oklch(0.45 0 0)"/>
  </svg>`,

  exotic: `<svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="white" stop-opacity="0.22"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient></defs>
    <g fill="var(--car-tint)">
      <path d="M10 96 C 14 84, 32 80, 48 80 L 78 64 C 92 56, 116 50, 150 50 L 210 50 C 240 52, 264 60, 278 72 L 298 86 C 308 88, 312 92, 312 98 L 312 104 C 312 108, 308 110, 304 110 L 280 110 C 278 116, 268 120, 258 120 C 248 120, 240 116, 238 110 L 96 110 C 94 116, 84 120, 74 120 C 64 120, 56 116, 54 110 L 18 110 C 14 110, 10 108, 10 104 Z"/>
    </g>
    <path d="M88 66 L 120 58 L 210 58 L 240 70 L 244 84 L 84 84 Z" fill="oklch(0 0 0 / 0.4)"/>
    <path d="M94 66 L 124 60 L 208 60 L 234 68 L 236 80 L 90 80 Z" fill="url(#g3)"/>
    <circle cx="74" cy="110" r="14" fill="oklch(0.15 0 0)"/>
    <circle cx="74" cy="110" r="6" fill="oklch(0.5 0 0)"/>
    <circle cx="258" cy="110" r="14" fill="oklch(0.15 0 0)"/>
    <circle cx="258" cy="110" r="6" fill="oklch(0.5 0 0)"/>
    <rect x="294" y="90" width="14" height="3" fill="oklch(0.6 0.22 25)"/>
  </svg>`,

  rally: `<svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg">
    <g fill="var(--car-tint)">
      <path d="M16 88 C 18 76, 32 72, 46 72 L 68 50 C 78 40, 102 36, 132 36 L 198 36 C 220 36, 240 42, 250 56 L 274 72 C 290 74, 302 78, 304 88 L 304 98 C 304 102, 300 104, 296 104 L 272 104 C 270 112, 260 117, 250 117 C 240 117, 232 112, 230 104 L 96 104 C 94 112, 84 117, 74 117 C 64 117, 56 112, 54 104 L 22 104 C 18 104, 14 102, 14 98 Z"/>
    </g>
    <path d="M76 56 L 104 42 L 196 42 L 220 56 L 226 72 L 70 72 Z" fill="oklch(0 0 0 / 0.4)"/>
    <path d="M140 60 L 160 56 L 180 60 L 180 70 L 140 70 Z" fill="white" fill-opacity="0.2"/>
    <circle cx="74" cy="104" r="15" fill="oklch(0.15 0 0)"/>
    <circle cx="74" cy="104" r="7" fill="oklch(0.5 0 0)"/>
    <circle cx="250" cy="104" r="15" fill="oklch(0.15 0 0)"/>
    <circle cx="250" cy="104" r="7" fill="oklch(0.5 0 0)"/>
    <rect x="60" y="46" width="36" height="3" fill="white" fill-opacity="0.7"/>
    <rect x="228" y="46" width="32" height="3" fill="white" fill-opacity="0.7"/>
  </svg>`,
};

const COLLECTION = [
  { id: "001", name: "'67 Chevy Camaro", brand: "Hot Wheels", year: 2024, series: "Mainline", color: "blue",  shape: "muscle", price: 8.99,  status: "lacrado", rarity: "comum",   note: "Treasure Hunt? Não, é a base. Mas o azul ficou perfeito. Comprado no Sam's." },
  { id: "002", name: "Nissan Skyline GT-R (BNR34)", brand: "Hot Wheels", year: 2023, series: "Boulevard", color: "silver", shape: "jdm", price: 39.90, status: "lacrado", rarity: "incomum", note: "Premium com rodas reais e detalhes de freio. Edição Boulevard." },
  { id: "003", name: "Mazda RX-7 (FD)", brand: "Hot Wheels", year: 2022, series: "Car Culture · JDM", color: "yellow", shape: "jdm", price: 65.00, status: "lacrado", rarity: "raro", note: "Card culture JDM. Acabamento perolado." },
  { id: "004", name: "'70 Plymouth Road Runner", brand: "Hot Wheels", year: 2023, series: "RLC Exclusive", color: "purple", shape: "muscle", price: 280.00, status: "lacrado", rarity: "sth", note: "Red Line Club. Caixa selada, jamais aberta." },
  { id: "005", name: "Porsche 911 GT3 RS", brand: "Mini GT", year: 2024, series: "Premium 1:64", color: "white", shape: "exotic", price: 89.90, status: "aberto", rarity: "raro", note: "Mini GT entrega outro nível de detalhe. Aberto pra display." },
  { id: "006", name: "Datsun 510", brand: "Hot Wheels", year: 2021, series: "Car Culture · Team Trans Am", color: "red", shape: "jdm", price: 55.00, status: "lacrado", rarity: "incomum", note: "" },
  { id: "007", name: "Ford GT40", brand: "Hot Wheels", year: 2023, series: "Mainline · Then & Now", color: "blue", shape: "exotic", price: 9.99, status: "aberto", rarity: "comum", note: "" },
  { id: "008", name: "Toyota AE86", brand: "Tarmac Works", year: 2024, series: "Global64", color: "white", shape: "jdm", price: 145.00, status: "lacrado", rarity: "raro", note: "Tarmac Works, decals do Initial D. Fenômeno." },
  { id: "009", name: "Lamborghini Countach", brand: "Hot Wheels", year: 2022, series: "Premium Forza", color: "orange", shape: "exotic", price: 49.90, status: "lacrado", rarity: "incomum", note: "" },
  { id: "010", name: "'55 Chevy Bel Air Gasser", brand: "Hot Wheels", year: 2023, series: "Mainline", color: "teal", shape: "muscle", price: 8.99, status: "lacrado", rarity: "th", note: "Treasure Hunt regular — logo TH no pacote." },
  { id: "011", name: "Subaru Impreza WRX (GC8)", brand: "Hot Wheels", year: 2024, series: "Boulevard", color: "blue", shape: "rally", price: 42.00, status: "lacrado", rarity: "incomum", note: "Edição Boulevard com rodas reais." },
  { id: "012", name: "Ford F-150 Lightning", brand: "Matchbox", year: 2023, series: "Moving Parts", color: "red", shape: "truck", price: 22.00, status: "aberto", rarity: "comum", note: "" },
  { id: "013", name: "Honda Civic EG6", brand: "Hot Wheels", year: 2023, series: "Car Culture · Modern Classics", color: "green", shape: "jdm", price: 72.00, status: "lacrado", rarity: "raro", note: "" },
  { id: "014", name: "'69 Ford Mustang Boss 302", brand: "Hot Wheels", year: 2024, series: "Mainline · Muscle Mania", color: "yellow", shape: "muscle", price: 8.99, status: "aberto", rarity: "comum", note: "" },
  { id: "015", name: "Pagani Huayra", brand: "Hot Wheels", year: 2023, series: "Premium Hypercar", color: "silver", shape: "exotic", price: 52.00, status: "lacrado", rarity: "incomum", note: "" },
  { id: "016", name: "Volkswagen Brasília", brand: "Hot Wheels", year: 2022, series: "HW Hot Auction", color: "yellow", shape: "muscle", price: 380.00, status: "lacrado", rarity: "sth", note: "Super Treasure Hunt. Spectraflame impecável, rodas RR." },
  { id: "017", name: "Toyota Supra MK4", brand: "Hot Wheels", year: 2024, series: "Fast & Furious", color: "orange", shape: "jdm", price: 16.90, status: "lacrado", rarity: "comum", note: "Pacote F&F, edição Toretto." },
  { id: "018", name: "Ford Escort RS1800", brand: "Hot Wheels", year: 2023, series: "Car Culture · Rally Legends", color: "white", shape: "rally", price: 68.00, status: "lacrado", rarity: "raro", note: "" },
  { id: "019", name: "McLaren P1", brand: "Hot Wheels", year: 2022, series: "Mainline", color: "red", shape: "exotic", price: 8.99, status: "aberto", rarity: "comum", note: "" },
  { id: "020", name: "Nissan Fairlady Z (S30)", brand: "Hot Wheels", year: 2024, series: "Boulevard", color: "orange", shape: "jdm", price: 42.00, status: "lacrado", rarity: "incomum", note: "" },
  { id: "021", name: "Dodge Charger Daytona", brand: "Hot Wheels", year: 2023, series: "Mainline · NASCAR", color: "purple", shape: "muscle", price: 8.99, status: "lacrado", rarity: "comum", note: "" },
  { id: "022", name: "BMW M3 (E30)", brand: "Hot Wheels", year: 2024, series: "Car Culture · Touring Cars", color: "white", shape: "rally", price: 75.00, status: "lacrado", rarity: "raro", note: "" },
  { id: "023", name: "'70 Chevelle SS", brand: "Hot Wheels", year: 2022, series: "RLC Exclusive", color: "green", shape: "muscle", price: 250.00, status: "lacrado", rarity: "sth", note: "RLC. Comprei direto no sorteio do Mattel Creations." },
  { id: "024", name: "Mercedes-Benz 300 SL Gullwing", brand: "Hot Wheels", year: 2023, series: "Premium Modern Classics", color: "silver", shape: "exotic", price: 58.00, status: "aberto", rarity: "incomum", note: "" },
  { id: "025", name: "Ford Bronco", brand: "Matchbox", year: 2024, series: "Off-Road", color: "blue", shape: "truck", price: 18.00, status: "lacrado", rarity: "comum", note: "" },
  { id: "026", name: "Acura NSX (NA1)", brand: "Hot Wheels", year: 2023, series: "Car Culture · Modern Classics", color: "red", shape: "exotic", price: 69.90, status: "lacrado", rarity: "raro", note: "" },
  { id: "027", name: "Volkswagen T1 Drag Bus", brand: "Hot Wheels", year: 2024, series: "Mainline · HW Drag Strip", color: "red", shape: "truck", price: 8.99, status: "lacrado", rarity: "th", note: "Treasure Hunt do mês. Achei na primeira gôndola." },
  { id: "028", name: "Lancia Stratos HF", brand: "Hot Wheels", year: 2024, series: "Car Culture · Rally Legends", color: "orange", shape: "rally", price: 72.00, status: "lacrado", rarity: "raro", note: "" },
  { id: "029", name: "Honda S2000", brand: "Mini GT", year: 2024, series: "Premium 1:64", color: "yellow", shape: "jdm", price: 92.00, status: "aberto", rarity: "raro", note: "Cap dobrado funcional. Detalhe absurdo." },
  { id: "030", name: "'63 Corvette Stingray", brand: "Hot Wheels", year: 2023, series: "Boulevard", color: "red", shape: "muscle", price: 39.90, status: "lacrado", rarity: "incomum", note: "" },
  { id: "031", name: "Renault 5 Turbo", brand: "Hot Wheels", year: 2024, series: "Car Culture · Hot Hatch", color: "yellow", shape: "rally", price: 78.00, status: "lacrado", rarity: "raro", note: "" },
  { id: "032", name: "Mitsubishi Lancer Evo VI", brand: "Hot Wheels", year: 2023, series: "Fast & Furious", color: "white", shape: "rally", price: 19.90, status: "lacrado", rarity: "comum", note: "" },
  { id: "033", name: "Bugatti Chiron", brand: "Hot Wheels", year: 2022, series: "Premium Hypercar", color: "blue", shape: "exotic", price: 48.00, status: "lacrado", rarity: "incomum", note: "" },
  { id: "034", name: "Custom '77 Dodge Van", brand: "Hot Wheels", year: 2024, series: "HW Hot Auction (STH)", color: "pink", shape: "truck", price: 420.00, status: "lacrado", rarity: "sth", note: "Super Treasure Hunt, Spectraflame rosa. Caça incrível." },
  { id: "035", name: "Audi R8 LMS", brand: "Hot Wheels", year: 2023, series: "Mainline · HW Race Team", color: "silver", shape: "exotic", price: 8.99, status: "aberto", rarity: "comum", note: "" },
  { id: "036", name: "Land Rover Defender 110", brand: "Matchbox", year: 2024, series: "MBX Off-Road", color: "green", shape: "truck", price: 16.00, status: "lacrado", rarity: "comum", note: "" },
  { id: "037", name: "Ferrari F40", brand: "Hot Wheels", year: 2022, series: "Car Culture · Modern Classics", color: "red", shape: "exotic", price: 95.00, status: "lacrado", rarity: "raro", note: "Re-edição depois de anos sem Ferrari. Pegou fogo no mercado." },
  { id: "038", name: "Toyota Tacoma Off-Road", brand: "Greenlight", year: 2023, series: "All-Terrain", color: "black", shape: "truck", price: 38.00, status: "aberto", rarity: "incomum", note: "" },
  { id: "039", name: "Mazda Miata MX-5 (NA)", brand: "Hot Wheels", year: 2024, series: "Boulevard", color: "red", shape: "jdm", price: 42.00, status: "lacrado", rarity: "incomum", note: "" },
  { id: "040", name: "Custom '69 Camaro SS", brand: "Hot Wheels", year: 2024, series: "RLC Exclusive (sH)", color: "gold", shape: "muscle", price: 310.00, status: "lacrado", rarity: "sth", note: "RLC Spectraflame Gold. Joia." },
];

window.COLLECTION = COLLECTION;
window.TINTS = TINTS;
window.SILHOUETTES = SILHOUETTES;
