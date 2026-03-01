export type ShopItemType = 'cosmetic' | 'service' | 'slot' | 'rune' | 'ability'

export interface ShopItem {
  id: string
  name: string
  emoji: string
  description: string
  costGold: number
  costCoin: number
  type: ShopItemType
  accessoryId?: string
  slot?: string // accessory slot ID (orejas | cola | ojos | cabeza | anteojos | garras)
  runeId?: string
  abilityId?: string
  abilityType?: 'active' | 'passive'
  archetype?: string
  tier?: 1 | 2 | 3 | 4 | 5
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'rename',
    name: 'Cambio de nombre',
    emoji: '✏️',
    description: 'Elige un nuevo nombre único para tu Therian.',
    costGold: 0,
    costCoin: 100,
    type: 'service',
  },
  {
    id: 'acc_glasses',
    name: 'Anteojos',
    emoji: '🕶️',
    description: 'Añade unos anteojos retro a tu Therian.',
    costGold: 300,
    costCoin: 0,
    type: 'cosmetic',
    accessoryId: 'glasses',
    slot: 'anteojos',
  },
  {
    id: 'acc_crown',
    name: 'Corona',
    emoji: '👑',
    description: 'Una corona digna de la realeza Therian.',
    costGold: 0,
    costCoin: 6,
    type: 'cosmetic',
    accessoryId: 'crown',
    slot: 'cabeza',
  },
  {
    id: 'slot_extra',
    name: 'Slot Extra de Therian',
    emoji: '🌟',
    description: 'Desbloquea otro slot para adoptar.',
    costGold: 0,
    costCoin: 10,
    type: 'slot',
  },

  // ── OREJAS ─────────────────────────────────────────────────────────────────
  { id: 'acc_ears_wolf',  name: 'Orejas de Lobo',    emoji: '🐺', description: 'Orejas puntiagudas y altas de lobo.',          costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'ears_wolf',  slot: 'orejas' },
  { id: 'acc_ears_fox',   name: 'Orejas de Zorro',   emoji: '🦊', description: 'Orejas enormes y puntiagudas de zorro.',        costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'ears_fox',   slot: 'orejas' },
  { id: 'acc_ears_cat',   name: 'Orejas de Gato',    emoji: '🐱', description: 'Orejas triangulares compactas de gato.',        costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'ears_cat',   slot: 'orejas' },
  { id: 'acc_ears_crow',  name: 'Cresta de Cuervo',  emoji: '🪶', description: 'Cresta de plumas estilizadas de cuervo.',       costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'ears_crow',  slot: 'orejas' },
  { id: 'acc_ears_deer',  name: 'Orejas de Ciervo',  emoji: '🦌', description: 'Orejas anchas y redondeadas de ciervo.',        costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'ears_deer',  slot: 'orejas' },
  { id: 'acc_ears_bear',  name: 'Orejas de Oso',     emoji: '🐻', description: 'Pequeñas orejas redondas de oso.',              costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'ears_bear',  slot: 'orejas' },

  // ── COLA ───────────────────────────────────────────────────────────────────
  { id: 'acc_tail_wolf',  name: 'Cola de Lobo',      emoji: '🐺', description: 'Cola voluminosa con punta clara de lobo.',      costGold: 600, costCoin: 0, type: 'cosmetic', accessoryId: 'tail_wolf',  slot: 'cola' },
  { id: 'acc_tail_fox',   name: 'Cola de Zorro',     emoji: '🦊', description: 'Cola gigante y esponjosa de zorro.',             costGold: 700, costCoin: 0, type: 'cosmetic', accessoryId: 'tail_fox',   slot: 'cola' },
  { id: 'acc_tail_cat',   name: 'Cola de Gato',      emoji: '🐱', description: 'Cola larga y curvada de gato.',                  costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'tail_cat',   slot: 'cola' },
  { id: 'acc_tail_crow',  name: 'Plumas Caudales',   emoji: '🪶', description: 'Abanico de plumas caudales de cuervo.',          costGold: 600, costCoin: 0, type: 'cosmetic', accessoryId: 'tail_crow',  slot: 'cola' },
  { id: 'acc_tail_deer',  name: 'Cola de Ciervo',    emoji: '🦌', description: 'Pequeña cola blanca de ciervo.',                 costGold: 400, costCoin: 0, type: 'cosmetic', accessoryId: 'tail_deer',  slot: 'cola' },
  { id: 'acc_tail_bear',  name: 'Cola de Oso',       emoji: '🐻', description: 'Pequeña cola redondeada de oso.',                costGold: 400, costCoin: 0, type: 'cosmetic', accessoryId: 'tail_bear',  slot: 'cola' },

  // ── OJOS ───────────────────────────────────────────────────────────────────
  { id: 'acc_eyes_wolf',  name: 'Ojos de Lobo',      emoji: '🐺', description: 'Marcas de lágrima bajo los ojos de lobo.',       costGold: 450, costCoin: 0, type: 'cosmetic', accessoryId: 'eyes_wolf',  slot: 'ojos' },
  { id: 'acc_eyes_fox',   name: 'Ojos de Zorro',     emoji: '🦊', description: 'Contorno astuto alrededor de los ojos de zorro.',costGold: 450, costCoin: 0, type: 'cosmetic', accessoryId: 'eyes_fox',   slot: 'ojos' },
  { id: 'acc_eyes_cat',   name: 'Ojos de Gato',      emoji: '🐱', description: 'Pupila vertical felina.',                        costGold: 450, costCoin: 0, type: 'cosmetic', accessoryId: 'eyes_cat',   slot: 'ojos' },
  { id: 'acc_eyes_crow',  name: 'Ojos de Cuervo',    emoji: '🪶', description: 'Círculo oscuro de cuervo alrededor de los ojos.',costGold: 450, costCoin: 0, type: 'cosmetic', accessoryId: 'eyes_crow',  slot: 'ojos' },
  { id: 'acc_eyes_deer',  name: 'Ojos de Ciervo',    emoji: '🦌', description: 'Pestañas curvas inocentes de ciervo.',           costGold: 450, costCoin: 0, type: 'cosmetic', accessoryId: 'eyes_deer',  slot: 'ojos' },
  { id: 'acc_eyes_bear',  name: 'Ojos de Oso',       emoji: '🐻', description: 'Parches oscuros alrededor de los ojos de oso.',  costGold: 450, costCoin: 0, type: 'cosmetic', accessoryId: 'eyes_bear',  slot: 'ojos' },

  // ── GARRAS ─────────────────────────────────────────────────────────────────
  { id: 'acc_claws_wolf', name: 'Garras de Lobo',    emoji: '🐺', description: '4 garras curvas afiladas de lobo.',               costGold: 550, costCoin: 0, type: 'cosmetic', accessoryId: 'claws_wolf', slot: 'garras' },
  { id: 'acc_claws_fox',  name: 'Garras de Zorro',   emoji: '🦊', description: 'Garras delgadas y elegantes de zorro.',           costGold: 550, costCoin: 0, type: 'cosmetic', accessoryId: 'claws_fox',  slot: 'garras' },
  { id: 'acc_claws_cat',  name: 'Garras de Gato',    emoji: '🐱', description: '3 garras retráctiles curvadas de gato.',          costGold: 550, costCoin: 0, type: 'cosmetic', accessoryId: 'claws_cat',  slot: 'garras' },
  { id: 'acc_claws_crow', name: 'Talones de Cuervo', emoji: '🪶', description: 'Talones de ave de cuervo.',                       costGold: 550, costCoin: 0, type: 'cosmetic', accessoryId: 'claws_crow', slot: 'garras' },
  { id: 'acc_claws_deer', name: 'Pezuñas de Ciervo', emoji: '🦌', description: 'Pezuñas divididas de ciervo.',                   costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'claws_deer', slot: 'garras' },
  { id: 'acc_claws_bear', name: 'Garras de Oso',     emoji: '🐻', description: '4 garras anchas y poderosas de oso.',             costGold: 550, costCoin: 0, type: 'cosmetic', accessoryId: 'claws_bear', slot: 'garras' },

  // ── RUNAS T1 (200 oro) ─────────────────────────────────────────────────────
  { id: 'rune_vit_t1', name: 'Runa de Vitalidad I',   emoji: '🌿', description: '+1 Vitalidad. La sangre fluye más fuerte.',              costGold: 200, costCoin: 0, type: 'rune', runeId: 'rune_vit_t1', tier: 1 },
  { id: 'rune_agi_t1', name: 'Runa de Agilidad I',    emoji: '⚡', description: '+1 Agilidad. El cuerpo responde al instante.',           costGold: 200, costCoin: 0, type: 'rune', runeId: 'rune_agi_t1', tier: 1 },
  { id: 'rune_ins_t1', name: 'Runa de Instinto I',    emoji: '🌌', description: '+1 Instinto. Los sentidos se agudizan levemente.',       costGold: 200, costCoin: 0, type: 'rune', runeId: 'rune_ins_t1', tier: 1 },
  { id: 'rune_cha_t1', name: 'Runa de Carisma I',     emoji: '✨', description: '+1 Carisma. Tu presencia se vuelve magnética.',          costGold: 200, costCoin: 0, type: 'rune', runeId: 'rune_cha_t1', tier: 1 },
  { id: 'rune_all_t1', name: 'Runa de Equilibrio I',  emoji: '🔮', description: '+1 a todos los stats. Un balance sutil.',                costGold: 1000, costCoin: 0, type: 'rune', runeId: 'rune_all_t1', tier: 1 },

  // ── RUNAS T2 (800 oro) ─────────────────────────────────────────────────────
  { id: 'rune_vit_t2', name: 'Runa de Vitalidad II',  emoji: '🌿', description: '+2 Vitalidad. El cuerpo resiste con más firmeza.',       costGold: 800, costCoin: 0, type: 'rune', runeId: 'rune_vit_t2', tier: 2 },
  { id: 'rune_agi_t2', name: 'Runa de Agilidad II',   emoji: '⚡', description: '+2 Agilidad. Cada paso es más veloz.',                   costGold: 800, costCoin: 0, type: 'rune', runeId: 'rune_agi_t2', tier: 2 },
  { id: 'rune_ins_t2', name: 'Runa de Instinto II',   emoji: '🌌', description: '+2 Instinto. Percibes lo que otros ignoran.',            costGold: 800, costCoin: 0, type: 'rune', runeId: 'rune_ins_t2', tier: 2 },
  { id: 'rune_cha_t2', name: 'Runa de Carisma II',    emoji: '✨', description: '+2 Carisma. Las miradas te siguen.',                    costGold: 800, costCoin: 0, type: 'rune', runeId: 'rune_cha_t2', tier: 2 },
  { id: 'rune_all_t2', name: 'Runa de Equilibrio II', emoji: '🔮', description: '+2 a todos los stats. Cuerpo y espíritu en armonía.',   costGold: 2400, costCoin: 0, type: 'rune', runeId: 'rune_all_t2', tier: 2 },

  // ── RUNAS T3 (50 esencia) ──────────────────────────────────────────────────
  { id: 'rune_vit_t3', name: 'Runa de Vitalidad III', emoji: '🌿', description: '+3 Vitalidad. Las heridas se cierran antes.',            costGold: 0, costCoin: 50, type: 'rune', runeId: 'rune_vit_t3', tier: 3 },
  { id: 'rune_agi_t3', name: 'Runa de Agilidad III',  emoji: '⚡', description: '+3 Agilidad. Difícil de atrapar para cualquiera.',       costGold: 0, costCoin: 50, type: 'rune', runeId: 'rune_agi_t3', tier: 3 },
  { id: 'rune_ins_t3', name: 'Runa de Instinto III',  emoji: '🌌', description: '+3 Instinto. Nada escapa a tu atención.',                costGold: 0, costCoin: 50, type: 'rune', runeId: 'rune_ins_t3', tier: 3 },
  { id: 'rune_cha_t3', name: 'Runa de Carisma III',   emoji: '✨', description: '+3 Carisma. Convences sin esfuerzo.',                   costGold: 0, costCoin: 50, type: 'rune', runeId: 'rune_cha_t3', tier: 3 },
  { id: 'rune_all_t3', name: 'Runa de Equilibrio III',emoji: '🔮', description: '+3 a todos los stats. La unión de todas las fuerzas.',  costGold: 0, costCoin: 150, type: 'rune', runeId: 'rune_all_t3', tier: 3 },

  // ══════════════════════════════════════════════════════════════════════════
  // 🌿 HABILIDADES FORESTAL
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'ab_for_regen',       name: 'Regeneración',        emoji: '🌿', description: 'Se cura a sí mismo con energía forestal.',             costGold: 300, costCoin: 0, type: 'ability', abilityId: 'for_regen',      abilityType: 'active',  archetype: 'forestal' },
  { id: 'ab_for_enred',       name: 'Enredadera',          emoji: '🌿', description: 'Reduce la agilidad del rival con raíces.',             costGold: 400, costCoin: 0, type: 'ability', abilityId: 'for_enred',      abilityType: 'active',  archetype: 'forestal' },
  { id: 'ab_for_latigo',      name: 'Látigo de Raíz',      emoji: '🌿', description: 'Golpe potente con raíces endurecidas.',                costGold: 400, costCoin: 0, type: 'ability', abilityId: 'for_latigo',     abilityType: 'active',  archetype: 'forestal' },
  { id: 'ab_for_cura_salvaje',name: 'Cura Salvaje',        emoji: '🌿', description: 'Curación poderosa de energía silvestre.',              costGold: 350, costCoin: 0, type: 'ability', abilityId: 'for_cura_salvaje',abilityType: 'active', archetype: 'forestal' },
  { id: 'ab_for_veneno',      name: 'Mordedura Venenosa',  emoji: '🌿', description: 'Daño inicial + veneno que dura varios turnos.',        costGold: 500, costCoin: 0, type: 'ability', abilityId: 'for_veneno',     abilityType: 'active',  archetype: 'forestal' },
  { id: 'ab_for_drenar',      name: 'Drenar Vida',         emoji: '🌿', description: 'Roba vida del rival con cada golpe.',                  costGold: 600, costCoin: 0, type: 'ability', abilityId: 'for_drenar',     abilityType: 'active',  archetype: 'forestal' },
  { id: 'ab_for_espinas',     name: 'Espinas',             emoji: '🌿', description: 'Refleja parte del daño recibido al atacante.',         costGold: 700, costCoin: 0, type: 'ability', abilityId: 'for_espinas',    abilityType: 'passive', archetype: 'forestal' },
  { id: 'ab_for_raices',      name: 'Raíces Profundas',    emoji: '🌿', description: 'Se regenera HP al inicio de cada turno.',             costGold: 600, costCoin: 0, type: 'ability', abilityId: 'for_raices',     abilityType: 'passive', archetype: 'forestal' },
  { id: 'ab_for_resiliencia', name: 'Resiliencia',         emoji: '🌿', description: 'Sobrevive una vez a un golpe fatal con 1 HP.',        costGold: 1000, costCoin: 0, type: 'ability', abilityId: 'for_resiliencia',abilityType: 'passive', archetype: 'forestal' },

  // ══════════════════════════════════════════════════════════════════════════
  // ⚡ HABILIDADES ELÉCTRICO
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'ab_ele_rayo',          name: 'Rayo Paralizante',  emoji: '⚡', description: 'Golpe eléctrico que aturde al rival un turno.',       costGold: 600, costCoin: 0, type: 'ability', abilityId: 'ele_rayo',         abilityType: 'active',  archetype: 'electrico' },
  { id: 'ab_ele_sobre',         name: 'Sobrecarga',        emoji: '⚡', description: 'Aumenta la propia agilidad temporalmente.',           costGold: 400, costCoin: 0, type: 'ability', abilityId: 'ele_sobre',        abilityType: 'active',  archetype: 'electrico' },
  { id: 'ab_ele_multirayo',     name: 'Multirayo',         emoji: '⚡', description: 'Tres descargas rápidas en un mismo turno.',           costGold: 500, costCoin: 0, type: 'ability', abilityId: 'ele_multirayo',    abilityType: 'active',  archetype: 'electrico' },
  { id: 'ab_ele_cortocircuito', name: 'Cortocircuito',     emoji: '⚡', description: 'Reduce drásticamente la agilidad del rival.',        costGold: 500, costCoin: 0, type: 'ability', abilityId: 'ele_cortocircuito',abilityType: 'active',  archetype: 'electrico' },
  { id: 'ab_ele_tormenta',      name: 'Tormenta Estática', emoji: '⚡', description: 'Golpe fuerte con probabilidad de aturdir.',           costGold: 500, costCoin: 0, type: 'ability', abilityId: 'ele_tormenta',     abilityType: 'active',  archetype: 'electrico' },
  { id: 'ab_ele_pulso',         name: 'Pulso EMP',         emoji: '⚡', description: 'Reduce el daño del rival durante dos turnos.',        costGold: 500, costCoin: 0, type: 'ability', abilityId: 'ele_pulso',        abilityType: 'active',  archetype: 'electrico' },
  { id: 'ab_ele_cond',          name: 'Conductividad',     emoji: '⚡', description: 'Actúa primero en empates de agilidad.',               costGold: 800, costCoin: 0, type: 'ability', abilityId: 'ele_cond',         abilityType: 'passive', archetype: 'electrico' },
  { id: 'ab_ele_estatica',      name: 'Carga Estática',    emoji: '⚡', description: 'Aumenta la probabilidad de crítico.',                 costGold: 700, costCoin: 0, type: 'ability', abilityId: 'ele_estatica',     abilityType: 'passive', archetype: 'electrico' },
  { id: 'ab_ele_blindaje',      name: 'Blindaje Eléctrico',emoji: '⚡', description: 'Inmune a efectos de aturdimiento.',                  costGold: 900, costCoin: 0, type: 'ability', abilityId: 'ele_blindaje',     abilityType: 'passive', archetype: 'electrico' },

  // ══════════════════════════════════════════════════════════════════════════
  // 💧 HABILIDADES ACUÁTICO
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'ab_acu_marea',          name: 'Marea Curativa',    emoji: '💧', description: 'Cura a un aliado con energía del agua.',             costGold: 400, costCoin: 0, type: 'ability', abilityId: 'acu_marea',         abilityType: 'active',  archetype: 'acuatico' },
  { id: 'ab_acu_corriente',      name: 'Corriente Gélida',  emoji: '💧', description: 'Golpe de agua que ralentiza al rival.',             costGold: 500, costCoin: 0, type: 'ability', abilityId: 'acu_corriente',     abilityType: 'active',  archetype: 'acuatico' },
  { id: 'ab_acu_burbuja',        name: 'Burbuja Escudo',    emoji: '💧', description: 'Crea un escudo de agua que absorbe daño.',          costGold: 500, costCoin: 0, type: 'ability', abilityId: 'acu_burbuja',       abilityType: 'active',  archetype: 'acuatico' },
  { id: 'ab_acu_helar',          name: 'Congelamiento',     emoji: '💧', description: 'Congela al rival, reduciendo drásticamente su agi.',costGold: 700, costCoin: 0, type: 'ability', abilityId: 'acu_helar',         abilityType: 'active',  archetype: 'acuatico' },
  { id: 'ab_acu_absorber',       name: 'Absorber',          emoji: '💧', description: 'Curación poderosa de energía acuática.',            costGold: 600, costCoin: 0, type: 'ability', abilityId: 'acu_absorber',      abilityType: 'active',  archetype: 'acuatico' },
  { id: 'ab_acu_presion',        name: 'Presión Hidráulica',emoji: '💧', description: 'Golpe que reduce el daño del rival progresivamente.',costGold: 400, costCoin: 0, type: 'ability', abilityId: 'acu_presion',       abilityType: 'active',  archetype: 'acuatico' },
  { id: 'ab_acu_fluid',          name: 'Fluidez',           emoji: '💧', description: 'Reduce el daño entrante en un 15%.',                costGold: 800, costCoin: 0, type: 'ability', abilityId: 'acu_fluid',         abilityType: 'passive', archetype: 'acuatico' },
  { id: 'ab_acu_escama',         name: 'Escamas de Hielo',  emoji: '💧', description: 'Devuelve parte del daño recibido.',                 costGold: 600, costCoin: 0, type: 'ability', abilityId: 'acu_escama',        abilityType: 'passive', archetype: 'acuatico' },
  { id: 'ab_acu_corrientevida',  name: 'Corriente de Vida', emoji: '💧', description: 'Regenera HP al inicio de cada turno.',             costGold: 700, costCoin: 0, type: 'ability', abilityId: 'acu_corrientevida', abilityType: 'passive', archetype: 'acuatico' },

  // ══════════════════════════════════════════════════════════════════════════
  // 🔥 HABILIDADES VOLCÁNICO
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'ab_vol_intim',     name: 'Intimidar',           emoji: '🔥', description: 'Reduce el daño del rival con presencia ígnea.',       costGold: 400, costCoin: 0, type: 'ability', abilityId: 'vol_intim',    abilityType: 'active',  archetype: 'volcanico' },
  { id: 'ab_vol_ejecucion', name: 'Ejecución Ígnea',     emoji: '🔥', description: 'Golpe letal con daño ×2 si el rival tiene poca vida.',costGold: 1000, costCoin: 0, type: 'ability', abilityId: 'vol_ejecucion',abilityType: 'active',  archetype: 'volcanico' },
  { id: 'ab_vol_golpe',     name: 'Golpe Magmático',     emoji: '🔥', description: 'Golpe volcánico de alta potencia.',                  costGold: 600, costCoin: 0, type: 'ability', abilityId: 'vol_golpe',    abilityType: 'active',  archetype: 'volcanico' },
  { id: 'ab_vol_quemadura', name: 'Quemadura Profunda',  emoji: '🔥', description: 'Inflama al rival, causando daño por varios turnos.', costGold: 500, costCoin: 0, type: 'ability', abilityId: 'vol_quemadura',abilityType: 'active',  archetype: 'volcanico' },
  { id: 'ab_vol_explosion', name: 'Explosión Controlada',emoji: '🔥', description: 'Explosión rápida de daño volcánico.',                costGold: 400, costCoin: 0, type: 'ability', abilityId: 'vol_explosion',abilityType: 'active',  archetype: 'volcanico' },
  { id: 'ab_vol_lava',      name: 'Lluvia de Lava',      emoji: '🔥', description: 'Golpe que también debilita el daño del rival.',       costGold: 500, costCoin: 0, type: 'ability', abilityId: 'vol_lava',     abilityType: 'active',  archetype: 'volcanico' },
  { id: 'ab_vol_aura',      name: 'Aura Ígnea',          emoji: '🔥', description: 'Aura ardiente que daña a quien te ataque.',          costGold: 800, costCoin: 0, type: 'ability', abilityId: 'vol_aura',     abilityType: 'passive', archetype: 'volcanico' },
  { id: 'ab_vol_berserker', name: 'Berserker',           emoji: '🔥', description: 'Aumenta la probabilidad de golpe crítico.',          costGold: 700, costCoin: 0, type: 'ability', abilityId: 'vol_berserker',abilityType: 'passive', archetype: 'volcanico' },
  { id: 'ab_vol_nucleo',    name: 'Núcleo Ardiente',     emoji: '🔥', description: 'Inmune a efectos de debilitamiento.',                costGold: 1000, costCoin: 0, type: 'ability', abilityId: 'vol_nucleo',   abilityType: 'passive', archetype: 'volcanico' },
]

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find(item => item.id === id)
}

/**
 * Dynamic slot cost based on current slot count.
 * Slot 4 → 10, slot 5 → 20, slot 6 → 30, slot 7 → 40, slot 8 → 50.
 */
export function getSlotCost(currentSlots: number): number {
  return (currentSlots - 2) * 10
}
