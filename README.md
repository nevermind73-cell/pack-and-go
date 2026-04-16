# ⛺ Pack & Go!

캠핑을 준비하고 기록하는 웹 앱. 장비 관리, 캠핑장 관리, 레시피 관리, 여행 일정, 다이어리 기능을 제공합니다.

## 주요 기능

### 🏕️ Home
- 예정된 캠핑 일정 대시보드
- D-Day 카운트다운
- 캠핑장별 날씨 정보 (OpenWeatherMap)
- Pack 체크리스트 (장비 체크/해제)
- Eat 체크리스트 (식재료 체크/해제)
- 할일 목록 관리
- 완료 처리 시 장비 사용 횟수 · 캠핑장 방문 횟수 자동 증가

### 🎒 Gear
- 장비 CRUD (카테고리, 무게, 제조사, 메모)
- Pack it! 버튼으로 홈 체크리스트에 추가
- 사용 횟수 자동 추적

### 🗺️ Site
- 캠핑장 CRUD (지역, 구분, 주소, 좌표, 방문 횟수 등)
- 즐겨찾기
- 방문 횟수 자동 추적

### 🍳 Eat
- 레시피 CRUD (식재료, 조리법, 인분)
- 쇼핑 목록 추가로 홈 체크리스트에 반영
- 즐겨찾기

### 📔 Diary
- 완료된 캠핑 자동 저장
- 목록: 검색 · 캠핑장 구분 필터 · 정렬(최신/오래된/가나다) · 페이지네이션
- 상세: 여행 개요, 가져간 장비 목록, 먹은 메뉴, 비고(자동저장), 사진(업로드/삭제/라이트박스)
- 다이어리 삭제 시 장비 사용 횟수 · 캠핑장 방문 횟수 자동 감소

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS + shadcn/ui |
| 상태관리 | Zustand |
| 서버 상태 | TanStack Query v5 |
| 백엔드/DB | Supabase (PostgreSQL + Storage) |
| 인증 | Supabase Auth (Google OAuth) |
| 날씨 | OpenWeatherMap API |
| 배포 | Vercel |

## 시작하기

### 1. 환경변수 설정

`.env.local` 파일을 생성하고 아래 값을 채웁니다.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenWeatherMap
OPENWEATHERMAP_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. DB 스키마 적용

Supabase SQL Editor에서 순서대로 실행합니다.

```
supabase/schema.sql
supabase/migration_diary_v2.sql
```

### 3. Storage 버킷 생성

Supabase 대시보드 → Storage → New bucket

- Name: `diary-photos`
- Public bucket: ✅

### 4. 개발 서버 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인합니다.

## 프로젝트 구조

```
pack-and-go/
├── app/
│   ├── (main)/          # 메인 레이아웃 (사이드바 + 탑바)
│   │   ├── page.tsx     # Home
│   │   ├── gear/        # 장비 관리
│   │   ├── site/        # 캠핑장 관리
│   │   ├── eat/         # 레시피 관리
│   │   ├── diary/       # 다이어리 목록 + 상세
│   │   └── settings/    # 설정
│   └── api/             # API Routes
├── components/          # UI 컴포넌트
├── hooks/               # TanStack Query 훅
├── stores/              # Zustand 스토어
├── lib/                 # Supabase 클라이언트, 날씨 유틸
└── supabase/            # DB 스키마 및 마이그레이션
```
