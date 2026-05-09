'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  BarChart3,
  BookOpen,
  Brain,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/components/ui/use-mobile'
import { useAuth } from '@/lib/auth-context'
import type { UserRole } from '@/lib/auth-types'

interface NavItem {
  icon: React.ReactNode
  labelKey: string
  href: string
  role: 'student' | 'teacher' | 'both' | 'admin'
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard className="w-5 h-5" />, labelKey: 'nav.dashboard', href: '/dashboard', role: 'student' },
  { icon: <LayoutDashboard className="w-5 h-5" />, labelKey: 'nav.dashboard', href: '/teacher/dashboard', role: 'teacher' },
  { icon: <Brain className="w-5 h-5" />, labelKey: 'nav.domains', href: '/domains', role: 'student' },
  { icon: <ClipboardList className="w-5 h-5" />, labelKey: 'nav.tests', href: '/tests', role: 'student' },
  { icon: <FileText className="w-5 h-5" />, labelKey: 'nav.results', href: '/results', role: 'student' },
  { icon: <Users className="w-5 h-5" />, labelKey: 'nav.students', href: '/teacher/students', role: 'teacher' },
  { icon: <BarChart3 className="w-5 h-5" />, labelKey: 'nav.analytics', href: '/analytics', role: 'teacher' },
  { icon: <BookOpen className="w-5 h-5" />, labelKey: 'nav.reports', href: '/reports', role: 'teacher' },
]

interface SidebarProps {
  /** When omitted, uses the signed-in user from `useAuth()`. */
  userRole?: UserRole
  /** When omitted, uses `displayName` or email from `useAuth()`. */
  userName?: string
}

export function Sidebar({ userRole: userRoleProp, userName: userNameProp }: SidebarProps) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const { user, logout } = useAuth()

  const rawRole = userRoleProp ?? user?.role ?? 'student'
  /** `super_admin` uses the same student nav entries when this shared sidebar is shown. */
  const userRole: 'student' | 'teacher' | 'admin' =
    rawRole === 'super_admin' ? 'student' : rawRole
  const userName =
    userNameProp ??
    (user?.displayName?.trim() ? user.displayName.trim() : null) ??
    user?.username ??
    t('sidebar.userFallback')
  const [isOpen, setIsOpen] = useState(false)

  const filteredItems = navItems.filter((item) => {
    if (item.role === 'both') return true
    // Admins never use the shared Sidebar — they have a dedicated isolated one.
    if (userRole === 'admin') return false
    return item.role === userRole
  })

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleNavClick = () => {
    if (isMobile) setIsOpen(false)
  }

  return (
    <>
      {/* Hamburger button — mobile only */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-background border border-border shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={isOpen ? t('sidebar.closeMenu') : t('sidebar.openMenu')}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {/* Backdrop overlay — mobile only, when open */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed left-0 top-0 w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-transform duration-200',
          isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg text-sidebar-foreground">CogniTest</h1>
              <p className="text-xs text-muted-foreground truncate">{t('sidebar.tagline')}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                {item.icon}
                <span>{t(item.labelKey)}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Footer — profil via ce bloc uniquement */}
        <div className="border-t border-sidebar-border px-4 py-4 flex-shrink-0">
          <Link
            href="/profile"
            onClick={handleNavClick}
            className="mb-3 block rounded-lg px-2 py-2 -mx-0.5 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            aria-label={t('sidebar.openProfileAria')}
          >
            <p className="text-xs text-muted-foreground mb-0.5">{t('sidebar.connectedAs')}</p>
            <p className="font-medium text-sidebar-foreground text-sm truncate">{userName}</p>
            <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors min-h-[44px]"
          >
            <LogOut className="w-4 h-4" />
            {t('sidebar.logout')}
          </button>
        </div>
      </aside>
    </>
  )
}
