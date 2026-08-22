CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  cover_image TEXT,
  budget NUMERIC(12, 2),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trips_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT trips_valid_dates CHECK (end_date >= start_date),
  CONSTRAINT trips_budget_non_negative CHECK (budget IS NULL OR budget >= 0)
);

CREATE INDEX trips_user_id_idx ON trips (user_id);
CREATE INDEX trips_user_dates_idx ON trips (user_id, start_date DESC);
CREATE INDEX trips_public_idx ON trips (is_public) WHERE is_public = TRUE;

CREATE TRIGGER trips_set_updated_at
BEFORE UPDATE ON trips
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
