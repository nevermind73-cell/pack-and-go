-- Pack 패널 작업 중인 항목을 서버에 저장하기 위한 컬럼 추가
ALTER TABLE trips ADD COLUMN IF NOT EXISTS pack_draft JSONB DEFAULT '[]';
