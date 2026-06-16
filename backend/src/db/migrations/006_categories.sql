ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

ALTER TABLE files
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

CREATE INDEX IF NOT EXISTS notes_category_idx ON notes (category);
CREATE INDEX IF NOT EXISTS files_category_idx ON files (category);
