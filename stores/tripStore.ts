'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Pack 체크리스트와 Eat 식재료 체크 상태를 로컬에 저장
interface TripCheckStore {
  // gear ID 목록 (체크된 항목)
  checkedGearIds: string[]
  toggleGearCheck: (id: string) => void
  clearGearChecks: () => void

  // "recipeId::ingredientIdx" 형태의 키 목록 (체크된 항목)
  checkedIngredientKeys: string[]
  toggleIngredientCheck: (key: string) => void
  clearIngredientChecks: () => void
}

export const useTripCheckStore = create<TripCheckStore>()(
  persist(
    (set, get) => ({
      checkedGearIds: [],
      toggleGearCheck: (id) =>
        set((s) => ({
          checkedGearIds: s.checkedGearIds.includes(id)
            ? s.checkedGearIds.filter((x) => x !== id)
            : [...s.checkedGearIds, id],
        })),
      clearGearChecks: () => set({ checkedGearIds: [] }),

      checkedIngredientKeys: [],
      toggleIngredientCheck: (key) =>
        set((s) => ({
          checkedIngredientKeys: s.checkedIngredientKeys.includes(key)
            ? s.checkedIngredientKeys.filter((x) => x !== key)
            : [...s.checkedIngredientKeys, key],
        })),
      clearIngredientChecks: () => set({ checkedIngredientKeys: [] }),
    }),
    { name: 'pack-and-go:trip-checks' }
  )
)
