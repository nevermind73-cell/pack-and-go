'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useDiary, useUpdateDiary, useUploadDiaryPhoto, useDeleteDiaryPhoto, type DiaryGearItem } from '@/hooks/useDiary'
import { useWeather } from '@/hooks/useWeather'

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start)
  const fmt = (d: Date) =>
    `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  if (!end) return fmt(s)
  const e = new Date(end)
  return `${fmt(s)} - ${String(e.getMonth() + 1).padStart(2, '0')}.${String(e.getDate()).padStart(2, '0')}`
}

function formatWeight(g: number): string {
  return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g} g`
}

function calcGearStats(items: DiaryGearItem[]) {
  const totalG = items.reduce((s, i) => s + (i.gear?.weight_g ?? 0) * i.quantity, 0)
  const wornG = items.filter((i) => i.isWorn).reduce((s, i) => s + (i.gear?.weight_g ?? 0) * i.quantity, 0)
  const consumableG = items.filter((i) => i.isConsumable).reduce((s, i) => s + (i.gear?.weight_g ?? 0) * i.quantity, 0)
  const baseG = items.filter((i) => !i.isWorn && !i.isConsumable).reduce((s, i) => s + (i.gear?.weight_g ?? 0) * i.quantity, 0)
  return { totalG, wornG, consumableG, baseG }
}

export default function DiaryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: diary, isLoading } = useDiary(id)
  const updateDiary = useUpdateDiary()
  const uploadPhoto = useUploadDiaryPhoto()
  const deletePhoto = useDeleteDiaryPhoto()

  const [content, setContent] = useState('')
  const [contentSaved, setContentSaved] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (diary?.content !== undefined) {
      setContent(diary.content ?? '')
    }
  }, [diary?.content])

  function handleContentChange(value: string) {
    setContent(value)
    setContentSaved(false)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await updateDiary.mutateAsync({ id, content: value })
        setContentSaved(true)
      } catch {
        toast.error('저장 실패')
      }
    }, 1000)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    e.target.value = ''

    for (const file of files) {
      try {
        await uploadPhoto.mutateAsync({ id, file })
      } catch (err) {
        toast.error(`업로드 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
      }
    }
  }

  async function handlePhotoDelete(url: string) {
    if (!confirm('사진을 삭제하시겠습니까?')) return
    try {
      await deletePhoto.mutateAsync({ id, url })
    } catch {
      toast.error('삭제 실패')
    }
  }

  const trip = diary?.trip
  const sortedSites = [...(trip?.trip_sites ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const primarySite = sortedSites[0]?.site

  const { data: weather } = useWeather(
    primarySite?.lat ?? null,
    primarySite?.lng ?? null,
    trip?.start_date ?? null
  )

  const photos = Array.isArray(diary?.photos) ? diary.photos : []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!diary) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
        <p>다이어리를 찾을 수 없습니다.</p>
        <Button variant="ghost" onClick={() => router.push('/diary')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          목록으로
        </Button>
      </div>
    )
  }

  // 장비 카테고리별 그룹
  const gearItems = Array.isArray(diary.gear_items) ? diary.gear_items : []
  const grouped = new Map<string, DiaryGearItem[]>()
  for (const item of gearItems) {
    const cat = item.gear?.category ?? '기타'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(item)
  }
  const stats = calcGearStats(gearItems)

  const recipes = Array.isArray(diary.recipes) ? diary.recipes : []

  return (
    <div>
      {/* 목록으로 */}
      <button
        onClick={() => router.push('/diary')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        목록
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 왼쪽: 개요 + 비고 + 사진 */}
        <div className="lg:col-span-3 space-y-5">
          {/* 여행 개요 카드 */}
          <div className="bg-card border rounded-xl p-5">
            <p className="text-sm text-muted-foreground mb-1">
              {trip ? formatDateRange(trip.start_date, trip.end_date) : ''}
            </p>
            <h1 className="text-2xl font-bold mb-3">{trip?.title}</h1>
            <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
              {primarySite && (
                <>
                  <span className="bg-secondary text-secondary-foreground rounded px-2 py-0.5 text-xs font-medium">
                    {primarySite.site_type}
                  </span>
                  <span>{primarySite.name}</span>
                </>
              )}
              {weather && (
                <span>
                  {weather.description} {weather.temp_min}°C - {weather.temp_max}°C
                </span>
              )}
            </div>
          </div>

          {/* 비고 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm">비고</h2>
              <span className="text-xs text-muted-foreground">
                {contentSaved ? '저장됨' : '저장 중…'}
              </span>
            </div>
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="여행 메모를 자유롭게 작성하세요"
              className="min-h-36 resize-none"
            />
          </div>

          {/* 사진 */}
          <div>
            <h2 className="font-semibold text-sm mb-3">사진</h2>
            <div className="flex flex-wrap gap-3">
              {photos.map((photo, idx) => (
                <div key={photo.url} className="relative w-28 h-28 group">
                  <img
                    src={photo.url}
                    alt=""
                    onClick={() => setLightboxIndex(idx)}
                    className="w-full h-full object-cover rounded-lg border cursor-zoom-in"
                  />
                  <button
                    onClick={() => handlePhotoDelete(photo.url)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {/* 추가 버튼 */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadPhoto.isPending}
                className="w-28 h-28 border-2 border-dashed border-primary/40 rounded-lg flex items-center justify-center text-primary/60 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
              >
                {uploadPhoto.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Plus className="h-6 w-6" />
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>

        {/* 오른쪽: Eat + Gear */}
        <div className="lg:col-span-2 space-y-4">
          {/* Eat */}
          <div className="bg-card border rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-3">Eat</h2>
            {recipes.length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 메뉴 없음</p>
            ) : (
              <ul className="space-y-1">
                {recipes.map((recipe) => (
                  <li key={recipe.id} className="text-sm">
                    {recipe.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Gear */}
          <div className="bg-card border rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-3">Gear</h2>

            {gearItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 장비 없음</p>
            ) : (
              <>
                {/* 통계 */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground border rounded-lg p-3 mb-4">
                  <div className="flex justify-between">
                    <span>총합</span>
                    <span className="font-medium text-foreground">{formatWeight(stats.totalG)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>착용</span>
                    <span className="font-medium text-foreground">{formatWeight(stats.wornG)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>소모</span>
                    <span className="font-medium text-foreground">{formatWeight(stats.consumableG)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>기본</span>
                    <span className="font-medium text-foreground">{formatWeight(stats.baseG)}</span>
                  </div>
                </div>

                {/* 카테고리별 목록 */}
                {Array.from(grouped.entries()).map(([category, items]) => {
                  const catWeight = items.reduce((s, i) => s + (i.gear?.weight_g ?? 0) * i.quantity, 0)
                  return (
                    <div key={category} className="mb-3">
                      <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-1.5">
                        <span>{category}</span>
                        <span>{formatWeight(catWeight)}</span>
                      </div>
                      {items.map((item) => (
                        <div
                          key={item.gearId}
                          className="flex items-center justify-between text-sm py-1 border-b border-muted last:border-0"
                        >
                          <span className="flex-1 truncate">{item.gear?.name}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground ml-2">
                            {item.quantity > 1 && <span>{item.quantity}</span>}
                            <span>{formatWeight((item.gear?.weight_g ?? 0) * item.quantity)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* 이전 버튼 */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length) }}
              className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* 사진 */}
          <img
            src={photos[lightboxIndex]?.url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />

          {/* 다음 버튼 */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % photos.length) }}
              className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* 닫기 버튼 */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* 인덱스 표시 */}
          {photos.length > 1 && (
            <p className="absolute bottom-4 text-white/60 text-sm">
              {lightboxIndex + 1} / {photos.length}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
