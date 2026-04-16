'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Bookmark, Shirt, Utensils, X, Plus, Minus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePackStore } from '@/stores/packStore'
import type { PackItem } from '@/stores/packStore'
import { useGear } from '@/hooks/useGear'
import { SaveListDialog } from './SaveListDialog'
import { useCurrentTrip, useUpdateTrip } from '@/hooks/useTrips'

function formatKg(g: number): string {
  return `${(g / 1000).toFixed(2)} kg`
}

export function PackPanel() {
  const packStore = usePackStore()
  const { data: gearList } = useGear()
  const { data: currentTrip, isSuccess: tripLoaded } = useCurrentTrip()
  const updateTrip = useUpdateTrip()
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  // 여행이 있으면 서버 pack_draft로 초기화 (최초 1회)
  const initializedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!tripLoaded) return
    if (!currentTrip) return
    if (initializedRef.current === currentTrip.id) return
    initializedRef.current = currentTrip.id
    const serverDraft: PackItem[] = Array.isArray(currentTrip.pack_draft)
      ? currentTrip.pack_draft
      : []
    packStore.setItems(serverDraft)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripLoaded, currentTrip?.id])

  // 여행이 있을 때 items 변경 시 서버에 자동 저장 (디바운스 1s)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!currentTrip) return
    if (initializedRef.current !== currentTrip.id) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      updateTrip.mutate({ id: currentTrip.id, pack_draft: packStore.items })
    }, 1000)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packStore.items])

  const safeGearList = Array.isArray(gearList) ? gearList : []
  const gearMap = useMemo(
    () => Object.fromEntries(safeGearList.map((g) => [g.id, g])),
    [safeGearList]
  )

  const packWithGear = useMemo(
    () =>
      packStore.items
        .map((item) => ({ ...item, gear: gearMap[item.gearId] }))
        .filter((item) => item.gear),
    [packStore.items, gearMap]
  )

  // 카테고리별 그룹화
  const grouped = useMemo(() => {
    const map = new Map<string, typeof packWithGear>()
    for (const item of packWithGear) {
      const cat = item.gear.category ?? '기타'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    return map
  }, [packWithGear])

  // 통계
  const totalCount = packWithGear.reduce((sum, i) => sum + i.quantity, 0)
  const totalWeightG = packWithGear.reduce(
    (sum, i) => sum + Number(i.gear.weight_g ?? 0) * i.quantity,
    0
  )
  const wornWeightG = packWithGear
    .filter((i) => i.isWorn)
    .reduce((sum, i) => sum + Number(i.gear.weight_g ?? 0) * i.quantity, 0)
  const consumableWeightG = packWithGear
    .filter((i) => i.isConsumable)
    .reduce((sum, i) => sum + Number(i.gear.weight_g ?? 0) * i.quantity, 0)
  const baseWeightG = totalWeightG - wornWeightG - consumableWeightG

  async function handlePack() {
    if (packStore.items.length === 0) {
      toast.error('Pack에 장비가 없습니다.')
      return
    }

    // 기존 홈 체크리스트와 중복 없이 병합
    const existingItems: typeof packStore.items = currentTrip
      ? (Array.isArray(currentTrip.pack_items) ? currentTrip.pack_items : [])
      : packStore.committedItems

    const existingIds = new Set(existingItems.map((i) => i.gearId))
    const newItems = packStore.items.filter((i) => !existingIds.has(i.gearId))
    const merged = [...existingItems, ...newItems]

    // 로컬 store 먼저 반영 (항상 동작)
    packStore.commitMerged(merged)

    // DB 여행이 있으면 저장 시도
    if (currentTrip) {
      try {
        await updateTrip.mutateAsync({ id: currentTrip.id, pack_items: merged })
      } catch {
        toast.error('서버 저장 실패 — 로컬에만 반영됩니다')
      }
    }

    toast.success(`${newItems.length > 0 ? `${newItems.length}개 추가` : '이미 모두 등록됨'} — 홈 체크리스트에 반영되었습니다.`)
  }

  return (
    <div className="flex flex-col h-full border-l">
      {/* 헤더: 통계 + Pack! 버튼 */}
      <div className="flex items-stretch gap-0 p-3 border-b shrink-0">
        <div className="flex items-center gap-3 flex-1 border rounded-l-lg px-3 py-2 bg-muted/30">
          {/* 아이콘 버튼 2개 */}
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={() => setSaveDialogOpen(true)}
              title="리스트로 저장"
              className="hover:text-foreground text-muted-foreground transition-colors"
            >
              <Bookmark className="h-4 w-4" />
            </button>
            <button
              onClick={() => { if (confirm('Pack 목록을 초기화하시겠습니까?')) packStore.clear() }}
              title="목록 초기화"
              className="hover:text-foreground text-muted-foreground transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          {/* 2행 통계 */}
          <div className="text-xs space-y-1 flex-1 min-w-0">
            <div className="flex gap-3">
              <span className="text-muted-foreground shrink-0">총합</span>
              <span className="font-medium">{formatKg(totalWeightG)}</span>
              <span className="text-muted-foreground shrink-0">착용</span>
              <span className="font-medium">{formatKg(wornWeightG)}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted-foreground shrink-0">소모</span>
              <span className="font-medium">{formatKg(consumableWeightG)}</span>
              <span className="text-muted-foreground shrink-0">기본</span>
              <span className="font-medium">{formatKg(baseWeightG)}</span>
            </div>
          </div>
        </div>
        <Button
          className="rounded-l-none rounded-r-lg h-auto px-5 text-sm font-bold"
          onClick={handlePack}
        >
          Pack !
        </Button>
      </div>

      {/* Pack 장비 목록 */}
      <div className="flex-1 overflow-y-auto">
        {packWithGear.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm text-center px-4">
            <p>장비 목록에서 체크박스를 선택하면</p>
            <p>여기에 추가됩니다.</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([category, items]) => {
            const categoryWeightG = items.reduce(
              (sum, i) => sum + Number(i.gear.weight_g ?? 0) * i.quantity,
              0
            )
            return (
            <div key={category}>
              {/* 카테고리 구분선 */}
              <div className="px-4 pt-3 pb-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {category}
                  </span>
                  {categoryWeightG > 0 && (
                    <span className="text-xs text-muted-foreground">{formatKg(categoryWeightG)}</span>
                  )}
                </div>
                <div className="border-b mt-1" />
              </div>

              {/* 아이템 목록 */}
              {items.map((item) => (
                <div
                  key={item.gearId}
                  className="group flex items-center gap-2 px-4 py-2 hover:bg-muted/30"
                >
                  {/* 장비명 */}
                  <span className="flex-1 text-sm truncate min-w-0">{item.gear.name}</span>

                  {/* 스테퍼 */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => packStore.updateQuantity(item.gearId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => packStore.updateQuantity(item.gearId, item.quantity + 1)}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* 무게 */}
                  <span className="text-xs text-muted-foreground w-14 text-right shrink-0">
                    {item.gear.weight_g
                      ? `${Number(item.gear.weight_g) * item.quantity}g`
                      : '—'}
                  </span>

                  {/* Worn / Consumable / 삭제 (hover + active) */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => packStore.toggleWorn(item.gearId)}
                      title="착용 의류"
                      className={cn(
                        'w-6 h-6 flex items-center justify-center rounded transition-colors',
                        item.isWorn
                          ? 'text-blue-500'
                          : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-blue-500'
                      )}
                    >
                      <Shirt className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => packStore.toggleConsumable(item.gearId)}
                      title="소모품"
                      className={cn(
                        'w-6 h-6 flex items-center justify-center rounded transition-colors',
                        item.isConsumable
                          ? 'text-orange-500'
                          : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-orange-500'
                      )}
                    >
                      <Utensils className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => packStore.removeItem(item.gearId)}
                      className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )
          })
        )}
      </div>


      <SaveListDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        packItems={packStore.items}
      />
    </div>
  )
}
