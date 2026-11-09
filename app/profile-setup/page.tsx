'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/lib/auth-context'
import {
  type MoroccanGradeLevel,
  resolveDefaultTrack,
} from '@/lib/student-profile-types'
import { SCHOLAR_LEVELS } from '@/lib/mock-data'
import type { TeacherDirectoryEntry } from '@/lib/teacher-directory'
import type { PublicSchool } from '@/lib/school-directory'
import { Brain, Building2, Loader2, Users } from 'lucide-react'
import { CenteredCardFormSkeleton } from '@/components/skeletons'
import { cn } from '@/lib/utils'

function teacherOptionLabel(t: TeacherDirectoryEntry): string {
  const name = t.full_name?.trim()
  if (name) return `${name} (${t.email})`
  return t.email
}

export default function ProfileSetupPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('')
  const [schoolId, setSchoolId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [schools, setSchools] = useState<PublicSchool[]>([])
  const [schoolsLoading, setSchoolsLoading] = useState(true)
  const [schoolsError, setSchoolsError] = useState<string | null>(null)
  const [teachers, setTeachers] = useState<TeacherDirectoryEntry[]>([])
  const [teachersLoading, setTeachersLoading] = useState(false)
  const [teachersError, setTeachersError] = useState<string | null>(null)
  const [gradeLevel, setGradeLevel] = useState<MoroccanGradeLevel>(SCHOLAR_LEVELS[0])
  const [className, setClassName] = useState('')
  const [mathAverage2025_2026, setMathAverage2025_2026] = useState('')
  const [mathAverage2024_2025, setMathAverage2024_2025] = useState('')

  const academicYear = '2025/2026'

  useEffect(() => {
    if (!authLoading && !user) router.replace('/')
  }, [authLoading, user, router])

  useEffect(() => {
    let cancelled = false
    setSchoolsLoading(true)
    setSchoolsError(null)
    fetch('/api/schools')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Impossible de charger les établissements.')
        return data as { schools?: PublicSchool[] }
      })
      .then((data) => {
        if (!cancelled) setSchools(data.schools ?? [])
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSchools([])
          setSchoolsError(e instanceof Error ? e.message : 'Erreur réseau.')
        }
      })
      .finally(() => {
        if (!cancelled) setSchoolsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!schoolId) {
      setTeachers([])
      setTeacherId('')
      setTeachersError(null)
      return
    }
    let cancelled = false
    setTeachersLoading(true)
    setTeachersError(null)
    fetch(`/api/teachers?schoolId=${encodeURIComponent(schoolId)}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Impossible de charger les enseignants.')
        return data as { teachers?: TeacherDirectoryEntry[] }
      })
      .then((data) => {
        if (!cancelled) {
          setTeachers(data.teachers ?? [])
          setTeacherId('')
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setTeachers([])
          setTeacherId('')
          setTeachersError(e instanceof Error ? e.message : 'Erreur réseau.')
        }
      })
      .finally(() => {
        if (!cancelled) setTeachersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [schoolId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!schoolId || !teacherId) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/student-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          fullName,
          age: Number(age) || 0,
          gender,
          schoolId,
          teacherId,
          gradeLevel,
          className,
          academicTrack: resolveDefaultTrack(gradeLevel),
          academicYear,
          mathAverage2025_2026:
            mathAverage2025_2026 === '' ? null : Number(mathAverage2025_2026),
          mathAverage2024_2025:
            mathAverage2024_2025 === '' ? null : Number(mathAverage2024_2025),
          updatedAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('save failed')
      router.push('/dashboard')
    } catch {
      setIsLoading(false)
    }
  }

  if (authLoading || !user) {
    return <CenteredCardFormSkeleton />
  }

  const canPickSchool = !schoolsLoading && !schoolsError && schools.length > 0
  const canPickTeacher =
    Boolean(schoolId) && !teachersLoading && !teachersError && teachers.length > 0
  const submitDisabled =
    isLoading ||
    !gender ||
    schoolsLoading ||
    !canPickSchool ||
    !schoolId ||
    teachersLoading ||
    !canPickTeacher ||
    !teacherId

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-background to-slate-100/80 dark:from-slate-950 dark:via-background dark:to-slate-900/50 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-2xl shadow-xl border-border/60 overflow-hidden">
        <CardHeader className="text-center pb-2 space-y-3 bg-gradient-to-br from-primary/5 to-transparent border-b border-border/40">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-md">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Profil élève</CardTitle>
            <CardDescription className="text-base mt-2 max-w-md mx-auto">
              Renseignez vos informations pour l&apos;année scolaire{' '}
              <span className="font-semibold text-foreground">{academicYear}</span>. Votre enseignant
              doit appartenir à l&apos;établissement que vous sélectionnez.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div
              className={cn(
                'rounded-2xl border border-border/80 bg-muted/25 p-5 space-y-5',
                'shadow-sm',
              )}
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  1
                </Badge>
                <h3 className="text-sm font-semibold text-foreground">Établissement et enseignant</h3>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground">
                    <Building2 className="h-4 w-4 text-primary" aria-hidden />
                    Établissement
                  </Label>
                  {schoolsLoading ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement…
                    </p>
                  ) : schoolsError ? (
                    <p className="text-sm text-destructive">{schoolsError}</p>
                  ) : schools.length === 0 ? (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Aucun établissement actif. Le super-administrateur doit créer des écoles dans
                      l&apos;administration.
                    </p>
                  ) : (
                    <Select value={schoolId || undefined} onValueChange={setSchoolId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir votre établissement" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                            {s.city ? ` · ${s.city}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground">
                    <Users className="h-4 w-4 text-primary" aria-hidden />
                    Enseignant référent
                  </Label>
                  {!schoolId ? (
                    <p className="text-xs text-muted-foreground py-2">
                      Sélectionnez d&apos;abord un établissement.
                    </p>
                  ) : teachersLoading ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement des enseignants…
                    </p>
                  ) : teachersError ? (
                    <p className="text-sm text-destructive">{teachersError}</p>
                  ) : teachers.length === 0 ? (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Aucun enseignant n&apos;est associé à cet établissement. Un super-administrateur doit d&apos;abord enregistrer l&apos;enseignant.
                    </p>
                  ) : (
                    <Select value={teacherId || undefined} onValueChange={setTeacherId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir votre enseignant" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {teacherOptionLabel(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                La liste des enseignants correspond uniquement aux profils enregistrés pour
                l&apos;établissement choisi : impossible de saisir un nom librement.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  2
                </Badge>
                <h3 className="text-sm font-semibold text-foreground">Niveau et classe</h3>
              </div>
              <div className="space-y-2">
                <Label>Niveau scolaire</Label>
                <Select value={gradeLevel} onValueChange={(v) => setGradeLevel(v as MoroccanGradeLevel)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHOLAR_LEVELS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="className">Classe</Label>
                <Input
                  id="className"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Ex. TC-1, 1BAC SM-A"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Moyenne maths 2025 / 2026</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    step={0.01}
                    value={mathAverage2025_2026}
                    onChange={(e) => setMathAverage2025_2026(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moyenne maths 2024 / 2025</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    step={0.01}
                    value={mathAverage2024_2025}
                    onChange={(e) => setMathAverage2024_2025(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  3
                </Badge>
                <h3 className="text-sm font-semibold text-foreground">Identité</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Âge</Label>
                  <Input id="age" type="number" min={5} max={100} value={age} onChange={(e) => setAge(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2 max-w-xs">
                <Label>Genre</Label>
                <Select value={gender || undefined} onValueChange={(v) => setGender(v as 'Male' | 'Female')} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Homme</SelectItem>
                    <SelectItem value="Female">Femme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={submitDisabled}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                'Enregistrer et continuer'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
