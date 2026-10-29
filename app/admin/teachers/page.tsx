'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GraduationCap, Loader2, UserPlus } from 'lucide-react'
import type { Database } from '@/lib/types/database'

type SchoolRow = Database['public']['Tables']['schools']['Row']

type TeacherListRow = {
  id: string
  email: string
  full_name: string | null
  school_id: string | null
  created_at: string
  school: { name: string; city: string | null } | null
}

export default function AdminTeachersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schools, setSchools] = useState<SchoolRow[]>([])
  const [teachers, setTeachers] = useState<TeacherListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setListError(null)
    try {
      const [sRes, tRes] = await Promise.all([
        fetch('/api/admin/schools'),
        fetch('/api/admin/teachers'),
      ])
      const sData = await sRes.json()
      const tData = await tRes.json()
      if (!sRes.ok) {
        setListError(sData.error ?? 'Écoles introuvables.')
        setSchools([])
      } else {
        setSchools(sData.schools ?? [])
      }
      if (!tRes.ok) {
        setListError(tData.error ?? 'Enseignants introuvables.')
        setTeachers([])
      } else {
        setTeachers(tData.teachers ?? [])
      }
    } catch {
      setListError('Erreur réseau.')
      setSchools([])
      setTeachers([])
    } finally {
      setLoading(false)
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
    setErr(null)
    setMsg(null)
    setCreateLoading(true)
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          fullName: fullName.trim() || undefined,
          schoolId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error ?? 'Échec de la création.')
        return
      }
      setMsg(`Compte enseignant créé pour ${data.user?.email ?? email}.`)
      setEmail('')
      setPassword('')
      setFullName('')
      setSchoolId('')
      await load()
    } catch {
      setErr('Erreur réseau.')
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

  const activeSchools = schools.filter((s) => s.is_active)

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          Enseignants
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          Créez des comptes enseignants rattachés à un établissement. Les enseignants peuvent aussi
          s&apos;inscrire eux-mêmes s&apos;ils choisissent le même établissement à l&apos;inscription.
        </p>
      </div>

      <Card className="border-slate-200/80 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-violet-50/80 to-white border-b border-slate-100">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-violet-600" />
            Nouvel enseignant
          </CardTitle>
          <CardDescription>E-mail, mot de passe et établissement obligatoires.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4 max-w-lg">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Établissement</Label>
              <Select value={schoolId || undefined} onValueChange={setSchoolId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir un établissement actif" />
                </SelectTrigger>
                <SelectContent>
                  {activeSchools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.city ? ` · ${s.city}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeSchools.length === 0 && (
                <p className="text-xs text-amber-700">
                  Créez d&apos;abord un établissement dans « Écoles ».
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-email">E-mail</Label>
              <Input
                id="t-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-pass">Mot de passe (min. 8)</Label>
              <Input
                id="t-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-name">Nom affiché (optionnel)</Label>
              <Input id="t-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            {msg && <p className="text-sm text-emerald-700">{msg}</p>}
            <Button
              type="submit"
              disabled={createLoading || activeSchools.length === 0 || !schoolId}
              className="w-full sm:w-auto"
            >
              {createLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Créer le compte enseignant'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Enseignants enregistrés</CardTitle>
          <CardDescription>Rattachés à un établissement (profil `profiles.school_id`).</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2 py-10 justify-center">
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
                  <TableHead>Établissement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                      Aucun enseignant pour le moment.
                    </TableCell>
                  </TableRow>
                ) : (
                  teachers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.email}</TableCell>
                      <TableCell>{t.full_name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {t.school
                          ? `${t.school.name}${t.school.city ? ` · ${t.school.city}` : ''}`
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
