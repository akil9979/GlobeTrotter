CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  duration_minutes INTEGER,
  estimated_cost NUMERIC(12, 2),
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activities_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT activities_city_name_unique UNIQUE (city_id, name),
  CONSTRAINT activities_category_valid CHECK (category IN ('sightseeing', 'culture', 'food', 'outdoor', 'entertainment', 'shopping', 'other')),
  CONSTRAINT activities_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  CONSTRAINT activities_estimated_cost_non_negative CHECK (estimated_cost IS NULL OR estimated_cost >= 0)
);

CREATE INDEX activities_city_id_idx ON activities (city_id);
CREATE INDEX activities_city_category_idx ON activities (city_id, category);
CREATE INDEX activities_name_search_idx ON activities USING gin (to_tsvector('simple', name));

CREATE TRIGGER activities_set_updated_at
BEFORE UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
