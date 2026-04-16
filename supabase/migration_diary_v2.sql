-- ============================================================
-- Diary Phase 7 Migration
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1. diary 테이블에 weather_snapshot 컬럼 추가
ALTER TABLE diary ADD COLUMN IF NOT EXISTS weather_snapshot JSONB DEFAULT '[]';

-- 2. 장비 사용 횟수 일괄 증가 RPC
CREATE OR REPLACE FUNCTION increment_gear_use_count(gear_ids UUID[])
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE gear SET use_count = use_count + 1 WHERE id = ANY(gear_ids);
$$;

-- 3. 캠핑장 방문 횟수 일괄 증가 RPC
CREATE OR REPLACE FUNCTION increment_site_visit_count(site_ids UUID[])
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE sites SET visit_count = visit_count + 1 WHERE id = ANY(site_ids);
$$;

-- 4. Supabase Storage: diary-photos 버킷 생성 (대시보드에서 직접 생성 권장)
-- Storage > New bucket > "diary-photos" > Public bucket 체크
-- 또는 아래 SQL 실행:
INSERT INTO storage.buckets (id, name, public)
VALUES ('diary-photos', 'diary-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS 정책
CREATE POLICY "인증 사용자 업로드 허용" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'diary-photos');

CREATE POLICY "인증 사용자 삭제 허용" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'diary-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "공개 읽기 허용" ON storage.objects
  FOR SELECT USING (bucket_id = 'diary-photos');
