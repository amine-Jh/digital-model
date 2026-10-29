'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import type {User} from '@supabase/supabase-js'
import type {AuthSession, PublicRegisterRole, UserRole} from '@/lib/auth-types'
import {getSupabaseBrowser} from '@/lib/supabase/client'
import {isValidAuthEmail, normalizeAuthEmail} from '@/lib/auth-email'

export type RegisterOutcome =
    | { ok: false; error: string }
    | { ok: true; needsEmailConfirmation: true }
    | { ok: true; needsEmailConfirmation: false; session: AuthSession }

type AuthContextValue = {
    user: AuthSession | null
    loading: boolean
    login: (
        email: string,
        password: string,
    ) => Promise<{ ok: boolean; error?: string; session?: AuthSession }>
    register: (
        email: string,
        password: string,
        role: PublicRegisterRole,
        fullName?: string,
        /** Required when `role` is `teacher` (must match an active `schools.id`). */
        schoolIdForTeacher?: string | null,
    ) => Promise<RegisterOutcome>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Build app session from an Auth user + profiles row. Does NOT call
 * `getUser()` — safe to run from `onAuthStateChange` after deferring.
 */
async function buildAuthSession(user: User | null): Promise<AuthSession | null> {
    if (!user) return null
    const sb = getSupabaseBrowser()
    const {data: profile} = await sb
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .maybeSingle()
    const meta = user.user_metadata as {full_name?: string} | undefined
    const fromProfile = profile?.full_name?.trim()
    const fromMeta =
        typeof meta?.full_name === 'string' ? meta.full_name.trim() : ''
    const displayName = fromProfile || fromMeta || null
    return {
        userId: user.id,
        username: user.email ?? '',
        displayName,
        // Role comes only from `profiles` (user_metadata is user-editable).
        role: (profile?.role ?? 'student') as UserRole,
    }
}

/** Initial hydration: local session only, no `getUser()` re-entry issues. */
async function hydrateFromBrowserSession(): Promise<AuthSession | null> {
    const sb = getSupabaseBrowser()
    const session = await Promise.race([
        sb.auth
            .getSession()
            .then((r) => r.data.session ?? null)
            .catch(() => null),
        new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), 4000)
        }),
    ])
    return buildAuthSession(session?.user ?? null)
}

export function AuthProvider({children}: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthSession | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        const safetyMs = 5000
        const safety = setTimeout(() => {
            if (!cancelled) setLoading(false)
        }, safetyMs)

        hydrateFromBrowserSession()
            .then((s) => {
                if (!cancelled) setUser(s)
            })
            .catch(() => {
                if (!cancelled) setUser(null)
            })
            .finally(() => {
                clearTimeout(safety)
                if (!cancelled) setLoading(false)
            })

        let sb
        try {
            sb = getSupabaseBrowser()
        } catch {
            return () => {
                cancelled = true
                clearTimeout(safety)
            }
        }
        const {data: sub} = sb.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                queueMicrotask(() => {
                    if (!cancelled) setUser(null)
                })
                return
            }
            // Defer async Supabase work — never await getUser() inside this callback
            // or it can deadlock with the SDK lock held during sign-in.
            queueMicrotask(() => {
                buildAuthSession(session?.user ?? null)
                    .then((s) => {
                        if (!cancelled) setUser(s)
                    })
                    .catch(() => {
                        if (!cancelled) setUser(null)
                    })
            })
        })

        return () => {
            cancelled = true
            clearTimeout(safety)
            sub.subscription.unsubscribe()
        }
    }, [])

    const login = useCallback(async (email: string, password: string) => {
        const normalized = normalizeAuthEmail(email)
        if (!isValidAuthEmail(normalized)) {
            return {ok: false, error: 'Saisissez l’e-mail du compte (pas un identifiant).'}
        }
        let sb
        try {
            sb = getSupabaseBrowser()
        } catch (e) {
            return {
                ok: false,
                error: e instanceof Error ? e.message : 'Supabase is not configured.',
            }
        }
        const {data, error} = await sb.auth.signInWithPassword({email: normalized, password})
        if (error || !data.user) {
            const raw = error?.message ?? 'Login failed'
            if (/email not confirmed/i.test(raw)) {
                return {
                    ok: false,
                    error:
                        'E-mail non confirmé. Ouvrez le lien reçu, ou désactivez « Confirm email » dans Supabase Auth.',
                }
            }
            return {ok: false, error: raw}
        }
        const session = await buildAuthSession(data.user)
        if (!session) return {ok: false, error: 'Profile lookup failed'}
        setUser(session)
        return {ok: true, session}
    }, [])

    const register = useCallback(
        async (
            email: string,
            password: string,
            role: PublicRegisterRole,
            fullName?: string,
            schoolIdForTeacher?: string | null,
        ): Promise<RegisterOutcome> => {
            if (role === 'teacher') {
                const sid = typeof schoolIdForTeacher === 'string' ? schoolIdForTeacher.trim() : ''
                if (!sid) {
                    return {
                        ok: false as const,
                        error:
                            'Choisissez l’établissement auquel vous êtes rattaché pour créer un compte enseignant.',
                    }
                }
            }
            const accountEmail = normalizeAuthEmail(email)
            if (!isValidAuthEmail(accountEmail)) {
                return {
                    ok: false as const,
                    error: 'Saisissez une adresse e-mail valide pour créer le compte.',
                }
            }
            if (password.length < 6) {
                return {
                    ok: false as const,
                    error: 'Le mot de passe doit contenir au moins 6 caractères.',
                }
            }
            let sb
            try {
                sb = getSupabaseBrowser()
            } catch (e) {
                return {
                    ok: false as const,
                    error: e instanceof Error ? e.message : 'Supabase is not configured.',
                }
            }
            const meta: Record<string, string> = {role, full_name: fullName ?? ''}
            if (role === 'teacher' && schoolIdForTeacher) {
                meta.school_id = schoolIdForTeacher.trim()
            }
            const {data, error} = await sb.auth.signUp({
                email: accountEmail,
                password,
                options: {
                    data: meta,
                    emailRedirectTo:
                        typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
                },
            })
            if (error) {
                return {ok: false as const, error: error.message ?? 'Registration failed'}
            }
            if (!data.user) {
                return {ok: false as const, error: 'Registration failed'}
            }
            if (!data.session) {
                return {ok: true as const, needsEmailConfirmation: true as const}
            }
            const session = await buildAuthSession(data.user)
            if (!session) {
                return {ok: false as const, error: 'Profile lookup failed'}
            }
            setUser(session)
            return {
                ok: true as const,
                needsEmailConfirmation: false as const,
                session,
            }
        },
        [],
    )

    const logout = useCallback(async () => {
        const sb = getSupabaseBrowser()
        await sb.auth.signOut()
        setUser(null)
    }, [])

    const value = useMemo(
        () => ({user, loading, login, register, logout}),
        [user, loading, login, register, logout],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
