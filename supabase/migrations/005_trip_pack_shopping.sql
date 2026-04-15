-- Pack 체크리스트와 쇼핑 레시피 목록을 trips 테이블에 저장 (기기간 동기화)
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS pack_items JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS shopping_recipe_ids JSONB NOT NULL DEFAULT '[]';
