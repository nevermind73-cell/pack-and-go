'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MapPin, Navigation, ChevronDown, Plus, Thermometer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentTrip, useUpdateTrip, useDeleteTrip, type Trip } from '@/hooks/useTrips'
import { useWeather } from '@/hooks/useWeather'
import { useTripCheckStore } from '@/stores/tripStore'
import { usePackStore } from '@/stores/packStore'
import { useShoppingStore } from '@/stores/shoppingStore'
import { NewTripDialog } from './NewTripDialog'
import { EditTripDialog } from './EditTripDialog'

// 캠핑 배경 이미지 (Unsplash CDN)
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

function SiteCard({ site, tripStartDate, onClick }: SiteCardProps) {
  const { data: weather } = useWeather(
    site.site.lat,
    site.site.lng,
    site.start_date ?? tripStartDate
  )

  const startFmt = formatDate(site.start_date)
  const endFmt = site.end_date ? formatDate(site.end_date) : null

  return (
    <div
      onClick={onClick}
      className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 w-fit min-w-80 max-w-[32rem] cursor-pointer hover:bg-white/20 transition-colors">
      <p className="text-white/80 text-2xl font-bold mb-0.5 text-center">
        {startFmt}
        {endFmt && ` ~ ${endFmt}`}
      </p>
      <h3 className="text-white font-bold text-2xl leading-tight mb-3 text-center">{site.site.name}</h3>

      <div className="flex flex-col gap-1.5 text-xs text-white/80">
        {/* 지도 링크 */}
        <a
          href={naverMapUrl(site.site.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{site.site.address ?? site.site.region ?? '지도 보기'}</span>
        </a>

        {/* 거리 */}
        {site.site.distance_km && (
          <div className="flex items-center gap-1.5">
            <Navigation className="h-3 w-3 shrink-0" />
            <span>{site.site.distance_km} km</span>
          </div>
        )}

        {/* 날씨 */}
        {weather && (
          <div className="flex items-center gap-1.5">
            <Thermometer className="h-3 w-3 shrink-0" />
            <span>
              {weather.temp_min}°C ~ {weather.temp_max}°C
            </span>
            {weather.description && (
              <span className="text-white/60">({weather.description})</span>
            )}
            {weather.out_of_range && (
              <span className="text-white/50 text-xs">*근사치</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface HeroSectionProps {
  onNewTrip: () => void
}

function TripHero({ trip, onNewTrip, onEdit }: { trip: Trip; onNewTrip: () => void; onEdit: () => void }) {
  const qc = useQueryClient()
  const updateTrip = useUpdateTrip()
  const deleteTrip = useDeleteTrip()
  const { clearGearChecks, clearIngredientChecks } = useTripCheckStore()
  const { clear: clearPack, clearCommitted: clearPackCommitted } = usePackStore()
  const { clear: clearShopping, clearCommitted: clearShoppingCommitted } = useShoppingStore()

  function clearAllState() {
    // 캐시 즉시 null → PackChecklist/EatChecklist가 빈 화면으로 즉시 전환
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
  const startFmt = formatDate(trip.start_date)
  const endFmt = trip.end_date ? formatDate(trip.end_date) : null

  return (
    <div className="flex flex-col gap-4">
      {/* D-day + 날짜 + 버튼 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="text-white font-bold text-lg">{dday}</span>
            <span className="text-white/80 font-semibold text-lg">{trip.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs"
            onClick={onNewTrip}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            새 캠핑 등록
          </Button>

          {/* 스플릿 버튼: 왼쪽=즉시 완료, 오른쪽=드롭다운(취소) */}
          <div className="flex items-center rounded-md overflow-hidden border border-white/30">
            <button
              onClick={handleComplete}
              disabled={updateTrip.isPending}
              className="h-8 px-3 text-xs font-medium bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              완료
            </button>
            <div className="w-px h-4 bg-white/30" />
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={updateTrip.isPending}
                className="h-8 px-1.5 bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-50 flex items-center"
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

      {/* 캠핑장 카드 목록 */}
      {trip.trip_sites.length > 0 && (
        <div className="flex gap-3 flex-wrap justify-center">
          {[...trip.trip_sites]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((ts) => (
              <SiteCard key={ts.id} site={ts} tripStartDate={trip.start_date} onClick={onEdit} />
            ))}
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
        className="relative -mx-6 -mt-6 mb-6 px-6 py-8 bg-cover bg-center min-h-52"
        style={{ backgroundImage: bgPhoto ? `url(${bgPhoto})` : undefined }}
      >
        {/* 어두운 오버레이 */}
        <div className="absolute inset-0 bg-black/45" />

        <div className="relative z-10">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-32 bg-white/20" />
              <Skeleton className="h-10 w-48 bg-white/20" />
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
