import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const date = searchParams.get('date') // YYYY-MM-DD

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

    // city.timezone: UTC 오프셋 (초 단위) — 한국은 32400 (UTC+9)
    const timezoneOffsetSec: number = data.city?.timezone ?? 0

    const listWithTxt = data.list as Array<{
      dt: number
      dt_txt: string
      main: { temp: number; temp_min: number; temp_max: number }
      weather: Array<{ main: string; description: string; icon: string }>
    }>

    // dt(UTC unix)를 현지 날짜 문자열로 변환
    function toLocalDate(dtSec: number): string {
      return new Date((dtSec + timezoneOffsetSec) * 1000).toISOString().split('T')[0]
    }

    const targetDate = date ?? toLocalDate(Math.floor(Date.now() / 1000))
    const dayEntries = listWithTxt.filter((e) => toLocalDate(e.dt) === targetDate)

    // 대상 날짜 항목이 없으면 (5일 초과 등) 가장 가까운 날짜 항목으로 대체
    const source =
      dayEntries.length > 0
        ? dayEntries
        : (() => {
            const targetTs = new Date(targetDate).getTime() / 1000
            const closest = listWithTxt.reduce((a, b) =>
              Math.abs(a.dt - targetTs) <= Math.abs(b.dt - targetTs) ? a : b
            )
            const closestDate = toLocalDate(closest.dt)
            return listWithTxt.filter((e) => toLocalDate(e.dt) === closestDate)
          })()

    const tempMin = Math.round(Math.min(...source.map((e) => e.main.temp)))
    const tempMax = Math.round(Math.max(...source.map((e) => e.main.temp)))
    const midEntry = source[Math.floor(source.length / 2)]
    const isOutOfRange = dayEntries.length === 0

    return NextResponse.json({
      temp_min: tempMin,
      temp_max: tempMax,
      description: midEntry.weather[0]?.description ?? '',
      icon: midEntry.weather[0]?.icon ?? '',
      out_of_range: isOutOfRange,
      _debug: {
        targetDate,
        timezoneOffsetSec,
        matchedSlots: source.map((e) => ({
          dt_txt: e.dt_txt,
          local_date: toLocalDate(e.dt),
          temp: e.main.temp,
        })),
        availableDates: [...new Set(listWithTxt.map((e) => toLocalDate(e.dt)))],
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
