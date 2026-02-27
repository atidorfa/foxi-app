'use client'
import React from 'react'

type AccColors = { primary: string; secondary: string; accent: string }
type AccVisualFn = (c: AccColors) => React.ReactElement
// Side-aware claw function: renders only ONE paw side, placed inside its arm group
type ClawSideFn = (c: AccColors, side: 'L' | 'R') => React.ReactElement | null

// ─────────────────────────────────────────────────────────────────────────────
// ANCHOR POINTS — contrato del cuerpo neutro (viewBox 0 0 300 300)
// SVG form:  EAR_L≈(118,78)  EAR_R≈(182,78)  MUZZLE=(150,120)
//            TAIL_BASE≈(205,224)  PAW_FL=(68,240)  PAW_FR=(232,240)
//            PAW_BL=(114,296)    PAW_BR=(186,296)
// Chibi form: EAR_L≈(104,96)  EAR_R≈(196,96)  MUZZLE=(150,118)
//            TAIL_BASE≈(178,202)  PAW_FL=(109,240)  PAW_FR=(191,240)
//            PAW_BL=(134,261)    PAW_BR=(166,261)
// ─────────────────────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// SVG FORM (Level 1-2, viewBox 0 0 300 300)
// Head center ~(150,100), HEAD_SHAPE y=50–154. Body y=148–274 (flat top).
// ═════════════════════════════════════════════════════════════════════════════
export const ACC_VISUAL_SVG: Record<string, AccVisualFn> = {

  // ── OREJAS ─────────────────────────────────────────────────────────────────
  ears_wolf: ({ primary, secondary, accent }) => (
    <>
      <path d="M106 80 Q100 46 114 30 Q126 52 120 80 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M109 78 Q104 51 114 38 Q122 56 118 78 Z" fill={secondary} opacity="0.65"/>
      <path d="M194 80 Q200 46 186 30 Q174 52 180 80 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M191 78 Q196 51 186 38 Q178 56 182 78 Z" fill={secondary} opacity="0.65"/>
    </>
  ),

  ears_fox: ({ primary, secondary, accent }) => (
    <>
      {/* Muy altas y anchas — icónicas del zorro */}
      <path d="M96 82 Q86 40 108 22 Q130 56 126 82 Z" fill={primary} stroke={accent} strokeWidth="1.2"/>
      <path d="M100 79 Q92 46 110 30 Q128 60 122 79 Z" fill={secondary} opacity="0.60"/>
      <path d="M204 82 Q214 40 192 22 Q170 56 174 82 Z" fill={primary} stroke={accent} strokeWidth="1.2"/>
      <path d="M200 79 Q208 46 190 30 Q172 60 178 79 Z" fill={secondary} opacity="0.60"/>
    </>
  ),

  ears_cat: ({ primary, secondary, accent }) => (
    <>
      {/* Triángulos compactos con tuft en la punta */}
      <path d="M109 80 Q108 54 117 44 Q126 58 122 80 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M111 78 Q110 57 117 50 Q123 61 120 78 Z" fill={secondary} opacity="0.6"/>
      <path d="M117 45 Q115 37 118 34 Q121 38 118 45 Z" fill={accent} opacity="0.95"/>
      <path d="M191 80 Q192 54 183 44 Q174 58 178 80 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M189 78 Q190 57 183 50 Q177 61 180 78 Z" fill={secondary} opacity="0.6"/>
      <path d="M183 45 Q185 37 182 34 Q179 38 182 45 Z" fill={accent} opacity="0.95"/>
    </>
  ),

  ears_crow: ({ primary, accent }) => (
    <>
      {/* Cresta de plumas escalonadas */}
      <path d="M134 68 Q132 48 138 34 Q147 52 142 70 Z" fill={accent} stroke={primary} strokeWidth="0.6" opacity="0.9"/>
      <path d="M141 65 Q139 42 145 28 Q153 48 148 67 Z" fill={accent} stroke={primary} strokeWidth="0.6" opacity="0.95"/>
      <path d="M148 63 Q148 40 155 26 Q162 46 156 65 Z" fill={accent} stroke={primary} strokeWidth="0.6" opacity="0.95"/>
      <path d="M155 64 Q156 44 161 30 Q166 50 161 66 Z" fill={accent} stroke={primary} strokeWidth="0.6" opacity="0.85"/>
    </>
  ),

  ears_deer: ({ primary, secondary, accent }) => (
    <>
      {/* Anchas y ligeramente caídas */}
      <path d="M96 82 Q82 50 96 34 Q118 52 116 82 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M100 79 Q88 54 98 42 Q116 56 113 79 Z" fill={secondary} opacity="0.55"/>
      <path d="M204 82 Q218 50 204 34 Q182 52 184 82 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M200 79 Q212 54 202 42 Q184 56 187 79 Z" fill={secondary} opacity="0.55"/>
    </>
  ),

  ears_bear: ({ primary, secondary, accent }) => (
    <>
      {/* Pequeñas y redondas — características del oso */}
      <ellipse cx={110} cy={62} rx={16} ry={15} fill={primary} stroke={accent} strokeWidth="1"/>
      <ellipse cx={110} cy={62} rx={10} ry={10} fill={secondary} opacity="0.5"/>
      <ellipse cx={190} cy={62} rx={16} ry={15} fill={primary} stroke={accent} strokeWidth="1"/>
      <ellipse cx={190} cy={62} rx={10} ry={10} fill={secondary} opacity="0.5"/>
    </>
  ),

  // ── HOCICO — el slot más impactante: define la especie visualmente ─────────
  // Coordenadas: cabeza inferior y≈110–145, nariz default en (150,120)

  hocico_wolf: ({ primary, secondary, accent }) => (
    <>
      {/* Morro alargado — zona secondary (pelaje más claro del morro) */}
      <path d="M126,114 Q150,108 174,114 Q180,124 174,138 Q150,145 126,138 Q120,128 126,114 Z"
            fill={secondary} opacity="0.75"/>
      {/* Nariz grande y oscura */}
      <ellipse cx="150" cy="117" rx="10" ry="7" fill="rgba(20,12,8,0.85)"/>
      {/* Fosas nasales */}
      <ellipse cx="146" cy="116" rx="3" ry="2" fill="rgba(0,0,0,0.5)"/>
      <ellipse cx="154" cy="116" rx="3" ry="2" fill="rgba(0,0,0,0.5)"/>
      {/* Philtrum */}
      <line x1="150" y1="124" x2="150" y2="132" stroke="rgba(0,0,0,0.3)" strokeWidth="1.2"/>
      {/* Boca */}
      <path d="M140,132 Q150,137 160,132" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1" strokeLinecap="round"/>
      {/* Bigotes — sutiles */}
      <line x1="118" y1="125" x2="132" y2="124" stroke={accent} strokeWidth="0.8" opacity="0.4"/>
      <line x1="118" y1="129" x2="132" y2="129" stroke={accent} strokeWidth="0.8" opacity="0.35"/>
      <line x1="168" y1="124" x2="182" y2="125" stroke={accent} strokeWidth="0.8" opacity="0.4"/>
      <line x1="168" y1="129" x2="182" y2="129" stroke={accent} strokeWidth="0.8" opacity="0.35"/>
    </>
  ),

  hocico_fox: ({ secondary, accent }) => (
    <>
      {/* Morro puntiagudo y estrecho */}
      <path d="M132,115 Q150,109 168,115 Q173,124 168,136 Q150,142 132,136 Q127,127 132,115 Z"
            fill={secondary} opacity="0.72"/>
      {/* Nariz triangular característica del zorro */}
      <path d="M143,114 Q150,110 157,114 L154,120 L146,120 Z" fill="rgba(20,10,5,0.88)"/>
      {/* Philtrum */}
      <line x1="150" y1="120" x2="150" y2="129" stroke="rgba(0,0,0,0.3)" strokeWidth="1"/>
      {/* Boca afilada */}
      <path d="M141,129 Q150,133 159,129" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1" strokeLinecap="round"/>
      {/* Bigotes pronunciados */}
      <line x1="112" y1="122" x2="130" y2="122" stroke={accent} strokeWidth="1" opacity="0.5"/>
      <line x1="112" y1="127" x2="130" y2="127" stroke={accent} strokeWidth="1" opacity="0.4"/>
      <line x1="113" y1="132" x2="130" y2="130" stroke={accent} strokeWidth="0.8" opacity="0.3"/>
      <line x1="170" y1="122" x2="188" y2="122" stroke={accent} strokeWidth="1" opacity="0.5"/>
      <line x1="170" y1="127" x2="188" y2="127" stroke={accent} strokeWidth="1" opacity="0.4"/>
      <line x1="170" y1="130" x2="187" y2="132" stroke={accent} strokeWidth="0.8" opacity="0.3"/>
    </>
  ),

  hocico_cat: ({ secondary, accent }) => (
    <>
      {/* Cara plana — apenas protrusion */}
      <path d="M136,118 Q150,114 164,118 Q167,123 164,130 Q150,134 136,130 Q133,124 136,118 Z"
            fill={secondary} opacity="0.55"/>
      {/* Nariz pad en forma de corazón invertido */}
      <path d="M145,118 L150,114 L155,118 Q156,123 150,126 Q144,123 145,118 Z"
            fill={accent} opacity="0.9"/>
      {/* Philtrum */}
      <line x1="150" y1="126" x2="150" y2="131" stroke="rgba(0,0,0,0.35)" strokeWidth="1.2"/>
      {/* Boca en W suave */}
      <path d="M142,131 Q146,135 150,132 Q154,135 158,131"
            fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1" strokeLinecap="round"/>
      {/* Puntos de bigotes */}
      <circle cx="130" cy="123" r="1.5" fill="rgba(0,0,0,0.4)"/>
      <circle cx="134" cy="124" r="1.5" fill="rgba(0,0,0,0.4)"/>
      <circle cx="138" cy="124" r="1.5" fill="rgba(0,0,0,0.4)"/>
      <circle cx="170" cy="123" r="1.5" fill="rgba(0,0,0,0.4)"/>
      <circle cx="166" cy="124" r="1.5" fill="rgba(0,0,0,0.4)"/>
      <circle cx="162" cy="124" r="1.5" fill="rgba(0,0,0,0.4)"/>
      {/* Bigotes felinos */}
      <line x1="108" y1="120" x2="132" y2="122" stroke={accent} strokeWidth="0.9" opacity="0.45"/>
      <line x1="108" y1="125" x2="132" y2="125" stroke={accent} strokeWidth="0.9" opacity="0.4"/>
      <line x1="108" y1="130" x2="131" y2="127" stroke={accent} strokeWidth="0.8" opacity="0.3"/>
      <line x1="168" y1="122" x2="192" y2="120" stroke={accent} strokeWidth="0.9" opacity="0.45"/>
      <line x1="168" y1="125" x2="192" y2="125" stroke={accent} strokeWidth="0.9" opacity="0.4"/>
      <line x1="169" y1="127" x2="192" y2="130" stroke={accent} strokeWidth="0.8" opacity="0.3"/>
    </>
  ),

  hocico_bear: ({ secondary, accent }) => (
    <>
      {/* Morro amplio y redondeado */}
      <path d="M116,112 Q150,106 184,112 Q191,124 184,140 Q150,148 116,140 Q109,128 116,112 Z"
            fill={secondary} opacity="0.70"/>
      {/* Nariz grande oval */}
      <ellipse cx="150" cy="115" rx="14" ry="9" fill="rgba(15,8,5,0.88)"/>
      {/* Fosas nasales */}
      <ellipse cx="144" cy="114" rx="4" ry="3" fill="rgba(0,0,0,0.45)"/>
      <ellipse cx="156" cy="114" rx="4" ry="3" fill="rgba(0,0,0,0.45)"/>
      {/* Philtrum */}
      <line x1="150" y1="124" x2="150" y2="133" stroke="rgba(0,0,0,0.28)" strokeWidth="1.5"/>
      {/* Boca ancha */}
      <path d="M136,133 Q150,140 164,133" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Reflejo en nariz */}
      <ellipse cx="144" cy="112" rx="3" ry="2" fill="white" opacity="0.15"/>
    </>
  ),

  hocico_deer: ({ secondary, accent }) => (
    <>
      {/* Morro delicado y pequeño */}
      <path d="M136,116 Q150,111 164,116 Q168,122 164,131 Q150,136 136,131 Q132,125 136,116 Z"
            fill={secondary} opacity="0.65"/>
      {/* Nariz pequeña y oval */}
      <ellipse cx="150" cy="118" rx="7" ry="5" fill="rgba(20,10,8,0.80)"/>
      {/* Philtrum */}
      <line x1="150" y1="123" x2="150" y2="130" stroke="rgba(0,0,0,0.25)" strokeWidth="1"/>
      {/* Boca fina */}
      <path d="M143,130 Q150,134 157,130" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" strokeLinecap="round"/>
      {/* Bigotes etéreos */}
      <line x1="118" y1="122" x2="134" y2="122" stroke={accent} strokeWidth="0.7" opacity="0.35"/>
      <line x1="118" y1="126" x2="134" y2="126" stroke={accent} strokeWidth="0.7" opacity="0.3"/>
      <line x1="166" y1="122" x2="182" y2="122" stroke={accent} strokeWidth="0.7" opacity="0.35"/>
      <line x1="166" y1="126" x2="182" y2="126" stroke={accent} strokeWidth="0.7" opacity="0.3"/>
    </>
  ),

  hocico_crow: ({ primary, secondary }) => (
    <>
      {/* Pico superior */}
      <path d="M130,112 Q150,106 170,112 L162,124 L150,130 L138,124 Z"
            fill={primary} stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
      {/* Línea de quilla del pico superior */}
      <line x1="150" y1="107" x2="150" y2="128" stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
      {/* Pico inferior */}
      <path d="M137,126 Q150,128 163,126 L159,136 L150,139 L141,136 Z"
            fill={secondary} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8"/>
      {/* Reflejo brillante en pico superior */}
      <path d="M140,112 Q150,109 158,112 L156,116 L144,116 Z" fill="white" opacity="0.12"/>
    </>
  ),

  // ── COLA — más dramáticas, con capas de color ─────────────────────────────
  // La cola se renderiza dentro de bodyBobRef (bob junto al cuerpo)

  tail_wolf: ({ primary, secondary, accent }) => (
    <>
      {/* Capa base — voluminosa, sale del rump derecho del cuerpo */}
      <path d="M200 228 Q256 206 278 242 Q290 270 264 278 Q234 288 214 256 Q200 244 200 228 Z"
            fill={primary} stroke="rgba(0,0,0,0.08)" strokeWidth="0.5"/>
      {/* Interior más claro */}
      <path d="M204 234 Q254 216 272 246 Q282 268 260 274 Q234 282 218 254 Q204 244 204 234 Z"
            fill={secondary} opacity="0.55"/>
      {/* Punta accent */}
      <ellipse cx="260" cy="270" rx="15" ry="10" fill={accent} opacity="0.72" transform="rotate(-18,260,270)"/>
    </>
  ),

  tail_fox: ({ primary, secondary, accent }) => (
    <>
      {/* Enorme y esponjosa — la más icónica, sale del rump */}
      <path d="M200 226 C218 200 262 192 280 228 C296 258 276 288 250 286 C222 284 200 260 200 226 Z"
            fill={primary} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
      {/* Interior secondary */}
      <path d="M204 234 C220 212 258 206 272 234 C284 260 268 282 250 280 C228 278 206 258 204 234 Z"
            fill={secondary} opacity="0.58"/>
      {/* Punta accent — característica del zorro */}
      <ellipse cx="250" cy="280" rx="24" ry="15" fill={accent} opacity="0.92"/>
      <ellipse cx="238" cy="272" rx="26" ry="14" fill={secondary} opacity="0.38"/>
    </>
  ),

  tail_cat: ({ primary, secondary, accent }) => (
    <>
      {/* Larga y sinuosa */}
      <path d="M200 232 Q234 212 260 226 Q280 240 276 264 Q272 284 252 274 Q232 264 216 238 Q204 234 200 232 Z"
            fill={primary} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
      {/* Anillo de secondary en el tercio final */}
      <ellipse cx="250" cy="258" rx="11" ry="15" fill={secondary} opacity="0.48" transform="rotate(20,250,258)"/>
      {/* Punta */}
      <ellipse cx="258" cy="268" rx="9" ry="7" fill={accent} opacity="0.58" transform="rotate(15,258,268)"/>
    </>
  ),

  tail_crow: ({ primary, secondary, accent }) => (
    <>
      {/* 4 plumas caudales en abanico */}
      <path d="M200 236 Q226 218 250 232 Q244 252 218 242 Z" fill={primary} stroke="rgba(0,0,0,0.12)" strokeWidth="0.5"/>
      <line x1="200" y1="236" x2="246" y2="232" stroke={secondary} strokeWidth="0.8" opacity="0.5"/>
      <path d="M200 240 Q228 224 254 244 Q246 264 220 250 Z" fill={primary} stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" opacity="0.9"/>
      <line x1="200" y1="240" x2="250" y2="244" stroke={secondary} strokeWidth="0.8" opacity="0.5"/>
      <path d="M200 244 Q226 238 248 260 Q238 276 216 260 Z" fill={primary} stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" opacity="0.8"/>
      <path d="M200 248 Q220 246 234 270 Q222 282 208 264 Z" fill={accent} stroke={primary} strokeWidth="0.5" opacity="0.78"/>
    </>
  ),

  tail_deer: ({ secondary, accent }) => (
    // Cola blanca pequeña y característica
    <ellipse cx="204" cy="232" rx="14" ry="11" fill={secondary} stroke={accent} strokeWidth="0.5" opacity="0.92"/>
  ),

  tail_bear: ({ primary, secondary }) => (
    // Pequeñita y redondeada
    <ellipse cx="204" cy="232" rx="12" ry="11" fill={secondary} stroke={primary} strokeWidth="0.8" opacity="0.9"/>
  ),

  // ── OJOS (markings sobre ojos existentes) ──────────────────────────────────
  eyes_wolf: ({ primary }) => (
    <>
      <line x1={116} y1={107} x2={110} y2={116} stroke={primary} strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
      <line x1={123} y1={107} x2={117} y2={116} stroke={primary} strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
      <line x1={176} y1={107} x2={170} y2={116} stroke={primary} strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
      <line x1={183} y1={107} x2={177} y2={116} stroke={primary} strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
    </>
  ),
  eyes_fox: ({ accent }) => (
    <>
      <path d="M111 108 L120 100 L129 108" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
      <path d="M171 108 L180 100 L189 108" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
    </>
  ),
  eyes_cat: () => (
    <>
      <rect x={119} y={97} width={2} height={12} rx={1} fill="rgba(0,0,0,0.55)"/>
      <rect x={179} y={97} width={2} height={12} rx={1} fill="rgba(0,0,0,0.55)"/>
    </>
  ),
  eyes_crow: () => (
    <>
      <circle cx={120} cy={103} r={9} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="2.5"/>
      <circle cx={180} cy={103} r={9} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="2.5"/>
    </>
  ),
  eyes_deer: ({ accent }) => (
    <>
      <path d="M114 98 Q115 94 117 97" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M120 97 Q120 93 121 96" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M126 98 Q127 94 125 97" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M174 98 Q175 94 177 97" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M180 97 Q180 93 181 96" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M186 98 Q187 94 185 97" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
    </>
  ),
  eyes_bear: () => (
    <>
      <ellipse cx={120} cy={103} rx={10} ry={8} fill="rgba(0,0,0,0.22)"/>
      <ellipse cx={180} cy={103} rx={10} ry={8} fill="rgba(0,0,0,0.22)"/>
    </>
  ),

  // ── ANTEOJOS ───────────────────────────────────────────────────────────────
  glasses: ({ accent }) => (
    <>
      <ellipse cx={120} cy={103} rx={11} ry={9} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.9"/>
      <ellipse cx={180} cy={103} rx={11} ry={9} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.9"/>
      <line x1={131} y1={103} x2={169} y2={103} stroke={accent} strokeWidth="1.5" opacity="0.9"/>
      <line x1={109} y1={103} x2={100} y2={100} stroke={accent} strokeWidth="1.5" opacity="0.9"/>
      <line x1={191} y1={103} x2={200} y2={100} stroke={accent} strokeWidth="1.5" opacity="0.9"/>
    </>
  ),

  // ── CABEZA ─────────────────────────────────────────────────────────────────
  crown: ({ accent, primary }) => (
    <path d="M115 75 L125 50 L150 65 L175 50 L185 75 L168 70 L150 60 L132 70 Z"
          fill={accent} stroke={primary} strokeWidth="1.5" opacity="0.95"/>
  ),
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAW_SIDE_SVG — garras lateralizadas para incluir DENTRO de los arm refs
// Pata delantera izq: PAW_FL=(68,240)  |  Pata delantera der: PAW_FR=(232,240)
// Garras salen por debajo de la pata (y=253–275) — grandes y visibles.
// ─────────────────────────────────────────────────────────────────────────────
export const CLAW_SIDE_SVG: Record<string, ClawSideFn> = {

  claws_wolf: ({ accent }, side) => {
    // 4 garras anchas apuntando hacia abajo
    const offsets = [-13, -4, 5, 14]
    const cx = side === 'L' ? 70 : 230
    const m  = side === 'R' ? -1 : 1
    return (
      <g>
        {offsets.map((dx, i) => {
          const bx = cx + dx * m
          return (
            <path key={i}
              d={`M${bx - 3},257 C${bx - 5},264 ${bx - 5},271 ${bx},275 C${bx + 5},271 ${bx + 5},264 ${bx + 3},257 Z`}
              fill={accent} opacity="0.95"/>
          )
        })}
      </g>
    )
  },

  claws_fox: ({ accent }, side) => {
    // 4 garras delgadas y elegantes
    const offsets = [-12, -4, 4, 12]
    const cx = side === 'L' ? 70 : 230
    const m  = side === 'R' ? -1 : 1
    return (
      <g>
        {offsets.map((dx, i) => {
          const bx = cx + dx * m
          return (
            <path key={i}
              d={`M${bx - 2},257 C${bx - 4},265 ${bx - 4},272 ${bx},276 C${bx + 4},272 ${bx + 4},265 ${bx + 2},257 Z`}
              fill={accent} opacity="0.9"/>
          )
        })}
      </g>
    )
  },

  claws_cat: ({ accent }, side) => {
    // 3 garras retráctiles curvadas — característica felina
    const cx = side === 'L' ? 70 : 230
    const m  = side === 'R' ? -1 : 1
    return (
      <g>
        <path d={`M${cx - 11*m},257 C${cx - 14*m},264 ${cx - 14*m},271 ${cx - 11*m},275 C${cx - 8*m},271 ${cx - 8*m},264 ${cx - 8*m},257 Z`}
              fill={accent} opacity="0.92"/>
        <path d={`M${cx},257 C${cx - 3*m},264 ${cx - 3*m},271 ${cx},275 C${cx + 3*m},271 ${cx + 3*m},264 ${cx + 3*m},257 Z`}
              fill={accent} opacity="0.92"/>
        <path d={`M${cx + 11*m},257 C${cx + 8*m},264 ${cx + 8*m},271 ${cx + 11*m},275 C${cx + 14*m},271 ${cx + 14*m},264 ${cx + 11*m},257 Z`}
              fill={accent} opacity="0.92"/>
      </g>
    )
  },

  claws_crow: ({ accent }, side) => {
    // 3 garras frontales largas + 1 espolón trasero
    const cx = side === 'L' ? 70 : 230
    const m  = side === 'R' ? -1 : 1
    return (
      <g>
        <path d={`M${cx - 11*m},255 C${cx - 15*m},264 ${cx - 14*m},273 ${cx - 11*m},277 C${cx - 8*m},273 ${cx - 9*m},264 ${cx - 9*m},255 Z`}
              fill={accent} opacity="0.92"/>
        <path d={`M${cx},255 C${cx - 2*m},265 ${cx - 1*m},274 ${cx},278 C${cx + 2*m},274 ${cx + 2*m},265 ${cx + 2*m},255 Z`}
              fill={accent} opacity="0.95"/>
        <path d={`M${cx + 11*m},255 C${cx + 9*m},264 ${cx + 10*m},273 ${cx + 13*m},277 C${cx + 15*m},273 ${cx + 14*m},264 ${cx + 13*m},255 Z`}
              fill={accent} opacity="0.92"/>
        <path d={`M${cx},250 C${cx - 2*m},246 ${cx - 5*m},242 ${cx - 8*m},240 C${cx - 5*m},242 ${cx - 2*m},246 ${cx + 2},250 Z`}
              fill={accent} opacity="0.8"/>
      </g>
    )
  },

  claws_deer: ({ accent }, side) => {
    // Pezuña hendida — 2 mitades anchas
    const cx = side === 'L' ? 70 : 230
    const m  = side === 'R' ? -1 : 1
    return (
      <g>
        <path d={`M${cx - 8*m},257 L${cx - 8*m},270 Q${cx - 11*m},278 ${cx - 16*m},278`}
              fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round"/>
        <path d={`M${cx - 8*m},270 Q${cx - 5*m},278 ${cx + 1*m},278`}
              fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round"/>
      </g>
    )
  },

  claws_bear: ({ accent }, side) => {
    // 4 garras gruesas y poderosas
    const offsets = [-14, -5, 4, 13]
    const cx = side === 'L' ? 70 : 230
    const m  = side === 'R' ? -1 : 1
    return (
      <g>
        {offsets.map((dx, i) => {
          const bx = cx + dx * m
          return (
            <path key={i}
              d={`M${bx - 4},257 C${bx - 6},263 ${bx - 6},269 ${bx},273 C${bx + 6},269 ${bx + 6},263 ${bx + 4},257 Z`}
              fill={accent} opacity="0.96"/>
          )
        })}
      </g>
    )
  },
}

// ═════════════════════════════════════════════════════════════════════════════
// CHIBI FORM (Level 3+, viewBox 0 0 300 300)
// Head: ellipse cx=150 cy=100 rx=82 ry=76 (top y=24, bottom y=176)
// Body: rect x=124 y=177 w=52 h=48 rx=22
// PAW_FL=(109,240)  PAW_FR=(191,240)  PAW_BL=(134,261)  PAW_BR=(166,261)
// ═════════════════════════════════════════════════════════════════════════════
export const ACC_VISUAL_CHIBI: Record<string, AccVisualFn> = {

  // ── OREJAS ─────────────────────────────────────────────────────────────────
  ears_wolf: ({ primary, secondary, accent }) => (
    <>
      <path d="M106 96 Q90 40 108 8 Q128 48 122 96 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M110 93 Q96 44 110 16 Q126 50 119 93 Z" fill={secondary} opacity="0.6"/>
      <path d="M194 96 Q210 40 192 8 Q172 48 178 96 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M190 93 Q204 44 190 16 Q174 50 181 93 Z" fill={secondary} opacity="0.6"/>
    </>
  ),
  ears_fox: ({ primary, secondary, accent }) => (
    <>
      <path d="M96 100 Q72 38 98 4 Q136 56 130 100 Z" fill={primary} stroke={accent} strokeWidth="1.2"/>
      <path d="M101 96 Q79 44 100 12 Q132 60 125 96 Z" fill={secondary} opacity="0.55"/>
      <path d="M204 100 Q228 38 202 4 Q164 56 170 100 Z" fill={primary} stroke={accent} strokeWidth="1.2"/>
      <path d="M199 96 Q221 44 200 12 Q168 60 175 96 Z" fill={secondary} opacity="0.55"/>
    </>
  ),
  ears_cat: ({ primary, secondary, accent }) => (
    <>
      <path d="M108 96 Q92 50 110 20 Q128 52 124 96 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M112 93 Q97 54 110 28 Q124 56 120 93 Z" fill={secondary} opacity="0.6"/>
      <path d="M110 21 Q108 12 111 8 Q114 12 111 21 Z" fill={accent} opacity="0.95"/>
      <path d="M192 96 Q208 50 190 20 Q172 52 176 96 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M188 93 Q203 54 190 28 Q176 56 180 93 Z" fill={secondary} opacity="0.6"/>
      <path d="M190 21 Q192 12 189 8 Q186 12 189 21 Z" fill={accent} opacity="0.95"/>
    </>
  ),
  ears_crow: ({ primary, accent }) => (
    <>
      <path d="M132 74 Q128 40 136 14 Q146 44 140 76 Z" fill={accent} stroke={primary} strokeWidth="0.6" opacity="0.9"/>
      <path d="M140 70 Q136 34 142 8 Q152 40 148 72 Z" fill={accent} stroke={primary} strokeWidth="0.6" opacity="0.95"/>
      <path d="M148 68 Q146 30 154 4 Q162 38 156 70 Z" fill={accent} stroke={primary} strokeWidth="0.6" opacity="0.95"/>
      <path d="M156 68 Q156 32 162 8 Q168 42 162 70 Z" fill={accent} stroke={primary} strokeWidth="0.6" opacity="0.85"/>
    </>
  ),
  ears_deer: ({ primary, secondary, accent }) => (
    <>
      <path d="M88 100 Q64 54 80 20 Q112 60 110 100 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M92 97 Q69 60 82 28 Q110 64 107 97 Z" fill={secondary} opacity="0.55"/>
      <path d="M212 100 Q236 54 220 20 Q188 60 190 100 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M208 97 Q231 60 218 28 Q190 64 193 97 Z" fill={secondary} opacity="0.55"/>
    </>
  ),
  ears_bear: ({ primary, secondary, accent }) => (
    <>
      <ellipse cx={110} cy={30} rx={19} ry={18} fill={primary} stroke={accent} strokeWidth="1"/>
      <ellipse cx={110} cy={30} rx={12} ry={12} fill={secondary} opacity="0.5"/>
      <ellipse cx={190} cy={30} rx={19} ry={18} fill={primary} stroke={accent} strokeWidth="1"/>
      <ellipse cx={190} cy={30} rx={12} ry={12} fill={secondary} opacity="0.5"/>
    </>
  ),

  // ── HOCICO CHIBI ──────────────────────────────────────────────────────────
  // Cabeza: cx=150 cy=100 rx=82 ry=76. Nariz default en (150,118).
  hocico_wolf: ({ secondary, accent }) => (
    <>
      <path d="M128,113 Q150,107 172,113 Q178,123 172,137 Q150,144 128,137 Q122,127 128,113 Z"
            fill={secondary} opacity="0.72"/>
      <ellipse cx="150" cy="116" rx="10" ry="7" fill="rgba(18,10,6,0.85)"/>
      <ellipse cx="146" cy="115" rx="3" ry="2" fill="rgba(0,0,0,0.45)"/>
      <ellipse cx="154" cy="115" rx="3" ry="2" fill="rgba(0,0,0,0.45)"/>
      <line x1="150" y1="123" x2="150" y2="131" stroke="rgba(0,0,0,0.28)" strokeWidth="1.2"/>
      <path d="M140,131 Q150,136 160,131" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1" strokeLinecap="round"/>
      <line x1="114" y1="121" x2="130" y2="121" stroke={accent} strokeWidth="0.9" opacity="0.4"/>
      <line x1="114" y1="125" x2="130" y2="125" stroke={accent} strokeWidth="0.9" opacity="0.35"/>
      <line x1="170" y1="121" x2="186" y2="121" stroke={accent} strokeWidth="0.9" opacity="0.4"/>
      <line x1="170" y1="125" x2="186" y2="125" stroke={accent} strokeWidth="0.9" opacity="0.35"/>
    </>
  ),
  hocico_fox: ({ secondary, accent }) => (
    <>
      <path d="M133,114 Q150,108 167,114 Q172,123 167,135 Q150,141 133,135 Q128,126 133,114 Z"
            fill={secondary} opacity="0.70"/>
      <path d="M144,113 Q150,109 156,113 L153,119 L147,119 Z" fill="rgba(20,10,5,0.88)"/>
      <line x1="150" y1="119" x2="150" y2="128" stroke="rgba(0,0,0,0.28)" strokeWidth="1"/>
      <path d="M142,128 Q150,132 158,128" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1" strokeLinecap="round"/>
      <line x1="108" y1="119" x2="128" y2="120" stroke={accent} strokeWidth="1" opacity="0.5"/>
      <line x1="108" y1="124" x2="128" y2="124" stroke={accent} strokeWidth="1" opacity="0.4"/>
      <line x1="172" y1="120" x2="192" y2="119" stroke={accent} strokeWidth="1" opacity="0.5"/>
      <line x1="172" y1="124" x2="192" y2="124" stroke={accent} strokeWidth="1" opacity="0.4"/>
    </>
  ),
  hocico_cat: ({ secondary, accent }) => (
    <>
      <path d="M136,116 Q150,112 164,116 Q167,122 164,129 Q150,133 136,129 Q133,123 136,116 Z"
            fill={secondary} opacity="0.52"/>
      <path d="M145,117 L150,113 L155,117 Q156,122 150,125 Q144,122 145,117 Z" fill={accent} opacity="0.88"/>
      <line x1="150" y1="125" x2="150" y2="130" stroke="rgba(0,0,0,0.32)" strokeWidth="1.2"/>
      <path d="M143,130 Q147,134 150,131 Q153,134 157,130" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1" strokeLinecap="round"/>
      <circle cx="128" cy="121" r="1.8" fill="rgba(0,0,0,0.38)"/>
      <circle cx="133" cy="122" r="1.8" fill="rgba(0,0,0,0.38)"/>
      <circle cx="138" cy="122" r="1.8" fill="rgba(0,0,0,0.38)"/>
      <circle cx="172" cy="121" r="1.8" fill="rgba(0,0,0,0.38)"/>
      <circle cx="167" cy="122" r="1.8" fill="rgba(0,0,0,0.38)"/>
      <circle cx="162" cy="122" r="1.8" fill="rgba(0,0,0,0.38)"/>
      <line x1="104" y1="118" x2="130" y2="120" stroke={accent} strokeWidth="0.9" opacity="0.44"/>
      <line x1="104" y1="123" x2="130" y2="123" stroke={accent} strokeWidth="0.9" opacity="0.38"/>
      <line x1="170" y1="120" x2="196" y2="118" stroke={accent} strokeWidth="0.9" opacity="0.44"/>
      <line x1="170" y1="123" x2="196" y2="123" stroke={accent} strokeWidth="0.9" opacity="0.38"/>
    </>
  ),
  hocico_bear: ({ secondary }) => (
    <>
      <path d="M118,112 Q150,106 182,112 Q188,124 182,140 Q150,148 118,140 Q112,128 118,112 Z"
            fill={secondary} opacity="0.68"/>
      <ellipse cx="150" cy="115" rx="14" ry="9" fill="rgba(15,8,5,0.88)"/>
      <ellipse cx="144" cy="114" rx="4" ry="3" fill="rgba(0,0,0,0.42)"/>
      <ellipse cx="156" cy="114" rx="4" ry="3" fill="rgba(0,0,0,0.42)"/>
      <line x1="150" y1="124" x2="150" y2="133" stroke="rgba(0,0,0,0.26)" strokeWidth="1.5"/>
      <path d="M136,133 Q150,140 164,133" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1.2" strokeLinecap="round"/>
      <ellipse cx="144" cy="112" rx="3" ry="2" fill="white" opacity="0.14"/>
    </>
  ),
  hocico_deer: ({ secondary, accent }) => (
    <>
      <path d="M136,115 Q150,110 164,115 Q168,122 164,131 Q150,136 136,131 Q132,124 136,115 Z"
            fill={secondary} opacity="0.62"/>
      <ellipse cx="150" cy="117" rx="7" ry="5" fill="rgba(20,10,8,0.78)"/>
      <line x1="150" y1="122" x2="150" y2="129" stroke="rgba(0,0,0,0.24)" strokeWidth="1"/>
      <path d="M143,129 Q150,133 157,129" fill="none" stroke="rgba(0,0,0,0.20)" strokeWidth="0.8" strokeLinecap="round"/>
      <line x1="114" y1="120" x2="132" y2="120" stroke={accent} strokeWidth="0.7" opacity="0.32"/>
      <line x1="114" y1="124" x2="132" y2="124" stroke={accent} strokeWidth="0.7" opacity="0.28"/>
      <line x1="168" y1="120" x2="186" y2="120" stroke={accent} strokeWidth="0.7" opacity="0.32"/>
      <line x1="168" y1="124" x2="186" y2="124" stroke={accent} strokeWidth="0.7" opacity="0.28"/>
    </>
  ),
  hocico_crow: ({ primary, secondary }) => (
    <>
      <path d="M131,111 Q150,105 169,111 L162,123 L150,129 L138,123 Z"
            fill={primary} stroke="rgba(0,0,0,0.28)" strokeWidth="0.8"/>
      <line x1="150" y1="106" x2="150" y2="127" stroke="rgba(0,0,0,0.18)" strokeWidth="1"/>
      <path d="M138,125 Q150,127 162,125 L158,135 L150,138 L142,135 Z"
            fill={secondary} stroke="rgba(0,0,0,0.22)" strokeWidth="0.8"/>
      <path d="M140,111 Q150,108 158,111 L156,115 L144,115 Z" fill="white" opacity="0.11"/>
    </>
  ),

  // ── COLA CHIBI ─────────────────────────────────────────────────────────────
  tail_wolf: ({ primary, secondary, accent }) => (
    <>
      <path d="M178 196 Q228 180 250 216 Q260 240 238 250 Q212 260 196 228 Q182 212 178 196 Z"
            fill={primary} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
      <path d="M182 202 Q226 190 244 220 Q252 238 234 246 Q212 254 200 230 Q188 216 182 202 Z"
            fill={secondary} opacity="0.48"/>
      <ellipse cx="232" cy="244" rx="12" ry="8" fill={accent} opacity="0.72" transform="rotate(-15,232,244)"/>
    </>
  ),
  tail_fox: ({ primary, secondary, accent }) => (
    <>
      <path d="M176 192 C198 166, 256 160, 272 208 C284 246, 252 278, 224 270 C196 262, 178 238, 176 192 Z"
            fill={primary} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
      <path d="M180 200 C200 178, 250 172, 264 212 C274 244, 248 270, 224 264 C200 258, 184 236, 180 200 Z"
            fill={secondary} opacity="0.52"/>
      <ellipse cx="228" cy="268" rx="18" ry="11" fill={accent} opacity="0.92" transform="rotate(-8,228,268)"/>
      <ellipse cx="218" cy="260" rx="20" ry="12" fill={secondary} opacity="0.38" transform="rotate(-12,218,260)"/>
    </>
  ),
  tail_cat: ({ primary, secondary, accent }) => (
    <>
      <path d="M178 200 Q212 184 234 196 Q250 208 246 230 Q242 248 226 238 Q210 228 194 206 Q184 202 178 200 Z"
            fill={primary} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
      <ellipse cx="228" cy="228" rx="9" ry="12" fill={secondary} opacity="0.44" transform="rotate(20,228,228)"/>
      <ellipse cx="236" cy="237" rx="7" ry="5" fill={accent} opacity="0.52" transform="rotate(14,236,237)"/>
    </>
  ),
  tail_crow: ({ primary, secondary, accent }) => (
    <>
      <path d="M176 200 Q200 188 220 200 Q214 216 194 206 Z" fill={primary} stroke="rgba(0,0,0,0.1)" strokeWidth="0.5"/>
      <line x1="176" y1="200" x2="218" y2="200" stroke={secondary} strokeWidth="0.7" opacity="0.5"/>
      <path d="M176 203 Q202 192 224 210 Q216 226 196 214 Z" fill={primary} stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" opacity="0.9"/>
      <path d="M176 206 Q200 200 218 220 Q210 232 192 220 Z" fill={primary} stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" opacity="0.8"/>
      <path d="M176 208 Q196 206 206 228 Q198 238 186 224 Z" fill={accent} stroke={primary} strokeWidth="0.5" opacity="0.75"/>
    </>
  ),
  tail_deer: ({ secondary, accent }) => (
    <ellipse cx="178" cy="202" rx="9" ry="8" fill={secondary} stroke={accent} strokeWidth="0.5" opacity="0.92"/>
  ),
  tail_bear: ({ primary, secondary }) => (
    <ellipse cx="178" cy="202" rx="7" ry="6" fill={secondary} stroke={primary} strokeWidth="0.6" opacity="0.88"/>
  ),

  // ── OJOS CHIBI ─────────────────────────────────────────────────────────────
  eyes_wolf: ({ primary }) => (
    <>
      <line x1={108} y1={100} x2={102} y2={110} stroke={primary} strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
      <line x1={119} y1={100} x2={113} y2={110} stroke={primary} strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
      <line x1={180} y1={100} x2={174} y2={110} stroke={primary} strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
      <line x1={191} y1={100} x2={185} y2={110} stroke={primary} strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
    </>
  ),
  eyes_fox: ({ accent }) => (
    <>
      <path d="M105 102 L114 92 L123 102" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
      <path d="M177 102 L186 92 L195 102" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
    </>
  ),
  eyes_cat: () => (
    <>
      <rect x={112} y={89} width={3} height={14} rx={1.5} fill="rgba(0,0,0,0.5)"/>
      <rect x={184} y={89} width={3} height={14} rx={1.5} fill="rgba(0,0,0,0.5)"/>
    </>
  ),
  eyes_crow: () => (
    <>
      <circle cx={114} cy={96} r={14} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="3"/>
      <circle cx={186} cy={96} r={14} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="3"/>
    </>
  ),
  eyes_deer: ({ accent }) => (
    <>
      <path d="M107 90 Q108 85 110 88" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M114 88 Q114 83 115 87" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M121 90 Q122 85 120 88" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M179 90 Q180 85 182 88" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M186 88 Q186 83 187 87" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M193 90 Q194 85 192 88" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
    </>
  ),
  eyes_bear: () => (
    <>
      <ellipse cx={114} cy={96} rx={15} ry={12} fill="rgba(0,0,0,0.18)"/>
      <ellipse cx={186} cy={96} rx={15} ry={12} fill="rgba(0,0,0,0.18)"/>
    </>
  ),

  // ── ANTEOJOS / CORONA CHIBI ────────────────────────────────────────────────
  glasses: ({ accent }) => (
    <>
      <ellipse cx={114} cy={96} rx={14} ry={12} fill="none" stroke={accent} strokeWidth="2" opacity="0.9"/>
      <ellipse cx={186} cy={96} rx={14} ry={12} fill="none" stroke={accent} strokeWidth="2" opacity="0.9"/>
      <line x1={128} y1={96} x2={172} y2={96} stroke={accent} strokeWidth="2" opacity="0.9"/>
      <line x1={100} y1={95} x2={88} y2={90} stroke={accent} strokeWidth="2" opacity="0.9"/>
      <line x1={200} y1={95} x2={212} y2={90} stroke={accent} strokeWidth="2" opacity="0.9"/>
    </>
  ),
  crown: ({ accent, primary }) => (
    <path d="M112 62 L124 34 L150 52 L176 34 L188 62 L168 56 L150 46 L132 56 Z"
          fill={accent} stroke={primary} strokeWidth="1.5" opacity="0.95"/>
  ),
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAW_SIDE_CHIBI — mismo contrato que CLAW_SIDE_SVG pero para forma Chibi
// PAW_FL=(109,240)  PAW_FR=(191,240)
// ─────────────────────────────────────────────────────────────────────────────
export const CLAW_SIDE_CHIBI: Record<string, ClawSideFn> = {

  claws_wolf: ({ accent }, side) => {
    const offsets = [-11, -4, 3, 10]
    const cx = side === 'L' ? 109 : 191
    const m = side === 'R' ? -1 : 1
    return (
      <g>
        {offsets.map((dx, i) => {
          const bx = cx + dx * m
          return (
            <path key={i}
              d={`M${bx - 2},244 C${bx - 3},250 ${bx - 3.5},255 ${bx - 0.5},260 C${bx + 1},255 ${bx + 3},250 ${bx + 2},244 Z`}
              fill={accent} opacity="0.92"/>
          )
        })}
      </g>
    )
  },

  claws_fox: ({ accent }, side) => {
    const offsets = [-10, -3, 4, 11]
    const cx = side === 'L' ? 109 : 191
    const m = side === 'R' ? -1 : 1
    return (
      <g>
        {offsets.map((dx, i) => {
          const bx = cx + dx * m
          return (
            <path key={i}
              d={`M${bx - 1.5},244 C${bx - 2.5},251 ${bx - 3},257 ${bx - 0.5},261 C${bx + 1},257 ${bx + 2},251 ${bx + 1.5},244 Z`}
              fill={accent} opacity="0.88"/>
          )
        })}
      </g>
    )
  },

  claws_cat: ({ accent }, side) => {
    const cx = side === 'L' ? 109 : 191
    const m = side === 'R' ? -1 : 1
    return (
      <g>
        <path d={`M${cx - 9*m},244 C${cx - 12*m},250 ${cx - 12*m},256 ${cx - 9*m},260 C${cx - 7*m},256 ${cx - 7*m},250 ${cx - 7*m},244 Z`}
              fill={accent} opacity="0.9"/>
        <path d={`M${cx - 0*m},244 C${cx - 3*m},251 ${cx - 3*m},257 ${cx + 0*m},261 C${cx + 2*m},257 ${cx + 2*m},251 ${cx + 0*m},244 Z`}
              fill={accent} opacity="0.9"/>
        <path d={`M${cx + 9*m},244 C${cx + 6*m},250 ${cx + 6*m},256 ${cx + 9*m},260 C${cx + 11*m},256 ${cx + 11*m},250 ${cx + 9*m},244 Z`}
              fill={accent} opacity="0.9"/>
      </g>
    )
  },

  claws_crow: ({ accent }, side) => {
    const cx = side === 'L' ? 109 : 191
    const m = side === 'R' ? -1 : 1
    return (
      <g>
        <path d={`M${cx - 9*m},241 C${cx - 13*m},249 ${cx - 12*m},258 ${cx - 9*m},262 C${cx - 7*m},258 ${cx - 8*m},249 ${cx - 7*m},241 Z`}
              fill={accent} opacity="0.92"/>
        <path d={`M${cx},241 C${cx - 2*m},250 ${cx - 1*m},259 ${cx + 1},263 C${cx + 2*m},259 ${cx + 2*m},250 ${cx + 2},241 Z`}
              fill={accent} opacity="0.95"/>
        <path d={`M${cx + 9*m},241 C${cx + 7*m},249 ${cx + 8*m},258 ${cx + 11*m},262 C${cx + 13*m},258 ${cx + 12*m},249 ${cx + 11*m},241 Z`}
              fill={accent} opacity="0.92"/>
        <path d={`M${cx},236 C${cx - 2*m},232 ${cx - 5*m},229 ${cx - 7*m},227 C${cx - 5*m},229 ${cx - 2*m},232 ${cx + 1},235 Z`}
              fill={accent} opacity="0.8"/>
      </g>
    )
  },

  claws_deer: ({ accent }, side) => {
    const cx = side === 'L' ? 109 : 191
    const m = side === 'R' ? -1 : 1
    return (
      <g>
        <path d={`M${cx - 6*m},244 L${cx - 6*m},254 Q${cx - 8*m},260 ${cx - 13*m},260`}
              fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
        <path d={`M${cx - 6*m},254 Q${cx - 4*m},260 ${cx + 1},260`}
              fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
      </g>
    )
  },

  claws_bear: ({ accent }, side) => {
    const offsets = [-11, -4, 3, 10]
    const cx = side === 'L' ? 109 : 191
    const m = side === 'R' ? -1 : 1
    return (
      <g>
        {offsets.map((dx, i) => {
          const bx = cx + dx * m
          return (
            <path key={i}
              d={`M${bx - 3},244 C${bx - 4},248 ${bx - 4},253 ${bx - 1},256 C${bx + 1},253 ${bx + 4},248 ${bx + 3},244 Z`}
              fill={accent} opacity="0.95"/>
          )
        })}
      </g>
    )
  },
}
