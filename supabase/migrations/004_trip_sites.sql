-- ============================================================
-- Trip Sites: multiple campsites per trip
-- ============================================================

CREATE TABLE IF NOT EXISTS trip_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  site_id UUID REFERENCES sites(id) ON DELETE RESTRICT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE trip_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 데이터만 접근" ON trip_sites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id::text = trip_sites.trip_id::text
        AND t.user_id::text = auth.uid()::text
    )
  );

-- sites 즐겨찾기 컬럼 (없는 경우에만 추가)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;
