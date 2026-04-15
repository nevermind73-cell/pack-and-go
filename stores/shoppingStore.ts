'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ShoppingStore {
  selectedRecipeIds: string[]
  toggleRecipe: (id: string) => void
  isSelected: (id: string) => boolean
  clear: () => void
}

export const useShoppingStore = create<ShoppingStore>()(
  persist(
    (set, get) => ({
      selectedRecipeIds: [],

      toggleRecipe: (id) =>
        set((s) => ({
          selectedRecipeIds: s.selectedRecipeIds.includes(id)
            ? s.selectedRecipeIds.filter((x) => x !== id)
            : [...s.selectedRecipeIds, id],
        })),

      isSelected: (id) => get().selectedRecipeIds.includes(id),

      clear: () => set({ selectedRecipeIds: [] }),
    }),
    { name: 'pack-and-go:shopping' }
  )
)
