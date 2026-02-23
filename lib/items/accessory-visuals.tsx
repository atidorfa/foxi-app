'use client'
import React from 'react'

type AccColors = { primary: string; secondary: string; accent: string }
type AccVisualFn = (c: AccColors) => React.ReactElement

// ─────────────────────────────────────────────────────────────────────────────
// SVG FORM (Level 1-2, viewBox 0 0 300 300)
// Head top y=55, center ~(150,100). Body: BODY_SHAPE, bottom y≈245
// Default ears peak: L≈(118,38) R≈(182,38)
// Eyes: L=(120,103) R=(180,103)
// Paws (showLimbs): L=(72,201) R=(228,201)
// ─────────────────────────────────────────────────────────────────────────────
export const ACC_VISUAL_SVG: Record<string, AccVisualFn> = {

  // ── OREJAS ─────────────────────────────────────────────────────────────────
  ears_wolf: ({ primary, secondary, accent }) => (
    <>
      {/* Left — tall narrow pointed */}
      <path d="M106 80 Q100 46 114 30 Q126 52 120 80 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M109 78 Q104 51 114 38 Q122 56 118 78 Z" fill={secondary} opacity="0.65"/>
      {/* Right */}
      <path d="M194 80 Q200 46 186 30 Q174 52 180 80 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M191 78 Q196 51 186 38 Q178 56 182 78 Z" fill={secondary} opacity="0.65"/>
    </>
  ),

  ears_fox: ({ primary, secondary, accent }) => (
    <>
      {/* Left — very tall and wide */}
      <path d="M98 82 Q88 42 108 24 Q130 56 126 82 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M101 79 Q93 48 109 32 Q126 60 122 79 Z" fill={secondary} opacity="0.6"/>
      {/* Right */}
      <path d="M202 82 Q212 42 192 24 Q170 56 174 82 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M199 79 Q207 48 191 32 Q174 60 178 79 Z" fill={secondary} opacity="0.6"/>
    </>
  ),

  ears_cat: ({ primary, secondary, accent }) => (
    <>
      {/* Left — compact triangle with tip tuft */}
      <path d="M109 80 Q108 54 117 44 Q126 58 122 80 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M111 78 Q110 57 117 50 Q123 61 120 78 Z" fill={secondary} opacity="0.6"/>
      <path d="M117 45 Q115 38 118 36 Q120 39 118 45 Z" fill={accent} opacity="0.9"/>
      {/* Right */}
      <path d="M191 80 Q192 54 183 44 Q174 58 178 80 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M189 78 Q190 57 183 50 Q177 61 180 78 Z" fill={secondary} opacity="0.6"/>
      <path d="M183 45 Q185 38 182 36 Q180 39 182 45 Z" fill={accent} opacity="0.9"/>
    </>
  ),

  ears_crow: ({ primary, accent }) => (
    // Feather crest — no ears, stylised plumes at top of head
    <>
      <path d="M136 66 Q134 48 140 36 Q148 50 144 68 Z" fill={accent} stroke={primary} strokeWidth="0.5" opacity="0.85"/>
      <path d="M142 64 Q140 44 145 30 Q152 46 148 66 Z" fill={accent} stroke={primary} strokeWidth="0.5" opacity="0.9"/>
      <path d="M148 62 Q148 42 155 28 Q160 44 155 64 Z" fill={accent} stroke={primary} strokeWidth="0.5" opacity="0.9"/>
      <path d="M154 62 Q155 44 160 32 Q164 48 160 64 Z" fill={accent} stroke={primary} strokeWidth="0.5" opacity="0.85"/>
    </>
  ),

  ears_deer: ({ primary, secondary, accent }) => (
    <>
      {/* Left — wide, slightly drooping */}
      <path d="M96 82 Q84 50 96 36 Q118 54 116 82 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M99 79 Q88 55 98 44 Q116 58 113 79 Z" fill={secondary} opacity="0.6"/>
      {/* Right */}
      <path d="M204 82 Q216 50 204 36 Q182 54 184 82 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M201 79 Q212 55 202 44 Q184 58 187 79 Z" fill={secondary} opacity="0.6"/>
    </>
  ),

  ears_bear: ({ primary, secondary, accent }) => (
    <>
      {/* Left — small round */}
      <ellipse cx={110} cy={62} rx={14} ry={14} fill={primary} stroke={accent} strokeWidth="1"/>
      <ellipse cx={110} cy={62} rx={9} ry={9} fill={secondary} opacity="0.5"/>
      {/* Right */}
      <ellipse cx={190} cy={62} rx={14} ry={14} fill={primary} stroke={accent} strokeWidth="1"/>
      <ellipse cx={190} cy={62} rx={9} ry={9} fill={secondary} opacity="0.5"/>
    </>
  ),

  // ── COLA ───────────────────────────────────────────────────────────────────
  tail_wolf: ({ primary, secondary, accent }) => (
    <>
      <path d="M196 200 Q242 188 264 220 Q272 240 250 248 Q226 256 208 232 Q198 218 196 200 Z"
            fill={primary} stroke={accent} strokeWidth="0.5" opacity="0.9"/>
      <ellipse cx={248} cy={244} rx={12} ry={8} fill={secondary} opacity="0.6" transform="rotate(-15,248,244)"/>
    </>
  ),

  tail_fox: ({ primary, secondary, accent }) => (
    <>
      <path d="M194 198 Q248 182 274 228 Q284 262 254 270 Q218 276 200 244 Q190 224 194 198 Z"
            fill={primary} stroke={accent} strokeWidth="0.5" opacity="0.9"/>
      <ellipse cx={252} cy={266} rx={14} ry={10} fill={accent} opacity="0.85" transform="rotate(-10,252,266)"/>
      <ellipse cx={242} cy={256} rx={18} ry={13} fill={secondary} opacity="0.45" transform="rotate(-15,242,256)"/>
    </>
  ),

  tail_cat: ({ primary, accent }) => (
    <path d="M197 206 Q230 188 252 200 Q268 212 264 234 Q260 250 246 240 Q232 230 216 210 Q204 208 197 206 Z"
          fill={primary} stroke={accent} strokeWidth="0.5" opacity="0.85"/>
  ),

  tail_crow: ({ primary, accent }) => (
    <>
      <path d="M195 215 Q215 200 232 210 Q228 224 210 218 Z" fill={primary} stroke={accent} strokeWidth="0.5" opacity="0.9"/>
      <path d="M195 215 Q220 204 242 220 Q236 234 212 222 Z" fill={primary} stroke={accent} strokeWidth="0.5" opacity="0.85"/>
      <path d="M195 215 Q220 210 238 232 Q230 244 208 228 Z" fill={primary} stroke={accent} strokeWidth="0.5" opacity="0.8"/>
      <path d="M195 215 Q218 214 228 238 Q218 250 204 232 Z" fill={accent} stroke={primary} strokeWidth="0.5" opacity="0.75"/>
    </>
  ),

  tail_deer: ({ accent }) => (
    <ellipse cx={200} cy={218} rx={10} ry={8} fill={accent} opacity="0.9"/>
  ),

  tail_bear: ({ primary, secondary }) => (
    <ellipse cx={202} cy={215} rx={8} ry={7} fill={secondary} stroke={primary} strokeWidth="0.5" opacity="0.85"/>
  ),

  // ── OJOS (eye overlays on top of existing eyes) ─────────────────────────────
  // Left eye at (120,103), right eye at (180,103)
  eyes_wolf: ({ primary }) => (
    <>
      <line x1={116} y1={107} x2={110} y2={116} stroke={primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.75"/>
      <line x1={123} y1={107} x2={117} y2={116} stroke={primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.75"/>
      <line x1={176} y1={107} x2={170} y2={116} stroke={primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.75"/>
      <line x1={183} y1={107} x2={177} y2={116} stroke={primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.75"/>
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

  // ── GARRAS (static overlay at paw rest positions) ──────────────────────────
  // Left paw: (72,201)  Right paw: (228,201)  — mirrored around x=150
  claws_wolf: ({ accent }) => (
    <>
      <line x1={62} y1={206} x2={57} y2={215} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={68} y1={208} x2={64} y2={217} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={74} y1={209} x2={71} y2={218} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={80} y1={207} x2={77} y2={216} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={238} y1={206} x2={243} y2={215} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={232} y1={208} x2={236} y2={217} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={226} y1={209} x2={229} y2={218} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={220} y1={207} x2={223} y2={216} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
    </>
  ),

  claws_fox: ({ accent }) => (
    <>
      <line x1={61} y1={205} x2={56} y2={216} stroke={accent} strokeWidth="1" strokeLinecap="round"/>
      <line x1={67} y1={207} x2={63} y2={218} stroke={accent} strokeWidth="1" strokeLinecap="round"/>
      <line x1={73} y1={208} x2={70} y2={219} stroke={accent} strokeWidth="1" strokeLinecap="round"/>
      <line x1={79} y1={207} x2={76} y2={218} stroke={accent} strokeWidth="1" strokeLinecap="round"/>
      <line x1={239} y1={205} x2={244} y2={216} stroke={accent} strokeWidth="1" strokeLinecap="round"/>
      <line x1={233} y1={207} x2={237} y2={218} stroke={accent} strokeWidth="1" strokeLinecap="round"/>
      <line x1={227} y1={208} x2={230} y2={219} stroke={accent} strokeWidth="1" strokeLinecap="round"/>
      <line x1={221} y1={207} x2={224} y2={218} stroke={accent} strokeWidth="1" strokeLinecap="round"/>
    </>
  ),

  claws_cat: ({ accent }) => (
    <>
      <path d="M63 205 Q60 210 63 216" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M70 206 Q68 212 71 218" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M77 205 Q75 210 77 216" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M237 205 Q240 210 237 216" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M230 206 Q232 212 229 218" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M223 205 Q225 210 223 216" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
    </>
  ),

  claws_crow: ({ accent }) => (
    <>
      <path d="M62 204 Q56 210 58 218" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M70 206 Q66 212 70 220" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M78 204 Q80 210 78 218" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M70 201 Q68 195 65 192" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M238 204 Q244 210 242 218" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M230 206 Q234 212 230 220" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M222 204 Q220 210 222 218" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M230 201 Q232 195 235 192" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
    </>
  ),

  claws_deer: ({ accent }) => (
    <>
      <path d="M68 205 L68 215 Q66 220 60 220" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M68 215 Q70 220 76 220" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M232 205 L232 215 Q234 220 240 220" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M232 215 Q230 220 224 220" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
    </>
  ),

  claws_bear: ({ accent }) => (
    <>
      <path d="M62 205 Q60 208 62 213" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M68 205 Q66 209 68 215" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M74 205 Q72 208 74 213" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M80 205 Q78 208 80 213" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M238 205 Q240 208 238 213" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M232 205 Q234 209 232 215" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M226 205 Q228 208 226 213" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M220 205 Q222 208 220 213" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
    </>
  ),

  // ── ANTEOJOS (cross-species) ───────────────────────────────────────────────
  glasses: ({ accent }) => (
    <>
      <ellipse cx={120} cy={103} rx={11} ry={9} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.9"/>
      <ellipse cx={180} cy={103} rx={11} ry={9} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.9"/>
      <line x1={131} y1={103} x2={169} y2={103} stroke={accent} strokeWidth="1.5" opacity="0.9"/>
      <line x1={109} y1={103} x2={100} y2={100} stroke={accent} strokeWidth="1.5" opacity="0.9"/>
      <line x1={191} y1={103} x2={200} y2={100} stroke={accent} strokeWidth="1.5" opacity="0.9"/>
    </>
  ),

  // ── CABEZA / CORONA (cross-species) ───────────────────────────────────────
  crown: ({ accent, primary }) => (
    <path d="M115 75 L125 50 L150 65 L175 50 L185 75 L168 70 L150 60 L132 70 Z"
          fill={accent} stroke={primary} strokeWidth="1.5" opacity="0.95"/>
  ),
}

// ─────────────────────────────────────────────────────────────────────────────
// CHIBI FORM (Level 3+, viewBox 0 0 300 300)
// Head: ellipse cx=150 cy=100 rx=82 ry=76  (top y=24, bottom y=176)
// Default ears: L="M76,96 Q56,16 104,0 Q144,46 112,100 Z" (tall rabbit)
// Eyes: L=(114,96) scale 1.35   R=(186,96) scale 1.35
// Paws: L=(109,240)  R=(191,240)
// ─────────────────────────────────────────────────────────────────────────────
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
      <path d="M96 100 Q72 38 98 4 Q136 56 130 100 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M101 96 Q79 44 100 12 Q132 60 125 96 Z" fill={secondary} opacity="0.55"/>
      <path d="M204 100 Q228 38 202 4 Q164 56 170 100 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M199 96 Q221 44 200 12 Q168 60 175 96 Z" fill={secondary} opacity="0.55"/>
    </>
  ),

  ears_cat: ({ primary, secondary, accent }) => (
    <>
      <path d="M108 96 Q92 50 110 20 Q128 52 124 96 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M112 93 Q97 54 110 28 Q124 56 120 93 Z" fill={secondary} opacity="0.6"/>
      <path d="M110 21 Q108 12 111 8 Q114 12 111 21 Z" fill={accent} opacity="0.9"/>
      <path d="M192 96 Q208 50 190 20 Q172 52 176 96 Z" fill={primary} stroke={accent} strokeWidth="1"/>
      <path d="M188 93 Q203 54 190 28 Q176 56 180 93 Z" fill={secondary} opacity="0.6"/>
      <path d="M190 21 Q192 12 189 8 Q186 12 189 21 Z" fill={accent} opacity="0.9"/>
    </>
  ),

  ears_crow: ({ primary, accent }) => (
    <>
      <path d="M132 74 Q128 40 136 14 Q146 44 140 76 Z" fill={accent} stroke={primary} strokeWidth="0.5" opacity="0.85"/>
      <path d="M140 70 Q136 34 142 8 Q152 40 148 72 Z" fill={accent} stroke={primary} strokeWidth="0.5" opacity="0.9"/>
      <path d="M148 68 Q146 30 154 4 Q162 38 156 70 Z" fill={accent} stroke={primary} strokeWidth="0.5" opacity="0.9"/>
      <path d="M156 68 Q156 32 162 8 Q168 42 162 70 Z" fill={accent} stroke={primary} strokeWidth="0.5" opacity="0.85"/>
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
      <ellipse cx={110} cy={30} rx={18} ry={17} fill={primary} stroke={accent} strokeWidth="1"/>
      <ellipse cx={110} cy={30} rx={12} ry={11} fill={secondary} opacity="0.5"/>
      <ellipse cx={190} cy={30} rx={18} ry={17} fill={primary} stroke={accent} strokeWidth="1"/>
      <ellipse cx={190} cy={30} rx={12} ry={11} fill={secondary} opacity="0.5"/>
    </>
  ),

  // ── COLA ───────────────────────────────────────────────────────────────────
  tail_wolf: ({ primary, secondary, accent }) => (
    <>
      <path d="M178 196 Q222 184 240 212 Q248 230 228 236 Q208 242 196 218 Q184 208 178 196 Z"
            fill={primary} stroke={accent} strokeWidth="0.5" opacity="0.9"/>
      <ellipse cx={226} cy={232} rx={11} ry={7} fill={secondary} opacity="0.6" transform="rotate(-15,226,232)"/>
    </>
  ),

  tail_fox: ({ primary, secondary, accent }) => (
    <>
      <path d="M176 192 Q228 176 252 216 Q260 244 234 250 Q202 256 186 226 Q178 210 176 192 Z"
            fill={primary} stroke={accent} strokeWidth="0.5" opacity="0.9"/>
      <ellipse cx={232} cy={246} rx={13} ry={9} fill={accent} opacity="0.85" transform="rotate(-10,232,246)"/>
      <ellipse cx={222} cy={238} rx={16} ry={11} fill={secondary} opacity="0.45" transform="rotate(-15,222,238)"/>
    </>
  ),

  tail_cat: ({ primary, accent }) => (
    <path d="M178 200 Q210 184 230 196 Q246 208 242 228 Q238 244 224 234 Q210 224 196 206 Q186 202 178 200 Z"
          fill={primary} stroke={accent} strokeWidth="0.5" opacity="0.85"/>
  ),

  tail_crow: ({ primary, accent }) => (
    <>
      <path d="M176 200 Q194 188 208 198 Q204 212 188 204 Z" fill={primary} stroke={accent} strokeWidth="0.5" opacity="0.9"/>
      <path d="M176 200 Q196 192 212 206 Q206 220 188 208 Z" fill={primary} stroke={accent} strokeWidth="0.5" opacity="0.85"/>
      <path d="M176 200 Q196 198 208 216 Q200 226 184 214 Z" fill={primary} stroke={accent} strokeWidth="0.5" opacity="0.8"/>
      <path d="M176 200 Q194 204 200 220 Q192 228 180 216 Z" fill={accent} stroke={primary} strokeWidth="0.5" opacity="0.75"/>
    </>
  ),

  tail_deer: ({ accent }) => (
    <ellipse cx={178} cy={202} rx={8} ry={7} fill={accent} opacity="0.9"/>
  ),

  tail_bear: ({ primary, secondary }) => (
    <ellipse cx={178} cy={202} rx={6} ry={5} fill={secondary} stroke={primary} strokeWidth="0.5" opacity="0.85"/>
  ),

  // ── OJOS ───────────────────────────────────────────────────────────────────
  // Left eye at (114,96) scale 1.35, right at (186,96) scale 1.35
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

  // ── GARRAS ─────────────────────────────────────────────────────────────────
  // Left paw: (109,240)  Right paw: (191,240)  Offset: 82
  claws_wolf: ({ accent }) => (
    <>
      <line x1={99} y1={246} x2={95} y2={255} stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <line x1={105} y1={248} x2={102} y2={257} stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <line x1={111} y1={248} x2={109} y2={257} stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <line x1={117} y1={246} x2={115} y2={255} stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <line x1={181} y1={246} x2={177} y2={255} stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <line x1={187} y1={248} x2={184} y2={257} stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <line x1={193} y1={248} x2={191} y2={257} stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <line x1={199} y1={246} x2={197} y2={255} stroke={accent} strokeWidth="2" strokeLinecap="round"/>
    </>
  ),

  claws_fox: ({ accent }) => (
    <>
      <line x1={98} y1={246} x2={93} y2={257} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={104} y1={248} x2={100} y2={259} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={110} y1={248} x2={107} y2={259} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={116} y1={246} x2={113} y2={257} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={180} y1={246} x2={175} y2={257} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={186} y1={248} x2={182} y2={259} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={192} y1={248} x2={189} y2={259} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1={198} y1={246} x2={195} y2={257} stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
    </>
  ),

  claws_cat: ({ accent }) => (
    <>
      <path d="M101 246 Q98 251 101 258" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M109 248 Q107 253 110 260" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M117 246 Q115 251 117 258" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M183 246 Q186 251 183 258" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M191 248 Q193 253 190 260" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M199 246 Q201 251 199 258" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
    </>
  ),

  claws_crow: ({ accent }) => (
    <>
      <path d="M100 246 Q94 252 96 260" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M109 248 Q105 254 109 262" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M118 246 Q120 252 118 260" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M109 241 Q107 235 104 232" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <path d="M182 246 Q188 252 186 260" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M191 248 Q195 254 191 262" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M200 246 Q198 252 200 260" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M191 241 Q193 235 196 232" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
    </>
  ),

  claws_deer: ({ accent }) => (
    <>
      <path d="M103 247 L103 256 Q101 262 95 262" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M103 256 Q105 262 111 262" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M185 247 L185 256 Q187 262 193 262" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M185 256 Q183 262 177 262" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
    </>
  ),

  claws_bear: ({ accent }) => (
    <>
      <path d="M99 246 Q97 250 99 255" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
      <path d="M105 248 Q103 252 105 258" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
      <path d="M111 248 Q109 252 111 258" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
      <path d="M117 246 Q115 250 117 255" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
      <path d="M181 246 Q183 250 181 255" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
      <path d="M187 248 Q189 252 187 258" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
      <path d="M193 248 Q195 252 193 258" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
      <path d="M199 246 Q201 250 199 255" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
    </>
  ),

  // ── ANTEOJOS ───────────────────────────────────────────────────────────────
  glasses: ({ accent }) => (
    <>
      <ellipse cx={114} cy={96} rx={14} ry={12} fill="none" stroke={accent} strokeWidth="2" opacity="0.9"/>
      <ellipse cx={186} cy={96} rx={14} ry={12} fill="none" stroke={accent} strokeWidth="2" opacity="0.9"/>
      <line x1={128} y1={96} x2={172} y2={96} stroke={accent} strokeWidth="2" opacity="0.9"/>
      <line x1={100} y1={95} x2={88} y2={90} stroke={accent} strokeWidth="2" opacity="0.9"/>
      <line x1={200} y1={95} x2={212} y2={90} stroke={accent} strokeWidth="2" opacity="0.9"/>
    </>
  ),

  // ── CABEZA / CORONA ────────────────────────────────────────────────────────
  crown: ({ accent, primary }) => (
    <path d="M112 62 L124 34 L150 52 L176 34 L188 62 L168 56 L150 46 L132 56 Z"
          fill={accent} stroke={primary} strokeWidth="1.5" opacity="0.95"/>
  ),
}
