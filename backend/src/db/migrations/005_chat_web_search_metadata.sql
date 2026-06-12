ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS web_search_answer TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS web_search_query TEXT;
