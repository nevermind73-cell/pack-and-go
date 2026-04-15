'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Ingredient {
  name: string
  amount: string
}

export interface Recipe {
  id: string
  user_id: string
  name: string
  category: string | null
  servings: number
  instructions: string | null
  ingredients: Ingredient[]
  sort_order: number
  is_favorite: boolean
  created_at: string
}

export interface CreateRecipeInput {
  name: string
  category?: string
  servings?: number
  instructions?: string
  ingredients?: Ingredient[]
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {}

async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const r = await fetch(input, init)
  const json = await r.json()
  if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
  return json
}

export function useRecipes() {
  return useQuery<Recipe[]>({
    queryKey: ['recipes'],
    queryFn: () => apiFetch('/api/recipes'),
  })
}

export function useCreateRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRecipeInput) =>
      apiFetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useUpdateRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateRecipeInput & { id: string }) =>
      apiFetch(`/api/recipes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useDeleteRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/recipes/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useReorderRecipes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: { id: string; sort_order: number }[]) =>
      Promise.all(
        updates.map(({ id, sort_order }) =>
          fetch(`/api/recipes/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sort_order }),
          })
        )
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useToggleRecipeFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, is_favorite }: { id: string; is_favorite: boolean }) =>
      apiFetch(`/api/recipes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite }),
      }),
    onMutate: async ({ id, is_favorite }) => {
      await qc.cancelQueries({ queryKey: ['recipes'] })
      const previous = qc.getQueryData<Recipe[]>(['recipes'])
      qc.setQueryData<Recipe[]>(['recipes'], (old) =>
        old?.map((r) => (r.id === id ? { ...r, is_favorite } : r)) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['recipes'], context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}
