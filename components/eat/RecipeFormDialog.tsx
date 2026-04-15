'use client'

import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
  useRecipes,
  type Recipe,
  type Ingredient,
} from '@/hooks/useRecipes'

interface RecipeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe?: Recipe
}

export function RecipeFormDialog({ open, onOpenChange, recipe }: RecipeFormDialogProps) {
  const isEdit = !!recipe
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [instructions, setInstructions] = useState('')
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', amount: '' }])

  const { data: recipeList } = useRecipes()
  const existingCategories = [
    ...new Set(
      (Array.isArray(recipeList) ? recipeList : [])
        .map((r) => r.category)
        .filter(Boolean) as string[]
    ),
  ]

  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()
  const deleteRecipe = useDeleteRecipe()

  useEffect(() => {
    if (open) {
      setName(recipe?.name ?? '')
      setCategory(recipe?.category ?? '')
      setInstructions(recipe?.instructions ?? '')
      setIngredients(
        recipe?.ingredients?.length
          ? recipe.ingredients.map((i) => ({ name: i.name, amount: i.amount }))
          : [{ name: '', amount: '' }]
      )
    }
  }, [open, recipe])

  function addIngredient() {
    setIngredients((prev) => [...prev, { name: '', amount: '' }])
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function updateIngredient(index: number, field: keyof Ingredient, value: string) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('요리 이름을 입력해주세요.')
      return
    }

    const filteredIngredients = ingredients.filter((i) => i.name.trim())

    const payload = {
      name: name.trim(),
      category: category.trim() || undefined,
      instructions: instructions.trim() || undefined,
      ingredients: filteredIngredients,
    }

    if (isEdit) {
      await updateRecipe.mutateAsync(
        { id: recipe.id, ...payload },
        {
          onSuccess: () => { toast.success('레시피가 수정되었습니다.'); onOpenChange(false) },
          onError: () => toast.error('수정에 실패했습니다.'),
        }
      )
    } else {
      await createRecipe.mutateAsync(payload, {
        onSuccess: () => { toast.success('레시피가 추가되었습니다.'); onOpenChange(false) },
        onError: () => toast.error('추가에 실패했습니다.'),
      })
    }
  }

  async function handleDelete() {
    if (!recipe) return
    if (!confirm(`"${recipe.name}"을(를) 삭제하시겠습니까?`)) return
    await deleteRecipe.mutateAsync(recipe.id, {
      onSuccess: () => { toast.success('레시피가 삭제되었습니다.'); onOpenChange(false) },
      onError: () => toast.error('삭제에 실패했습니다.'),
    })
  }

  const isPending = createRecipe.isPending || updateRecipe.isPending || deleteRecipe.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '레시피 수정' : '새 레시피 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이름 + 구분 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="recipe-name">이름 *</Label>
              <Input
                id="recipe-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 부대찌개"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recipe-category">구분</Label>
              <Input
                id="recipe-category"
                list="recipe-category-list"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="예: 한식"
                autoComplete="off"
              />
              <datalist id="recipe-category-list">
                {existingCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          {/* 재료 */}
          <div className="space-y-1.5">
            <Label>재료</Label>
            <div className="space-y-2">
              {ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={ing.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    placeholder="재료 이름"
                    className="flex-1"
                  />
                  <Input
                    value={ing.amount}
                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                    placeholder="수량 (예: 1개)"
                    className="w-32"
                  />
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addIngredient}
              className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              재료 추가
            </button>
          </div>

          {/* 레시피 (instructions) */}
          <div className="space-y-1.5">
            <Label htmlFor="recipe-instructions">레시피</Label>
            <Textarea
              id="recipe-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="조리 방법을 자유롭게 작성해주세요."
              rows={5}
            />
          </div>

          <DialogFooter className="flex-row items-center">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
                className="mr-auto"
              >
                삭제
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '저장 중...' : isEdit ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
