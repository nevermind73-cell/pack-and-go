'use client'

import { useQuery } from '@tanstack/react-query'

export interface WeatherData {
  temp_min: number
  temp_max: number
  description: string
  icon: string
  out_of_range?: boolean
}

async function fetchWeather(lat: number, lng: number, date: string): Promise<WeatherData> {
  const r = await fetch(`/api/weather?lat=${lat}&lng=${lng}&date=${date}`)
  const json = await r.json()
  if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
  return json
}

export function useWeather(lat: number | null, lng: number | null, date: string | null) {
  return useQuery<WeatherData>({
    queryKey: ['weather', lat, lng, date],
    queryFn: () => fetchWeather(lat!, lng!, date!),
    enabled: lat !== null && lng !== null && date !== null,
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  })
}
