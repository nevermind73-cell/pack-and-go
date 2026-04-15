'use client'

import { useMemo, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRecipes, type Recipe } from '@/hooks/useRecipes'
import { useShoppingStore } from '@/stores/shoppingStore'
import { useTripCheckStore } from '@/stores/tripStore'
import { RecipeDetailDialog } from './RecipeDetailDialog'

export function EatChecklist() {
  const { data: recipeList } = useRecipes()
  const shoppingStore = useShoppingStore()
  const { checkedIngredientKeys, toggleIngredientCheck } = useTripCheckStore()
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null)

  const safeList = Array.isArray(recipeList) ? recipeList : []

  const selectedRecipes = useMemo(
    () => safeList.filter((r) => shoppingStore.isSelected(r.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeList, shoppingStore.selectedRecipeIds]
  )

  const totalIngredients = selectedRecipes.reduce(
    (sum, r) => sum + (r.ingredients?.length ?? 0),
    0
  )
  const checkedCount = checkedIngredientKeys.filter((k) =>
    selectedRecipes.some((r) => k.startsWith(r.id + '::'))
  ).length

  return (
    <>
      <div className="bg-card rounded-xl border flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Eat</h2>
          <span className="text-xs text-muted-foreground">
            {checkedCount}/{totalIngredients}
          </span>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto max-h-72">
          {selectedRecipes.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              Eat 페이지에서 쇼핑 목록에 추가하세요
            </div>
          ) : (
            selectedRecipes.map((recipe) => (
              <div key={recipe.id}>
                {/* 요리명 헤더 */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <span className="text-sm font-semibold flex-1">{recipe.name}</span>
                  <button
                    onClick={() => setDetailRecipe(recipe)}
                    title="레시피 보기"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mx-4 border-b" />

                {/* 재료 목록 */}
                {recipe.ingredients?.length ? (
                  recipe.ingredients.map((ing, idx) => {
                    const key = `${recipe.id}::${idx}`
                    const isChecked = checkedIngredientKeys.includes(key)
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-muted-foreground"
                          checked={isChecked}
                          onChange={() => toggleIngredientCheck(key)}
                        />
                        <span
                          className={cn(
                            'flex-1 text-sm',
                            isChecked && 'line-through text-muted-foreground'
                          )}
                        >
                          {ing.name}
                        </span>
                        <span
                          className={cn(
                            'text-sm text-muted-foreground',
                            isChecked && 'line-through'
                          )}
                        >
                          {ing.amount}
                        </span>
                      </label>
                    )
                  })
                ) : (
                  <p className="px-4 py-2 text-sm text-muted-foreground">재료 없음</p>
                )}
              </div>
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
