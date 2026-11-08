'use client'

/**
 * Isolated sidebar for the Admin dashboard.
 *
 * Intentionally does NOT link to /dashboard, /domains, /tests, /results,
 * /teacher/* or any student/teacher route. Switching interface is only
 * possible by logging out — enforced by the auth guard in `layout.tsx`.
 */

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  Building2,
  GitCompare,
  GraduationCap,
  Gauge,
  LineChart,
  LogOut,
  Menu,
  Pencil,
  Upload,
  Shield,
  User,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/components/ui/use-mobile'
import { useAuth } from '@/lib/auth-context'

const superAdminNav = [
  {
    icon: <Building2 className="w-5 h-5" />,
    label: 'Écoles',
    href: '/admin/schools',
  },
  {
    icon: <GraduationCap className="w-5 h-5" />,
    label: 'Enseignants',
    href: '/admin/teachers',
  },
  {
    icon: <UserCog className="w-5 h-5" />,
    label: 'Administrateurs',
    href: '/admin/admins',
  },
]

const adminNav = [
  { icon: <User className="w-5 h-5" />,      label: 'Résultats individuels',     href: '/admin/individual' },
  { icon: <Users className="w-5 h-5" />,     label: 'Résultats agrégés',          href: '/admin/aggregated' },
  { icon: <GitCompare className="w-5 h-5" />,label: 'Comparaison & visualisation',href: '/admin/comparison' },
  { icon: <Gauge className="w-5 h-5" />,     label: 'Indicateurs de performance', href: '/admin/indicators' },
  { icon: <Upload className="w-5 h-5" />,    label: 'Import résultats externes', href: '/admin/imports' },
  { icon: <LineChart className="w-5 h-5" />, label: 'Modèles statistiques',       href: '/admin/sem' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Administration de la recherche', href: '/admin/research' },
  { icon: <Pencil className="w-5 h-5" />,    label: 'Manual Correction',             href: '/admin/manual-correction' },
]

export function AdminSidebar({ userName = 'Admin' }: { userName?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const navItems = user?.role === 'super_admin' ? [...superAdminNav, ...adminNav] : adminNav

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <>
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-background border border-border shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {isMobile && isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 w-64 h-screen bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col z-50 transition-transform duration-200',
          isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'
        )}
      >
        <div className="px-6 py-6 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Admin</h1>
              <p className="text-xs text-slate-400">Recherche doctorale</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-800 px-4 py-4 flex-shrink-0">
          <div className="mb-3 px-2">
            <p className="text-xs text-slate-400 mb-0.5">Connecté en tant que</p>
            <p className="font-medium text-sm truncate">{userName}</p>
            <p className="text-xs text-slate-400">
              {user?.role === 'super_admin' ? 'Super administrateur' : 'Administrateur'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 rounded-lg transition-colors min-h-[44px]"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}
