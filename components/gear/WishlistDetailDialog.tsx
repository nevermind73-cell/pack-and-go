'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink, Pencil } from 'lucide-react'
import type { WishlistItem, PriceCurrency } from '@/hooks/useWishlist'

function formatWeight(g: number): string {
  return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g} g`
}

function formatPrice(p: number, currency: PriceCurrency | null): string {
  if (currency === 'USD') return `$${p.toLocaleString('en-US')}`
  if (currency === 'JPY') return `¥${p.toLocaleString('ja-JP')}`
  return p.toLocaleString('ko-KR') + '원'
}

interface Props {
  item: WishlistItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}

export function WishlistDetailDialog({ item, open, onOpenChange, onEdit }: Props) {
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 pr-8">
            <DialogTitle className="flex-1 leading-snug">{item.name}</DialogTitle>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={() => { onOpenChange(false); onEdit() }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {item.category && (
              <>
                <span className="text-muted-foreground">카테고리</span>
                <span>{item.category}</span>
              </>
            )}
            {item.manufacturer && (
              <>
                <span className="text-muted-foreground">제조사</span>
                <span>{item.manufacturer}</span>
              </>
            )}
            {item.price != null && (
              <>
                <span className="text-muted-foreground">가격</span>
                <span>{formatPrice(item.price, item.price_currency)}</span>
              </>
            )}
            {item.weight_g != null && (
              <>
                <span className="text-muted-foreground">무게</span>
                <span>{formatWeight(Number(item.weight_g))}</span>
              </>
            )}
          </div>

          {/* 링크 */}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-blue-500 hover:underline min-w-0"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="break-all">{item.url}</span>
            </a>
          )}

          {/* 비고 */}
          {item.memo && (
            <div className="border rounded-lg px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">
              {item.memo}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
