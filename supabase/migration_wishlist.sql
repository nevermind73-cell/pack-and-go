-- 위시리스트 테이블
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  manufacturer TEXT,
  price INTEGER,
  weight_g INTEGER,
  memo TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 데이터만 접근" ON wishlist
  FOR ALL USING (auth.uid()::text = user_id);
