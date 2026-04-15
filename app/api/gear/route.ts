import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('gear')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, category, gear_type, manufacturer, weight_g, use_count, memo } = body

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    name,
    category: category || null,
    memo: memo || null,
  }
  if (gear_type !== undefined) insertData.gear_type = gear_type || null
  if (manufacturer !== undefined) insertData.manufacturer = manufacturer || null
  if (weight_g !== undefined) insertData.weight_g = weight_g ?? 0
  if (use_count !== undefined) insertData.use_count = use_count ?? 0

  const { data, error } = await supabase
    .from('gear')
    .insert(insertData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
