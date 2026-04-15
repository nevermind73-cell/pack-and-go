'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Backpack,
  MapPin,
  UtensilsCrossed,
  BookOpen,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/gear', label: 'Gear', icon: Backpack },
  { href: '/site', label: 'Site', icon: MapPin },
  { href: '/eat', label: 'Eat', icon: UtensilsCrossed },
  { href: '/diary', label: 'Diary', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r bg-background h-screen sticky top-0">
      {/* 로고 */}
      <div className="flex items-center gap-2 px-5 py-5 border-b">
        <span className="text-2xl">⛺</span>
        <span className="font-bold text-lg tracking-tight">Pack &amp; Go!</span>
      </div>

      {/* 네비게이션 */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export { navItems }
