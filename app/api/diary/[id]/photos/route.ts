import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/diary/[id]/photos → 사진 업로드
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // 본인 다이어리인지 확인
  const { data: diary } = await supabase
    .from('diary')
    .select('id, photos')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!diary) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${user.id}/${id}/${Date.now()}.${ext}`

  const serviceClient = createServiceClient()
  const { error: uploadError } = await serviceClient.storage
    .from('diary-photos')
    .upload(fileName, file, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = serviceClient.storage
    .from('diary-photos')
    .getPublicUrl(fileName)

  const currentPhotos = Array.isArray(diary.photos) ? diary.photos : []
  const newPhotos = [...currentPhotos, { url: publicUrl, caption: '' }]

  const { data: updated, error: updateError } = await supabase
    .from('diary')
    .update({ photos: newPhotos })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('photos')
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ photos: updated.photos, url: publicUrl })
}

// DELETE /api/diary/[id]/photos → 사진 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const photoUrl = searchParams.get('url')
  if (!photoUrl) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  const { data: diary } = await supabase
    .from('diary')
    .select('id, photos')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!diary) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Storage에서 파일 경로 추출 후 삭제
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const bucketPrefix = `${supabaseUrl}/storage/v1/object/public/diary-photos/`
  const filePath = photoUrl.startsWith(bucketPrefix) ? photoUrl.slice(bucketPrefix.length) : null

  if (filePath) {
    const serviceClient = createServiceClient()
    await serviceClient.storage.from('diary-photos').remove([filePath])
  }

  const currentPhotos = Array.isArray(diary.photos) ? diary.photos : []
  const newPhotos = currentPhotos.filter((p: { url: string }) => p.url !== photoUrl)

  const { data: updated, error: updateError } = await supabase
    .from('diary')
    .update({ photos: newPhotos })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('photos')
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ photos: updated.photos })
}
