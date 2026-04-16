'use client'

import { useMemo, useState } from 'react'
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
  SelectValue,
} from '@/components/ui/select'
import { useSites, SITE_TYPES } from '@/hooks/useSites'
import { useCreateTrip } from '@/hooks/useTrips'
import { usePackStore } from '@/stores/packStore'
import { useShoppingStore } from '@/stores/shoppingStore'

// 박수 → 종료일 계산
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

interface SiteEntry {
  start_date: string
  nights: number        // 박수 (0 = 당일치기)
  onlyFavorite: boolean // 즐겨찾기 필터
  filterRegion: string  // '' = 전체
  filterType: string    // '' = 전체
  site_id: string
}

function newEntry(): SiteEntry {
  return {
    start_date: '',
    nights: 1,
    onlyFavorite: false,
    filterRegion: '',
    filterType: '',
    site_id: '',
  }
}

interface NewTripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewTripDialog({ open, onOpenChange }: NewTripDialogProps) {
  const { data: allSites = [] } = useSites()
  const createTrip = useCreateTrip()
  const { committedItems } = usePackStore()
  const { committedRecipeIds } = useShoppingStore()

  const [title, setTitle] = useState('')
  const [entries, setEntries] = useState<SiteEntry[]>([newEntry()])

  // 전체 지역 목록 (중복 제거)
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
              // 필터 변경 시 캠핑장 선택 초기화
              ...(field !== 'start_date' && field !== 'nights' && field !== 'site_id'
                ? { site_id: '' }
                : {}),
            }
          : e
      )
    )
  }

  function addEntry() {
    setEntries((prev) => [...prev, newEntry()])
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx))
  }

  // 각 항목의 필터 적용된 사이트 목록
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

    // 전체 여행 날짜: 첫 캠핑장 ~ 마지막 캠핑장
    const startDates = validEntries.map((e) => e.start_date).sort()
    const endDates = validEntries
      .map((e) => addDays(e.start_date, e.nights))
      .filter(Boolean)
      .sort()

    const tripStartDate = startDates[0]
    const tripEndDate = endDates[endDates.length - 1] || undefined

    try {
      await createTrip.mutateAsync({
        title: title.trim(),
        start_date: tripStartDate,
        end_date: tripEndDate,
        sites: validEntries.map((e, i) => ({
          site_id: e.site_id,
          start_date: e.start_date,
          end_date: addDays(e.start_date, e.nights) || undefined,
          sort_order: i,
        })),
        pack_items: committedItems.length > 0 ? committedItems : undefined,
        shopping_recipe_ids: committedRecipeIds.length > 0 ? committedRecipeIds : undefined,
      })
      toast.success('새 캠핑이 등록되었습니다!')
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '등록 실패')
    }
  }

  function handleClose() {
    setTitle('')
    setEntries([newEntry()])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>새 캠핑 등록</DialogTitle>
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
                  {/* 삭제 버튼 (항목이 2개 이상일 때만) */}
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
                    {/* 종료일 미리보기 */}
                    {entry.start_date && entry.nights > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ~ {addDays(entry.start_date, entry.nights)} 까지
                      </p>
                    )}
                  </div>

                  {/* 캠핑장 필터 */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Label className="text-xs text-muted-foreground">캠핑장</Label>
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          id={`fav-${idx}`}
                          checked={entry.onlyFavorite}
                          onCheckedChange={(v) => updateEntry(idx, 'onlyFavorite', !!v)}
                          className="h-3.5 w-3.5"
                        />
                        <label
                          htmlFor={`fav-${idx}`}
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          즐겨찾기
                        </label>
                      </div>
                    </div>

                    {/* 3단 드롭다운: 지역 / 구분 / 캠핑장 */}
                    <div className="flex gap-2">
                      {/* 지역 */}
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
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* 구분 (site_type) */}
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
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* 캠핑장 */}
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
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              결과 없음
                            </div>
                          ) : (
                            siteOptions.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
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

          {/* 캠핑장 추가 */}
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
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={createTrip.isPending}>
            {createTrip.isPending ? '등록 중...' : '등록'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
