'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface DiaryPhoto {
  url: string
  caption: string
}

export interface DiaryListItem {
  id: string
  photos: DiaryPhoto[]
  created_at: string
  trip: {
    id: string
    title: string
    start_date: string
    end_date: string | null
    trip_sites: Array<{
      sort_order: number
      site: { id: string; name: string; site_type: string; region: string; lat: number | null; lng: number | null }
    }>
  }
}

export interface DiaryGearItem {
  gearId: string
  quantity: number
  isWorn: boolean
  isConsumable: boolean
  gear: { id: string; name: string; category: string | null; weight_g: number }
}

export interface DiaryRecipe {
  id: string
  name: string
  category: string | null
}

export interface DiaryDetail {
  id: string
  content: string
  photos: DiaryPhoto[]
  created_at: string
  updated_at: string
  trip: {
    id: string
    title: string
    start_date: string
    end_date: string | null
    pack_items: unknown[]
    shopping_recipe_ids: string[]
    trip_sites: Array<{
      sort_order: number
      site: { id: string; name: string; site_type: string; region: string; lat: number | null; lng: number | null }
    }>
  }
  gear_items: DiaryGearItem[]
  recipes: DiaryRecipe[]
}

export interface DiaryListResponse {
  data: DiaryListItem[]
  total: number
  page: number
  totalPages: number
}

export interface DiaryListParams {
  search?: string
  site_type?: string
  sort?: 'latest' | 'oldest' | 'name'
  page?: number
  limit?: number
}

async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const r = await fetch(input, init)
  if (r.status === 204) return null
  const json = await r.json()
  if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
  return json
}

export function useDiaries(params: DiaryListParams = {}) {
  const { search = '', site_type = '', sort = 'latest', page = 1, limit = 9 } = params
  const qs = new URLSearchParams({
    search,
    site_type,
    sort,
    page: String(page),
    limit: String(limit),
  })
  return useQuery<DiaryListResponse>({
    queryKey: ['diaries', search, site_type, sort, page, limit],
    queryFn: () => apiFetch(`/api/diary?${qs}`),
  })
}

export function useDiary(id: string) {
  return useQuery<DiaryDetail>({
    queryKey: ['diary', id],
    queryFn: () => apiFetch(`/api/diary/${id}`),
    enabled: !!id,
  })
}

export function useUpdateDiary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; content?: string; photos?: DiaryPhoto[] }) =>
      apiFetch(`/api/diary/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['diary', variables.id] })
      qc.invalidateQueries({ queryKey: ['diaries'] })
    },
  })
}

export function useUploadDiaryPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      const r = await fetch(`/api/diary/${id}/photos`, { method: 'POST', body: formData })
      const json = await r.json()
      if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
      return json as { photos: DiaryPhoto[]; url: string }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['diary', variables.id] })
      qc.invalidateQueries({ queryKey: ['diaries'] })
    },
  })
}

export function useDeleteDiary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/diary/${id}`, { method: 'DELETE' })
      if (r.status === 204) return
      const json = await r.json()
      if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diaries'] })
    },
  })
}

export function useDeleteDiaryPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      const r = await fetch(`/api/diary/${id}/photos?url=${encodeURIComponent(url)}`, { method: 'DELETE' })
      const json = await r.json()
      if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
      return json as { photos: DiaryPhoto[] }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['diary', variables.id] })
      qc.invalidateQueries({ queryKey: ['diaries'] })
    },
  })
}
