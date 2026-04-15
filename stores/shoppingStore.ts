'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ShoppingStore {
  // Eat 페이지에서 체크 중인 임시 선택
  selectedRecipeIds: string[]
  toggleRecipe: (id: string) => void
  isSelected: (id: string) => boolean
  clear: () => void

  // 홈에 실제 반영된 목록 (쇼핑 리스트에 추가 버튼 클릭 시 저장)
  committedRecipeIds: string[]
  commit: () => void
  isCommitted: (id: string) => boolean
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

      committedRecipeIds: [],

      commit: () =>
        set((s) => ({ committedRecipeIds: [...s.selectedRecipeIds] })),

      isCommitted: (id) => get().committedRecipeIds.includes(id),
    }),
    { name: 'pack-and-go:shopping' }
  )
)
