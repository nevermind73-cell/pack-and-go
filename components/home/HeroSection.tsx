'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MapPin, Navigation, ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentTrip, useUpdateTrip, useDeleteTrip, type Trip } from '@/hooks/useTrips'
import { useWeatherForecast } from '@/hooks/useWeatherForecast'
import { useTripCheckStore } from '@/stores/tripStore'
import { usePackStore } from '@/stores/packStore'
import { useShoppingStore } from '@/stores/shoppingStore'
import { NewTripDialog } from './NewTripDialog'
import { EditTripDialog } from './EditTripDialog'

const CAMPING_PHOTOS = [
  'photo-1504280390367-361c6d9f38f4',
  'photo-1527721023685-b7a6e2af95aa',
  'photo-1563299796-17596ed6b017',
  'photo-1508739773434-c26b3d09e071',
  'photo-1519681393784-d120267933ba',
]

function calcDDay(startDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(startDate)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'D-Day!'
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function naverMapUrl(name: string): string {
  return `https://map.naver.com/v5/search/${encodeURIComponent(name)}`
}

interface SiteCardProps {
  site: Trip['trip_sites'][number]
  tripStartDate: string
  onClick: () => void
}

function SiteCard({ site, onClick }: SiteCardProps) {
  const startFmt = formatDate(site.start_date)
  const endFmt = site.end_date ? formatDate(site.end_date) : null

  return (
    <div
      onClick={onClick}
      className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 flex-1 min-w-[14rem] max-w-[20rem] cursor-pointer hover:bg-white/20 transition-colors flex flex-col justify-center"
    >
      <p className="text-white/70 text-xs font-mono mb-0.5">
        {startFmt}
        {endFmt && ` – ${endFmt}`}
      </p>
      <h3 className="text-white font-bold text-lg leading-tight mb-3">{site.site.name}</h3>

      <div className="flex flex-col gap-1.5 text-xs font-mono text-white/80">
        <a
          href={naverMapUrl(site.site.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-white transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{site.site.address ?? site.site.region ?? '지도 보기'}</span>
        </a>
        {site.site.distance_km && (
          <div className="flex items-center gap-1.5">
            <Navigation className="h-3 w-3 shrink-0" />
            <span>{site.site.distance_km} km</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 일별 날씨 스트립 ────────────────────────────────────────────

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

function getDatesInRange(start: string, end: string | null): string[] {
  const dates: string[] = []
  const cur = new Date(start)
  const last = end ? new Date(end) : new Date(start)
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function WeatherStrip({ trip }: { trip: Trip }) {
  const sortedSites = [...trip.trip_sites].sort((a, b) => a.sort_order - b.sort_order)
  const firstSite = sortedSites[0]
  const lat = firstSite?.site?.lat ?? null
  const lng = firstSite?.site?.lng ?? null

  const { data: forecast = [] } = useWeatherForecast(lat, lng)

  const campingDates = getDatesInRange(trip.start_date, trip.end_date)
  const forecastMap = new Map(forecast.map((f) => [f.date, f]))

  if (!lat || !lng) return null

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 flex gap-3 overflow-x-auto items-center w-full md:w-auto self-stretch">
      {campingDates.map((date) => {
        const weather = forecastMap.get(date)
        const d = new Date(date)
        const dayLabel = DAY_KO[d.getDay()]
        const dateLabel = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`

        return (
          <div
            key={date}
            className="flex flex-col items-center gap-0.5 min-w-[56px]"
          >
            <span className="text-white/60 text-xs">{dayLabel}</span>
            <span className="text-white text-xs font-medium">{dateLabel}</span>
            {weather ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                  alt={weather.description}
                  className="w-10 h-10"
                />
                <span className="text-white text-xs font-semibold">{weather.temp_max}°</span>
                <span className="text-white/60 text-xs">{weather.temp_min}°</span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 flex items-center justify-center text-white/30 text-lg">—</div>
                <span className="text-white/40 text-xs">-°</span>
                <span className="text-white/40 text-xs">-°</span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TripHero({ trip, onNewTrip, onEdit }: { trip: Trip; onNewTrip: () => void; onEdit: () => void }) {
  const qc = useQueryClient()
  const updateTrip = useUpdateTrip()
  const deleteTrip = useDeleteTrip()
  const { clearGearChecks, clearIngredientChecks } = useTripCheckStore()
  const { clear: clearPack, clearCommitted: clearPackCommitted } = usePackStore()
  const { clear: clearShopping, clearCommitted: clearShoppingCommitted } = useShoppingStore()

  function clearAllState() {
    qc.setQueryData(['current-trip'], null)
    clearGearChecks()
    clearIngredientChecks()
    clearPack()
    clearPackCommitted()
    clearShopping()
    clearShoppingCommitted()
  }

  async function handleComplete() {
    try {
      await updateTrip.mutateAsync({ id: trip.id, status: 'done' })
      clearAllState()
      toast.success('캠핑 완료! 다이어리에 기록되었습니다.')
    } catch {
      toast.error('완료 처리 실패')
    }
  }

  async function handleCancel() {
    if (!confirm('캠핑을 취소하시겠습니까? 등록된 데이터가 삭제됩니다.')) return
    try {
      await deleteTrip.mutateAsync(trip.id)
      clearAllState()
      toast.success('캠핑이 취소되었습니다.')
    } catch {
      toast.error('취소 처리 실패')
    }
  }

  const dday = calcDDay(trip.start_date)

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 상단: D-day + 제목 + 버튼 */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-white font-display text-[56px] leading-none block">{dday}</span>
          <span className="text-white/80 font-semibold text-base mt-0.5 block">{trip.title}</span>
        </div>

        {/* 버튼 */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 bg-transparent text-white border border-white/40 hover:bg-white/10 hover:text-white text-xs"
            onClick={onNewTrip}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            새 캠핑 등록
          </Button>

          <div className="flex items-center rounded-md overflow-hidden border border-foreground/80">
            <button
              onClick={handleComplete}
              disabled={updateTrip.isPending}
              className="h-8 px-3 text-xs font-medium bg-foreground/95 text-background hover:bg-foreground transition-colors disabled:opacity-50"
            >
              완료
            </button>
            <div className="w-px h-4 bg-background/30" />
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={updateTrip.isPending}
                className="h-8 px-1.5 bg-foreground/95 text-background hover:bg-foreground transition-colors disabled:opacity-50 flex items-center"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleCancel}
                >
                  ❌ 취소 — 데이터 초기화
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 중앙: 캠핑장 카드 + 날씨 */}
      {trip.trip_sites.length > 0 && (
        <div className="flex-1 flex flex-col md:flex-row items-stretch justify-center gap-3">
          <div className="flex gap-3 flex-wrap justify-center w-full md:w-auto">
            {[...trip.trip_sites]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((ts) => (
                <SiteCard key={ts.id} site={ts} tripStartDate={trip.start_date} onClick={onEdit} />
              ))}
          </div>
          <WeatherStrip trip={trip} />
        </div>
      )}
    </div>
  )
}

function EmptyHero({ onNewTrip }: { onNewTrip: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <p className="text-white/80 text-lg font-medium">등록된 캠핑이 없습니다</p>
      <Button
        onClick={onNewTrip}
        className="bg-white text-foreground hover:bg-white/90 font-semibold"
      >
        <Plus className="h-4 w-4 mr-2" />
        새 캠핑 등록
      </Button>
    </div>
  )
}

export function HeroSection() {
  const { data: trip, isLoading } = useCurrentTrip()
  const [bgPhoto, setBgPhoto] = useState('')
  const [newTripOpen, setNewTripOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    const id = CAMPING_PHOTOS[Math.floor(Math.random() * CAMPING_PHOTOS.length)]
    setBgPhoto(`https://images.unsplash.com/${id}?w=1920&q=80&auto=format&fit=crop`)
  }, [])

  return (
    <>
      <div
        className="relative -mx-6 -mt-6 mb-6 px-6 pt-5 pb-6 bg-cover bg-center min-h-[240px] flex flex-col"
        style={{ backgroundImage: bgPhoto ? `url(${bgPhoto})` : undefined }}
      >
        {/* 잉크 그라디언트 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/65 via-foreground/45 to-foreground/20" />

        <div className="relative z-10 flex-1 flex flex-col">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-32 bg-white/20" />
              <Skeleton className="h-5 w-48 bg-white/20" />
            </div>
          ) : trip ? (
            <TripHero trip={trip} onNewTrip={() => setNewTripOpen(true)} onEdit={() => setEditOpen(true)} />
          ) : (
            <EmptyHero onNewTrip={() => setNewTripOpen(true)} />
          )}
        </div>
      </div>

      <NewTripDialog open={newTripOpen} onOpenChange={setNewTripOpen} />
      {trip && (
        <EditTripDialog trip={trip} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </>
  )
}
