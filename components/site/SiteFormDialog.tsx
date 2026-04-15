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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateSite,
  useUpdateSite,
  useDeleteSite,
  useSites,
  SITE_TYPES,
  type Site,
  type SiteType,
} from '@/hooks/useSites'

interface SiteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  site?: Site
}

export function SiteFormDialog({ open, onOpenChange, site }: SiteFormDialogProps) {
  const isEdit = !!site

  const [name, setName] = useState('')
  const [siteType, setSiteType] = useState<SiteType>('사설 캠핑장')
  const [region, setRegion] = useState('')
  const [address, setAddress] = useState('')
  const [visitCount, setVisitCount] = useState('')
  const [parking, setParking] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [reservation, setReservation] = useState('')
  const [price, setPrice] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [memo, setMemo] = useState('')

  const { data: siteList } = useSites()
  const regions = [...new Set(
    (Array.isArray(siteList) ? siteList : []).map((s) => s.region).filter(Boolean)
  )]

  const createSite = useCreateSite()
  const updateSite = useUpdateSite()
  const deleteSite = useDeleteSite()

  useEffect(() => {
    if (open) {
      setName(site?.name ?? '')
      setSiteType(site?.site_type ?? '사설 캠핑장')
      setRegion(site?.region ?? '')
      setAddress(site?.address ?? '')
      setVisitCount(site?.visit_count != null ? String(site.visit_count) : '0')
      setParking(site?.parking ?? '')
      setDistanceKm(site?.distance_km != null ? String(site.distance_km) : '')
      setReservation(site?.reservation ?? '')
      setPrice(site?.price ?? '')
      setLat(site?.lat != null ? String(site.lat) : '')
      setLng(site?.lng != null ? String(site.lng) : '')
      setMemo(site?.memo ?? '')
    }
  }, [open, site])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('캠핑장 이름을 입력해주세요.')
      return
    }
    if (!region.trim()) {
      toast.error('지역을 입력해주세요.')
      return
    }

    const payload = {
      name: name.trim(),
      site_type: siteType,
      region: region.trim(),
      address: address.trim() || undefined,
      visit_count: visitCount ? parseInt(visitCount, 10) : 0,
      parking: parking.trim() || undefined,
      distance_km: distanceKm ? parseFloat(distanceKm) : undefined,
      reservation: reservation.trim() || undefined,
      price: price.trim() || undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      memo: memo.trim() || undefined,
    }

    if (isEdit) {
      await updateSite.mutateAsync(
        { id: site.id, ...payload },
        {
          onSuccess: () => { toast.success('캠핑장이 수정되었습니다.'); onOpenChange(false) },
          onError: () => toast.error('수정에 실패했습니다.'),
        }
      )
    } else {
      await createSite.mutateAsync(payload, {
        onSuccess: () => { toast.success('캠핑장이 추가되었습니다.'); onOpenChange(false) },
        onError: () => toast.error('추가에 실패했습니다.'),
      })
    }
  }

  async function handleDelete() {
    if (!site) return
    if (!confirm(`"${site.name}"을(를) 삭제하시겠습니까?`)) return
    await deleteSite.mutateAsync(site.id, {
      onSuccess: () => { toast.success('캠핑장이 삭제되었습니다.'); onOpenChange(false) },
      onError: () => toast.error('삭제에 실패했습니다.'),
    })
  }

  const isPending = createSite.isPending || updateSite.isPending || deleteSite.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '캠핑장 수정' : '새 캠핑장 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* 이름 */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="site-name">캠핑장 이름 *</Label>
              <Input
                id="site-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 원적산"
                required
              />
            </div>

            {/* 구분 */}
            <div className="space-y-1.5">
              <Label htmlFor="site-type">사이트 구분 *</Label>
              <Select value={siteType} onValueChange={(v) => setSiteType(v as SiteType)}>
                <SelectTrigger id="site-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 지역 */}
            <div className="space-y-1.5">
              <Label htmlFor="site-region">지역 *</Label>
              <Input
                id="site-region"
                list="site-region-list"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="예: 서울, 경기"
                autoComplete="off"
              />
              <datalist id="site-region-list">
                {regions.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

            {/* 주소 */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="site-address">주소 (면 단위)</Label>
              <Input
                id="site-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="예: 경기도 이천시 백사면"
              />
            </div>

            {/* 방문 횟수 */}
            <div className="space-y-1.5">
              <Label htmlFor="site-visit">방문 횟수</Label>
              <Input
                id="site-visit"
                type="number"
                min="0"
                value={visitCount}
                onChange={(e) => setVisitCount(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* 거리 */}
            <div className="space-y-1.5">
              <Label htmlFor="site-distance">거리 (km)</Label>
              <Input
                id="site-distance"
                type="number"
                min="0"
                step="0.1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                placeholder="예: 41"
              />
            </div>

            {/* 주차 */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="site-parking">주차</Label>
              <Input
                id="site-parking"
                value={parking}
                onChange={(e) => setParking(e.target.value)}
                placeholder="예: 영원사 주차장"
              />
            </div>

            {/* 예약 방법 */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="site-reservation">예약 방법</Label>
              <Input
                id="site-reservation"
                value={reservation}
                onChange={(e) => setReservation(e.target.value)}
                placeholder="예: 국립공원 예약시스템, 현장 방문 등"
              />
            </div>

            {/* 가격 */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="site-price">가격</Label>
              <Input
                id="site-price"
                value={price}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, '')
                  setPrice(digits ? Number(digits).toLocaleString('ko-KR') : '')
                }}
                placeholder="예: 20,000"
                inputMode="numeric"
              />
            </div>

            {/* 위도 / 경도 */}
            <div className="space-y-1.5">
              <Label htmlFor="site-lat">위도 (날씨용)</Label>
              <Input
                id="site-lat"
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="예: 37.5665"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-lng">경도 (날씨용)</Label>
              <Input
                id="site-lng"
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="예: 126.9780"
              />
            </div>

            {/* 비고 */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="site-memo">비고</Label>
              <Textarea
                id="site-memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="추가 메모"
                rows={2}
              />
            </div>
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
