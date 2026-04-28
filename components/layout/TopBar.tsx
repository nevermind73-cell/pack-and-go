'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { navItems } from './Sidebar'
import { useCurrentTrip } from '@/hooks/useTrips'
import { Tent } from 'lucide-react'
import { cn } from '@/lib/utils'

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

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/gear': 'Gear',
  '/site': 'Site',
  '/eat': 'Eat',
  '/diary': 'Diary',
  '/settings': 'Settings',
}

interface TopBarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function TopBar({ user }: TopBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { data: trip } = useCurrentTrip()
  const dday = trip ? calcDDay(trip.start_date) : null

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }
  const title =
    Object.entries(pageTitles).find(([path]) =>
      path === '/' ? pathname === '/' : pathname.startsWith(path)
    )?.[1] ?? 'Pack & Go!'

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b bg-background">
      {/* 모바일 햄버거 메뉴 */}
      <div className="flex items-center gap-3">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'md:hidden')}
          >
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-0 !bg-[#151513] !border-[#2e2925] !text-[#ece4d2]">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {/* 브랜드 마크 */}
            <div className="flex items-center gap-2.5 px-4 py-5">
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: STAMP, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
              >
                <Tent size={16} color="#fff" />
              </div>
              <span className="font-bold text-base tracking-tight" style={{ color: PAPER2 }}>
                Pack &amp; Go!
              </span>
            </div>
            {/* 구분선 */}
            <div className="mx-4 mb-3" style={{ height: 1, backgroundColor: DIVIDER }} />
            <nav className="flex flex-col gap-0.5 px-3">
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
                const showBadge = href === '/' && dday
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setSheetOpen(false)}
                    style={{
                      backgroundColor: isActive ? ACTIVE_BG : undefined,
                      color: isActive ? '#ffffff' : PAPER2,
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <Icon size={16} style={{ color: isActive ? STAMP : MUTED }} />
                    <span className="flex-1">{label}</span>
                    {showBadge && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ color: STAMP, backgroundColor: BADGE_BG, border: `1px solid ${BADGE_BD}` }}
                      >
                        {dday}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>

        <h1 className="font-semibold text-base">{title}</h1>
      </div>

      {/* 유저 아바타 + 드롭다운 */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full')}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ''} />
            <AvatarFallback>
              {user.name?.[0]?.toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            onClick={handleSignOut}
          >
            <LogOut size={14} className="mr-2" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
