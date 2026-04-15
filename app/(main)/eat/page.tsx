'use client'

import { RecipeListPanel } from '@/components/eat/RecipeListPanel'
import { ShoppingPanel } from '@/components/eat/ShoppingPanel'

export default function EatPage() {
  return (
    <div className="flex flex-col md:flex-row h-full -m-6">
      {/* 모바일: Shopping 위 / 데스크탑: Shopping 오른쪽 */}
      <div className="md:hidden shrink-0 max-h-[45vh] flex flex-col border-b overflow-hidden">
        <ShoppingPanel />
      </div>

      {/* 레시피 목록 */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <RecipeListPanel />
      </div>

      {/* 데스크탑 전용 Shopping 패널 */}
      <div className="hidden md:flex w-[380px] shrink-0 flex-col">
        <ShoppingPanel />
      </div>
    </div>
  )
}
