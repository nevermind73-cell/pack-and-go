'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PackItem {
  gearId: string
  quantity: number
  isWorn: boolean
  isConsumable: boolean
}

interface PackStore {
  // 작업 중인 Pack (Gear 페이지)
  items: PackItem[]
  addItem: (gearId: string) => void
  removeItem: (gearId: string) => void
  updateQuantity: (gearId: string, qty: number) => void
  toggleWorn: (gearId: string) => void
  toggleConsumable: (gearId: string) => void
  clear: () => void
  hasItem: (gearId: string) => boolean
  loadItems: (gearIds: string[]) => void

  // Pack! 버튼으로 확정된 Pack (홈 체크리스트)
  committedItems: PackItem[]
  commit: () => void
  clearCommitted: () => void
}

export const usePackStore = create<PackStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (gearId) => {
        if (!get().hasItem(gearId)) {
          set((s) => ({
            items: [...s.items, { gearId, quantity: 1, isWorn: false, isConsumable: false }],
          }))
        }
      },

      removeItem: (gearId) =>
        set((s) => ({ items: s.items.filter((i) => i.gearId !== gearId) })),

      updateQuantity: (gearId, qty) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.gearId === gearId ? { ...i, quantity: Math.max(1, qty) } : i
          ),
        })),

      toggleWorn: (gearId) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.gearId === gearId ? { ...i, isWorn: !i.isWorn } : i
          ),
        })),

      toggleConsumable: (gearId) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.gearId === gearId ? { ...i, isConsumable: !i.isConsumable } : i
          ),
        })),

      clear: () => set({ items: [] }),

      hasItem: (gearId) => get().items.some((i) => i.gearId === gearId),

      loadItems: (gearIds) => {
        const existing = new Set(get().items.map((i) => i.gearId))
        const newItems = gearIds
          .filter((id) => !existing.has(id))
          .map((gearId) => ({ gearId, quantity: 1, isWorn: false, isConsumable: false }))
        set((s) => ({ items: [...s.items, ...newItems] }))
      },

      // 현재 items를 홈 체크리스트에 확정
      committedItems: [],
      commit: () => set((s) => ({ committedItems: [...s.items] })),
      clearCommitted: () => set({ committedItems: [] }),
    }),
    { name: 'pack-and-go:pack' }
  )
)
