CREATE TABLE saved_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT saved_destinations_user_city_unique UNIQUE (user_id, city_id)
);

CREATE INDEX saved_destinations_user_id_idx ON saved_destinations (user_id);
CREATE INDEX saved_destinations_city_id_idx ON saved_destinations (city_id);
