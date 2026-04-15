'use client'

import { GearListPanel } from '@/components/gear/GearListPanel'
import { PackPanel } from '@/components/gear/PackPanel'

export default function GearPage() {
  return (
    <div className="flex flex-col md:flex-row h-full -m-6">
      {/* 모바일: Pack 위 / 데스크탑: Pack 오른쪽 */}
      <div className="md:hidden shrink-0 max-h-[45vh] flex flex-col border-b overflow-hidden">
        <PackPanel />
      </div>

      {/* 장비 목록 */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <GearListPanel />
      </div>

      {/* 데스크탑 전용 Pack 패널 */}
      <div className="hidden md:flex w-[420px] shrink-0 flex-col">
        <PackPanel />
      </div>
    </div>
  )
}
