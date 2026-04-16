import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/diary?search=&site_type=&sort=latest&page=1&limit=9
export async function GET(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const siteType = searchParams.get('site_type') ?? ''
  const sort = searchParams.get('sort') ?? 'latest'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '9')))

  const { data, error } = await supabase
    .from('diary')
    .select(`
      id, photos, created_at,
      trip:trips (
        id, title, start_date, end_date,
        trip_sites (
          sort_order,
          site:sites (id, name, site_type, region, lat, lng)
        )
      )
    `)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type SiteEntry = { sort_order: number; site: { id: string; name: string; site_type: string; region: string; lat: number | null; lng: number | null } }
  type TripData = { id: string; title: string; start_date: string; end_date: string | null; trip_sites: SiteEntry[] }
  type DiaryItem = { id: string; photos: Array<{ url: string; caption: string }>; created_at: string; trip: TripData }

  let items = (data ?? []) as unknown as DiaryItem[]

  // 검색 필터 (여행 제목)
  if (search) {
    const q = search.toLowerCase()
    items = items.filter((d) => d.trip?.title?.toLowerCase().includes(q))
  }

  // 구분 필터 (캠핑장 site_type)
  if (siteType) {
    items = items.filter((d) =>
      d.trip?.trip_sites?.some((ts) => ts.site?.site_type === siteType)
    )
  }

  // 정렬
  items.sort((a, b) => {
    if (sort === 'oldest') {
      return new Date(a.trip?.start_date).getTime() - new Date(b.trip?.start_date).getTime()
    }
    if (sort === 'name') {
      return (a.trip?.title ?? '').localeCompare(b.trip?.title ?? '', 'ko')
    }
    // latest (default)
    return new Date(b.trip?.start_date).getTime() - new Date(a.trip?.start_date).getTime()
  })

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const paged = items.slice((page - 1) * limit, page * limit)

  return NextResponse.json({ data: paged, total, page, totalPages })
}
