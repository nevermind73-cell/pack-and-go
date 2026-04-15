'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { Plus, Search, GripVertical, Pencil, ChevronDown, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RecipeFormDialog } from './RecipeFormDialog'
import { RecipeDetailSheet } from './RecipeDetailSheet'
import { useRecipes, useReorderRecipes, useToggleRecipeFavorite, type Recipe } from '@/hooks/useRecipes'
import { useShoppingStore } from '@/stores/shoppingStore'

type SortKey = 'newest' | 'oldest' | 'alpha'

const SORT_LABELS: Record<SortKey, string> = {
  newest: '최신 순',
  oldest: '오래된 순',
  alpha: '가나다 순',
}

// ── SortableRecipeCard ────────────────────────────────────
interface RecipeCardProps {
  recipe: Recipe
  isSelected: boolean
  onToggle: () => void
  onEdit: () => void
  onToggleFavorite: () => void
  onCardClick: () => void
  isDragDisabled: boolean
}

function SortableRecipeCard({ recipe, isSelected, onToggle, onEdit, onToggleFavorite, onCardClick, isDragDisabled }: RecipeCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: recipe.id, disabled: isDragDisabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onCardClick}
      className={`group relative rounded-lg border bg-card p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow cursor-pointer ${
        isSelected ? 'border-primary/50 bg-primary/5' : ''
      }`}
    >
      {/* 상단: 체크박스 + 즐겨찾기 + edit + drag — 클릭 이벤트 차단 */}
      <div
        className="flex items-center justify-between"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
        />
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFavorite}
            className={`transition-opacity ${
              recipe.is_favorite
                ? 'opacity-100 text-yellow-400'
                : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-yellow-400'
            }`}
            title={recipe.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
          >
            <Star className={`h-3.5 w-3.5 ${recipe.is_favorite ? 'fill-yellow-400' : ''}`} />
          </button>
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {!isDragDisabled && (
            <button
              {...attributes}
              {...listeners}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground/60 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none transition-opacity"
              tabIndex={-1}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 카테고리 배지 */}
      {recipe.category ? (
        <Badge variant="outline" className="text-xs font-normal w-fit">
          {recipe.category}
        </Badge>
      ) : (
        <div className="h-5" />
      )}

      {/* 요리 이름 */}
      <span className="text-sm font-semibold leading-snug line-clamp-2">{recipe.name}</span>
    </div>
  )
}

// ── RecipeListPanel ───────────────────────────────────────
export function RecipeListPanel() {
  const { data: recipeList, isLoading } = useRecipes()
  const reorderRecipes = useReorderRecipes()
  const toggleFavorite = useToggleRecipeFavorite()
  const shoppingStore = useShoppingStore()

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [favOnly, setFavOnly] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Recipe | undefined>()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<Recipe | undefined>()
  const [detailOpen, setDetailOpen] = useState(false)
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const safeList = Array.isArray(recipeList) ? recipeList : []

  const sortedAndFiltered = useMemo(() => {
    let list: Recipe[]

    if (sortKey === 'newest') {
      list = localOrder
        ? [
            ...localOrder.map((id) => safeList.find((r) => r.id === id)).filter(Boolean) as Recipe[],
            ...safeList.filter((r) => !localOrder.includes(r.id)),
          ]
        : [...safeList].sort((a, b) => {
            if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
    } else if (sortKey === 'oldest') {
      list = [...safeList].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    } else {
      list = [...safeList].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    }

    if (favOnly) {
      list = list.filter((r) => r.is_favorite)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q)
      )
    }

    return list
  }, [safeList, localOrder, sortKey, favOnly, search])

  const isDragDisabled = sortKey !== 'newest'

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sortedAndFiltered.findIndex((r) => r.id === active.id)
    const newIndex = sortedAndFiltered.findIndex((r) => r.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(sortedAndFiltered, oldIndex, newIndex)
    const newIds = reordered.map((r) => r.id)
    setLocalOrder(newIds)

    const updates = newIds.map((id, idx) => ({ id, sort_order: idx }))
    reorderRecipes.mutate(updates, {
      onError: () => {
        setLocalOrder(null)
        toast.error('순서 저장에 실패했습니다.')
      },
      onSuccess: () => setLocalOrder(null),
    })
  }

  function handleEdit(recipe: Recipe) {
    setEditTarget(recipe)
    setEditDialogOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 툴바 */}
      <div className="flex flex-col gap-2 p-3 border-b shrink-0">
        {/* 1행: 추가 버튼 + 검색 */}
        <div className="flex gap-2">
          <Button size="sm" className="h-8 shrink-0" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            새 레시피 추가
          </Button>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="레시피 검색"
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* 2행: 즐겨찾기 토글 + 정렬 */}
        <div className="flex gap-2">
          <div className="flex h-8 rounded-md border border-input overflow-hidden text-sm">
            <button
              onClick={() => setFavOnly(false)}
              className={`px-3 transition-colors ${
                !favOnly ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFavOnly(true)}
              className={`px-3 transition-colors ${
                favOnly ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              즐겨찾기
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 h-8 shrink-0 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
              {SORT_LABELS[sortKey]}
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* 레시피 카드 그리드 */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : sortedAndFiltered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
            <p>{search ? '검색 결과가 없습니다.' : '레시피가 없습니다. 첫 레시피를 추가해보세요!'}</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedAndFiltered.map((r) => r.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sortedAndFiltered.map((recipe) => (
                  <SortableRecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isSelected={shoppingStore.isSelected(recipe.id)}
                    onToggle={() => shoppingStore.toggleRecipe(recipe.id)}
                    onEdit={() => handleEdit(recipe)}
                    onToggleFavorite={() =>
                      toggleFavorite.mutate(
                        { id: recipe.id, is_favorite: !recipe.is_favorite },
                        { onError: () => toast.error('즐겨찾기 저장에 실패했습니다.') }
                      )
                    }
                    onCardClick={() => { setDetailTarget(recipe); setDetailOpen(true) }}
                    isDragDisabled={isDragDisabled}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <RecipeFormDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <RecipeFormDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) setEditTarget(undefined)
        }}
        recipe={editTarget}
      />
      <RecipeDetailSheet
        recipe={detailTarget}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailTarget(undefined)
        }}
        onEdit={(recipe) => {
          setEditTarget(recipe)
          setEditDialogOpen(true)
        }}
      />
    </div>
  )
}
