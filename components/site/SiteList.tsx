'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, GripVertical, Pencil, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useSites, useToggleFavoriteSite, type Site, type SiteType } from '@/hooks/useSites'
import { SiteFormDialog } from './SiteFormDialog'
import { SiteDetailDialog } from './SiteDetailDialog'

const REGION_PREFIX = 'region__'
const REGION_ORDER_KEY = 'pack-and-go:site-region-order'

// ── 유틸 ─────────────────────────────────────────────────
const SITE_TYPE_CLASS: Record<SiteType, string> = {
  '백패킹':      'bg-slate-800 text-slate-50 hover:bg-slate-800',
  '휴양림':      'bg-emerald-600 text-white hover:bg-emerald-600',
  '사설 캠핑장':  'bg-orange-500 text-white hover:bg-orange-500',
  '국립 캠핑장':  'bg-blue-600 text-white hover:bg-blue-600',
  '지자체 캠핑장': 'bg-violet-600 text-white hover:bg-violet-600',
  '섬/바다':      'bg-cyan-500 text-white hover:bg-cyan-500',
}

function findRegion(siteId: string, map: Map<string, Site[]>): string | null {
  for (const [region, sites] of map) {
    if (sites.some((s) => s.id === siteId)) return region
  }
  return null
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

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'border-b last:border-0 text-sm cursor-pointer',
        isDragging ? 'opacity-40 bg-muted' : 'hover:bg-muted/40'
      )}
      onClick={() => onDetail(site)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="w-6 pl-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="py-2.5 px-3 w-28">
        <Badge className={cn('text-xs font-medium rounded-sm px-1.5 py-0.5', SITE_TYPE_CLASS[site.site_type] ?? 'bg-gray-500 text-white')}>
          {site.site_type}
        </Badge>
      </td>
      <td className="py-2.5 px-3 font-medium whitespace-nowrap">{site.name}</td>
      <td className="py-2.5 px-3 text-muted-foreground max-w-[200px] truncate">
        {site.address || <span className="text-muted-foreground/50">—</span>}
      </td>
      <td className="py-2.5 px-3 text-center whitespace-nowrap">
        {site.visit_count > 0 ? `${site.visit_count}회` : <span className="text-muted-foreground/50">—</span>}
      </td>
      <td className="py-2.5 px-3 text-muted-foreground max-w-[160px] truncate">
        {site.parking || <span className="text-muted-foreground/50">—</span>}
      </td>
      <td className="py-2.5 px-3 text-center whitespace-nowrap">
        {site.distance_km != null ? `${site.distance_km}km` : <span className="text-muted-foreground/50">—</span>}
      </td>
      <td className="py-2.5 px-3 text-muted-foreground max-w-[140px] truncate">
        {site.reservation || <span className="text-muted-foreground/50">—</span>}
      </td>
      <td className="py-2.5 px-3 text-muted-foreground max-w-[120px] truncate">
        {site.price || <span className="text-muted-foreground/50">—</span>}
      </td>
      <td className="py-2.5 pr-3 w-20 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost" size="icon"
            className={cn('h-7 w-7 transition-opacity', site.is_favorite ? 'opacity-100' : hovered ? 'opacity-100' : 'opacity-0')}
            onClick={() => onToggleFavorite(site)}
          >
            <Star className={cn('h-3.5 w-3.5 transition-colors', site.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')} />
          </Button>
          <Button
            variant="ghost" size="icon"
            className={cn('h-7 w-7 transition-opacity', hovered ? 'opacity-100' : 'opacity-0')}
            onClick={() => onEdit(site)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── 지역 섹션 ─────────────────────────────────────────────
function RegionSection({
  region,
  sites,
  isOver,
  onDetail,
  onEdit,
  onToggleFavorite,
}: {
  region: string
  sites: Site[]
  isOver: boolean
  onDetail: (site: Site) => void
  onEdit: (site: Site) => void
  onToggleFavorite: (site: Site) => void
}) {
  const [open, setOpen] = useState(true)

  const {
    attributes: regionAttrs,
    listeners: regionListeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${REGION_PREFIX}${region}` })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'border rounded-md overflow-hidden mb-2 transition-colors',
        isDragging && 'opacity-50 shadow-lg',
        isOver && !isDragging && 'ring-2 ring-primary/40'
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center bg-muted/60 hover:bg-muted/80 transition-colors">
        <button
          {...regionAttrs}
          {...regionListeners}
          className="pl-3 pr-1 py-2.5 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="flex-1 flex items-center justify-between pr-4 py-2.5 text-sm font-medium"
        >
          <span>{region}</span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', !open && '-rotate-90')} />
        </button>
      </div>

      {/* 사이트 테이블 — 항상 SortableContext는 마운트, 행만 조건부 표시 */}
      <SortableContext items={sites.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        {open && (
          <table className="w-full">
            <colgroup>
              <col className="w-6" /><col className="w-28" /><col />
              <col className="w-[200px]" /><col className="w-16" />
              <col className="w-[160px]" /><col className="w-16" />
              <col className="w-[140px]" /><col className="w-[120px]" />
              <col className="w-10" />
            </colgroup>
            <tbody>
              {sites.map((site) => (
                <SortableSiteRow
                  key={site.id}
                  site={site}
                  onDetail={onDetail}
                  onEdit={onEdit}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </tbody>
          </table>
        )}
      </SortableContext>
    </div>
  )
}

// ── 드래그 오버레이용 미니 카드 ────────────────────────────
function SiteRowOverlay({ site }: { site: Site }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-md shadow-xl text-sm opacity-95">
      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
      <Badge className={cn('text-xs rounded-sm px-1.5 py-0.5', SITE_TYPE_CLASS[site.site_type] ?? 'bg-gray-500 text-white')}>
        {site.site_type}
      </Badge>
      <span className="font-medium">{site.name}</span>
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
  const qc = useQueryClient()
  const { data: siteList, isLoading } = useSites()
  const toggleFavorite = useToggleFavoriteSite()
  const [detailTarget, setDetailTarget] = useState<Site | null>(null)
  const [editTarget, setEditTarget] = useState<Site | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overRegion, setOverRegion] = useState<string | null>(null)
  const [localGrouped, setLocalGrouped] = useState<Map<string, Site[]>>(new Map())
  const originalGroupedRef = useRef<Map<string, Site[]>>(new Map())

  const [regionOrder, setRegionOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(REGION_ORDER_KEY) ?? '[]') } catch { return [] }
  })

  // 필터링
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

  // 드래그 중이 아닐 때 서버 데이터와 동기화
  useEffect(() => {
    if (!activeId) setLocalGrouped(new Map(Array.from(grouped.entries()).map(([k, v]) => [k, [...v]])))
  }, [grouped, activeId])

  // 새 지역이 추가됐을 때만 regionOrder 끝에 추가 (로딩 중 빈 grouped로 덮어쓰기 방지)
  useEffect(() => {
    const current = Array.from(grouped.keys())
    if (current.length === 0) return
    setRegionOrder((prev) => {
      const added = current.filter((r) => !prev.includes(r))
      if (added.length === 0) return prev
      const updated = [...prev, ...added]
      localStorage.setItem(REGION_ORDER_KEY, JSON.stringify(updated))
      return updated
    })
  }, [grouped])

  const sortedRegions = useMemo(() => {
    const current = Array.from(localGrouped.keys())
    const ordered = regionOrder.filter((r) => current.includes(r))
    const rest = current.filter((r) => !regionOrder.includes(r))
    return [...ordered, ...rest]
  }, [regionOrder, localGrouped])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const activeSite = activeId && !activeId.startsWith(REGION_PREFIX)
    ? Array.from(localGrouped.values()).flat().find((s) => s.id === activeId) ?? null
    : null

  // ── 핸들러 ──────────────────────────────────────────────
  function handleDragStart({ active }: DragStartEvent) {
    const id = String(active.id)
    setActiveId(id)
    originalGroupedRef.current = new Map(Array.from(grouped.entries()).map(([k, v]) => [k, [...v]]))
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId.startsWith(REGION_PREFIX) || activeId === overId) return

    const fromRegion = findRegion(activeId, localGrouped)
    const toRegion = overId.startsWith(REGION_PREFIX)
      ? overId.slice(REGION_PREFIX.length)
      : findRegion(overId, localGrouped)

    if (!fromRegion || !toRegion) return
    setOverRegion(toRegion)

    setLocalGrouped((prev) => {
      const next = new Map(Array.from(prev.entries()).map(([k, v]) => [k, [...v]]))

      if (fromRegion === toRegion) {
        // 같은 그룹 내 재정렬
        const list = next.get(fromRegion) ?? []
        const oldIdx = list.findIndex((s) => s.id === activeId)
        const newIdx = list.findIndex((s) => s.id === overId)
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          next.set(fromRegion, arrayMove(list, oldIdx, newIdx))
        }
      } else {
        // 그룹 간 이동
        const sourceList = next.get(fromRegion) ?? []
        const targetList = next.get(toRegion) ?? []
        const siteIdx = sourceList.findIndex((s) => s.id === activeId)
        if (siteIdx === -1) return prev

        const [moved] = sourceList.splice(siteIdx, 1)
        const overIdx = targetList.findIndex((s) => s.id === overId)
        targetList.splice(overIdx >= 0 ? overIdx : targetList.length, 0, moved)

        next.set(fromRegion, sourceList)
        next.set(toRegion, targetList)
      }

      return next
    })
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    const activeId = String(active.id)
    setActiveId(null)
    setOverRegion(null)

    if (!over) {
      setLocalGrouped(new Map(Array.from(grouped.entries()).map(([k, v]) => [k, [...v]])))
      return
    }

    const overId = String(over.id)

    // 지역 순서 변경
    if (activeId.startsWith(REGION_PREFIX)) {
      if (!overId.startsWith(REGION_PREFIX)) return
      const a = activeId.slice(REGION_PREFIX.length)
      const b = overId.slice(REGION_PREFIX.length)
      if (a === b) return
      setRegionOrder((prev) => {
        const ai = prev.indexOf(a), bi = prev.indexOf(b)
        if (ai === -1 || bi === -1) return prev
        const updated = arrayMove(prev, ai, bi)
        localStorage.setItem(REGION_ORDER_KEY, JSON.stringify(updated))
        return updated
      })
      return
    }

    // 사이트 이동/재정렬 — localGrouped 기준으로 변경사항 전체 저장
    const patches: Promise<Response>[] = []
    const original = originalGroupedRef.current

    for (const [region, sites] of localGrouped) {
      for (let i = 0; i < sites.length; i++) {
        const site = sites[i]
        const origRegion = findRegion(site.id, original)
        const regionChanged = origRegion !== region
        const origSites = original.get(origRegion ?? '') ?? []
        const orderChanged = origSites.findIndex((s) => s.id === site.id) !== i

        if (regionChanged || orderChanged) {
          const body: Record<string, unknown> = { sort_order: i }
          if (regionChanged) body.region = region
          patches.push(
            fetch(`/api/sites/${site.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
          )
        }
      }
    }

    if (patches.length > 0) {
      try {
        await Promise.all(patches)
        qc.invalidateQueries({ queryKey: ['sites'] })
      } catch {
        toast.error('변경사항 저장에 실패했습니다.')
        setLocalGrouped(new Map(Array.from(grouped.entries()).map(([k, v]) => [k, [...v]])))
      }
    }
  }

  // ── 렌더 ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }

  if (!Array.isArray(siteList) || siteList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <p className="text-sm">등록된 캠핑장이 없습니다.</p>
        <p className="text-xs mt-1">
          <button onClick={onOpenAdd} className="underline underline-offset-2 hover:text-foreground">새 캠핑장을 추가</button>
          해보세요!
        </p>
      </div>
    )
  }

  if (grouped.size === 0) {
    return <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">검색 결과가 없습니다.</div>
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null)
          setOverRegion(null)
          setLocalGrouped(new Map(Array.from(grouped.entries()).map(([k, v]) => [k, [...v]])))
        }}
      >
        <SortableContext items={sortedRegions.map((r) => `${REGION_PREFIX}${r}`)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0">
            {sortedRegions.map((region) => (
              <RegionSection
                key={region}
                region={region}
                sites={localGrouped.get(region) ?? []}
                isOver={overRegion === region && !!activeId && !activeId.startsWith(REGION_PREFIX)}
                onDetail={(s) => setDetailTarget(s)}
                onEdit={(s) => { setEditTarget(s); setDialogOpen(true) }}
                onToggleFavorite={(s) => toggleFavorite.mutate({ id: s.id, is_favorite: !s.is_favorite })}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeSite && <SiteRowOverlay site={activeSite} />}
        </DragOverlay>
      </DndContext>

      <SiteDetailDialog
        site={detailTarget}
        onOpenChange={(open) => { if (!open) setDetailTarget(null) }}
      />
      <SiteFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditTarget(undefined) }}
        site={editTarget}
      />
    </>
  )
}
