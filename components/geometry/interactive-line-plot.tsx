'use client'
import { useRef, useState } from 'react'

/**
 * Click-to-place two points on a coordinate plane and draw the line through
 * them. Used by Produit-Scalaire Q17 / Q19 (and any other quiz that asks the
 * student to plot a line). Pure SVG — no external dependency.
 *
 * Plotted points are stored in mathematical coordinates and are passed back
 * via `onChange` so the parent (the quiz) can persist them in the trial.
 *
 * The component is *not* auto-graded; it captures input only.
 */

export interface PlottedPoint {
  x: number
  y: number
}

interface InteractiveLinePlotProps {
  equation: string
  onChange?: (points: PlottedPoint[]) => void
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
}

export function InteractiveLinePlot({
  equation,
  onChange,
  xMin = -6,
  xMax = 6,
  yMin = -6,
  yMax = 6,
}: InteractiveLinePlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [points, setPoints] = useState<PlottedPoint[]>([])

  const padX = 28
  const padY = 24
  const w = 480
  const h = 360
  const innerW = w - 2 * padX
  const innerH = h - 2 * padY
  const sx = (x: number) => padX + ((x - xMin) / (xMax - xMin)) * innerW
  const sy = (y: number) => padY + ((yMax - y) / (yMax - yMin)) * innerH
  const ix = (px: number) => xMin + ((px - padX) / innerW) * (xMax - xMin)
  const iy = (py: number) => yMax - ((py - padY) / innerH) * (yMax - yMin)

  const xs: number[] = []
  for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) xs.push(x)
  const ys: number[] = []
  for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) ys.push(y)

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * w
    const py = ((e.clientY - rect.top) / rect.height) * h
    const x = Math.round(ix(px))
    const y = Math.round(iy(py))
    if (x < xMin || x > xMax || y < yMin || y > yMax) return

    setPoints((prev) => {
      let next: PlottedPoint[]
      if (prev.length >= 2) next = [{ x, y }]
      else next = [...prev, { x, y }]
      onChange?.(next)
      return next
    })
  }

  const reset = () => {
    setPoints([])
    onChange?.([])
  }

  return (
    <div className="rounded-md border bg-white p-3">
      <p className="mb-2 text-xs text-muted-foreground">
        Cliquez deux points dans le repère pour tracer la droite{' '}
        <span className="font-mono">{equation}</span>. (Cliquez une 3ᵉ fois
        pour recommencer.)
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="block w-full cursor-crosshair"
        role="img"
        onClick={handleClick}
      >
        <rect width={w} height={h} fill="#fafafa" />

        {/* Grid */}
        {xs.map((x) => (
          <line
            key={`vx-${x}`}
            x1={sx(x)}
            y1={padY}
            x2={sx(x)}
            y2={h - padY}
            stroke={x === 0 ? '#94a3b8' : '#e5e7eb'}
            strokeWidth={x === 0 ? 1.4 : 0.6}
          />
        ))}
        {ys.map((y) => (
          <line
            key={`hy-${y}`}
            x1={padX}
            y1={sy(y)}
            x2={w - padX}
            y2={sy(y)}
            stroke={y === 0 ? '#94a3b8' : '#e5e7eb'}
            strokeWidth={y === 0 ? 1.4 : 0.6}
          />
        ))}

        {/* Tick labels */}
        {xs.filter((x) => x !== 0).map((x) => (
          <text
            key={`xl-${x}`}
            x={sx(x)}
            y={sy(0) + 12}
            fontSize={10}
            textAnchor="middle"
            fill="#64748b"
          >
            {x}
          </text>
        ))}
        {ys.filter((y) => y !== 0).map((y) => (
          <text
            key={`yl-${y}`}
            x={sx(0) - 6}
            y={sy(y) + 3}
            fontSize={10}
            textAnchor="end"
            fill="#64748b"
          >
            {y}
          </text>
        ))}

        <text x={w - padX + 4} y={sy(0) + 4} fontSize={11} fill="#475569">
          x
        </text>
        <text x={sx(0) + 4} y={padY - 4} fontSize={11} fill="#475569">
          y
        </text>

        {/* Drawn line — extended through the full viewport */}
        {points.length === 2 && (() => {
          const [p0, p1] = points
          const dx = p1.x - p0.x
          const dy = p1.y - p0.y
          if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return null
          const tVals: number[] = []
          const addT = (t: number) => {
            if (Number.isFinite(t)) tVals.push(t)
          }
          if (Math.abs(dx) > 1e-9) {
            addT((xMin - p0.x) / dx)
            addT((xMax - p0.x) / dx)
          }
          if (Math.abs(dy) > 1e-9) {
            addT((yMin - p0.y) / dy)
            addT((yMax - p0.y) / dy)
          }
          const tMin = Math.min(...tVals)
          const tMax = Math.max(...tVals)
          const x1 = p0.x + tMin * dx
          const y1 = p0.y + tMin * dy
          const x2 = p0.x + tMax * dx
          const y2 = p0.y + tMax * dy
          return (
            <line
              x1={sx(x1)}
              y1={sy(y1)}
              x2={sx(x2)}
              y2={sy(y2)}
              stroke="#2563eb"
              strokeWidth={2.2}
            />
          )
        })()}

        {/* Plotted points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={5}
              fill="#dc2626"
              stroke="white"
              strokeWidth={1.5}
            />
            <text
              x={sx(p.x) + 8}
              y={sy(p.y) - 8}
              fontSize={11}
              fontWeight={700}
              fill="#dc2626"
            >
              ({p.x};{p.y})
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Points placés : {points.length} / 2
        </span>
        <button
          type="button"
          onClick={reset}
          className="rounded border px-2 py-1 text-xs hover:bg-muted/50"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  )
}
