'use client'

import { useMemo, useState } from 'react'
import { BookOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { useRecipes, type Recipe } from '@/hooks/useRecipes'
import { useShoppingStore } from '@/stores/shoppingStore'
import { useTripCheckStore } from '@/stores/tripStore'
import { useCurrentTrip, useUpdateTrip } from '@/hooks/useTrips'
import { RecipeDetailDialog } from './RecipeDetailDialog'

export function EatChecklist() {
  const { data: trip } = useCurrentTrip()
  const updateTrip = useUpdateTrip()
  const { data: recipeList } = useRecipes()
  const shoppingStore = useShoppingStore()
  const { checkedIngredientKeys, toggleIngredientCheck } = useTripCheckStore()
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null)

  const safeList = Array.isArray(recipeList) ? recipeList : []

  const sourceIds: string[] = trip
    ? (Array.isArray(trip.shopping_recipe_ids) ? trip.shopping_recipe_ids : [])
    : []

  const selectedRecipes = useMemo(
    () => safeList.filter((r) => sourceIds.includes(r.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeList, sourceIds.join(',')]
  )

  const totalIngredients = selectedRecipes.reduce(
    (sum, r) => sum + (r.ingredients?.length ?? 0),
    0
  )
  const checkedCount = checkedIngredientKeys.filter((k) =>
    selectedRecipes.some((r) => k.startsWith(r.id + '::'))
  ).length
  const progress = totalIngredients > 0 ? (checkedCount / totalIngredients) * 100 : 0

  function handleRemoveRecipe(recipeId: string) {
    if (trip) {
      const next = sourceIds.filter((id) => id !== recipeId)
      updateTrip.mutate({ id: trip.id, shopping_recipe_ids: next })
    } else {
      shoppingStore.removeCommitted(recipeId)
    }
  }

  return (
    <>
      <div className="bg-card rounded-xl border flex flex-col overflow-hidden">
        <div className="flex flex-col border-b">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <h2 className="font-semibold text-sm">Eat</h2>
            <span className="text-xs text-muted-foreground">
              {checkedCount}/{totalIngredients}
            </span>
          </div>
          {totalIngredients > 0 && (
            <div className="h-1 bg-muted">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto max-h-[600px]">
          {selectedRecipes.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              Eat 페이지에서 쇼핑 목록에 추가하세요
            </div>
          ) : (
            selectedRecipes.map((recipe) => (
              <RecipeSection
                key={recipe.id}
                recipe={recipe}
                checkedIngredientKeys={checkedIngredientKeys}
                onToggleIngredient={toggleIngredientCheck}
                onRemoveRecipe={() => handleRemoveRecipe(recipe.id)}
                onShowDetail={() => setDetailRecipe(recipe)}
              />
            ))
          )}
        </div>
      </div>

      <RecipeDetailDialog
        recipe={detailRecipe}
        open={detailRecipe !== null}
        onOpenChange={(open) => { if (!open) setDetailRecipe(null) }}
      />
    </>
  )
}

function RecipeSection({
  recipe, checkedIngredientKeys, onToggleIngredient, onRemoveRecipe, onShowDetail,
}: {
  recipe: Recipe
  checkedIngredientKeys: string[]
  onToggleIngredient: (key: string) => void
  onRemoveRecipe: () => void
  onShowDetail: () => void
}) {
  const [headerHovered, setHeaderHovered] = useState(false)
  const recipeChecked = checkedIngredientKeys.filter((k) => k.startsWith(recipe.id + '::')).length
  const recipeTotal = recipe.ingredients?.length ?? 0

  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 pt-3 pb-1"
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
      >
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide flex-1">{recipe.name}</span>
        <div className="flex-1 border-b border-dashed border-border/60" />
        <span className="text-xs font-mono text-muted-foreground shrink-0">{recipeChecked}/{recipeTotal}</span>
        <button
          onClick={onShowDetail}
          title="레시피 보기"
          className="text-muted-foreground hover:text-foreground transition-colors ml-1"
        >
          <BookOpen className="h-3.5 w-3.5" />
        </button>
        {headerHovered && (
          <button
            onClick={onRemoveRecipe}
            title="목록에서 제거"
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {recipe.ingredients?.length ? (
        recipe.ingredients.map((ing, idx) => {
          const key = `${recipe.id}::${idx}`
          const isChecked = checkedIngredientKeys.includes(key)
          return (
            <label
              key={key}
              className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer"
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => onToggleIngredient(key)}
                className="data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
              />
              <span className={cn('flex-1 text-sm', isChecked && 'line-through text-muted-foreground')}>
                {ing.name}
              </span>
              <span className={cn('text-sm text-muted-foreground', isChecked && 'line-through')}>
                {ing.amount}
              </span>
            </label>
          )
        })
      ) : (
        <p className="px-4 py-2 text-sm text-muted-foreground">재료 없음</p>
      )}
    </div>
  )
}
