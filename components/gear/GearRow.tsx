'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Gear } from '@/hooks/useGear'

function formatWeight(g: number | null | undefined): string {
  const n = Number(g)
  if (!n) return '—'
  if (n < 1000) return `${n}g`
  return `${(n / 1000).toFixed(2)}kg`
}

interface GearRowProps {
  gear: Gear
  isInPack: boolean
  onTogglePack: () => void
  onEdit: () => void
  onDetail: () => void
}

export function GearRow({ gear, isInPack, onTogglePack, onEdit, onDetail }: GearRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: gear.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 rounded-sm select-none cursor-pointer',
        isDragging && 'opacity-40 bg-muted z-50'
      )}
      onClick={onDetail}
    >
      {/* 드래그 핸들 */}
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 touch-none"
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      {/* 체크박스 */}
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        <Checkbox
          checked={isInPack}
          onCheckedChange={onTogglePack}
        />
      </div>

      {/* 구분 */}
      {gear.gear_type ? (
        <Badge variant="secondary" className="text-xs shrink-0 font-normal">
          {gear.gear_type}
        </Badge>
      ) : (
        <span className="w-12 shrink-0" />
      )}

      {/* 장비명 */}
      <span className="flex-1 text-sm font-medium truncate min-w-0">{gear.name}</span>

      {/* 제조사 */}
      <span className="text-xs text-muted-foreground w-20 truncate hidden sm:block">
        {gear.manufacturer ?? ''}
      </span>

      {/* 사용 횟수 */}
      <span className="text-xs text-muted-foreground w-10 text-right hidden md:block">
        {Number(gear.use_count) > 0 ? `${gear.use_count}회` : '—'}
      </span>

      {/* 무게 */}
      <span className="text-xs text-right w-14 shrink-0">
        {formatWeight(gear.weight_g)}
      </span>

      {/* 수정 버튼 (hover) */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
        onClick={(e) => { e.stopPropagation(); onEdit() }}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
