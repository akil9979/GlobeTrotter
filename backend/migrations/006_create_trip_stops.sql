CREATE TABLE trip_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  stop_order INTEGER NOT NULL,
  arrival_date DATE NOT NULL,
  departure_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trip_stops_valid_dates CHECK (departure_date >= arrival_date),
  CONSTRAINT trip_stops_order_positive CHECK (stop_order > 0),
  CONSTRAINT trip_stops_trip_order_unique UNIQUE (trip_id, stop_order),
  CONSTRAINT trip_stops_id_trip_unique UNIQUE (id, trip_id)
);

CREATE INDEX trip_stops_trip_id_idx ON trip_stops (trip_id);
CREATE INDEX trip_stops_city_id_idx ON trip_stops (city_id);
CREATE INDEX trip_stops_trip_dates_idx ON trip_stops (trip_id, arrival_date);

CREATE TRIGGER trip_stops_set_updated_at
BEFORE UPDATE ON trip_stops
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
