'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, UserPlus } from 'lucide-react'

type AdminRow = {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

export default function PlatformAdminsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<AdminRow[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createMessage, setCreateMessage] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const res = await fetch('/api/admin/platform-admins')
      const data = await res.json()
      if (!res.ok) {
        setListError(data.error ?? 'Impossible de charger la liste.')
        setRows([])
        return
      }
      setRows(data.admins ?? [])
    } catch {
      setListError('Erreur réseau.')
      setRows([])
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'super_admin') {
      router.replace('/admin')
      return
    }
    void load()
  }, [authLoading, user, router, load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setCreateMessage(null)
    setCreateLoading(true)
    try {
      const res = await fetch('/api/admin/platform-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          fullName: fullName.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error ?? 'Échec de la création.')
        return
      }
      setCreateMessage(`Compte administrateur créé pour ${data.user?.email ?? email}.`)
      setEmail('')
      setPassword('')
      setFullName('')
      await load()
    } catch {
      setCreateError('Erreur réseau.')
    } finally {
      setCreateLoading(false)
    }
  }

  if (authLoading || !user || user.role !== 'super_admin') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Chargement…
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Administrateurs plateforme</h1>
        <p className="text-sm text-slate-600 mt-1">
          Créez des comptes <strong>admin</strong> pour votre équipe. Le rôle{' '}
          <strong>super-admin</strong> ne peut pas être ajouté ici : il est défini uniquement dans
          Supabase (sécurité).
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" />
            Nouvel administrateur
          </CardTitle>
          <CardDescription>
            L&apos;utilisateur pourra se connecter sur la page d&apos;accueil avec cet e-mail et ce mot de
            passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="adm-email">E-mail</Label>
              <Input
                id="adm-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm-pass">Mot de passe (min. 8 caractères)</Label>
              <Input
                id="adm-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm-name">Nom affiché (optionnel)</Label>
              <Input
                id="adm-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            {createMessage && <p className="text-sm text-emerald-700">{createMessage}</p>}
            <Button type="submit" disabled={createLoading}>
              {createLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création…
                </>
              ) : (
                'Créer le compte admin'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Comptes admin et super-admin</CardTitle>
          <CardDescription>Liste des profils avec accès à l&apos;espace /admin.</CardDescription>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement…
            </p>
          ) : listError ? (
            <p className="text-sm text-destructive">{listError}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-right">Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground text-center py-8">
                      Aucun administrateur trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.email}</TableCell>
                      <TableCell>{r.full_name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={r.role === 'super_admin' ? 'default' : 'secondary'}>
                          {r.role === 'super_admin' ? 'Super-admin' : 'Admin'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
