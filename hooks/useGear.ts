'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Gear {
  id: string
  user_id: string
  name: string
  category: string | null
  gear_type: string | null
  manufacturer: string | null
  weight_g: number
  use_count: number
  sort_order: number
  memo: string | null
  created_at: string
}

export interface GearGroup {
  id: string
  user_id: string
  name: string
  is_favorite: boolean
  created_at: string
  gear_group_items: {
    gear_id: string
    quantity: number
    gear: Gear
  }[]
}

export interface CreateGearInput {
  name: string
  category?: string
  gear_type?: string
  manufacturer?: string
  weight_g?: number
  use_count?: number
  memo?: string
}

export interface UpdateGearInput extends Partial<CreateGearInput> {}

// ── Gear ──────────────────────────────────────────────

async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const r = await fetch(input, init)
  const json = await r.json()
  if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
  return json
}

export function useGear() {
  return useQuery<Gear[]>({
    queryKey: ['gear'],
    queryFn: () => apiFetch('/api/gear'),
  })
}

export function useCreateGear() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGearInput) =>
      apiFetch('/api/gear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gear'] }),
  })
}

export function useUpdateGear() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateGearInput & { id: string }) =>
      apiFetch(`/api/gear/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gear'] })
      qc.invalidateQueries({ queryKey: ['gear-groups'] })
    },
  })
}

export function useDeleteGear() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/gear/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gear'] })
      qc.invalidateQueries({ queryKey: ['gear-groups'] })
    },
  })
}

export function useReorderGear() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: { id: string; sort_order: number }[]) =>
      Promise.all(
        updates.map(({ id, sort_order }) =>
          fetch(`/api/gear/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sort_order }),
          })
        )
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gear'] }),
  })
}

// ── Gear Groups ───────────────────────────────────────

export function useGearGroups() {
  return useQuery<GearGroup[]>({
    queryKey: ['gear-groups'],
    queryFn: () => apiFetch('/api/gear/groups'),
  })
}

export function useCreateGearGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch('/api/gear/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gear-groups'] }),
  })
}

export function useUpdateGearGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; is_favorite?: boolean }) =>
      apiFetch(`/api/gear/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gear-groups'] }),
  })
}

export function useDeleteGearGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/gear/groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gear-groups'] }),
  })
}

export function useAddGearToGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, gearId, quantity = 1 }: { groupId: string; gearId: string; quantity?: number }) =>
      apiFetch(`/api/gear/groups/${groupId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gear_id: gearId, quantity }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gear-groups'] }),
  })
}

export function useRemoveGearFromGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, gearId }: { groupId: string; gearId: string }) =>
      fetch(`/api/gear/groups/${groupId}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gear_id: gearId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gear-groups'] }),
  })
}
