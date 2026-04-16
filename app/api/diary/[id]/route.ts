import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/diary/[id] → 다이어리 상세 (gear, recipe 포함)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: diary, error } = await supabase
    .from('diary')
    .select(`
      id, content, photos, created_at, updated_at,
      trip:trips (
        id, title, start_date, end_date, pack_items, shopping_recipe_ids,
        trip_sites (
          sort_order,
          site:sites (id, name, site_type, region, lat, lng)
        )
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const trip = diary.trip as unknown as {
    id: string
    title: string
    start_date: string
    end_date: string | null
    pack_items: Array<{ gearId: string; quantity: number; isWorn: boolean; isConsumable: boolean }>
    shopping_recipe_ids: string[]
    trip_sites: Array<{ sort_order: number; site: { id: string; name: string; site_type: string; region: string; lat: number | null; lng: number | null } }>
  }

  // 장비 데이터 조회
  const packItems = Array.isArray(trip?.pack_items) ? trip.pack_items : []
  const gearIds = packItems.map((i) => i.gearId).filter(Boolean)
  const { data: gearData } = gearIds.length > 0
    ? await supabase.from('gear').select('id, name, category, weight_g').in('id', gearIds)
    : { data: [] }

  const gearMap = Object.fromEntries((gearData ?? []).map((g) => [g.id, g]))
  const gearItems = packItems
    .map((item) => ({ ...item, gear: gearMap[item.gearId] }))
    .filter((item) => item.gear)

  // 레시피 데이터 조회
  const recipeIds = Array.isArray(trip?.shopping_recipe_ids) ? trip.shopping_recipe_ids : []
  const { data: recipeData } = recipeIds.length > 0
    ? await supabase.from('recipes').select('id, name, category').in('id', recipeIds)
    : { data: [] }

  return NextResponse.json({
    ...diary,
    gear_items: gearItems,
    recipes: recipeData ?? [],
  })
}

// DELETE /api/diary/[id] → 다이어리 삭제 + 장비/캠핑장 횟수 -1
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // 삭제 전 trip 데이터 조회 (횟수 감소용)
  const { data: diary } = await supabase
    .from('diary')
    .select('trip_id, trip:trips(pack_items, trip_sites(site_id))')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('diary')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 장비 사용 횟수 -1, 캠핑장 방문 횟수 -1
  if (diary) {
    const service = createServiceClient()
    const trip = diary.trip as unknown as {
      pack_items: Array<{ gearId: string }> | null
      trip_sites: Array<{ site_id: string }> | null
    } | null

    const gearIds = (trip?.pack_items ?? []).map((i) => i.gearId).filter(Boolean)
    if (gearIds.length > 0) {
      await service.rpc('decrement_gear_use_count', { gear_ids: gearIds })
    }

    const siteIds = (trip?.trip_sites ?? []).map((ts) => ts.site_id).filter(Boolean)
    if (siteIds.length > 0) {
      await service.rpc('decrement_site_visit_count', { site_ids: siteIds })
    }
  }

  return new NextResponse(null, { status: 204 })
}

// PATCH /api/diary/[id] → content, photos 수정
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if (body.content !== undefined) updates.content = body.content
  if (body.photos !== undefined) updates.photos = body.photos

  const { data, error } = await supabase
    .from('diary')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
