import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/trips → 현재 planned 상태의 여행 (최신 1건)
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      trip_sites (
        id, site_id, start_date, end_date, sort_order,
        site:sites (id, name, lat, lng, distance_km, address, region)
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'planned')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/trips → 새 여행 생성
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { title, start_date, end_date, sites } = body

  if (!title || !start_date) {
    return NextResponse.json({ error: 'title과 start_date는 필수입니다' }, { status: 400 })
  }

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({
      user_id: user.id,
      title,
      start_date,
      end_date: end_date || null,
      status: 'planned',
      todos: [],
    })
    .select()
    .single()

  if (tripError) return NextResponse.json({ error: tripError.message }, { status: 500 })

  if (sites?.length) {
    const tripSites = (sites as { site_id: string; start_date: string; end_date?: string }[]).map(
      (s, i) => ({
        trip_id: trip.id,
        site_id: s.site_id,
        start_date: s.start_date,
        end_date: s.end_date || null,
        sort_order: i,
      })
    )
    const { error: sitesError } = await supabase.from('trip_sites').insert(tripSites)
    if (sitesError) return NextResponse.json({ error: sitesError.message }, { status: 500 })
  }

  return NextResponse.json(trip, { status: 201 })
}
