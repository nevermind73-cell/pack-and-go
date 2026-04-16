import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchWeatherForDate } from '@/lib/weather'

// PATCH /api/trips/[id] → 여행 업데이트 (status, todos 등)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { status, todos, title, start_date, end_date, sites, pack_items, pack_draft, shopping_recipe_ids } = body

  // 본인 여행인지 확인
  const { data: existing } = await supabase
    .from('trips')
    .select('id, pack_items, pack_draft, shopping_recipe_ids, start_date')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (todos !== undefined) updates.todos = todos
  if (title !== undefined) updates.title = title
  if (start_date !== undefined) updates.start_date = start_date
  if (end_date !== undefined) updates.end_date = end_date || null
  if (pack_items !== undefined) updates.pack_items = pack_items
  if (pack_draft !== undefined) updates.pack_draft = pack_draft
  if (shopping_recipe_ids !== undefined) updates.shopping_recipe_ids = shopping_recipe_ids

  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // trip_sites 교체 (sites 배열이 있을 때만)
  if (sites !== undefined) {
    await supabase.from('trip_sites').delete().eq('trip_id', id)
    if (sites.length > 0) {
      const rows = (sites as { site_id: string; start_date: string; end_date?: string }[]).map(
        (s, i) => ({
          trip_id: id,
          site_id: s.site_id,
          start_date: s.start_date,
          end_date: s.end_date || null,
          sort_order: i,
        })
      )
      const { error: sitesError } = await supabase.from('trip_sites').insert(rows)
      if (sitesError) return NextResponse.json({ error: sitesError.message }, { status: 500 })
    }
  }

  // 완료 처리 시 부가 작업
  if (status === 'done') {
    const service = createServiceClient()

    // 1. 장비 사용 횟수 +1
    const currentPackItems = (pack_items ?? existing.pack_items ?? []) as Array<{ gearId: string }>
    const gearIds = currentPackItems.map((i) => i.gearId).filter(Boolean)
    if (gearIds.length > 0) {
      await service.rpc('increment_gear_use_count', { gear_ids: gearIds })
    }

    // 2. 캠핑장 방문 횟수 +1
    const { data: tripSites } = await supabase
      .from('trip_sites')
      .select('site_id, start_date, site:sites(id, name, lat, lng)')
      .eq('trip_id', id)

    const siteIds = (tripSites ?? []).map((ts) => ts.site_id).filter(Boolean)
    if (siteIds.length > 0) {
      await service.rpc('increment_site_visit_count', { site_ids: siteIds })
    }

    // 3. diary 생성 (trip_id 충돌 시 무시)
    const { error: diaryError } = await supabase
      .from('diary')
      .upsert(
        { user_id: user.id, trip_id: id, content: '', photos: [] },
        { onConflict: 'trip_id', ignoreDuplicates: false }
      )

    // 4. 날씨 스냅샷 저장 (migration_diary_v2.sql 실행 후 활성화됨)
    if (!diaryError) {
      const tripStartDate = start_date ?? existing.start_date
      const weatherSnapshots = await Promise.all(
        (tripSites ?? []).map(async (ts) => {
          const site = ts.site as unknown as { id: string; name: string; lat: number | null; lng: number | null } | null
          if (!site?.lat || !site?.lng) return null
          const date = ts.start_date ?? tripStartDate
          const weather = await fetchWeatherForDate(site.lat, site.lng, date)
          if (!weather) return null
          return { site_id: site.id, site_name: site.name, ...weather }
        })
      )
      const validSnapshots = weatherSnapshots.filter(Boolean)
      if (validSnapshots.length > 0) {
        // weather_snapshot 컬럼이 없으면 이 update는 조용히 실패함 (정상)
        await supabase
          .from('diary')
          .update({ weather_snapshot: validSnapshots })
          .eq('trip_id', id)
          .eq('user_id', user.id)
      }
    }
  }

  return NextResponse.json(data)
}

// DELETE /api/trips/[id] → 여행 취소 (삭제)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
