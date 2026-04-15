'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, GripVertical, Pencil, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useSites, useReorderSites, useToggleFavoriteSite, type Site, type SiteType } from '@/hooks/useSites'
import { SiteFormDialog } from './SiteFormDialog'
import { SiteDetailDialog } from './SiteDetailDialog'

// ── Badge 색상 매핑 ───────────────────────────────────────
const SITE_TYPE_CLASS: Record<SiteType, string> = {
  '백패킹':     'bg-slate-800 text-slate-50 hover:bg-slate-800',
  '휴양림':     'bg-emerald-600 text-white hover:bg-emerald-600',
  '사설 캠핑장': 'bg-orange-500 text-white hover:bg-orange-500',
  '국립 캠핑장': 'bg-blue-600 text-white hover:bg-blue-600',
  '지자체 캠핑장': 'bg-violet-600 text-white hover:bg-violet-600',
  '섬/바다':      'bg-cyan-500 text-white hover:bg-cyan-500',
}

// ── 정렬 가능한 행 ─────────────────────────────────────────
function SortableSiteRow({
  site,
  onDetail,
  onEdit,
  onToggleFavorite,
}: {
  site: Site
  onDetail: (site: Site) => void
  onEdit: (site: Site) => void
  onToggleFavorite: (site: Site) => void
}) {
  const [hovered, setHovered] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: site.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-b last:border-0 text-sm cursor-pointer',
        isDragging ? 'opacity-50 bg-muted' : 'hover:bg-muted/40'
      )}
      onClick={() => onDetail(site)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 드래그 핸들 */}
      <td className="w-6 pl-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground"
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>

      {/* 구분 */}
      <td className="py-2.5 px-3 w-28">
        <Badge
          className={cn(
            'text-xs font-medium rounded-sm px-1.5 py-0.5',
            SITE_TYPE_CLASS[site.site_type] ?? 'bg-gray-500 text-white'
          )}
        >
          {site.site_type}
        </Badge>
      </td>

      {/* 이름 */}
      <td className="py-2.5 px-3 font-medium whitespace-nowrap">{site.name}</td>

      {/* 주소 */}
      <td className="py-2.5 px-3 text-muted-foreground max-w-[200px] truncate">
        {site.address || <span className="text-muted-foreground/50">—</span>}
      </td>

      {/* 방문 횟수 */}
      <td className="py-2.5 px-3 text-center whitespace-nowrap">
        {site.visit_count > 0 ? `${site.visit_count}회` : <span className="text-muted-foreground/50">—</span>}
      </td>

      {/* 주차 */}
      <td className="py-2.5 px-3 text-muted-foreground max-w-[160px] truncate">
        {site.parking || <span className="text-muted-foreground/50">—</span>}
      </td>

      {/* 거리 */}
      <td className="py-2.5 px-3 text-center whitespace-nowrap">
        {site.distance_km != null
          ? `${site.distance_km}km`
          : <span className="text-muted-foreground/50">—</span>}
      </td>

      {/* 예약 */}
      <td className="py-2.5 px-3 text-muted-foreground max-w-[140px] truncate">
        {site.reservation || <span className="text-muted-foreground/50">—</span>}
      </td>

      {/* 가격 */}
      <td className="py-2.5 px-3 text-muted-foreground max-w-[120px] truncate">
        {site.price || <span className="text-muted-foreground/50">—</span>}
      </td>

      {/* 즐겨찾기 + 수정 버튼 (hover 시 노출) */}
      <td className="py-2.5 pr-3 w-20 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 transition-opacity',
              site.is_favorite ? 'opacity-100' : hovered ? 'opacity-100' : 'opacity-0'
            )}
            onClick={() => onToggleFavorite(site)}
          >
            <Star
              className={cn(
                'h-3.5 w-3.5 transition-colors',
                site.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 transition-opacity',
              hovered ? 'opacity-100' : 'opacity-0'
            )}
            onClick={() => onEdit(site)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── 지역 섹션 (아코디언 + DnD) ─────────────────────────────
function RegionSection({
  region,
  sites,
  onDetail,
  onEdit,
  onToggleFavorite,
  onReorder,
}: {
  region: string
  sites: Site[]
  onDetail: (site: Site) => void
  onEdit: (site: Site) => void
  onToggleFavorite: (site: Site) => void
  onReorder: (reordered: Site[]) => void
}) {
  const [open, setOpen] = useState(true)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sites.findIndex((s) => s.id === active.id)
    const newIdx = sites.findIndex((s) => s.id === over.id)
    onReorder(arrayMove(sites, oldIdx, newIdx))
  }

  return (
    <div className="border rounded-md overflow-hidden mb-2">
      {/* 아코디언 헤더 */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/60 hover:bg-muted/80 transition-colors text-sm font-medium"
      >
        <span>{region}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            !open && '-rotate-90'
          )}
        />
      </button>

      {/* 테이블 */}
      {open && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sites.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <table className="w-full">
              <colgroup>
                <col className="w-6" />
                <col className="w-28" />
                <col />
                <col className="w-[200px]" />
                <col className="w-16" />
                <col className="w-[160px]" />
                <col className="w-16" />
                <col className="w-[140px]" />
                <col className="w-[120px]" />
                <col className="w-10" />
              </colgroup>
              <tbody>
                {sites.map((site) => (
                  <SortableSiteRow key={site.id} site={site} onDetail={onDetail} onEdit={onEdit} onToggleFavorite={onToggleFavorite} />
                ))}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

// ── 메인 SiteList ─────────────────────────────────────────
interface SiteListProps {
  searchQuery: string
  filterMode: 'all' | 'favorite'
  onOpenAdd: () => void
}

export function SiteList({ searchQuery, filterMode, onOpenAdd }: SiteListProps) {
  const { data: siteList, isLoading } = useSites()
  const reorderSites = useReorderSites()
  const toggleFavorite = useToggleFavoriteSite()
  const [detailTarget, setDetailTarget] = useState<Site | null>(null)
  const [editTarget, setEditTarget] = useState<Site | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleDetail(site: Site) {
    setDetailTarget(site)
  }

  function handleEdit(site: Site) {
    setEditTarget(site)
    setDialogOpen(true)
  }

  function handleToggleFavorite(site: Site) {
    toggleFavorite.mutate({ id: site.id, is_favorite: !site.is_favorite })
  }

  // 검색 + 즐겨찾기 필터링
  const filtered = useMemo(() => {
    if (!Array.isArray(siteList)) return []
    let list = siteList
    if (filterMode === 'favorite') list = list.filter((s) => s.is_favorite)
    const q = searchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q) ||
        (s.address ?? '').toLowerCase().includes(q)
    )
  }, [siteList, searchQuery, filterMode])

  // 지역별 그룹핑
  const grouped = useMemo(() => {
    const map = new Map<string, Site[]>()
    for (const site of filtered) {
      const list = map.get(site.region) ?? []
      list.push(site)
      map.set(site.region, list)
    }
    return map
  }, [filtered])

  async function handleReorder(region: string, reordered: Site[]) {
    // 낙관적 UI: TanStack Query cache를 직접 수정하지 않고 API 호출 후 invalidate
    const updates = reordered.map((site, idx) => ({ id: site.id, sort_order: idx }))
    await reorderSites.mutateAsync(updates, {
      onError: () => toast.error('순서 변경에 실패했습니다.'),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (!Array.isArray(siteList) || siteList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <p className="text-sm">등록된 캠핑장이 없습니다.</p>
        <p className="text-xs mt-1">
          <button
            onClick={onOpenAdd}
            className="underline underline-offset-2 hover:text-foreground"
          >
            새 캠핑장을 추가
          </button>
          해보세요!
        </p>
      </div>
    )
  }

  if (grouped.size === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        검색 결과가 없습니다.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-0">
        {Array.from(grouped.entries()).map(([region, sites]) => (
          <RegionSection
            key={region}
            region={region}
            sites={sites}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onToggleFavorite={handleToggleFavorite}
            onReorder={(reordered) => handleReorder(region, reordered)}
          />
        ))}
      </div>

      <SiteDetailDialog
        site={detailTarget}
        onOpenChange={(open) => { if (!open) setDetailTarget(null) }}
      />

      <SiteFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditTarget(undefined)
        }}
        site={editTarget}
      />
    </>
  )
}
