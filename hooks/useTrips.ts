'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Site } from './useSites'

export interface TodoItem {
  id: string
  text: string
  checked: boolean
}

export interface TripSiteEntry {
  id: string
  site_id: string
  start_date: string
  end_date: string | null
  sort_order: number
  site: Pick<Site, 'id' | 'name' | 'lat' | 'lng' | 'distance_km' | 'address' | 'region'>
}

export interface Trip {
  id: string
  user_id: string
  title: string
  start_date: string
  end_date: string | null
  status: 'planned' | 'done'
  todos: TodoItem[]
  created_at: string
  trip_sites: TripSiteEntry[]
}

export interface CreateTripInput {
  title: string
  start_date: string
  end_date?: string
  sites?: { site_id: string; start_date: string; end_date?: string }[]
}

async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const r = await fetch(input, init)
  if (r.status === 204) return null
  const json = await r.json()
  if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
  return json
}

export function useCurrentTrip() {
  return useQuery<Trip | null>({
    queryKey: ['current-trip'],
    queryFn: () => apiFetch('/api/trips'),
  })
}

export function useCreateTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTripInput) =>
      apiFetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['current-trip'] }),
  })
}

export interface UpdateTripInput {
  id: string
  status?: string
  todos?: TodoItem[]
  title?: string
  start_date?: string
  end_date?: string
  sites?: { site_id: string; start_date: string; end_date?: string }[]
}

export function useUpdateTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateTripInput) =>
      apiFetch(`/api/trips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['current-trip'] }),
  })
}

export function useDeleteTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/trips/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['current-trip'] }),
  })
}
