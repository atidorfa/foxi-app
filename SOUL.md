# SOUL.md — Visión, fantasía y diseño del juego

## 1) La promesa central
**"Cada persona tiene un Therian. El tuyo ya existe. Solo necesita ser encontrado."**

Foxi es una app donde iniciar sesión es el primer acto de un descubrimiento: el sistema genera —de forma irrepetible— un compañero con forma, color, personalidad y stats únicos. Ese compañero evoluciona contigo, a tu ritmo, un gesto por día.

---

## 2) Las cuatro fantasías que alimentan el loop

### Descubrimiento
La primera vez es un ritual. La pantalla de adopción no muestra un botón frío: muestra un portal, un instante de tensión antes de revelar quién te espera. El Therian no es generado — es "despertado".

### Vínculo
Cada acción diaria es pequeña pero deliberada. No hay grind. No hay presión. Solo la pregunta: *¿qué necesita hoy?* El usuario elige conscientemente y ese gesto modifica la historia compartida.

### Colección (futuro)
Rareza visible pero justa. Ver un Legendary hace que el jugador diga "wow", no "trampa". El sistema es transparente: las odds están en la pantalla, pero el momento del reveal sigue siendo mágico.

### Identidad
El Therian no es un pet genérico. Tiene un arquetipo (trait) con lore breve que resuena. "Silencioso — Escucha lo que nadie más oye." Esa línea de texto vale más que mil stats.

---

## 3) Las seis especies

| Especie  | Esencia               | Paleta sugerida  | Stat fuerte   |
|----------|-----------------------|------------------|---------------|
| Lobo     | Fuerza y manada       | Shadow, Void     | Vitalidad     |
| Zorro    | Astucia y velocidad   | Ember, Dawn      | Agilidad      |
| Gato     | Independencia y misterio | Dusk, Frost   | Instinto      |
| Cuervo   | Sabiduría y observación | Void, Shadow   | Carisma       |
| Ciervo   | Gracia y equilibrio   | Forest, Gold     | Todos parejo  |
| Oso      | Resistencia y calma   | Forest, Ember    | Vitalidad ++  |

---

## 4) Los ocho arquetipos (traits)

Cada arquetipo tiene tres partes: nombre, modificador de stat, y **una línea de lore** que define la identidad.

| Trait       | Stat +        | Stat - | Lore                                       |
|-------------|---------------|--------|--------------------------------------------|
| Silencioso  | Instinto +5   | Carisma -3 | "Escucha lo que nadie más oye."        |
| Impulsivo   | Agilidad +6   | Vitalidad -2 | "Actúa antes de pensar."             |
| Protector   | Vitalidad +6  | Agilidad -2 | "Nadie cae mientras él esté."         |
| Curioso     | Instinto +4   | —      | "El mundo es demasiado pequeño."           |
| Carismático | Carisma +8    | Vitalidad -2 | "Todos le prestan atención."         |
| Salvaje     | Vitalidad +5  | Carisma -5 | "No necesita reglas."                 |
| Místico     | Instinto +7   | Agilidad -2 | "Ve lo que el tiempo esconde."        |
| Leal        | Carisma +4    | —      | "No abandona. Nunca."                      |

---

## 5) Las cuatro acciones diarias

Cada acción dura exactamente **un gesto del usuario** y produce:
- Un cambio de stat (+3 al stat correspondiente)
- +10 XP
- Un **texto narrativo** (2–3 líneas, tono místico suave)

### Cuidar (CARE) → +Vitalidad
*"Tu Therian descansa cerca. Su respiración se normaliza. La fatiga del mundo se afloja un poco."*

### Entrenar (TRAIN) → +Agilidad
*"Se lanza una y otra vez contra el viento. Hoy sus reflejos respondieron diferente. Mejor."*

### Explorar (EXPLORE) → +Instinto
*"Se adentró en el terreno desconocido sin miedo. Volvió con algo en los ojos: más mundo."*

### Socializar (SOCIAL) → +Carisma
*"Hubo contacto hoy. Un intercambio. Algo que solo se aprende entre dos."*

---

## 6) Rareza y justicia

### Distribución de pesos (visible en la UI)
| Rareza    | Probabilidad | Color UI      | Aura visual            |
|-----------|-------------|---------------|------------------------|
| Common    | 70%         | Gris          | Sin glow               |
| Rare      | 20%         | Azul          | Glow suave             |
| Epic      | 9%          | Púrpura       | Glow fuerte + partículas|
| Legendary | 1%          | Dorado        | Animación especial     |

### Principio de justicia
- Las odds son **publicadas en la UI** (link a "¿cómo funciona esto?").
- El seed es **reproducible** internamente (auditoría futura).
- La rareza solo afecta **stats base y cosmética**. No hay ventaja PvP en MVP.

---

## 7) Paletas de apariencia

### 8 paletas con identidad propia
| Palette | Primary    | Secondary  | Accent  | Mood            |
|---------|-----------|-----------|---------|-----------------|
| ember   | #C0392B   | #E67E22   | #F39C12 | Fuego, pasión   |
| shadow  | #2C3E50   | #34495E   | #95A5A6 | Misterio, noche |
| forest  | #27AE60   | #1E8449   | #A9DFBF | Naturaleza, vida|
| frost   | #2980B9   | #85C1E9   | #EBF5FB | Frío, claridad  |
| dusk    | #8E44AD   | #D7BDE2   | #F8F9FA | Crepúsculo, magia|
| gold    | #D4AC0D   | #F9E79F   | #7D6608 | Riqueza, luz    |
| void    | #1A1A2E   | #16213E   | #E94560 | Abismo, poder   |
| dawn    | #F06292   | #FFB74D   | #FFF9C4 | Aurora, esperanza|

---

## 8) Diseño de pantallas

### /login — El umbral
- Pantalla oscura, logo minimalista "FOXI"
- Tagline: *"Tu compañero ya existe."*
- Form simple: email + contraseña
- Link a registro

### /adopt — El ritual
- Fondo con partículas sutiles
- Título: *"Tu Therian espera ser encontrado"*
- Descripción breve del proceso
- Botón grande, centrado: "Despertar mi Therian"
- Al hacer click: animación de "revelación" (fade + scale)
- Reveal: la carta aparece con animación dramática
- Rarity badge con glow según rareza

### /therian — La carta viva
```
┌─────────────────────────────────────┐
│  [Avatar SVG]          [Rarity badge]│
│                                      │
│  Nombre especie  •  Nivel X          │
│  Trait: "Silencioso"                 │
│  "Escucha lo que nadie más oye."     │
│                                      │
│  ━━━━━━━━ STATS ━━━━━━━━━           │
│  Vitalidad  ████████░░  82           │
│  Agilidad   █████░░░░░  55           │
│  Instinto   ███████░░░  73           │
│  Carisma    ████░░░░░░  42           │
│                                      │
│  XP: 40/100  [████░░░░░░░]          │
│                                      │
│  ━━━━ ACCIÓN DEL DÍA ━━━━━          │
│  [Cuidar] [Entrenar] [Explorar] [Social]│
│                                      │
│  "Hoy exploró el bosque sin rumbo..."│
└─────────────────────────────────────┘
```

---

## 9) Tono y narrativa

### Principios de voz
- **Breve:** nunca más de 3 líneas de texto narrativo
- **Específico:** no genérico ("descansó" → "su respiración se normalizó")
- **Místico suave:** evocador sin ser pretencioso
- **Sin promesas reales:** es ficción, es juego, no hay afirmaciones clínicas

### Ejemplos de flavor text adicional
- "Se quedó quieto en la oscuridad. Y la oscuridad lo reconoció."
- "Hoy aprendió algo que no tiene nombre todavía."
- "Hay velocidad que no se mide. La tuya."
- "El bosque no olvidará este recorrido."
- "Alguien lo vio hoy. Realmente lo vio."

### Mensajes de sistema (cooldown activo)
- "Tu Therian necesita tiempo para integrar lo de hoy."
- "El descanso también es parte del camino. Vuelve mañana."

---

## 10) Progresión (MVP simplificado)

### XP y niveles
- Nivel 1 → 2: 100 XP (10 días de acciones)
- Cada nivel: XP × 1.5 (curva suave)
- Nivel máximo MVP: 10
- Al subir de nivel: mensaje especial + animación

### Stats caps
- Mínimo: 1
- Máximo: 100 (hard cap en MVP)
- Las acciones diarias siempre suman (no hay riesgo de bajar stats)

---

## 11) Lo que Foxi NO es (guía de ética)

- **No** es una herramienta de diagnóstico o análisis psicológico
- **No** afirma ninguna identidad real del usuario
- **No** tiene mecánicas pay-to-win en MVP
- **No** recolecta datos sensibles más allá del email
- **Sí** es un juego de colección y compañía, sin más

---

## 12) Roadmap emocional de fases

### Fase 0 — MVP: "El encuentro"
*El usuario tiene UN compañero. Lo cuida. Lo conoce.*

### Fase 1 — "La colección"
*Múltiples Therians. Reroll limitado. Misiones semanales.*

### Fase 2 — "El mundo"
*Trading social. Ítems y crafting. Eventos de temporada.*

### Fase 3 — "La expedición"
*PVE ligero. Guilds. Editor de biomas y lore.*
