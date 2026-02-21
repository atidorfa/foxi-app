# therian-evolved.riv — Guía de creación

Este archivo `.riv` debe ser creado en el editor Rive (rive.app).
El archivo `therian-evolved.riv` que está en esta carpeta es un placeholder vacío — el componente
`TherianAvatarEvolved` detecta el error de carga y muestra el SVG original como fallback
hasta que este archivo sea reemplazado por el .riv real.

---

## Estructura del esqueleto (Bones)

```
root
├── body          (torso central)
│   ├── head      (cabeza)
│   │   ├── ear_left
│   │   ├── ear_right
│   │   ├── eye_left
│   │   ├── eye_right
│   │   └── nose
│   ├── arm_left
│   ├── arm_right
│   ├── leg_left
│   └── leg_right
└── signature     (cola / cuernos / alas / melena)
```

---

## State Machine: `TherianSM`

### States
| Estado | Descripción |
|--------|-------------|
| `idle` | Parado, respiración suave |
| `walk` | Caminata bipeda (brazos y piernas balanceándose) |

### Transitions
- `idle → walk`: cuando `isWalking == true`
- `walk → idle`: cuando `isWalking == false`

### Inputs

| Nombre         | Tipo    | Rango      | Descripción |
|----------------|---------|------------|-------------|
| `isWalking`    | Boolean | —          | Activa la animación de caminar |
| `facingRight`  | Boolean | —          | NO necesario — el flip se hace vía CSS scaleX |
| `speed`        | Number  | 0.0 – 1.0  | Velocidad de la animación de caminar |
| `doAction`     | Trigger | —          | Dispara una animación de celebración/acción |
| `colorPrimary` | Number  | 0xRRGGBB   | Color primario de la paleta del Therian |
| `colorSecondary`| Number | 0xRRGGBB   | Color secundario |
| `colorAccent`  | Number  | 0xRRGGBB   | Color de acento |
| `eyeType`      | Number  | 0 – 7      | Tipo de ojo (ver tabla abajo) |
| `patternType`  | Number  | 0 – 7      | Patrón corporal (ver tabla abajo) |
| `signatureType`| Number  | 0 – 7      | Elemento signature (ver tabla abajo) |

### Tabla eyeType
| Valor | Forma    |
|-------|----------|
| 0     | round    |
| 1     | sharp    |
| 2     | sleepy   |
| 3     | fierce   |
| 4     | gentle   |
| 5     | hollow   |
| 6     | glowing  |
| 7     | star     |

### Tabla patternType
| Valor | Patrón   |
|-------|----------|
| 0     | solid    |
| 1     | stripe   |
| 2     | spot     |
| 3     | gradient |
| 4     | void     |
| 5     | ember    |
| 6     | frost    |
| 7     | dual     |

### Tabla signatureType
| Valor | Elemento      |
|-------|---------------|
| 0     | tail_long     |
| 1     | tail_fluffy   |
| 2     | horns_small   |
| 3     | horns_grand   |
| 4     | wings_small   |
| 5     | mane          |
| 6     | crown         |
| 7     | no_signature  |

---

## Notas de diseño

- El Therian siempre mira hacia la derecha en el .riv.
  El flip horizontal se hace con `scaleX(-1)` en CSS desde el componente padre.
- Los colores se aplican vía los Number inputs (`colorPrimary`, etc.) usando fill rules en Rive.
- El artboard debe ser 300×300px para mantener consistencia con el SVG de nivel 1.
- La animación `walk` debe ser un loop de ~0.6s con desplazamiento de piernas alternado.
- El `doAction` trigger puede conectarse a una animación de 1-2s (salto, giro, etc.) con
  retorno automático al estado anterior.
