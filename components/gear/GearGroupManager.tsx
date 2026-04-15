'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
} from '@/hooks/useGear'
import { Skeleton } from '@/components/ui/skeleton'

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

            return (
              <Card key={group.id}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleExpand(group.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <CardTitle className="text-sm font-medium">{group.name}</CardTitle>
                      {group.is_favorite && (
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {group.gear_group_items.length}개
                      </Badge>
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
                              <span className="text-sm">{gear.name}</span>
                              {gear.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {gear.category}
                                </Badge>
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
    </div>
  )
}
