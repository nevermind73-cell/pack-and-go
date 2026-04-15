import { createServiceClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { id: gear_group_id } = await params
  const { gear_id } = await request.json()

  const { data: group } = await supabase
    .from('gear_groups')
    .select('id')
    .eq('id', gear_group_id)
    .eq('user_id', session.user.id)
    .single()

  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('gear_group_items')
    .insert({ gear_group_id, gear_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { id: gear_group_id } = await params
  const { gear_id } = await request.json()

  const { data: group } = await supabase
    .from('gear_groups')
    .select('id')
    .eq('id', gear_group_id)
    .eq('user_id', session.user.id)
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
