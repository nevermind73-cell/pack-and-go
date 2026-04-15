-- ============================================================
-- Pack & Go! — Database Schema
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 캠핑장/장소 (trips보다 먼저 생성 — 외래키 참조)
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  site_type TEXT NOT NULL DEFAULT '사설 캠핑장',  -- 백패킹|휴양림|사설 캠핑장|국립 캠핑장|지자체 캠핑장
  region TEXT NOT NULL DEFAULT '기타',            -- 지역 (아코디언 그룹핑용)
  address TEXT,
  lat NUMERIC,
  lng NUMERIC,
  visit_count INTEGER NOT NULL DEFAULT 0,
  parking TEXT,
  distance_km NUMERIC,
  reservation TEXT,
  price TEXT,
  memo TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ============================================================
-- RLS 활성화
-- ============================================================
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

-- ============================================================
-- RLS 정책 (본인 데이터만 접근)
-- ============================================================
CREATE POLICY "본인 데이터만 접근" ON trips FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "본인 데이터만 접근" ON gear FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "본인 데이터만 접근" ON gear_groups FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "본인 데이터만 접근" ON sites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "본인 데이터만 접근" ON recipes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "본인 데이터만 접근" ON diary FOR ALL USING (auth.uid() = user_id);

-- 조인 테이블 RLS (trip 소유자만 접근)
CREATE POLICY "본인 데이터만 접근" ON gear_group_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gear_groups gg
      WHERE gg.id = gear_group_id AND gg.user_id = auth.uid()
    )
  );

CREATE POLICY "본인 데이터만 접근" ON trip_gear_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "본인 데이터만 접근" ON trip_gear_checks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "본인 데이터만 접근" ON trip_recipes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "본인 데이터만 접근" ON trip_ingredient_checks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_id AND t.user_id = auth.uid()
    )
  );

-- ============================================================
-- updated_at 자동 갱신 트리거 (diary)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER diary_updated_at
  BEFORE UPDATE ON diary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
