-- Sites 테이블 확장 마이그레이션
-- 이미 초기 schema.sql을 실행한 경우 이 파일을 Supabase SQL Editor에서 실행하세요.

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS site_type TEXT NOT NULL DEFAULT '사설 캠핑장',
  ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT '기타',
  ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parking TEXT,
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC,
  ADD COLUMN IF NOT EXISTS reservation TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
