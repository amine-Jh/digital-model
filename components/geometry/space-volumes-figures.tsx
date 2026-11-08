'use client'

import type { ReactElement, ReactNode } from 'react'
import type { SpaceVolumesFigure } from '@/lib/geometry/space-volumes'
import { SPACE_VOLUMES_FIGURE_ORIENTATION } from '@/lib/geometry/space-volumes'

const stroke = '#0f172a'
const hidden = '4 3'

function Frame({
  caption,
  children,
}: {
  caption: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <svg viewBox="0 0 280 240" className="mx-auto block h-auto w-full max-w-sm">
        {children}
      </svg>
      <p className="mt-1 text-center text-xs text-muted-foreground">{caption}</p>
    </div>
  )
}

function CubeFrontal() {
  return (
    <Frame caption="Cube vu de face. L’orientation ne change pas le volume.">
      <polygon points="78,78 188,78 188,188 78,188" fill="#f0f9ff" stroke={stroke} />
      <polygon points="188,78 228,48 228,158 188,188" fill="#bae6fd" stroke={stroke} />
      <polygon points="78,78 188,78 228,48 118,48" fill="#e0f2fe" stroke={stroke} />
      <line x1="118" y1="48" x2="118" y2="158" stroke={stroke} strokeDasharray={hidden} />
      <line x1="118" y1="158" x2="228" y2="158" stroke={stroke} strokeDasharray={hidden} />
      <line x1="118" y1="158" x2="78" y2="188" stroke={stroke} strokeDasharray={hidden} />
    </Frame>
  )
}

function PyramidBase() {
  return (
    <Frame caption="Pyramide : base et hauteur perpendiculaire à la base.">
      <polygon points="70,180 190,180 230,145 110,145" fill="#ecfccb" stroke={stroke} />
      <line x1="150" y1="42" x2="70" y2="180" stroke={stroke} />
      <line x1="150" y1="42" x2="190" y2="180" stroke={stroke} />
      <line x1="150" y1="42" x2="230" y2="145" stroke={stroke} />
      <line x1="150" y1="42" x2="110" y2="145" stroke={stroke} strokeDasharray={hidden} />
      <line x1="150" y1="42" x2="150" y2="162" stroke="#dc2626" strokeDasharray={hidden} />
      <circle cx="150" cy="162" r="2.5" fill="#dc2626" />
      <text x="156" y="110" fontSize="12" fill="#dc2626">
        h
      </text>
      <text x="118" y="200" fontSize="12" fill={stroke}>
        base
      </text>
    </Frame>
  )
}

function CylinderTilt() {
  return (
    <Frame caption="Cylindre incliné d’environ 40°. Le rayon et la hauteur se lisent sur le solide, pas sur l’écran.">
      <g transform="rotate(-40 140 120)">
        <ellipse cx="140" cy="58" rx="46" ry="16" fill="#e0f2fe" stroke={stroke} />
        <line x1="94" y1="58" x2="94" y2="182" stroke={stroke} />
        <line x1="186" y1="58" x2="186" y2="182" stroke={stroke} />
        <ellipse cx="140" cy="182" rx="46" ry="16" fill="#bae6fd" stroke={stroke} />
        <line x1="140" y1="58" x2="140" y2="182" stroke="#dc2626" strokeDasharray={hidden} />
      </g>
    </Frame>
  )
}

function PlaneScale() {
  return (
    <Frame caption="Figure plane et son image par agrandissement. L’aire n’est pas affichée.">
      <rect x="36" y="120" width="52" height="36" fill="#fef3c7" stroke={stroke} />
      <text x="42" y="112" fontSize="11" fill={stroke}>
        initiale
      </text>
      <rect x="120" y="70" width="120" height="84" fill="#fde68a" stroke={stroke} />
      <text x="150" y="62" fontSize="11" fill={stroke}>
        image
      </text>
    </Frame>
  )
}

function SolidScale() {
  return (
    <Frame caption="Même solide à deux échelles. La rotation du grand cube ne change pas son volume.">
      <polygon points="28,150 78,150 78,200 28,200" fill="#f0f9ff" stroke={stroke} />
      <polygon points="78,150 98,136 98,186 78,200" fill="#bae6fd" stroke={stroke} />
      <polygon points="28,150 78,150 98,136 48,136" fill="#e0f2fe" stroke={stroke} />
      <g transform="rotate(-35 190 130)">
        <polygon points="150,70 230,70 230,150 150,150" fill="#f0f9ff" stroke={stroke} />
        <polygon points="230,70 258,50 258,130 230,150" fill="#bae6fd" stroke={stroke} />
        <polygon points="150,70 230,70 258,50 178,50" fill="#e0f2fe" stroke={stroke} />
      </g>
    </Frame>
  )
}

function CubeFour() {
  return (
    <Frame caption="Cube, face supérieure plus visible. Toutes les arêtes mesurent 4 cm.">
      <polygon points="70,150 190,118 230,148 110,180" fill="#e0f2fe" stroke={stroke} />
      <polygon points="110,180 230,148 230,198 110,230" fill="#f0f9ff" stroke={stroke} />
      <polygon points="190,118 230,148 230,198 190,168" fill="#bae6fd" stroke={stroke} />
      <line x1="70" y1="150" x2="70" y2="200" stroke={stroke} strokeDasharray={hidden} />
      <line x1="70" y1="200" x2="110" y2="230" stroke={stroke} strokeDasharray={hidden} />
      <line x1="70" y1="200" x2="190" y2="168" stroke={stroke} strokeDasharray={hidden} />
      <line x1="110" y1="186" x2="230" y2="154" stroke="#dc2626" />
      <text x="150" y="160" fontSize="13" fontWeight={700} fill="#dc2626">
        4 cm
      </text>
    </Frame>
  )
}

function PyramidSixFive() {
  return (
    <Frame caption="Pyramide tournée. h = 5 cm est perpendiculaire à la base de côté 6 cm.">
      <g transform="rotate(-50 150 140)">
        <polygon points="70,170 190,170 220,140 100,140" fill="#ecfccb" stroke={stroke} />
        <line x1="145" y1="55" x2="70" y2="170" stroke={stroke} />
        <line x1="145" y1="55" x2="190" y2="170" stroke={stroke} />
        <line x1="145" y1="55" x2="220" y2="140" stroke={stroke} />
        <line x1="145" y1="55" x2="100" y2="140" stroke={stroke} strokeDasharray={hidden} />
        <line x1="145" y1="55" x2="145" y2="155" stroke="#dc2626" strokeDasharray={hidden} />
        <text x="150" y="110" fontSize="12" fontWeight={700} fill="#dc2626">
          h = 5 cm
        </text>
        <text x="100" y="188" fontSize="12" fontWeight={700} fill={stroke}>
          6 cm
        </text>
      </g>
    </Frame>
  )
}

function CylinderThreeFive() {
  return (
    <Frame caption="Cylindre droit, vue latérale. Rayon 3 cm, hauteur 5 cm.">
      <ellipse cx="130" cy="46" rx="78" ry="14" fill="#e0f2fe" stroke={stroke} />
      <path d="M52 46 L52 190 A78 14 0 0 0 208 190 L208 46" fill="#dbeafe" stroke={stroke} />
      <ellipse cx="130" cy="190" rx="78" ry="14" fill="none" stroke={stroke} />
      <line x1="130" y1="46" x2="208" y2="46" stroke="#dc2626" />
      <text x="146" y="40" fontSize="12" fontWeight={700} fill="#dc2626">
        r = 3 cm
      </text>
      <line x1="218" y1="46" x2="218" y2="190" stroke={stroke} />
      <text x="222" y="124" fontSize="12" fontWeight={700} fill={stroke}>
        5 cm
      </text>
    </Frame>
  )
}

function PlaneK2() {
  return (
    <Frame caption="Aire initiale 18 cm². Le rapport d’agrandissement est k = 2. L’aire de l’image n’est pas écrite.">
      <rect x="28" y="130" width="48" height="32" fill="#fef3c7" stroke={stroke} />
      <text x="30" y="122" fontSize="11" fill={stroke}>
        18 cm²
      </text>
      <rect x="110" y="64" width="96" height="64" fill="#fde68a" stroke={stroke} />
      <text x="132" y="54" fontSize="12" fontWeight={700} fill={stroke}>
        k = 2
      </text>
    </Frame>
  )
}

function PyramidScale() {
  return (
    <Frame caption="Volume initial 24 cm³, rapport k = 2. Le volume de l’image n’est pas écrit.">
      <polygon points="40,150 90,150 110,132 60,132" fill="#ecfccb" stroke={stroke} />
      <line x1="75" y1="96" x2="40" y2="150" stroke={stroke} />
      <line x1="75" y1="96" x2="90" y2="150" stroke={stroke} />
      <line x1="75" y1="96" x2="110" y2="132" stroke={stroke} />
      <text x="36" y="170" fontSize="11" fill={stroke}>
        24 cm³
      </text>
      <g transform="rotate(-30 190 120)">
        <polygon points="150,150 230,150 255,124 175,124" fill="#d9f99d" stroke={stroke} />
        <line x1="202" y1="48" x2="150" y2="150" stroke={stroke} />
        <line x1="202" y1="48" x2="230" y2="150" stroke={stroke} />
        <line x1="202" y1="48" x2="255" y2="124" stroke={stroke} />
        <line x1="202" y1="48" x2="175" y2="124" stroke={stroke} strokeDasharray={hidden} />
      </g>
      <text x="168" y="40" fontSize="12" fontWeight={700} fill={stroke}>
        k = 2
      </text>
    </Frame>
  )
}

const VIEWS: Record<
  Exclude<SpaceVolumesFigure, `photo-${string}`>,
  () => ReactElement
> = {
  'cube-frontal': CubeFrontal,
  'pyramid-base': PyramidBase,
  'cylinder-tilt': CylinderTilt,
  'plane-scale': PlaneScale,
  'solid-scale': SolidScale,
  'cube-4': CubeFour,
  'pyramid-6-5': PyramidSixFive,
  'cylinder-3-5': CylinderThreeFive,
  'plane-k2': PlaneK2,
  'pyramid-scale': PyramidScale,
}

export function isDrawnSpaceVolumesFigure(
  figure: SpaceVolumesFigure,
): figure is Exclude<SpaceVolumesFigure, `photo-${string}`> {
  return !figure.startsWith('photo-')
}

export function SpaceVolumesFigureView({
  figure,
}: {
  figure: Exclude<SpaceVolumesFigure, `photo-${string}`>
}) {
  const View = VIEWS[figure]
  const note = SPACE_VOLUMES_FIGURE_ORIENTATION[figure]
  return (
    <div data-orientation={note}>
      <View />
    </div>
  )
}
