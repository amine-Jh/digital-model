'use client'

import type { GeometryAnalyticsReport } from '@/lib/geometry/geometry-analytics-report'
import { formatCapacityGlyph } from '@/lib/geometry/capacity-definitions'

export function GeometryAnalyticsSummary({
  report,
  compact,
}: {
  report: GeometryAnalyticsReport
  /** Single condensed block (e.g. dashboard cards). */
  compact?: boolean
}) {
  if (compact) {
    return (
      <div className="mt-2 rounded-md border border-border/80 bg-muted/20 px-2 py-1.5 text-left text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Synthèse :</span>{' '}
        {report.globalScoreOutOf20}/20 ({Math.round(report.globalPercent)} %) —{' '}
        {report.globalLevel}
        {report.parts.length > 0 && (
          <>
            {' '}
            ·{' '}
            {report.parts.map((p) => `P${p.part} ${Math.round(p.percent)}%`).join(' · ')}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="mb-6 space-y-6 text-left">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Score global
        </h3>
        <div className="rounded-lg border bg-muted/15 p-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-primary">
              {report.globalScoreOutOf20}/20
            </span>
            <span className="text-sm text-muted-foreground">
              ({Math.round(report.globalPercent)} %)
            </span>
          </div>
          <p className="mt-1 text-sm font-medium">{report.globalLevel}</p>
          <p className="mt-2 text-xs text-muted-foreground">{report.globalLevelDetail}</p>
          {report.strengths.length > 0 && (
            <p className="mt-2 text-xs">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">Forces :</span>{' '}
              {report.strengths.join(' · ')}
            </p>
          )}
          {report.weaknesses.length > 0 && (
            <p className="mt-1 text-xs">
              <span className="font-semibold text-amber-800 dark:text-amber-200">Faiblesses :</span>{' '}
              {report.weaknesses.join(' · ')}
            </p>
          )}
        </div>
      </section>

      {report.capacities.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Capacités (Cₖ)
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {report.capacities.map((c) => (
              <div key={c.code} className="rounded-lg border bg-card p-3 text-sm">
                <div className="font-mono font-semibold text-emerald-800 dark:text-emerald-200">
                  {formatCapacityGlyph(c.code)}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{c.name}</p>
                <p className="mt-2 font-semibold tabular-nums">
                  {c.scoreOutOf20}/20 — {Math.round(c.percent)} %
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Moy. score / question (pondéré) : {c.meanPerQuestion}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {report.parts.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Parties
          </h3>
          <div className="space-y-2">
            {report.parts.map((p) => (
              <div key={p.part} className="rounded-lg border bg-card p-3 text-sm">
                <p className="text-xs font-medium text-foreground">{p.label}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Score :{' '}
                    <strong className="text-foreground">
                      {p.scoreOutOf20}/20 ({Math.round(p.percent)} %)
                    </strong>
                  </span>
                  <span>
                    Moyenne : <strong className="text-foreground">{p.meanPerQuestion}</strong>
                  </span>
                  <span>
                    Réponses justes :{' '}
                    <strong className="text-foreground">
                      {p.correctCount}/{p.totalScorable}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {report.recommendations.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recommandations
          </h3>
          <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
            {report.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
