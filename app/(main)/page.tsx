'use client'

import { HeroSection } from '@/components/home/HeroSection'
import { PackChecklist } from '@/components/home/PackChecklist'
import { EatChecklist } from '@/components/home/EatChecklist'
import { TodoList } from '@/components/home/TodoList'
import { useCurrentTrip } from '@/hooks/useTrips'
import { Skeleton } from '@/components/ui/skeleton'

export default function HomePage() {
  const { data: trip, isLoading } = useCurrentTrip()

  return (
    <div>
      {/* 히어로 (full-bleed, 네거티브 마진으로 layout padding 상쇄) */}
      <HeroSection />

      {/* 체크리스트 3열 */}
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1.1fr_1fr] gap-4">
        <PackChecklist />
        <EatChecklist />

        {isLoading ? (
          <div className="bg-card rounded-xl border p-4 space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : trip ? (
          <TodoList trip={trip} />
        ) : (
          <div className="bg-card rounded-xl border flex items-center justify-center py-10 text-sm text-muted-foreground">
            캠핑을 등록하면 할일을 관리할 수 있습니다
          </div>
        )}
      </div>
    </div>
  )
}
