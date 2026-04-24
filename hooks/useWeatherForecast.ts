'use client'

import { useQuery } from '@tanstack/react-query'
import type { DailyWeather } from '@/app/api/weather/daily/route'

export type { DailyWeather }

async function fetchDailyForecast(lat: number, lng: number): Promise<DailyWeather[]> {
  const r = await fetch(`/api/weather/daily?lat=${lat}&lng=${lng}`)
  const json = await r.json()
  if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
  return json
}

export function useWeatherForecast(lat: number | null, lng: number | null) {
  return useQuery<DailyWeather[]>({
    queryKey: ['weather-forecast', lat, lng],
    queryFn: () => fetchDailyForecast(lat!, lng!),
    enabled: lat !== null && lng !== null,
    staleTime: 1000 * 60 * 60,
  })
}
