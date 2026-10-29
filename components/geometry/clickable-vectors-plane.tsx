'use client'
import { useRef, useState } from 'react'
import { VECTOR_POINTS } from '@/lib/geometry/geo-vectors-complete'

/**
 * Coordinate plane that mirrors the canonical vecteurs.png figure but lets
 * the student click to place named points (Q9 batch / Q10–Q11 sequential).
 * Lattice coordinates of the labelled figure points are not displayed.
 */

export type VectorsPlaneMark = {
  name: string
  x: number
  y: number
  correct?: boolean | null
}

interface ClickableVectorsPlaneProps {
  labels: string[]
  mode?: 'batch' | 'sequential' | 'readonly'
  /** Sequential: name of the point currently requested. */
  activeLabel?: string | null
  /** Sequential: already checked marks (locked). */
  marks?: VectorsPlaneMark[]
  locked?: boolean
  /** Override figure letters (default: VECTOR_POINTS). Pass [] to hide them. */
  figurePoints?: { name: string; x: number; y: number }[]
  onChange?: (placed: { name: string; x: number; y: number }[]) => void
  onPlace?: (placed: { name: string; x: number; y: number }) => void
}

export function ClickableVectorsPlane({
  labels,
  mode = 'batch',
  activeLabel = null,
  marks,
  locked = false,
  figurePoints,
  onChange,
  onPlace,
}: ClickableVectorsPlaneProps) {
  const labeledFigure = figurePoints ?? VECTOR_POINTS
  const svgRef = useRef<SVGSVGElement>(null)
  const [placed, setPlaced] = useState<{ name: string; x: number; y: number }[]>([])
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)

  const sequential = mode === 'sequential'
  const readonly = mode === 'readonly' || labels.length === 0

  const xMin = -4
  const xMax = 12
  const yMin = -6
  const yMax = 10
  const padX = 36
  const padY = 32
  const w = 640
  const h = 480
  const innerW = w - 2 * padX
  const innerH = h - 2 * padY
  const sx = (x: number) => padX + ((x - xMin) / (xMax - xMin)) * innerW
  const sy = (y: number) => padY + ((yMax - y) / (yMax - yMin)) * innerH
  const ix = (px: number) => xMin + ((px - padX) / innerW) * (xMax - xMin)
  const iy = (py: number) => yMax - ((py - padY) / innerH) * (yMax - yMin)

  const xs: number[] = []
  for (let x = xMin; x <= xMax; x++) xs.push(x)
  const ys: number[] = []
  for (let y = yMin; y <= yMax; y++) ys.push(y)

  const latticeFromEvent = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * w
    const py = ((e.clientY - rect.top) / rect.height) * h
    const x = Math.round(ix(px))
    const y = Math.round(iy(py))
    if (x < xMin || x > xMax || y < yMin || y > yMax) return null
    return { x, y }
  }

  const handlePlace = (e: React.PointerEvent<SVGSVGElement>) => {
    if (readonly || locked) return
    const pt = latticeFromEvent(e)
    if (!pt) return

    if (sequential) {
      if (!activeLabel) return
      onPlace?.({ name: activeLabel, x: pt.x, y: pt.y })
      return
    }

    setPlaced((prev) => {
      const i = prev.length
      let next: { name: string; x: number; y: number }[]
      if (i >= labels.length) {
        next = [{ name: labels[0], x: pt.x, y: pt.y }]
      } else {
        next = [...prev, { name: labels[i], x: pt.x, y: pt.y }]
      }
      onChange?.(next)
      return next
    })
  }

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (readonly || locked) {
      setHover(null)
      return
    }
    setHover(latticeFromEvent(e))
  }

  const displayMarks: VectorsPlaneMark[] = sequential ? (marks ?? []) : placed
  const nextLabel = sequential
    ? locked
      ? null
      : activeLabel
    : placed.length >= labels.length
      ? labels[0] ?? null
      : labels[placed.length] ?? null

  const reset = () => {
    if (sequential) return
    setPlaced([])
    onChange?.([])
  }

  const markFill = (m: VectorsPlaneMark) => {
    if (m.correct === true) return '#16a34a'
    if (m.correct === false) return '#dc2626'
    return '#dc2626'
  }

  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">
        {sequential ? (
          <>
            Cliquez sur le nœud du repère pour placer{' '}
            <strong>{activeLabel ?? 'le point'}</strong>.
          </>
        ) : readonly ? (
          'Repère de référence.'
        ) : (
          <>
            Cliquez sur le repère pour placer{' '}
            {labels.map((l, i) => (
              <span key={l}>
                {i > 0 ? ', ' : ''}
                <strong>{l}</strong>
              </span>
            ))}
            {' '}(plus de clics réinitialisent automatiquement).
          </>
        )}
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className={`block w-full touch-none bg-white ${
          readonly || locked ? 'cursor-default' : 'cursor-crosshair'
        }`}
        role="img"
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return
          handlePlace(e)
        }}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <rect width={w} height={h} fill="#fafafa" />

        {xs.map((x) => (
          <line
            key={`vx-${x}`}
            x1={sx(x)}
            y1={padY}
            x2={sx(x)}
            y2={h - padY}
            stroke={x === 0 ? '#64748b' : '#e5e7eb'}
            strokeWidth={x === 0 ? 1.6 : 0.7}
          />
        ))}
        {ys.map((y) => (
          <line
            key={`hy-${y}`}
            x1={padX}
            y1={sy(y)}
            x2={w - padX}
            y2={sy(y)}
            stroke={y === 0 ? '#64748b' : '#e5e7eb'}
            strokeWidth={y === 0 ? 1.6 : 0.7}
          />
        ))}

        {xs.map((x) => (
          <text
            key={`xl-${x}`}
            x={sx(x)}
            y={sy(0) + 14}
            fontSize={11}
            textAnchor="middle"
            fill="#475569"
          >
            {x}
          </text>
        ))}
        {ys.filter((y) => y !== 0).map((y) => (
          <text
            key={`yl-${y}`}
            x={sx(0) - 7}
            y={sy(y) + 4}
            fontSize={11}
            textAnchor="end"
            fill="#475569"
          >
            {y}
          </text>
        ))}
        <text x={w - padX + 6} y={sy(0) + 4} fontSize={13} fill="#334155">
          x
        </text>
        <text x={sx(0) + 6} y={padY - 8} fontSize={13} fill="#334155">
          y
        </text>

        {labeledFigure.map((pt) => {
          const cx = sx(pt.x)
          const cy = sy(pt.y)
          return (
            <g key={pt.name}>
              <circle cx={cx} cy={cy} r={3.5} fill="#475569" stroke="white" strokeWidth={1} />
              <text x={cx + 6} y={cy - 6} fontSize={12} fontWeight={700} fill="#1e293b">
                {pt.name}
              </text>
            </g>
          )
        })}

        {hover && nextLabel && (
          <g pointerEvents="none">
            <circle
              cx={sx(hover.x)}
              cy={sy(hover.y)}
              r={6}
              fill="#2563eb"
              fillOpacity={0.3}
              stroke="#2563eb"
              strokeWidth={1.2}
            />
            <text
              x={sx(hover.x) + 8}
              y={sy(hover.y) - 8}
              fontSize={13}
              fontWeight={700}
              fill="#1d4ed8"
            >
              {nextLabel}
            </text>
            <text x={sx(hover.x) + 8} y={sy(hover.y) + 14} fontSize={11} fill="#475569">
              ({hover.x};{hover.y})
            </text>
          </g>
        )}

        {displayMarks.map((p, i) => (
          <g key={`${p.name}-${i}`}>
            <circle
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={7}
              fill={markFill(p)}
              stroke="white"
              strokeWidth={1.8}
            />
            <text
              x={sx(p.x) + 8}
              y={sy(p.y) - 8}
              fontSize={14}
              fontWeight={700}
              fill={markFill(p)}
            >
              {p.name}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {displayMarks.length === 0
            ? 'Aucun point placé.'
            : displayMarks
                .map((p) => {
                  const flag =
                    p.correct === true ? ' ✓' : p.correct === false ? ' ✗' : ''
                  return `${p.name}(${p.x};${p.y})${flag}`
                })
                .join(' · ')}
        </span>
        {!sequential && !readonly && (
          <button
            type="button"
            onClick={reset}
            className="rounded border px-2 py-1 text-xs hover:bg-muted/50"
          >
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  )
}
