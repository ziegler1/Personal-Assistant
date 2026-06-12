DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_status') THEN
    CREATE TYPE extraction_status AS ENUM ('success', 'empty', 'error');
  END IF;
END$$;

ALTER TABLE files ADD COLUMN IF NOT EXISTS extraction_status extraction_status;
