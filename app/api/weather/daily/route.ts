import { NextResponse } from 'next/server'

export interface DailyWeather {
  date: string        // YYYY-MM-DD
  temp_min: number
  temp_max: number
  icon: string
  description: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=ko&cnt=40`
    const res = await fetch(url, { next: { revalidate: 3600 } })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: err.message ?? 'Weather API error' }, { status: 502 })
    }

    const data = await res.json()
    const timezoneOffsetSec: number = data.city?.timezone ?? 0

    const list = data.list as Array<{
      dt: number
      main: { temp: number; temp_min: number; temp_max: number }
      weather: Array<{ description: string; icon: string }>
    }>

    // UTC 타임스탬프 → 현지 날짜
    function toLocalDate(dtSec: number): string {
      return new Date((dtSec + timezoneOffsetSec) * 1000).toISOString().split('T')[0]
    }

    // 날짜별 그룹화
    const byDate = new Map<string, typeof list>()
    for (const entry of list) {
      const d = toLocalDate(entry.dt)
      if (!byDate.has(d)) byDate.set(d, [])
      byDate.get(d)!.push(entry)
    }

    const result: DailyWeather[] = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entries]) => {
        const temps = entries.map((e) => e.main.temp)
        const mid = entries[Math.floor(entries.length / 2)]
        return {
          date,
          temp_min: Math.round(Math.min(...temps)),
          temp_max: Math.round(Math.max(...temps)),
          icon: mid.weather[0]?.icon ?? '01d',
          description: mid.weather[0]?.description ?? '',
        }
      })

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
