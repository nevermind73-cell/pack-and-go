'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Gear } from '@/hooks/useGear'

interface GearDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gear: Gear | undefined
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0">
      <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm flex-1">{value}</span>
    </div>
  )
}

export function GearDetailDialog({ open, onOpenChange, gear }: GearDetailDialogProps) {
  if (!gear) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {gear.name}
            {gear.gear_type && (
              <Badge variant="secondary" className="font-normal text-xs">
                {gear.gear_type}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-1">
          <Row label="카테고리" value={gear.category} />
          <Row label="제조사" value={gear.manufacturer} />
          <Row label="무게" value={gear.weight_g ? `${gear.weight_g}g` : null} />
          <Row label="사용 횟수" value={gear.use_count ? `${gear.use_count}회` : null} />
          <Row label="메모" value={gear.memo} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
