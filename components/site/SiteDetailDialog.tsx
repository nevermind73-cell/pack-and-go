'use client'

import { useState } from 'react'
import { Star, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useToggleFavoriteSite, type Site, type SiteType } from '@/hooks/useSites'
import { SiteFormDialog } from './SiteFormDialog'

const SITE_TYPE_CLASS: Record<SiteType, string> = {
  '백패킹':      'bg-slate-800 text-slate-50',
  '휴양림':      'bg-emerald-600 text-white',
  '사설 캠핑장':  'bg-orange-500 text-white',
  '국립 캠핑장':  'bg-blue-600 text-white',
  '지자체 캠핑장': 'bg-violet-600 text-white',
  '섬/바다':     'bg-cyan-500 text-white',
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex gap-3 py-2 border-b last:border-0">
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

interface SiteDetailDialogProps {
  site: Site | null
  onOpenChange: (open: boolean) => void
}

export function SiteDetailDialog({ site, onOpenChange }: SiteDetailDialogProps) {
  const [editOpen, setEditOpen] = useState(false)
  const toggleFavorite = useToggleFavoriteSite()

  if (!site) return null

  return (
    <>
      <Dialog open={!!site} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-2 pr-6">
              <div className="flex-1 min-w-0">
                <Badge
                  className={cn(
                    'text-xs font-medium rounded-sm px-1.5 py-0.5 mb-2',
                    SITE_TYPE_CLASS[site.site_type] ?? 'bg-gray-500 text-white'
                  )}
                >
                  {site.site_type}
                </Badge>
                <DialogTitle className="text-lg leading-snug">{site.name}</DialogTitle>
              </div>
              <div className="flex items-center gap-1 shrink-0 mt-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleFavorite.mutate({ id: site.id, is_favorite: !site.is_favorite })}
                >
                  <Star
                    className={cn(
                      'h-4 w-4 transition-colors',
                      site.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                    )}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { onOpenChange(false); setEditOpen(true) }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-2">
            <Row label="지역" value={site.region} />
            <Row label="주소" value={site.address} />
            <Row label="방문 횟수" value={site.visit_count > 0 ? `${site.visit_count}회` : null} />
            <Row label="주차" value={site.parking} />
            <Row label="거리" value={site.distance_km != null ? `${site.distance_km}km` : null} />
            <Row label="예약 방법" value={site.reservation} />
            <Row label="가격" value={site.price} />
            <Row
              label="위도 / 경도"
              value={
                site.lat != null && site.lng != null
                  ? `${site.lat}, ${site.lng}`
                  : null
              }
            />
            <Row label="비고" value={site.memo} />
          </div>
        </DialogContent>
      </Dialog>

      <SiteFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        site={site}
      />
    </>
  )
}
