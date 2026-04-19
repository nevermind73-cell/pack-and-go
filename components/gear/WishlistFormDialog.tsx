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
import {
  useCreateWishlistItem,
  useUpdateWishlistItem,
  useDeleteWishlistItem,
  useWishlist,
  type WishlistItem,
  type PriceCurrency,
} from '@/hooks/useWishlist'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: WishlistItem
}

const CURRENCIES: { value: PriceCurrency; label: string }[] = [
  { value: 'KRW', label: '원' },
  { value: 'USD', label: 'USD' },
  { value: 'JPY', label: '엔화' },
]

export function WishlistFormDialog({ open, onOpenChange, item }: Props) {
  const isEdit = !!item
  const { data: wishlist } = useWishlist()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState<PriceCurrency>('KRW')
  const [weightG, setWeightG] = useState('')
  const [memo, setMemo] = useState('')
  const [url, setUrl] = useState('')

  const createItem = useCreateWishlistItem()
  const updateItem = useUpdateWishlistItem()
  const deleteItem = useDeleteWishlistItem()

  const categories = Array.from(
    new Set((Array.isArray(wishlist) ? wishlist : []).map((i) => i.category).filter(Boolean) as string[])
  )

  useEffect(() => {
    if (open) {
      setName(item?.name ?? '')
      setCategory(item?.category ?? '')
      setManufacturer(item?.manufacturer ?? '')
      setPrice(item?.price != null ? String(item.price) : '')
      setCurrency(item?.price_currency ?? 'KRW')
      setWeightG(item?.weight_g != null ? String(item.weight_g) : '')
      setMemo(item?.memo ?? '')
      setUrl(item?.url ?? '')
    }
  }, [open, item])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const payload = {
      name: name.trim(),
      category: category.trim() || undefined,
      manufacturer: manufacturer.trim() || undefined,
      price: price ? Number(price) : undefined,
      price_currency: price ? currency : undefined,
      weight_g: weightG ? Number(weightG) : undefined,
      memo: memo.trim() || undefined,
      url: url.trim() || undefined,
    }

    try {
      if (isEdit) {
        await updateItem.mutateAsync({ id: item.id, ...payload })
        toast.success('수정되었습니다.')
      } else {
        await createItem.mutateAsync(payload)
        toast.success('위시리스트에 추가되었습니다.')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
    }
  }

  async function handleDelete() {
    if (!item) return
    if (!confirm(`"${item.name}"을 위시리스트에서 삭제하시겠습니까?`)) return
    try {
      await deleteItem.mutateAsync(item.id)
      toast.success('삭제되었습니다.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    }
  }

  const isPending = createItem.isPending || updateItem.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '위시리스트 수정' : '위시리스트 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="wl-name">품목명 *</Label>
            <Input
              id="wl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 블랙다이아몬드 트레일 폴"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wl-category">카테고리</Label>
              <Input
                id="wl-category"
                list="wl-category-list"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="예: 폴"
              />
              <datalist id="wl-category-list">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wl-manufacturer">제조사</Label>
              <Input
                id="wl-manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="예: Black Diamond"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>가격</Label>
              <div className="flex gap-1.5">
                <div className="flex rounded-md border overflow-hidden shrink-0">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCurrency(c.value)}
                      className={`px-2 py-1.5 text-xs transition-colors ${
                        currency === c.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  className="flex-1 min-w-0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wl-weight">무게 (g)</Label>
              <Input
                id="wl-weight"
                type="number"
                min={0}
                value={weightG}
                onChange={(e) => setWeightG(e.target.value)}
                placeholder="예: 420"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wl-url">링크 (URL)</Label>
            <Input
              id="wl-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wl-memo">비고</Label>
            <Textarea
              id="wl-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="자유롭게 메모"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteItem.isPending}
                className="mr-auto"
              >
                삭제
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? '저장 중...' : isEdit ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
