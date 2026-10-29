'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth-context'
import { isAdminAreaRole } from '@/lib/auth-types'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { HeroAnimatedBackdrop } from '@/components/landing/hero-animated-backdrop'
import { Brain, Lock, Loader2, Sparkles, Mail, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { login } = useAuth()
  const accessRef = useRef<HTMLDivElement>(null)

  const goToSignIn = useCallback(() => {
    accessRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    window.setTimeout(() => {
      document.getElementById('landing-email')?.focus()
    }, 380)
  }, [])

  const goToApp = useCallback(
    (role?: Parameters<typeof isAdminAreaRole>[0] | 'teacher' | 'student') => {
      const next =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('redirect')
          : null
      const safeNext =
        next && next.startsWith('/') && !next.startsWith('//') ? next : null
      if (safeNext) {
        router.push(safeNext)
        return
      }
      if (isAdminAreaRole(role)) router.push('/admin')
      else if (role === 'teacher') router.push('/teacher/dashboard')
      else router.push('/dashboard')
    },
    [router],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    const res = await login(username, password)
    setIsLoading(false)
    if (!res.ok || !res.session) {
      setError(res.error ?? t('auth.loginFailed'))
      return
    }
    goToApp(res.session.role)
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#030712] text-zinc-100">
      <HeroAnimatedBackdrop />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <Link
            href="/"
            className="group flex min-h-0 items-center gap-3 text-inherit no-underline"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_24px_-6px_rgba(56,189,248,0.4)] transition group-hover:border-sky-400/30">
              <Brain className="h-5 w-5 text-sky-300" aria-hidden />
            </span>
            <span className="flex flex-col">
              <span className="text-base font-semibold tracking-tight [font-family:var(--font-display)]">
                CogniTest
              </span>
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 sm:block">
                {t('landing.subtitle')}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <LocaleSwitcher
              trigger="button"
              className="hidden h-9 border-white/20 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white sm:inline-flex"
            />
            <LocaleSwitcher
              trigger="icon"
              className="border-0 text-zinc-400 hover:bg-white/10 hover:text-white sm:hidden"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={goToSignIn}
              className="hidden h-9 border-white/25 bg-transparent text-zinc-200 hover:bg-white/10 hover:text-white md:inline-flex"
            >
              {t('landing.navAccess')}
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center px-4 pb-10 pt-2 sm:px-8 sm:pb-12 sm:pt-4">
          <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,420px)] lg:items-center lg:gap-16 xl:gap-20">
            <div className="flex max-w-xl flex-col lg:max-w-none">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-sky-200/90 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-200/90" aria-hidden />
                {t('landing.badge')}
              </div>

              <h1 className="mt-7 text-balance text-4xl font-semibold leading-[1.08] tracking-tight [font-family:var(--font-display)] sm:text-5xl lg:text-[3.25rem] xl:text-[3.5rem]">
                <span className="bg-gradient-to-br from-white via-white to-cyan-200/85 bg-clip-text text-transparent">
                  {t('landing.heroTitle')}
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg">
                {t('landing.heroSubtitle')}
              </p>

              <p className="mt-4 text-sm font-medium tracking-wide text-zinc-500">
                {t('landing.heroAudienceLine')}
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  size="lg"
                  onClick={goToSignIn}
                  className="h-12 min-h-12 rounded-full bg-white px-8 text-base font-semibold text-slate-950 shadow-[0_0_48px_-12px_rgba(56,189,248,0.55)] transition hover:bg-zinc-100 hover:shadow-[0_0_56px_-8px_rgba(34,211,238,0.45)]"
                >
                  {t('landing.navAccess')}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 min-h-12 rounded-full border-white/25 bg-white/5 text-white hover:bg-white/10"
                >
                  <Link href="/register">{t('landing.register')}</Link>
                </Button>
              </div>
            </div>

            <div ref={accessRef} id="access" className="relative w-full justify-self-end lg:max-w-[420px]">
              <div
                className="absolute -inset-px rounded-[1.75rem] bg-gradient-to-br from-sky-400/25 via-white/10 to-teal-400/20 opacity-80 blur-sm"
                aria-hidden
              />
              <div className="relative rounded-[1.75rem] border border-white/15 bg-white/[0.07] p-8 shadow-[0_28px_90px_-24px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
                <div className="mb-6 space-y-1">
                  <h2 className="text-lg font-semibold text-white [font-family:var(--font-display)]">
                    {t('landing.signInTitle')}
                  </h2>
                  <p className="text-sm leading-relaxed text-zinc-400">{t('landing.signInHint')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-300" htmlFor="landing-email">
                      {t('landing.username')}
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <Input
                        id="landing-email"
                        type="email"
                        inputMode="email"
                        placeholder={t('landing.usernamePlaceholder')}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-11 border-white/15 bg-white/95 pl-10 text-slate-900 placeholder:text-slate-400"
                        required
                        autoComplete="email"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-300" htmlFor="landing-password">
                      {t('landing.password')}
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <Input
                        id="landing-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 border-white/15 bg-white/95 pl-10 text-slate-900 placeholder:text-slate-400"
                        required
                        autoComplete="current-password"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {error ? <p className="text-sm text-red-300">{error}</p> : null}

                  <Button
                    type="submit"
                    className="mt-2 h-11 w-full rounded-xl bg-sky-500 font-semibold text-white shadow-[0_0_32px_-8px_rgba(14,165,233,0.7)] hover:bg-sky-400"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('landing.loggingIn')}
                      </>
                    ) : (
                      t('landing.continue')
                    )}
                  </Button>

                  <p className="pt-1 text-center text-sm text-zinc-400">
                    {t('landing.noAccount')}{' '}
                    <Link
                      href="/register"
                      className="inline-flex min-h-0 items-center font-semibold text-sky-300 underline-offset-4 hover:text-sky-200 hover:underline"
                    >
                      {t('landing.register')}
                    </Link>
                  </p>

                  <p className="rounded-lg border border-dashed border-white/15 bg-white/[0.04] px-3 py-2.5 text-center text-[11px] leading-relaxed text-zinc-500">
                    {t('landing.demoHint')}
                  </p>
                </form>
              </div>
            </div>
          </div>
        </main>

        <footer className="relative shrink-0 border-t border-white/[0.08] px-4 py-6 sm:px-8">
          <p className="mx-auto max-w-3xl text-center text-[11px] leading-relaxed text-zinc-600">
            {t('landing.footerBlurb')}
          </p>
        </footer>
      </div>
    </div>
  )
}
