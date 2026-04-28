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
  Tent,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentTrip } from '@/hooks/useTrips'

// ── 색상 상수 ───────────────────────────────────────────────────
const INK       = '#151513'
const PAPER2    = '#ece4d2'
const STAMP     = '#b54a2b'
const MUTED     = '#8a7f77'
const DIVIDER   = '#2e2925'
const ACTIVE_BG = 'rgba(255,255,255,0.07)'
const BADGE_BG  = 'rgba(181,74,43,0.16)'
const BADGE_BD  = 'rgba(181,74,43,0.32)'

function calcDDay(startDate: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(startDate); target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'D-Day'
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

// ── 네비게이션 그룹 정의 ─────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/',      label: 'Home',  icon: Home },
  { href: '/gear',  label: 'Gear',  icon: Backpack },
  { href: '/site',  label: 'Site',  icon: MapPin },
  { href: '/eat',   label: 'Eat',   icon: UtensilsCrossed },
  { href: '/diary', label: 'Diary', icon: BookOpen },
]

const BOTTOM_ITEMS = [{ href: '/settings', label: 'Settings', icon: Settings }]

export function Sidebar() {
  const pathname = usePathname()
  const { data: trip } = useCurrentTrip()
  const dday = trip ? calcDDay(trip.start_date) : null

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
    const showBadge = href === '/' && dday

    return (
      <Link
        href={href}
        style={{
          backgroundColor: isActive ? ACTIVE_BG : undefined,
          color: isActive ? '#ffffff' : PAPER2,
        }}
        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-90"
      >
        <Icon
          size={16}
          style={{ color: isActive ? STAMP : MUTED }}
        />
        <span className="flex-1">{label}</span>
        {showBadge && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{
              color: STAMP,
              backgroundColor: BADGE_BG,
              border: `1px solid ${BADGE_BD}`,
            }}
          >
            {dday}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0"
      style={{ backgroundColor: INK }}
    >
      {/* 브랜드 마크 */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{
            backgroundColor: STAMP,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        >
          <Tent size={16} color="#fff" />
        </div>
        <span className="font-bold text-base tracking-tight" style={{ color: PAPER2 }}>
          Pack &amp; Go!
        </span>
      </div>

      {/* 구분선 */}
      <div className="mx-4 mb-3" style={{ height: 1, backgroundColor: DIVIDER }} />

      {/* 네비게이션 */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* 하단 구분선 + 설정 */}
      <div className="mx-4 mt-2" style={{ height: 1, backgroundColor: DIVIDER }} />
      <div className="px-3 py-3">
        {BOTTOM_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </div>
    </aside>
  )
}

export const navItems = NAV_ITEMS
