'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { useSites, SITE_TYPES } from '@/hooks/useSites'
import { useUpdateTrip, type Trip } from '@/hooks/useTrips'

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const DURATION_OPTIONS = [
  { label: '당일치기', nights: 0 },
  { label: '1박 2일', nights: 1 },
  { label: '2박 3일', nights: 2 },
  { label: '3박 4일', nights: 3 },
  { label: '4박 5일', nights: 4 },
  { label: '5박 6일', nights: 5 },
]

function calcNights(start: string, end: string | null): number {
  if (!end) return 0
  const diff = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  )
  return Math.max(0, diff)
}

interface SiteEntry {
  start_date: string
  nights: number
  onlyFavorite: boolean
  filterRegion: string
  filterType: string
  site_id: string
}

interface EditTripDialogProps {
  trip: Trip
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditTripDialog({ trip, open, onOpenChange }: EditTripDialogProps) {
  const { data: allSites = [] } = useSites()
  const updateTrip = useUpdateTrip()

  const [title, setTitle] = useState('')
  const [entries, setEntries] = useState<SiteEntry[]>([])

  // trip이 바뀔 때 초기값 세팅
  useEffect(() => {
    if (!open) return
    setTitle(trip.title)
    if (trip.trip_sites.length > 0) {
      setEntries(
        [...trip.trip_sites]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((ts) => ({
            site_id: ts.site_id,
            start_date: ts.start_date,
            nights: calcNights(ts.start_date, ts.end_date),
            onlyFavorite: false,
            filterRegion: '',
            filterType: '',
          }))
      )
    } else {
      setEntries([{ site_id: '', start_date: trip.start_date, nights: 1, onlyFavorite: false, filterRegion: '', filterType: '' }])
    }
  }, [open, trip])

  const regions = useMemo(
    () => [...new Set(allSites.map((s) => s.region).filter(Boolean))].sort(),
    [allSites]
  )

  function updateEntry<K extends keyof SiteEntry>(idx: number, field: K, value: SiteEntry[K]) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === idx
          ? {
              ...e,
              [field]: value,
              ...(field !== 'start_date' && field !== 'nights' && field !== 'site_id'
                ? { site_id: '' }
                : {}),
            }
          : e
      )
    )
  }

  function addEntry() {
    setEntries((prev) => [
      ...prev,
      { site_id: '', start_date: '', nights: 1, onlyFavorite: false, filterRegion: '', filterType: '' },
    ])
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx))
  }

  function filteredSites(entry: SiteEntry) {
    return allSites.filter((s) => {
      if (entry.onlyFavorite && !s.is_favorite) return false
      if (entry.filterRegion && s.region !== entry.filterRegion) return false
      if (entry.filterType && s.site_type !== entry.filterType) return false
      return true
    })
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error('여행 제목을 입력하세요')
      return
    }
    const validEntries = entries.filter((e) => e.site_id && e.start_date)
    if (validEntries.length === 0) {
      toast.error('캠핑장과 날짜를 입력하세요')
      return
    }

    const startDates = validEntries.map((e) => e.start_date).sort()
    const endDates = validEntries.map((e) => addDays(e.start_date, e.nights)).filter(Boolean).sort()
    const tripStartDate = startDates[0]
    const tripEndDate = endDates[endDates.length - 1] || undefined

    try {
      await updateTrip.mutateAsync({
        id: trip.id,
        title: title.trim(),
        start_date: tripStartDate,
        end_date: tripEndDate,
        sites: validEntries.map((e, i) => ({
          site_id: e.site_id,
          start_date: e.start_date,
          end_date: addDays(e.start_date, e.nights) || undefined,
          sort_order: i,
        })),
      })
      toast.success('수정되었습니다!')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '수정 실패')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>캠핑 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* 여행 제목 */}
          <div className="space-y-1.5">
            <Label>여행 제목</Label>
            <Input
              placeholder="여행 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* 캠핑장 항목 목록 */}
          <div className="space-y-3">
            {entries.map((entry, idx) => {
              const siteOptions = filteredSites(entry)
              return (
                <div key={idx} className="border rounded-lg p-4 space-y-3 relative">
                  {entries.length > 1 && (
                    <button
                      onClick={() => removeEntry(idx)}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {/* 일자 */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">일자</Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        className="flex-1"
                        value={entry.start_date}
                        onChange={(e) => updateEntry(idx, 'start_date', e.target.value)}
                      />
                      <Select
                        value={String(entry.nights)}
                        onValueChange={(v) => updateEntry(idx, 'nights', Number(v ?? '1'))}
                      >
                        <SelectTrigger className="w-32">
                          <span className="flex-1 text-left text-sm truncate">
                            {DURATION_OPTIONS.find((o) => o.nights === entry.nights)?.label ?? '1박 2일'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.nights} value={String(opt.nights)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {entry.start_date && entry.nights > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ~ {addDays(entry.start_date, entry.nights)} 까지
                      </p>
                    )}
                  </div>

                  {/* 캠핑장 */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Label className="text-xs text-muted-foreground">캠핑장</Label>
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          id={`fav-edit-${idx}`}
                          checked={entry.onlyFavorite}
                          onCheckedChange={(v) => updateEntry(idx, 'onlyFavorite', !!v)}
                          className="h-3.5 w-3.5"
                        />
                        <label
                          htmlFor={`fav-edit-${idx}`}
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          즐겨찾기
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Select
                        value={entry.filterRegion || '__all__'}
                        onValueChange={(v) =>
                          updateEntry(idx, 'filterRegion', v === '__all__' ? '' : (v ?? ''))
                        }
                      >
                        <SelectTrigger className="flex-1 min-w-0">
                          <span className="flex-1 text-left text-sm truncate">
                            {entry.filterRegion || '지역'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">지역</SelectItem>
                          {regions.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={entry.filterType || '__all__'}
                        onValueChange={(v) =>
                          updateEntry(idx, 'filterType', v === '__all__' ? '' : (v ?? ''))
                        }
                      >
                        <SelectTrigger className="flex-1 min-w-0">
                          <span className="flex-1 text-left text-sm truncate">
                            {entry.filterType || '구분'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">구분</SelectItem>
                          {SITE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={entry.site_id || '__none__'}
                        onValueChange={(v) =>
                          updateEntry(idx, 'site_id', v === '__none__' ? '' : (v ?? ''))
                        }
                      >
                        <SelectTrigger className="flex-1 min-w-0">
                          <span className="flex-1 text-left text-sm truncate">
                            {entry.site_id
                              ? (allSites.find((s) => s.id === entry.site_id)?.name ?? '캠핑장')
                              : '캠핑장'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">캠핑장</SelectItem>
                          {siteOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">결과 없음</div>
                          ) : (
                            siteOptions.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={addEntry}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            캠핑장 추가
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={updateTrip.isPending}>
            {updateTrip.isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
