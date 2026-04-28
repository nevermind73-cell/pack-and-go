'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { usePackStore } from '@/stores/packStore'
import { useGear } from '@/hooks/useGear'
import { useTripCheckStore } from '@/stores/tripStore'
import { useCurrentTrip, useUpdateTrip, type PackItem } from '@/hooks/useTrips'

function formatWeight(g: number): string {
  return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g} g`
}

export function PackChecklist() {
  const { data: trip } = useCurrentTrip()
  const updateTrip = useUpdateTrip()
  const { committedItems, removeCommitted } = usePackStore()
  const { data: gearList } = useGear()
  const { checkedGearIds, toggleGearCheck } = useTripCheckStore()

  const sourceItems: PackItem[] = trip
    ? (Array.isArray(trip.pack_items) ? trip.pack_items : [])
    : []

  const safeGearList = Array.isArray(gearList) ? gearList : []
  const gearMap = useMemo(
    () => Object.fromEntries(safeGearList.map((g) => [g.id, g])),
    [safeGearList]
  )

  const packWithGear = useMemo(
    () =>
      sourceItems
        .map((item) => ({ ...item, gear: gearMap[item.gearId] }))
        .filter((item) => item.gear),
    [sourceItems, gearMap]
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
  const total = packWithGear.length
  const progress = total > 0 ? (checkedCount / total) * 100 : 0

  function handleRemove(gearId: string) {
    if (trip) {
      const next = sourceItems.filter((i) => i.gearId !== gearId)
      updateTrip.mutate({ id: trip.id, pack_items: next })
    } else {
      removeCommitted(gearId)
    }
  }

  return (
    <div className="bg-card rounded-xl border flex flex-col overflow-hidden">
      <div className="flex flex-col border-b">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="font-semibold text-sm">Pack</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{checkedCount}/{total}</span>
            {totalWeightG > 0 && <span>{formatWeight(totalWeightG)}</span>}
          </div>
        </div>
        {total > 0 && (
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto max-h-[600px]">
        {packWithGear.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            Gear 페이지에서 Pack it! 으로 추가하세요
          </div>
        ) : (
          Array.from(grouped.entries()).map(([category, items]) => {
            const catChecked = items.filter((i) => checkedGearIds.includes(i.gearId)).length
            return (
              <div key={category}>
                <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide shrink-0">
                    {category}
                  </span>
                  <div className="flex-1 border-b border-dashed border-border/60" />
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    {catChecked}/{items.length}
                  </span>
                </div>
                {items.map((item) => {
                  const isChecked = checkedGearIds.includes(item.gearId)
                  return (
                    <PackRow
                      key={item.gearId}
                      name={item.gear.name}
                      quantity={item.quantity}
                      weightG={item.gear.weight_g}
                      isChecked={isChecked}
                      onToggle={() => toggleGearCheck(item.gearId)}
                      onRemove={() => handleRemove(item.gearId)}
                    />
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function PackRow({
  name, quantity, weightG, isChecked, onToggle, onRemove,
}: {
  name: string
  quantity: number
  weightG: number
  isChecked: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Checkbox
        checked={isChecked}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
      />
      <span className={cn('flex-1 text-sm', isChecked && 'line-through text-muted-foreground')}>
        {name}
      </span>
      {quantity > 1 && (
        <span className="text-xs text-muted-foreground">×{quantity}</span>
      )}
      {weightG > 0 && !hovered && (
        <span className="text-xs text-muted-foreground">{weightG * quantity}g</span>
      )}
      {hovered && (
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
