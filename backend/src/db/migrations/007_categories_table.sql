CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL REFERENCES categories(name) ON UPDATE CASCADE ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_name, name)
);

INSERT INTO categories (name) VALUES
  ('PERSONAL'), ('PROJECTS'), ('TECHNICAL'), ('CAREER'), ('TOOLS')
ON CONFLICT (name) DO NOTHING;

INSERT INTO subcategories (category_name, name) VALUES
  ('PERSONAL', 'Health'),
  ('PERSONAL', 'Recipes & Cooking'),
  ('PERSONAL', 'Restaurants & Dining'),
  ('PERSONAL', 'Legal/Documents'),
  ('PROJECTS', 'Cheers-Mate'),
  ('PROJECTS', 'Waypoint'),
  ('PROJECTS', 'PA Development'),
  ('TECHNICAL', 'APIs & Architecture'),
  ('TECHNICAL', 'Development Best Practices'),
  ('TECHNICAL', 'AI/Prompts'),
  ('CAREER', 'Skills & Professional Development'),
  ('CAREER', 'Learning Resources'),
  ('CAREER', 'Networking'),
  ('TOOLS', 'Guides & How-Tos'),
  ('TOOLS', 'Tool Documentation')
ON CONFLICT (category_name, name) DO NOTHING;
