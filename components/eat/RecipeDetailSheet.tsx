'use client'

import { Star, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Recipe } from '@/hooks/useRecipes'

interface RecipeDetailSheetProps {
  recipe: Recipe | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (recipe: Recipe) => void
}

export function RecipeDetailSheet({ recipe, open, onOpenChange, onEdit }: RecipeDetailSheetProps) {
  if (!recipe) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="p-5 pb-4 border-b">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="flex flex-col gap-1.5 min-w-0">
              {recipe.category && (
                <Badge variant="outline" className="text-xs font-normal w-fit">
                  {recipe.category}
                </Badge>
              )}
              <SheetTitle className="text-lg leading-snug">
                {recipe.is_favorite && (
                  <Star className="inline h-4 w-4 fill-yellow-400 text-yellow-400 mr-1.5 -mt-0.5" />
                )}
                {recipe.name}
              </SheetTitle>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 mt-0.5"
              onClick={() => {
                onOpenChange(false)
                onEdit(recipe)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* 재료 */}
          {recipe.ingredients?.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                재료
              </h3>
              <div className="space-y-0">
                {recipe.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2.5 border-b last:border-0"
                  >
                    <span className="text-sm">{ing.name}</span>
                    <span className="text-sm text-muted-foreground">{ing.amount}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 레시피 */}
          {recipe.instructions && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                레시피
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
                {recipe.instructions}
              </p>
            </section>
          )}

          {!recipe.ingredients?.length && !recipe.instructions && (
            <p className="text-sm text-muted-foreground text-center py-8">
              등록된 내용이 없습니다.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
