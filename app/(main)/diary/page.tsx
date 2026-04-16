'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, ChevronLeft, ChevronRight, Cloud, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useDiaries, useDeleteDiary, type DiaryListItem, type DiaryListParams } from '@/hooks/useDiary'
import { useDebounce } from '@/hooks/useDebounce'
import { useWeather } from '@/hooks/useWeather'

const SITE_TYPES = ['전체', '백패킹', '섬/바다', '사설 캠핑장', '지자체 캠핑장', '국립 캠핑장', '휴양림', '기타']
const SORT_OPTIONS = [
  { value: 'latest', label: '최신 순' },
  { value: 'oldest', label: '오래된 순' },
  { value: 'name', label: '가나다 순' },
] as const

const ITEMS_PER_PAGE = 9

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start)
  const fmt = (d: Date) =>
    `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  if (!end) return fmt(s)
  const e = new Date(end)
  return `${fmt(s)} - ${String(e.getMonth() + 1).padStart(2, '0')}.${String(e.getDate()).padStart(2, '0')}`
}

function DiaryCard({ diary, onClick }: { diary: DiaryListItem; onClick: () => void }) {
  const firstPhoto = diary.photos?.[0]?.url
  const trip = diary.trip
  const dateStr = trip ? formatDateRange(trip.start_date, trip.end_date) : ''
  const sortedSites = [...(trip?.trip_sites ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const primarySite = sortedSites[0]?.site
  const deleteDiary = useDeleteDiary()

  const { data: weather } = useWeather(
    primarySite?.lat ?? null,
    primarySite?.lng ?? null,
    trip?.start_date ?? null
  )

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('이 다이어리를 삭제하시겠습니까?')) return
    deleteDiary.mutate(diary.id)
  }

  return (
    <div
      onClick={onClick}
      className="relative bg-card rounded-xl border overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
    >
      {/* 삭제 버튼 */}
      <button
        onClick={handleDelete}
        disabled={deleteDiary.isPending}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* 사진 영역 */}
      <div className="relative h-40 bg-muted overflow-hidden">
        {firstPhoto ? (
          <img
            src={firstPhoto}
            alt={trip?.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Cloud className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        {/* 날짜 오버레이 */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent px-3 py-2">
          <p className="text-white text-xs font-medium">{dateStr}</p>
        </div>
      </div>

      {/* 카드 본문 */}
      <div className="px-4 py-3">
        <h3 className="font-bold text-base mb-2 truncate">{trip?.title}</h3>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0">
            {primarySite && (
              <>
                <span className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0">
                  {primarySite.site_type}
                </span>
                <span className="truncate">{primarySite.name}</span>
              </>
            )}
          </div>
          {weather && (
            <span className="shrink-0">
              {weather.description} {weather.temp_min}°C - {weather.temp_max}°C
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function DiaryCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <Skeleton className="h-40 w-full" />
      <div className="px-4 py-3 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null

  const getPages = () => {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>

      {getPages().map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">...</span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'default' : 'ghost'}
            size="sm"
            className="w-9"
            onClick={() => onPage(p as number)}
          >
            {p}
          </Button>
        )
      )}

      <Button
        variant="ghost"
        size="sm"
        className="gap-1"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function DiaryPage() {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState('')
  const [siteType, setSiteType] = useState('')
  const [sort, setSort] = useState<DiaryListParams['sort']>('latest')
  const [page, setPage] = useState(1)

  const search = useDebounce(searchInput, 300)

  const { data, isLoading } = useDiaries({
    search,
    site_type: siteType,
    sort,
    page,
    limit: ITEMS_PER_PAGE,
  })

  const diaries = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  function handleParamChange(updater: () => void) {
    updater()
    setPage(1)
  }

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? '최신 순'

  return (
    <div>
      {/* 검색 + 필터 바 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Diary 검색"
            value={searchInput}
            onChange={(e) => handleParamChange(() => setSearchInput(e.target.value))}
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 h-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
            구분
            {siteType ? ` · ${siteType}` : ''}
            <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SITE_TYPES.map((type) => (
              <DropdownMenuItem
                key={type}
                onClick={() => handleParamChange(() => setSiteType(type === '전체' ? '' : type))}
                className={siteType === (type === '전체' ? '' : type) ? 'font-semibold' : ''}
              >
                {type}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 h-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
            {sortLabel}
            <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleParamChange(() => setSort(option.value))}
                className={sort === option.value ? 'font-semibold' : ''}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 카드 그리드 */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <DiaryCardSkeleton key={i} />
          ))}
        </div>
      ) : diaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
          <Cloud className="h-12 w-12 opacity-30" />
          <p className="text-sm">
            {searchInput || siteType ? '검색 결과가 없습니다' : '완료된 캠핑이 없습니다'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {diaries.map((diary) => (
            <DiaryCard
              key={diary.id}
              diary={diary}
              onClick={() => router.push(`/diary/${diary.id}`)}
            />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  )
}
