'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Brain, ClipboardList, FileText, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/components/ui/use-mobile'
import type { UserRole } from '@/lib/auth-types'

interface MobileNavItem {
  icon: React.ElementType
  label: string
  href: string
}

const studentNavItems: MobileNavItem[] = [
  { icon: LayoutDashboard, label: 'Accueil', href: '/dashboard' },
  { icon: Brain, label: 'Domaines', href: '/domains' },
  { icon: ClipboardList, label: 'Tests', href: '/tests' },
  { icon: FileText, label: 'Résultats', href: '/results' },
  { icon: User, label: 'Profil', href: '/profile' },
]

interface MobileNavProps {
  userRole: UserRole
}

export function MobileNav({ userRole }: MobileNavProps) {
  const isMobile = useIsMobile()
  const pathname = usePathname()

  // Only show on mobile, only for students (treat super_admin like student here)
  const showStudentBar = userRole === 'student' || userRole === 'super_admin'
  if (!isMobile || !showStudentBar) return null

  return (
    <nav className="mobile-safe-bottom fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex h-16 items-stretch">
      {studentNavItems.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
