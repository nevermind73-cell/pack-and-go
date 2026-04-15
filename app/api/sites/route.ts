import { createServiceClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('user_id', session.user.id)
    .order('region', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const body = await request.json()
  const {
    name, site_type, region, address, lat, lng,
    visit_count, parking, distance_km, reservation, price, memo,
  } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  // 현재 region 내 마지막 sort_order 조회
  const { data: lastInRegion } = await supabase
    .from('sites')
    .select('sort_order')
    .eq('user_id', session.user.id)
    .eq('region', region || '기타')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sort_order = lastInRegion ? lastInRegion.sort_order + 1 : 0

  const { data, error } = await supabase
    .from('sites')
    .insert({
      user_id: session.user.id,
      name: name.trim(),
      site_type: site_type || '사설 캠핑장',
      region: (region || '기타').trim(),
      address: address?.trim() || null,
      lat: lat ?? null,
      lng: lng ?? null,
      visit_count: visit_count ?? 0,
      parking: parking?.trim() || null,
      distance_km: distance_km ?? null,
      reservation: reservation?.trim() || null,
      price: price?.trim() || null,
      memo: memo?.trim() || null,
      sort_order,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
