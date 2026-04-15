'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const SITE_TYPES = ['백패킹', '휴양림', '사설 캠핑장', '국립 캠핑장', '지자체 캠핑장', '섬/바다'] as const
export type SiteType = (typeof SITE_TYPES)[number]

export interface Site {
  id: string
  user_id: string
  name: string
  site_type: SiteType
  region: string
  address: string | null
  lat: number | null
  lng: number | null
  visit_count: number
  parking: string | null
  distance_km: number | null
  reservation: string | null
  price: string | null
  memo: string | null
  is_favorite: boolean
  sort_order: number
  created_at: string
}

export interface CreateSiteInput {
  name: string
  site_type: SiteType
  region: string
  address?: string
  lat?: number
  lng?: number
  visit_count?: number
  parking?: string
  distance_km?: number
  reservation?: string
  price?: string
  memo?: string
}

export interface UpdateSiteInput extends Partial<CreateSiteInput> {
  sort_order?: number
  is_favorite?: boolean
}

async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const r = await fetch(input, init)
  if (r.status === 204) return null
  const json = await r.json()
  if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
  return json
}

export function useSites() {
  return useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => apiFetch('/api/sites'),
  })
}

export function useCreateSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSiteInput) =>
      apiFetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}

export function useUpdateSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateSiteInput & { id: string }) =>
      apiFetch(`/api/sites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}

export function useDeleteSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/sites/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}

export function useToggleFavoriteSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, is_favorite }: { id: string; is_favorite: boolean }) =>
      apiFetch(`/api/sites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite }),
      }),
    onMutate: async ({ id, is_favorite }) => {
      await qc.cancelQueries({ queryKey: ['sites'] })
      const previous = qc.getQueryData<Site[]>(['sites'])
      qc.setQueryData<Site[]>(['sites'], (old) =>
        old?.map((s) => (s.id === id ? { ...s, is_favorite } : s))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['sites'], context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}

export function useReorderSites() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: { id: string; sort_order: number }[]) =>
      Promise.all(
        updates.map(({ id, sort_order }) =>
          fetch(`/api/sites/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sort_order }),
          })
        )
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}
