'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Star, MoreVertical, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import {
  useGear,
  useGearGroups,
  useCreateGearGroup,
  useUpdateGearGroup,
  useDeleteGearGroup,
  useAddGearToGroup,
  useRemoveGearFromGroup,
  type GearGroup,
} from '@/hooks/useGear'
import { Skeleton } from '@/components/ui/skeleton'

function formatWeight(g: number): string {
  return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g} g`
}

function groupTotalWeight(group: GearGroup): number {
  return group.gear_group_items.reduce(
    (sum, i) => sum + Number(i.gear?.weight_g ?? 0) * (i.quantity ?? 1),
    0
  )
}

// ── 그룹 상세 팝업 ─────────────────────────────────────
function GroupDetailDialog({
  group,
  open,
  onOpenChange,
}: {
  group: GearGroup
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const items = group.gear_group_items
  const totalWeightG = groupTotalWeight(group)

  // 카테고리별 그룹화
  const categoryMap = new Map<string, typeof items>()
  for (const item of items) {
    const cat = item.gear?.category ?? '기타'
    if (!categoryMap.has(cat)) categoryMap.set(cat, [])
    categoryMap.get(cat)!.push(item)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {group.name}
            {group.is_favorite && (
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            )}
          </DialogTitle>
        </DialogHeader>

        {/* 요약 */}
        <div className="flex items-center gap-3 text-sm border rounded-lg px-3 py-2 bg-muted/30">
          <span className="text-muted-foreground">장비</span>
          <span className="font-medium">{items.length}개</span>
          <span className="text-muted-foreground">총 무게</span>
          <span className="font-medium">{totalWeightG > 0 ? formatWeight(totalWeightG) : '—'}</span>
        </div>

        {/* 장비 목록 */}
        <div className="overflow-y-auto max-h-[50vh] -mx-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">장비가 없습니다.</p>
          ) : (
            Array.from(categoryMap.entries()).map(([category, catItems]) => {
              const catWeight = catItems.reduce(
                (sum, i) => sum + Number(i.gear?.weight_g ?? 0),
                0
              )
              return (
                <div key={category}>
                  <div className="px-3 pt-3 pb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {category}
                      </span>
                      {catWeight > 0 && (
                        <span className="text-xs text-muted-foreground">{formatWeight(catWeight)}</span>
                      )}
                    </div>
                    <div className="border-b mt-1" />
                  </div>
                  {catItems.map((item) => (
                    <div
                      key={item.gear_id}
                      className="flex items-center justify-between px-3 py-1.5"
                    >
                      <span className="text-sm">{item.gear?.name ?? item.gear_id}</span>
                      <span className="text-xs text-muted-foreground">
                        {Number(item.gear?.weight_g ?? 0) > 0
                          ? formatWeight(Number(item.gear.weight_g))
                          : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── 메인 ──────────────────────────────────────────────
export function GearGroupManager() {
  const { data: gearList } = useGear()
  const { data: groups, isLoading } = useGearGroups()
  const createGroup = useCreateGearGroup()
  const updateGroup = useUpdateGearGroup()
  const deleteGroup = useDeleteGearGroup()
  const addToGroup = useAddGearToGroup()
  const removeFromGroup = useRemoveGearFromGroup()

  const [newGroupName, setNewGroupName] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [detailGroup, setDetailGroup] = useState<GearGroup | null>(null)

  function toggleExpand(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    await createGroup.mutateAsync(newGroupName.trim(), {
      onSuccess: () => {
        toast.success('그룹이 생성되었습니다.')
        setNewGroupName('')
      },
      onError: () => toast.error('그룹 생성에 실패했습니다.'),
    })
  }

  async function handleToggleFavorite(id: string, current: boolean) {
    await updateGroup.mutateAsync(
      { id, is_favorite: !current },
      { onError: () => toast.error('업데이트에 실패했습니다.') }
    )
  }

  async function handleDeleteGroup(id: string, name: string) {
    if (!confirm(`"${name}" 그룹을 삭제하시겠습니까?`)) return
    await deleteGroup.mutateAsync(id, {
      onSuccess: () => toast.success('그룹이 삭제되었습니다.'),
      onError: () => toast.error('삭제에 실패했습니다.'),
    })
  }

  async function handleToggleGearInGroup(groupId: string, gearId: string, isInGroup: boolean) {
    if (isInGroup) {
      await removeFromGroup.mutateAsync(
        { groupId, gearId },
        { onError: () => toast.error('장비 제거에 실패했습니다.') }
      )
    } else {
      await addToGroup.mutateAsync(
        { groupId, gearId },
        { onError: () => toast.error('장비 추가에 실패했습니다.') }
      )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 새 그룹 생성 */}
      <form onSubmit={handleCreateGroup} className="flex gap-2">
        <Input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="새 그룹 이름"
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={createGroup.isPending}>
          <Plus className="h-4 w-4 mr-1" />
          그룹 추가
        </Button>
      </form>

      {/* 그룹 목록 */}
      {!Array.isArray(groups) || groups.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          그룹이 없습니다. 새 그룹을 만들어보세요.
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.id)
            const groupGearIds = new Set(group.gear_group_items.map((i) => i.gear_id))
            const totalWeightG = groupTotalWeight(group)

            return (
              <Card key={group.id}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => toggleExpand(group.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      {/* 클릭하면 상세 팝업 */}
                      <button
                        className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-70 transition-opacity"
                        onClick={() => setDetailGroup(group)}
                      >
                        <CardTitle className="text-sm font-medium truncate">{group.name}</CardTitle>
                        {group.is_favorite && (
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                        )}
                        <span className="text-xs text-muted-foreground shrink-0">
                          {totalWeightG > 0 ? formatWeight(totalWeightG) : `${group.gear_group_items.length}개`}
                        </span>
                      </button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleToggleFavorite(group.id, group.is_favorite)}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          {group.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          그룹 삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="px-4 pb-3">
                    {!gearList || gearList.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        먼저 장비를 추가해주세요.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {gearList.map((gear) => {
                          const isInGroup = groupGearIds.has(gear.id)
                          return (
                            <label
                              key={gear.id}
                              className="flex items-center gap-2 cursor-pointer rounded px-1 py-0.5 hover:bg-muted"
                            >
                              <Checkbox
                                checked={isInGroup}
                                onCheckedChange={() =>
                                  handleToggleGearInGroup(group.id, gear.id, isInGroup)
                                }
                              />
                              <span className="text-sm flex-1">{gear.name}</span>
                              {gear.weight_g > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {formatWeight(Number(gear.weight_g))}
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* 상세 팝업 */}
      {detailGroup && (
        <GroupDetailDialog
          group={detailGroup}
          open={!!detailGroup}
          onOpenChange={(v) => { if (!v) setDetailGroup(null) }}
        />
      )}
    </div>
  )
}
