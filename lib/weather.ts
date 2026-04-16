export interface WeatherSnapshot {
  site_id: string
  site_name: string
  temp_min: number
  temp_max: number
  description: string
  icon: string
}

export async function fetchWeatherForDate(
  lat: number,
  lng: number,
  date: string
): Promise<{ temp_min: number; temp_max: number; description: string; icon: string } | null> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey) return null

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=ko&cnt=40`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null

    const data = await res.json()
    const timezoneOffsetSec: number = data.city?.timezone ?? 0

    const list = data.list as Array<{
      dt: number
      main: { temp: number }
      weather: Array<{ description: string; icon: string }>
    }>

    function toLocalDate(dtSec: number): string {
      return new Date((dtSec + timezoneOffsetSec) * 1000).toISOString().split('T')[0]
    }

    const dayEntries = list.filter((e) => toLocalDate(e.dt) === date)
    const source =
      dayEntries.length > 0
        ? dayEntries
        : (() => {
            const targetTs = new Date(date).getTime() / 1000
            const closest = list.reduce((a, b) =>
              Math.abs(a.dt - targetTs) <= Math.abs(b.dt - targetTs) ? a : b
            )
            const closestDate = toLocalDate(closest.dt)
            return list.filter((e) => toLocalDate(e.dt) === closestDate)
          })()

    if (source.length === 0) return null

    const tempMin = Math.round(Math.min(...source.map((e) => e.main.temp)))
    const tempMax = Math.round(Math.max(...source.map((e) => e.main.temp)))
    const midEntry = source[Math.floor(source.length / 2)]

    return {
      temp_min: tempMin,
      temp_max: tempMax,
      description: midEntry.weather[0]?.description ?? '',
      icon: midEntry.weather[0]?.icon ?? '',
    }
  } catch {
    return null
  }
}
