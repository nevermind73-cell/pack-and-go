'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2 } from 'lucide-react'
import { useGear, useDeleteGear, type Gear } from '@/hooks/useGear'
import { GearFormDialog } from './GearFormDialog'
import { Skeleton } from '@/components/ui/skeleton'

export function GearTable() {
  const { data: gearList, isLoading } = useGear()
  const deleteGear = useDeleteGear()
  const [editTarget, setEditTarget] = useState<Gear | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleEdit(gear: Gear) {
    setEditTarget(gear)
    setDialogOpen(true)
  }

  async function handleDelete(gear: Gear) {
    if (!confirm(`"${gear.name}"을(를) 삭제하시겠습니까?`)) return
    await deleteGear.mutateAsync(gear.id, {
      onSuccess: () => toast.success('장비가 삭제되었습니다.'),
      onError: () => toast.error('삭제에 실패했습니다.'),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (!Array.isArray(gearList) || gearList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">등록된 장비가 없습니다.</p>
        <p className="text-xs mt-1">위의 버튼으로 첫 장비를 추가해보세요!</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>메모</TableHead>
              <TableHead className="w-20 text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gearList.map((gear) => (
              <TableRow key={gear.id}>
                <TableCell className="font-medium">{gear.name}</TableCell>
                <TableCell>
                  {gear.category ? (
                    <Badge variant="secondary">{gear.category}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                  {gear.memo || '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(gear)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(gear)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <GearFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditTarget(undefined)
        }}
        gear={editTarget}
      />
    </>
  )
}
