'use client'

import { useMemo } from 'react'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRecipes } from '@/hooks/useRecipes'
import { useShoppingStore } from '@/stores/shoppingStore'
import { useCurrentTrip, useUpdateTrip } from '@/hooks/useTrips'

export function ShoppingPanel() {
  const { data: recipeList } = useRecipes()
  const shoppingStore = useShoppingStore()
  const { data: currentTrip } = useCurrentTrip()
  const updateTrip = useUpdateTrip()

  const safeList = Array.isArray(recipeList) ? recipeList : []

  const selectedRecipes = useMemo(
    () => safeList.filter((r) => shoppingStore.isSelected(r.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeList, shoppingStore.selectedRecipeIds]
  )

  function handleRemoveRecipe(id: string) {
    shoppingStore.toggleRecipe(id)
  }

  async function handleAddToShoppingList() {
    if (selectedRecipes.length === 0) {
      toast.error('레시피를 선택해주세요.')
      return
    }

    // 기존 홈 체크리스트와 중복 없이 병합
    const existingIds: string[] = currentTrip
      ? (Array.isArray(currentTrip.shopping_recipe_ids) ? currentTrip.shopping_recipe_ids : [])
      : shoppingStore.committedRecipeIds

    const existingSet = new Set(existingIds)
    const newIds = shoppingStore.selectedRecipeIds.filter((id) => !existingSet.has(id))
    const merged = [...existingIds, ...newIds]

    // 로컬 store 먼저 반영
    shoppingStore.commitMerged(merged)

    // DB 여행이 있으면 저장 시도
    if (currentTrip) {
      try {
        await updateTrip.mutateAsync({ id: currentTrip.id, shopping_recipe_ids: merged })
      } catch {
        toast.error('서버 저장 실패 — 로컬에만 반영됩니다')
      }
    }

    const total = selectedRecipes.reduce((sum, r) => sum + (r.ingredients?.length ?? 0), 0)
    toast.success(`${newIds.length > 0 ? `${newIds.length}개 추가` : '이미 모두 등록됨'} — 홈 체크리스트에 반영되었습니다.`)
  }

  return (
    <div className="flex flex-col h-full border-l">
      {/* 헤더 */}
      <div className="p-3 border-b shrink-0">
        <Button className="w-full" onClick={handleAddToShoppingList}>
          쇼핑 리스트에 추가
        </Button>
      </div>

      {/* 재료 목록 */}
      <div className="flex-1 overflow-y-auto">
        {selectedRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm text-center px-4">
            <p>레시피 체크박스를 선택하면</p>
            <p>재료가 여기에 표시됩니다.</p>
          </div>
        ) : (
          selectedRecipes.map((recipe) => (
            <div key={recipe.id}>
              {/* 요리명 헤더 */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <span className="text-sm font-semibold">{recipe.name}</span>
                <button
                  onClick={() => handleRemoveRecipe(recipe.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mx-4 border-b" />

              {/* 재료 목록 */}
              {recipe.ingredients?.length ? (
                recipe.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20"
                  >
                    <span className="text-sm">{ing.name}</span>
                    <span className="text-sm text-muted-foreground">{ing.amount}</span>
                  </div>
                ))
              ) : (
                <p className="px-4 py-2 text-sm text-muted-foreground">재료 없음</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
