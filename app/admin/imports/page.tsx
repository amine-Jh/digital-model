'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EXTERNAL_CSV_TEMPLATE } from '@/lib/assessment/csv-external'

type Issue = { line: number; message: string }

export default function ImportsPage() {
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState('import.csv')
  const [issues, setIssues] = useState<Issue[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  async function send(mode: 'preview' | 'confirm') {
    setMessage(null)
    const res = await fetch('/api/admin/external-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, csv, fileName }),
    })
    const body = await res.json()
    setIssues(body.issues ?? [])
    setPreviewCount(body.rowCount ?? null)
    if (!res.ok || body.ok === false) {
      setMessage(body.error ?? 'Le fichier contient des erreurs. Aucune ligne n’a été enregistrée.')
      return
    }
    setMessage(
      mode === 'preview'
        ? 'Aperçu valide. Confirmez pour enregistrer.'
        : `${body.imported} ligne(s) importée(s). Le fichier Excel est disponible dans Indicateurs de performance.`,
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import des résultats externes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Le fichier est relu avant enregistrement. Un Student_ID inconnu, un score hors barème ou un doublon bloque l’import. Rien n’est écrasé en silence.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fichier CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              setFileName(file.name)
              setCsv(await file.text())
              setIssues([])
              setMessage(null)
            }}
          />
          <textarea
            className="min-h-40 w-full rounded-md border border-slate-200 p-3 font-mono text-xs"
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            placeholder={EXTERNAL_CSV_TEMPLATE}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => send('preview')}>
              Vérifier
            </Button>
            <Button type="button" onClick={() => send('confirm')}>
              Confirmer l’import
            </Button>
            <a
              className="inline-flex items-center text-sm text-indigo-700 underline"
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(EXTERNAL_CSV_TEMPLATE)}`}
              download="modele-resultats-externes.csv"
            >
              Modèle CSV
            </a>
          </div>
          {previewCount != null && <p className="text-sm text-slate-600">{previewCount} ligne(s) lue(s).</p>}
          {message && <p className="text-sm text-slate-800">{message}</p>}
          {issues.length > 0 && (
            <ul className="space-y-1 text-sm text-red-700">
              {issues.map((issue, index) => (
                <li key={`${issue.line}-${index}`}>
                  Ligne {issue.line} — {issue.message}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
