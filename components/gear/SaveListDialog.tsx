'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateGearGroup, useAddGearToGroup } from '@/hooks/useGear'
import type { PackItem } from '@/stores/packStore'

interface SaveListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  packItems: PackItem[]
}

export function SaveListDialog({ open, onOpenChange, packItems }: SaveListDialogProps) {
  const [name, setName] = useState('')
  const createGroup = useCreateGearGroup()
  const addToGroup = useAddGearToGroup()
  const qc = useQueryClient()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    try {
      const group = await createGroup.mutateAsync(name.trim())
      if (group?.id && packItems.length > 0) {
        await Promise.all(
          packItems.map((item) =>
            addToGroup.mutateAsync({ groupId: group.id, gearId: item.gearId })
          )
        )
      }
      // 모든 아이템 추가 완료 후 강제 재조회 (타이밍 이슈 방지)
      await qc.refetchQueries({ queryKey: ['gear-groups'] })
      toast.success(`"${name.trim()}" 리스트가 저장되었습니다.`)
      setName('')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
    }
  }

  const isPending = createGroup.isPending || addToGroup.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>리스트로 저장</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="list-name">리스트 이름</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 여름 백패킹 기본 세트"
              autoFocus
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            현재 Pack에 있는 장비 {packItems.length}개가 저장됩니다.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
