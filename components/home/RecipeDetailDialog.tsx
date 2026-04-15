'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Recipe } from '@/hooks/useRecipes'

interface RecipeDetailDialogProps {
  recipe: Recipe | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecipeDetailDialog({ recipe, open, onOpenChange }: RecipeDetailDialogProps) {
  if (!recipe) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {recipe.name}
            {recipe.category && (
              <Badge variant="secondary" className="text-xs">
                {recipe.category}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-xs text-muted-foreground">{recipe.servings}인분</p>

          {recipe.instructions && (
            <div>
              <p className="text-sm font-medium mb-2">조리 방법</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {recipe.instructions}
              </p>
            </div>
          )}

          {!recipe.instructions && (
            <p className="text-sm text-muted-foreground">조리 방법이 없습니다.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
