'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { usePackStore } from '@/stores/packStore'
import { useGear } from '@/hooks/useGear'
import { useTripCheckStore } from '@/stores/tripStore'

function formatWeight(g: number): string {
  return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g} g`
}

export function PackChecklist() {
  const { committedItems } = usePackStore()
  const { data: gearList } = useGear()
  const { checkedGearIds, toggleGearCheck } = useTripCheckStore()

  const safeGearList = Array.isArray(gearList) ? gearList : []
  const gearMap = useMemo(
    () => Object.fromEntries(safeGearList.map((g) => [g.id, g])),
    [safeGearList]
  )

  const packWithGear = useMemo(
    () =>
      committedItems
        .map((item) => ({ ...item, gear: gearMap[item.gearId] }))
        .filter((item) => item.gear),
    [committedItems, gearMap]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, typeof packWithGear>()
    for (const item of packWithGear) {
      const cat = item.gear.category ?? '기타'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    return map
  }, [packWithGear])

  const totalWeightG = packWithGear.reduce(
    (sum, i) => sum + (i.gear.weight_g ?? 0) * i.quantity,
    0
  )

  const checkedCount = packWithGear.filter((i) => checkedGearIds.includes(i.gearId)).length

  return (
    <div className="bg-card rounded-xl border flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold text-sm">Pack</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {checkedCount}/{packWithGear.length}
          </span>
          {totalWeightG > 0 && <span>{formatWeight(totalWeightG)}</span>}
        </div>
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto max-h-72">
        {packWithGear.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            Gear 페이지에서 Pack it! 으로 추가하세요
          </div>
        ) : (
          Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <div className="px-4 pt-3 pb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {category}
                </span>
                <div className="border-b mt-1" />
              </div>
              {items.map((item) => {
                const isChecked = checkedGearIds.includes(item.gearId)
                return (
                  <label
                    key={item.gearId}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-muted-foreground"
                      checked={isChecked}
                      onChange={() => toggleGearCheck(item.gearId)}
                    />
                    <span
                      className={cn(
                        'flex-1 text-sm',
                        isChecked && 'line-through text-muted-foreground'
                      )}
                    >
                      {item.gear.name}
                    </span>
                    {item.quantity > 1 && (
                      <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                    )}
                    {item.gear.weight_g > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {item.gear.weight_g * item.quantity}g
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
