'use client'

import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { useCreateGear, useUpdateGear, useDeleteGear, useGear, type Gear } from '@/hooks/useGear'

interface GearFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gear?: Gear
}

export function GearFormDialog({ open, onOpenChange, gear }: GearFormDialogProps) {
  const isEdit = !!gear
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [gearType, setGearType] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [weightG, setWeightG] = useState('')
  const [useCount, setUseCount] = useState('')
  const [memo, setMemo] = useState('')

  const { data: gearList } = useGear()
  const categories = [...new Set(
    (Array.isArray(gearList) ? gearList : [])
      .map((g) => g.category)
      .filter(Boolean) as string[]
  )]

  const createGear = useCreateGear()
  const updateGear = useUpdateGear()
  const deleteGear = useDeleteGear()

  useEffect(() => {
    if (open) {
      setName(gear?.name ?? '')
      setCategory(gear?.category ?? '')
      setGearType(gear?.gear_type ?? '')
      setManufacturer(gear?.manufacturer ?? '')
      setWeightG(gear?.weight_g != null ? String(gear.weight_g) : '')
      setUseCount(gear?.use_count != null ? String(gear.use_count) : '')
      setMemo(gear?.memo ?? '')
    }
  }, [open, gear])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('장비 이름을 입력해주세요.')
      return
    }

    const payload = {
      name: name.trim(),
      category: category.trim() || undefined,
      gear_type: gearType.trim() || undefined,
      manufacturer: manufacturer.trim() || undefined,
      weight_g: weightG ? parseFloat(weightG) : 0,
      use_count: useCount ? parseInt(useCount, 10) : 0,
      memo: memo.trim() || undefined,
    }

    try {
      if (isEdit) {
        await updateGear.mutateAsync({ id: gear.id, ...payload })
        toast.success('장비가 수정되었습니다.')
      } else {
        await createGear.mutateAsync(payload)
        toast.success('장비가 추가되었습니다.')
      }
      onOpenChange(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[GearFormDialog]', msg)
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!gear) return
    if (!confirm(`"${gear.name}"을(를) 삭제하시겠습니까?`)) return
    await deleteGear.mutateAsync(gear.id, {
      onSuccess: () => { toast.success('장비가 삭제되었습니다.'); onOpenChange(false) },
      onError: () => toast.error('삭제에 실패했습니다.'),
    })
  }

  const isPending = createGear.isPending || updateGear.isPending || deleteGear.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '장비 수정' : '장비 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="gear-name">이름 *</Label>
              <Input
                id="gear-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: X-mid Pro 2"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gear-category">카테고리</Label>
              <Input
                id="gear-category"
                list="gear-category-list"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="예: Sleeping"
                autoComplete="off"
              />
              <datalist id="gear-category-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gear-type">구분</Label>
              <Input
                id="gear-type"
                value={gearType}
                onChange={(e) => setGearType(e.target.value)}
                placeholder="예: Tent, Jacket"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gear-manufacturer">제조사</Label>
              <Input
                id="gear-manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="예: Durston"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gear-weight">무게 (g)</Label>
              <Input
                id="gear-weight"
                type="number"
                min="0"
                step="0.1"
                value={weightG}
                onChange={(e) => setWeightG(e.target.value)}
                placeholder="650"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gear-usecount">사용 횟수</Label>
              <Input
                id="gear-usecount"
                type="number"
                min="0"
                value={useCount}
                onChange={(e) => setUseCount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gear-memo">메모</Label>
            <Textarea
              id="gear-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="추가 메모"
              rows={2}
            />
          </div>
          <DialogFooter className="flex-row items-center">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
                className="mr-auto"
              >
                삭제
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '저장 중...' : isEdit ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
