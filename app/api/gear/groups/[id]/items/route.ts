import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: gear_group_id } = await params
  const { gear_id, quantity = 1 } = await request.json()

  const { data: group } = await supabase
    .from('gear_groups')
    .select('id')
    .eq('id', gear_group_id)
    .eq('user_id', user.id)
    .single()

  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('gear_group_items')
    .insert({ gear_group_id, gear_id, quantity })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: gear_group_id } = await params
  const { gear_id } = await request.json()

  const { data: group } = await supabase
    .from('gear_groups')
    .select('id')
    .eq('id', gear_group_id)
    .eq('user_id', user.id)
    .single()

  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase
    .from('gear_group_items')
    .delete()
    .eq('gear_group_id', gear_group_id)
    .eq('gear_id', gear_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
