'use client'

import { useMemo, useState } from 'react'
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
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { Plus, Search, ChevronDown, ChevronRight, Trash2, Download, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { GearRow } from './GearRow'
import { GearFormDialog } from './GearFormDialog'
import { GearDetailDialog } from './GearDetailDialog'
import {
  useGear,
  useGearGroups,
  useReorderGear,
  useDeleteGearGroup,
  type Gear,
} from '@/hooks/useGear'
import { usePackStore } from '@/stores/packStore'

type Tab = 'my' | 'list'

export function GearListPanel() {
  const { data: gearList, isLoading: gearLoading } = useGear()
  const { data: groups, isLoading: groupsLoading } = useGearGroups()
  const reorderGear = useReorderGear()
  const deleteGroup = useDeleteGearGroup()
  const packStore = usePackStore()

  const [tab, setTab] = useState<Tab>('my')
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Gear | undefined>()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<Gear | undefined>()
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // 로컬 순서 상태 (DnD 낙관적 업데이트)
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const safeGearList = Array.isArray(gearList) ? gearList : []
  const safeGroups = Array.isArray(groups) ? groups : []

  // 정렬 + 검색 적용된 gear 목록
  const filteredGear = useMemo(() => {
    let list = localOrder
      ? [
          ...localOrder.map((id) => safeGearList.find((g) => g.id === id)).filter(Boolean) as Gear[],
          // localOrder에 없는 새 아이템을 끝에 추가
          ...safeGearList.filter((g) => !localOrder.includes(g.id)),
        ]
      : [...safeGearList].sort((a, b) => {
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.manufacturer?.toLowerCase().includes(q) ||
          g.category?.toLowerCase().includes(q)
      )
    }
    return list
  }, [safeGearList, localOrder, search])

  // 카테고리별 그룹화
  const grouped = useMemo(() => {
    const map = new Map<string, Gear[]>()
    for (const gear of filteredGear) {
      const cat = gear.category ?? '기타'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(gear)
    }
    return map
  }, [filteredGear])

  // 카테고리 accordion 초기 상태: 모두 열림
  function isCategoryOpen(cat: string) {
    // expandedCategories가 비어있으면 모두 열린 상태
    return !expandedCategories.has(cat)
  }

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  function handleDragEnd(event: DragEndEvent, categoryItems: Gear[]) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = categoryItems.findIndex((g) => g.id === active.id)
    const newIndex = categoryItems.findIndex((g) => g.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(categoryItems, oldIndex, newIndex)

    // 전체 목록에서 이 카테고리 아이템들의 sort_order를 업데이트
    const allIds = filteredGear.map((g) => g.id)
    const catIds = new Set(categoryItems.map((g) => g.id))
    const newAllIds = allIds.filter((id) => !catIds.has(id))

    // 기존 위치에 reordered 삽입
    const firstCatIndex = allIds.findIndex((id) => catIds.has(id))
    newAllIds.splice(firstCatIndex, 0, ...reordered.map((g) => g.id))

    setLocalOrder(newAllIds)

    const updates = newAllIds.map((id, idx) => ({ id, sort_order: idx }))
    reorderGear.mutate(updates, {
      onError: () => {
        setLocalOrder(null)
        toast.error('순서 저장에 실패했습니다.')
      },
      onSuccess: () => setLocalOrder(null),
    })
  }

  function togglePack(gearId: string) {
    if (packStore.hasItem(gearId)) {
      packStore.removeItem(gearId)
    } else {
      packStore.addItem(gearId)
    }
  }

  function handleEdit(gear: Gear) {
    setEditTarget(gear)
    setEditDialogOpen(true)
  }

  async function handleDeleteGroup(id: string, name: string) {
    if (!confirm(`"${name}" 리스트를 삭제하시겠습니까?`)) return
    await deleteGroup.mutateAsync(id, {
      onSuccess: () => toast.success('리스트가 삭제되었습니다.'),
      onError: () => toast.error('삭제에 실패했습니다.'),
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* 탭 */}
      <div className="flex border-b shrink-0">
        {(['my', 'list'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'my' ? '내 장비' : '리스트'}
          </button>
        ))}
      </div>

      {tab === 'my' ? (
        <div className="flex flex-col flex-1 min-h-0">
          {/* 툴바 */}
          <div className="flex gap-2 p-3 border-b shrink-0">
            <Button size="sm" className="h-8" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              새 장비 추가
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="장비 검색"
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* 장비 목록 */}
          <div className="flex-1 overflow-y-auto">
            {gearLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : grouped.size === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
                <p>{search ? '검색 결과가 없습니다.' : '장비가 없습니다. 첫 장비를 추가해보세요!'}</p>
              </div>
            ) : (
              Array.from(grouped.entries()).map(([category, items]) => (
                <div key={category}>
                  {/* 카테고리 헤더 */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isCategoryOpen(category) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-semibold">{category}</span>
                      <span className="text-xs text-muted-foreground">({items.length})</span>
                    </div>
                  </button>

                  {/* 카테고리 아이템 */}
                  {isCategoryOpen(category) && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, items)}
                    >
                      <SortableContext
                        items={items.map((g) => g.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="py-1">
                          {items.map((gear) => (
                            <GearRow
                              key={gear.id}
                              gear={gear}
                              isInPack={packStore.hasItem(gear.id)}
                              onTogglePack={() => togglePack(gear.id)}
                              onEdit={() => handleEdit(gear)}
                              onDetail={() => { setDetailTarget(gear); setDetailDialogOpen(true) }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* 리스트 탭 */
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {groupsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))
          ) : safeGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
              <p>저장된 리스트가 없습니다.</p>
              <p className="text-xs mt-1">Pack을 구성하고 리스트로 저장해보세요.</p>
            </div>
          ) : (
            safeGroups.map((group) => (
              <div key={group.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm">{group.name}</span>
                      {group.is_favorite && (
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {group.gear_group_items.length}개
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {group.gear_group_items
                        .slice(0, 4)
                        .map((i) => i.gear?.name)
                        .filter(Boolean)
                        .join(', ')}
                      {group.gear_group_items.length > 4 && ' ...'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        packStore.loadItems(group.gear_group_items.map((i) => i.gear_id))
                        toast.success(`"${group.name}" 리스트를 Pack에 불러왔습니다.`)
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      불러오기
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 장비 추가 다이얼로그 */}
      <GearFormDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {/* 장비 수정 다이얼로그 */}
      <GearFormDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) setEditTarget(undefined)
        }}
        gear={editTarget}
      />

      {/* 장비 상세 다이얼로그 */}
      <GearDetailDialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open)
          if (!open) setDetailTarget(undefined)
        }}
        gear={detailTarget}
        onEdit={() => detailTarget && handleEdit(detailTarget)}
      />
    </div>
  )
}
