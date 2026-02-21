export type ActionType = 'CARE' | 'TRAIN' | 'EXPLORE' | 'SOCIAL'

const NARRATIVES: Record<ActionType, string[]> = {
  CARE: [
    'Tu Therian descansa cerca. Su respiración se normaliza. La fatiga del mundo se afloja un poco.',
    'Un momento de quietud. No hacía falta decir nada. Solo estar ahí.',
    'Se acomoda. Cierra los ojos. Sabe que está seguro contigo.',
    'La vitalidad no se grita. Se acumula en silencio, un día a la vez.',
    'Hoy el descanso fue real. No hubo prisa. Solo el ahora.',
  ],
  TRAIN: [
    'Se lanza una y otra vez contra el viento. Hoy sus reflejos respondieron diferente. Mejor.',
    'El esfuerzo no duele cuando tiene propósito. Hoy encontró el suyo.',
    'Hay velocidad que no se mide. La tuya es de esa clase.',
    'Cada repetición graba algo en la memoria del cuerpo. Hoy fue un buen día de grabación.',
    'Falla. Intenta. Falla mejor. Eso es progresar.',
  ],
  EXPLORE: [
    'Se adentró en terreno desconocido sin miedo. Volvió con algo en los ojos: más mundo.',
    'El bosque no olvidará este recorrido.',
    'Hoy aprendió algo que no tiene nombre todavía.',
    'Hay mapas que no se dibujan en papel. Hoy trazó uno.',
    'El instinto no se explica. Se afina. Hoy se afinó.',
  ],
  SOCIAL: [
    'Hubo contacto hoy. Un intercambio. Algo que solo se aprende entre dos.',
    'Alguien lo vio hoy. Realmente lo vio.',
    'La conexión no necesita durar para ser real.',
    'Se quedó quieto en la oscuridad. Y la oscuridad lo reconoció.',
    'Hoy tu Therian miró el mundo desde otro ángulo.',
  ],
}

const COOLDOWN_MESSAGES = [
  'Tu Therian necesita tiempo para integrar lo de hoy.',
  'El descanso también es parte del camino. Vuelve mañana.',
  'No todo puede ser ahora. Mañana habrá más.',
  'La paciencia también es una stat. La tuya sube.',
]

export function getNarrative(actionType: ActionType): string {
  const options = NARRATIVES[actionType]
  return options[Math.floor(Math.random() * options.length)]
}

export function getCooldownMessage(): string {
  return COOLDOWN_MESSAGES[Math.floor(Math.random() * COOLDOWN_MESSAGES.length)]
}

export const ACTION_LABELS: Record<ActionType, { label: string; icon: string; color: string }> = {
  CARE:    { label: 'Cuidar',     icon: '🌿', color: 'emerald' },
  TRAIN:   { label: 'Entrenar',   icon: '⚡', color: 'amber' },
  EXPLORE: { label: 'Explorar',   icon: '🌌', color: 'blue' },
  SOCIAL:  { label: 'Socializar', icon: '✨', color: 'pink' },
}

export const ACTION_DELTAS: Record<ActionType, { stat: keyof import('../generation/engine').TherianStats; amount: number; xp: number; essencia: number }> = {
  CARE:    { stat: 'vitality', amount: 3, xp: 10, essencia: 10 },
  TRAIN:   { stat: 'agility',  amount: 3, xp: 10, essencia: 10 },
  EXPLORE: { stat: 'instinct', amount: 3, xp: 10, essencia: 10 },
  SOCIAL:  { stat: 'charisma', amount: 3, xp: 10, essencia: 10 },
}
