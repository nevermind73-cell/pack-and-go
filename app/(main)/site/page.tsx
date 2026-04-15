'use client'

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SiteList } from '@/components/site/SiteList'
import { SiteFormDialog } from '@/components/site/SiteFormDialog'

type FilterMode = 'all' | 'favorite'

export default function SitePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  return (
    <div className="flex flex-col h-full gap-3">
      {/* 툴바 */}
      <div className="flex flex-wrap gap-3">
        {/* 1행: 추가 버튼 + 검색 */}
        <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1">
          <Button onClick={() => setAddDialogOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            새 캠핑장 추가
          </Button>

          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="캠핑장 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* 2행(모바일) / 1행 우측(데스크탑): 전체/즐겨찾기 필터 */}
        <div className="flex items-center rounded-md border overflow-hidden sm:ml-auto">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-sm transition-colors ${
              filterMode === 'all'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            전체
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('favorite')}
            className={`px-3 py-1.5 text-sm transition-colors ${
              filterMode === 'favorite'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            즐겨찾기
          </button>
        </div>
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-auto">
        <SiteList
          searchQuery={searchQuery}
          filterMode={filterMode}
          onOpenAdd={() => setAddDialogOpen(true)}
        />
      </div>

      {/* 추가 다이얼로그 */}
      <SiteFormDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  )
}
