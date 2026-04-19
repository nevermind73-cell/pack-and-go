'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type PriceCurrency = 'KRW' | 'USD' | 'JPY'

export interface WishlistItem {
  id: string
  user_id: string
  name: string
  category: string | null
  manufacturer: string | null
  price: number | null
  price_currency: PriceCurrency | null
  weight_g: number | null
  memo: string | null
  url: string | null
  created_at: string
}

export interface WishlistInput {
  name: string
  category?: string
  manufacturer?: string
  price?: number
  price_currency?: PriceCurrency
  weight_g?: number
  memo?: string
  url?: string
}

async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const r = await fetch(input, init)
  if (r.status === 204) return null
  const json = await r.json()
  if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
  return json
}

export function useWishlist() {
  return useQuery<WishlistItem[]>({
    queryKey: ['wishlist'],
    queryFn: () => apiFetch('/api/wishlist'),
  })
}

export function useCreateWishlistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: WishlistInput) =>
      apiFetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  })
}

export function useUpdateWishlistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: WishlistInput & { id: string }) =>
      apiFetch(`/api/wishlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  })
}

export function useDeleteWishlistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/wishlist/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  })
}
