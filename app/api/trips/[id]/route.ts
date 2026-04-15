import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/trips/[id] → 여행 업데이트 (status, todos)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { status, todos, title, start_date, end_date, sites, pack_items, shopping_recipe_ids } = body

  // 본인 여행인지 확인
  const { data: existing } = await supabase
    .from('trips')
    .select('id')
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

  // 완료 처리 시 diary 자동 생성
  if (status === 'done') {
    await supabase
      .from('diary')
      .upsert({ user_id: user.id, trip_id: id, content: '', photos: [] })
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
