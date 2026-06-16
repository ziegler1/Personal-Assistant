ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '📁';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE categories SET icon = '👤', sort_order = 1 WHERE name = 'PERSONAL';
UPDATE categories SET icon = '🚀', sort_order = 2 WHERE name = 'PROJECTS';
UPDATE categories SET icon = '⚙️', sort_order = 3 WHERE name = 'TECHNICAL';
UPDATE categories SET icon = '💼', sort_order = 4 WHERE name = 'CAREER';
UPDATE categories SET icon = '🔧', sort_order = 5 WHERE name = 'TOOLS';

UPDATE subcategories SET sort_order = 1 WHERE category_name = 'PERSONAL' AND name = 'Health';
UPDATE subcategories SET sort_order = 2 WHERE category_name = 'PERSONAL' AND name = 'Recipes & Cooking';
UPDATE subcategories SET sort_order = 3 WHERE category_name = 'PERSONAL' AND name = 'Restaurants & Dining';
UPDATE subcategories SET sort_order = 4 WHERE category_name = 'PERSONAL' AND name = 'Legal/Documents';

UPDATE subcategories SET sort_order = 1 WHERE category_name = 'PROJECTS' AND name = 'Cheers-Mate';
UPDATE subcategories SET sort_order = 2 WHERE category_name = 'PROJECTS' AND name = 'Waypoint';
UPDATE subcategories SET sort_order = 3 WHERE category_name = 'PROJECTS' AND name = 'PA Development';

UPDATE subcategories SET sort_order = 1 WHERE category_name = 'TECHNICAL' AND name = 'APIs & Architecture';
UPDATE subcategories SET sort_order = 2 WHERE category_name = 'TECHNICAL' AND name = 'Development Best Practices';
UPDATE subcategories SET sort_order = 3 WHERE category_name = 'TECHNICAL' AND name = 'AI/Prompts';

UPDATE subcategories SET sort_order = 1 WHERE category_name = 'CAREER' AND name = 'Skills & Professional Development';
UPDATE subcategories SET sort_order = 2 WHERE category_name = 'CAREER' AND name = 'Learning Resources';
UPDATE subcategories SET sort_order = 3 WHERE category_name = 'CAREER' AND name = 'Networking';

UPDATE subcategories SET sort_order = 1 WHERE category_name = 'TOOLS' AND name = 'Guides & How-Tos';
UPDATE subcategories SET sort_order = 2 WHERE category_name = 'TOOLS' AND name = 'Tool Documentation';
