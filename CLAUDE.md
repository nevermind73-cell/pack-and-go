# Pack & Go! — Claude Code 작업 지침서

## 프로젝트 개요

캠핑을 준비하고 기록하는 웹 앱. 장비 관리, 캠핑장 관리, 레시피 관리, 여행 일정, 다이어리 기능을 제공한다.

- **프로젝트명**: Pack & Go!
- **저장소 루트**: 이 파일이 있는 디렉토리가 루트
- **작업 방식**: 단계별 Phase로 나뉘며, 각 Phase를 완료한 후 다음 Phase로 진행

---

## 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 14.x |
| 언어 | TypeScript | 5.x |
| 스타일 | Tailwind CSS | 3.x |
| UI 컴포넌트 | shadcn/ui | latest |
| 상태관리 | Zustand | 4.x |
| 서버 상태 | TanStack Query | 5.x |
| 백엔드/DB | Supabase | latest |
| 인증 | NextAuth.js | 5.x (Auth.js) |
| 날씨 API | OpenWeatherMap | free tier |
| 배포 | Vercel | - |

---

## 디렉토리 구조

```
pack-and-go/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (main)/
│   │   ├── layout.tsx          # 사이드바/네비 포함 공통 레이아웃
│   │   ├── page.tsx            # Home
│   │   ├── gear/
│   │   │   └── page.tsx
│   │   ├── site/
│   │   │   └── page.tsx
│   │   ├── eat/
│   │   │   └── page.tsx
│   │   ├── diary/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── trips/route.ts
│   │   ├── gear/route.ts
│   │   ├── sites/route.ts
│   │   ├── recipes/route.ts
│   │   ├── diary/route.ts
│   │   └── weather/route.ts
│   ├── layout.tsx              # Root layout
│   └── globals.css
├── components/
│   ├── ui/                     # shadcn/ui 자동 생성 컴포넌트
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── home/
│   │   ├── TripOverview.tsx
│   │   ├── GearChecklist.tsx
│   │   ├── MealChecklist.tsx
│   │   ├── TodoList.tsx
│   │   └── NewTripDialog.tsx
│   ├── gear/
│   │   ├── GearTable.tsx
│   │   ├── GearFormDialog.tsx
│   │   └── GearGroupManager.tsx
│   ├── site/
│   │   ├── SiteGrid.tsx
│   │   └── SiteFormDialog.tsx
│   ├── eat/
│   │   ├── RecipeGrid.tsx
│   │   └── RecipeFormDialog.tsx
│   └── diary/
│       ├── DiaryList.tsx
│       └── DiaryDetail.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # 클라이언트용 Supabase 인스턴스
│   │   ├── server.ts           # 서버용 Supabase 인스턴스
│   │   └── types.ts            # DB 타입 (supabase gen types 결과)
│   ├── auth.ts                 # NextAuth 설정
│   ├── weather.ts              # OpenWeatherMap API 래퍼
│   └── utils.ts
├── stores/
│   └── tripStore.ts            # Zustand: 현재 선택된 여행 상태
├── hooks/
│   ├── useTrips.ts
│   ├── useGear.ts
│   ├── useSites.ts
│   ├── useRecipes.ts
│   └── useWeather.ts
├── types/
│   └── index.ts                # 공통 타입 정의
├── supabase/
│   └── schema.sql              # DB 스키마 (직접 실행용)
└── .env.local.example
```

---

## 데이터베이스 스키마

> Supabase SQL Editor에서 `supabase/schema.sql`을 실행한다.

### 핵심 테이블

```sql
-- 사용자 (Supabase Auth users 테이블 연동)
-- auth.users 는 Supabase가 자동 관리

-- 캠핑 여행
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  site_id UUID REFERENCES sites(id),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'done')),
  todos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 장비
CREATE TABLE gear (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 장비 그룹
CREATE TABLE gear_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 장비-그룹 연결
CREATE TABLE gear_group_items (
  gear_group_id UUID REFERENCES gear_groups(id) ON DELETE CASCADE,
  gear_id UUID REFERENCES gear(id) ON DELETE CASCADE,
  PRIMARY KEY (gear_group_id, gear_id)
);

-- 여행-장비그룹 연결
CREATE TABLE trip_gear_groups (
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  gear_group_id UUID REFERENCES gear_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_id, gear_group_id)
);

-- 장비 체크 상태 (여행별)
CREATE TABLE trip_gear_checks (
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  gear_id UUID REFERENCES gear(id) ON DELETE CASCADE,
  checked BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (trip_id, gear_id)
);

-- 캠핑장/장소
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'campsite' CHECK (type IN ('campsite', 'wild')),
  address TEXT,
  lat NUMERIC,
  lng NUMERIC,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 레시피
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  servings INTEGER DEFAULT 2,
  category TEXT,
  instructions TEXT,
  ingredients JSONB DEFAULT '[]',  -- [{name, amount, unit}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 여행-레시피 연결
CREATE TABLE trip_recipes (
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_id, recipe_id)
);

-- 식재료 체크 상태 (여행별)
CREATE TABLE trip_ingredient_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE
);

-- 다이어리
CREATE TABLE diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL UNIQUE,
  content TEXT,
  photos JSONB DEFAULT '[]',  -- [{url, caption}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화 (모든 테이블)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_gear_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_gear_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_ingredient_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary ENABLE ROW LEVEL SECURITY;

-- RLS 정책 예시 (trips, 나머지도 동일 패턴)
CREATE POLICY "본인 데이터만 접근" ON trips
  FOR ALL USING (auth.uid() = user_id);
```

---

## 환경 변수

`.env.local.example`을 복사해 `.env.local`을 만들고 값을 채운다.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# OpenWeatherMap
OPENWEATHERMAP_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 개발 Phase 계획

### Phase 0 — 프로젝트 초기 세팅
**목표**: 실행 가능한 빈 Next.js 앱 + Supabase 연결 확인

**작업 목록**
- [ ] `npx create-next-app@latest pack-and-go --typescript --tailwind --app` 실행
- [ ] shadcn/ui 초기화: `npx shadcn@latest init`
- [ ] 필수 shadcn 컴포넌트 설치: button, input, dialog, table, card, checkbox, badge, form, select, textarea, dropdown-menu, sheet, toast
- [ ] Supabase 클라이언트 패키지 설치: `npm install @supabase/supabase-js @supabase/ssr`
- [ ] TanStack Query 설치: `npm install @tanstack/react-query`
- [ ] Zustand 설치: `npm install zustand`
- [ ] `lib/supabase/client.ts`, `lib/supabase/server.ts` 작성
- [ ] `supabase/schema.sql` 작성 후 Supabase에서 실행
- [ ] `.env.local` 환경변수 설정
- [ ] `app/layout.tsx`에 QueryClientProvider, Toaster 래퍼 추가

**완료 기준**: `npm run dev` 실행 시 오류 없이 뜨고, Supabase 연결 테스트 통과

---

### Phase 1 — 인증 (Login)
**목표**: 구글 소셜 로그인 → 보호된 라우트 접근 제어

**작업 목록**
- [ ] `npm install next-auth@beta` 설치
- [ ] `lib/auth.ts` — NextAuth 설정 (Google Provider, Supabase Adapter)
- [ ] `app/api/auth/[...nextauth]/route.ts` 작성
- [ ] `app/(auth)/login/page.tsx` — 로그인 UI (로고 + 구글 로그인 버튼)
- [ ] `middleware.ts` — 미인증 사용자를 `/login`으로 리다이렉트
- [ ] `app/(main)/layout.tsx` — 인증 확인 후 Sidebar + TopBar 렌더

**완료 기준**: 로그인 후 Home 접근 가능, 미로그인 시 Login 페이지로 이동

---

### Phase 2 — 공통 레이아웃
**목표**: 모든 페이지에서 사용하는 네비게이션 완성

**작업 목록**
- [ ] `components/layout/Sidebar.tsx` — 아이콘+텍스트 메뉴 (Home, Gear, Site, Eat, Diary, Settings)
- [ ] `components/layout/TopBar.tsx` — 페이지 타이틀, 유저 아바타/로그아웃
- [ ] 모바일 대응: Sheet 컴포넌트로 햄버거 메뉴
- [ ] 각 페이지 파일 생성 (빈 placeholder): gear, site, eat, diary, settings

**완료 기준**: 사이드바 메뉴 클릭 시 각 페이지로 이동

---

### Phase 3 — Gear 페이지
**목표**: 장비 CRUD + 그룹 관리

**작업 목록**
- [ ] `app/api/gear/route.ts` — GET(목록), POST(추가)
- [ ] `app/api/gear/[id]/route.ts` — PATCH(수정), DELETE(삭제)
- [ ] `app/api/gear/groups/route.ts` — 그룹 CRUD
- [ ] `hooks/useGear.ts` — TanStack Query 훅
- [ ] `components/gear/GearTable.tsx` — 장비 목록 테이블 (카테고리, 메모, 수정/삭제 버튼)
- [ ] `components/gear/GearFormDialog.tsx` — 추가/수정 Dialog (name, category, memo)
- [ ] `components/gear/GearGroupManager.tsx` — 그룹 생성, 장비 추가, 즐겨찾기 토글
- [ ] `app/(main)/gear/page.tsx` — 조합

**완료 기준**: 장비 추가/수정/삭제, 그룹 생성 및 즐겨찾기 저장 동작

---

### Phase 4 — Site 페이지
**목표**: 캠핑장/노지 장소 CRUD

**작업 목록**
- [ ] `app/api/sites/route.ts` — GET, POST
- [ ] `app/api/sites/[id]/route.ts` — PATCH, DELETE
- [ ] `hooks/useSites.ts`
- [ ] `components/site/SiteGrid.tsx` — 카드 그리드 (이름, 타입 배지, 주소, 메모)
- [ ] `components/site/SiteFormDialog.tsx` — 추가/수정 (name, type 선택, address, memo)
- [ ] `app/(main)/site/page.tsx` — 조합

**완료 기준**: 캠핑장 추가/수정/삭제, 노지/일반 타입 구분 표시

---

### Phase 5 — Eat 페이지
**목표**: 레시피 + 식재료 CRUD

**작업 목록**
- [ ] `app/api/recipes/route.ts` — GET, POST
- [ ] `app/api/recipes/[id]/route.ts` — PATCH, DELETE
- [ ] `hooks/useRecipes.ts`
- [ ] `components/eat/RecipeGrid.tsx` — 카드 그리드 (이름, 카테고리, 인분, 식재료 미리보기)
- [ ] `components/eat/RecipeFormDialog.tsx` — 추가/수정 (name, category, servings, ingredients 동적 추가, instructions)
- [ ] `app/(main)/eat/page.tsx` — 조합

**식재료 입력 UI**: "재료 추가" 버튼으로 {이름, 양, 단위} 행 동적 추가/삭제

**완료 기준**: 레시피 추가/수정/삭제, 식재료 목록 관리

---

### Phase 6 — 새 여행 + Home 페이지
**목표**: 여행 생성 → Home 대시보드 완성

**작업 목록**

#### 새 여행 Dialog
- [ ] `components/home/NewTripDialog.tsx`
  - Step 1: 여행 제목, 시작일, 종료일
  - Step 2: Site 목록에서 캠핑장 선택
  - Step 3: Gear 그룹 선택 (즐겨찾기 우선 표시)
  - Step 4: Recipe 선택 (다중 선택)
  - Step 5: 할일 목록 초기 입력
- [ ] `app/api/trips/route.ts` — POST (trip + 연결 테이블 한 번에)

#### Home 컴포넌트
- [ ] `lib/weather.ts` — OpenWeatherMap Current Weather API 래퍼
- [ ] `app/api/weather/route.ts` — 좌표 또는 도시명으로 날씨 조회
- [ ] `components/home/TripOverview.tsx` — 여행 제목, 날짜, 캠핑장명, 날씨 카드
- [ ] `components/home/GearChecklist.tsx` — 선택한 그룹의 장비 체크리스트
- [ ] `components/home/MealChecklist.tsx` — 선택한 레시피의 식재료 체크리스트
- [ ] `components/home/TodoList.tsx` — 할일 추가/완료 토글/삭제
- [ ] `hooks/useTrips.ts` — 현재 planned 여행 조회
- [ ] `app/(main)/page.tsx` — 조합, 예정 여행 없을 시 "새 여행 추가" 안내

**날씨 API 호출**: site의 lat/lng가 있으면 좌표로, 없으면 site name으로 조회

**완료 기준**: 새 여행 생성 후 Home에 개요/체크리스트/할일 표시, 날씨 카드 동작

---

### Phase 7 — Diary 페이지
**목표**: 완료된 여행 → 다이어리 저장 및 조회

**작업 목록**
- [ ] Home의 TripOverview에 "Done!" 버튼 추가
  - 클릭 시 trip.status = 'done' 업데이트
  - diary 레코드 자동 생성 (trip_id 연결)
- [ ] `app/api/diary/route.ts` — GET(목록)
- [ ] `app/api/diary/[id]/route.ts` — GET(상세), PATCH(일기/사진 업데이트)
- [ ] Supabase Storage 버킷 생성: `diary-photos`
- [ ] `components/diary/DiaryList.tsx` — 여행 목록 카드 (날짜, 캠핑장, 썸네일)
- [ ] `components/diary/DiaryDetail.tsx`
  - 사용한 장비 목록 (읽기전용)
  - 사용한 레시피 목록 (읽기전용)
  - 사진 업로드 (Supabase Storage) + 갤러리
  - 일기 텍스트 편집 (textarea, 자동저장)
- [ ] `app/(main)/diary/page.tsx` — 목록
- [ ] `app/(main)/diary/[id]/page.tsx` — 상세

**완료 기준**: Done! 클릭 → Diary 목록에 표시, 사진 업로드, 일기 저장

---

### Phase 8 — Settings 페이지
**목표**: 기본 설정 UI (확장 가능한 구조)

**작업 목록**
- [ ] `app/(main)/settings/page.tsx`
  - 프로필 섹션: 이름, 이메일 (읽기전용)
  - 로그아웃 버튼
  - 추후 추가될 설정을 위한 섹션 구분 UI

**완료 기준**: 프로필 표시, 로그아웃 동작

---

### Phase 9 — 마무리 및 QA
**목표**: 버그 수정, 모바일 대응, 성능 최적화

**작업 목록**
- [ ] 모바일 반응형 전체 점검 (breakpoint: sm/md/lg)
- [ ] 로딩 스켈레톤 추가 (TanStack Query isFetching 활용)
- [ ] 에러 처리 통일 (API 에러 → toast 메시지)
- [ ] 빈 상태 UI (데이터 없을 때 안내 문구/일러스트)
- [ ] Vercel 배포 설정
- [ ] Supabase RLS 정책 최종 확인
- [ ] `npm run build` 오류 없음 확인

---

## 공통 코딩 규칙

### 컴포넌트 작성
- 모든 컴포넌트는 TypeScript + 명시적 Props 타입
- 서버 컴포넌트 기본, 인터랙션 필요 시에만 `'use client'`
- Props 타입은 컴포넌트 파일 상단에 interface로 선언

### API Route 패턴
```typescript
// app/api/gear/route.ts 예시
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('gear')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

### TanStack Query 훅 패턴
```typescript
// hooks/useGear.ts 예시
export function useGear() {
  return useQuery({
    queryKey: ['gear'],
    queryFn: () => fetch('/api/gear').then(r => r.json()),
  })
}

export function useCreateGear() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGearInput) =>
      fetch('/api/gear', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gear'] }),
  })
}
```

### 에러/로딩 처리
- API 에러는 항상 `toast.error(message)` 로 표시
- 목록 로딩 중에는 shadcn `Skeleton` 컴포넌트 사용
- 빈 상태는 별도 `EmptyState` 컴포넌트로 처리

---

## Claude에게 작업 요청하는 방법

각 Phase 작업 시 아래 형식으로 지시한다.

```
지금 Phase 3 (Gear 페이지)를 작업할 거야.
이 CLAUDE.md의 규칙과 스키마를 참고해서
[구체적인 작업 항목]을 만들어줘.
현재 파일 구조: [관련 파일 경로 나열]
```

**좋은 요청 예시**
> "Phase 3에서 `components/gear/GearFormDialog.tsx`를 만들어줘. shadcn Dialog + Form을 사용하고, name(필수)/category/memo 입력, 추가와 수정 모드를 props로 구분해줘."

**피해야 할 요청**
> "Gear 페이지 전체 다 만들어줘" (범위가 너무 넓음)

---

## 현재 진행 상태

> 아래 체크박스를 작업 완료 시마다 업데이트한다.

- [ ] Phase 0 — 초기 세팅
- [ ] Phase 1 — 인증
- [ ] Phase 2 — 공통 레이아웃
- [ ] Phase 3 — Gear
- [ ] Phase 4 — Site
- [ ] Phase 5 — Eat
- [ ] Phase 6 — Home + 새 여행
- [ ] Phase 7 — Diary
- [ ] Phase 8 — Settings
- [ ] Phase 9 — QA + 배포
