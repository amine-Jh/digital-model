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
    const {
        data: {session},
    } = await sb.auth.getSession()
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

        const sb = getSupabaseBrowser()
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
        const sb = getSupabaseBrowser()
        const {data, error} = await sb.auth.signInWithPassword({email, password})
        if (error || !data.user) {
            return {ok: false, error: error?.message ?? 'Login failed'}
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
            const sb = getSupabaseBrowser()
            const meta: Record<string, string> = {role, full_name: fullName ?? ''}
            if (role === 'teacher' && schoolIdForTeacher) {
                meta.school_id = schoolIdForTeacher.trim()
            }
            const {data, error} = await sb.auth.signUp({
                email,
                password,
                options: {
                    data: meta,
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
