CREATE TABLE trip_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_stop_id UUID NOT NULL,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE RESTRICT,
  activity_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  custom_cost NUMERIC(12, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'planned',
  sort_order INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trip_activities_stop_belongs_to_trip
    FOREIGN KEY (trip_stop_id, trip_id) REFERENCES trip_stops(id, trip_id) ON DELETE CASCADE,
  CONSTRAINT trip_activities_time_range_valid CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time),
  CONSTRAINT trip_activities_cost_non_negative CHECK (custom_cost IS NULL OR custom_cost >= 0),
  CONSTRAINT trip_activities_status_valid CHECK (status IN ('planned', 'completed', 'cancelled')),
  CONSTRAINT trip_activities_sort_order_positive CHECK (sort_order > 0),
  CONSTRAINT trip_activities_schedule_order_unique UNIQUE (trip_stop_id, activity_date, sort_order)
);

CREATE INDEX trip_activities_trip_id_idx ON trip_activities (trip_id);
CREATE INDEX trip_activities_stop_id_idx ON trip_activities (trip_stop_id);
CREATE INDEX trip_activities_activity_id_idx ON trip_activities (activity_id);
CREATE INDEX trip_activities_trip_date_idx ON trip_activities (trip_id, activity_date, start_time);

CREATE TRIGGER trip_activities_set_updated_at
BEFORE UPDATE ON trip_activities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION validate_trip_activity_schedule()
RETURNS TRIGGER AS $$
DECLARE
  stop_city_id UUID;
  stop_arrival_date DATE;
  stop_departure_date DATE;
  activity_city_id UUID;
BEGIN
  SELECT city_id, arrival_date, departure_date
  INTO stop_city_id, stop_arrival_date, stop_departure_date
  FROM trip_stops
  WHERE id = NEW.trip_stop_id;

  SELECT city_id INTO activity_city_id FROM activities WHERE id = NEW.activity_id;

  IF activity_city_id <> stop_city_id THEN
    RAISE EXCEPTION 'Activity must belong to the city assigned to its trip stop';
  END IF;

  IF NEW.activity_date NOT BETWEEN stop_arrival_date AND stop_departure_date THEN
    RAISE EXCEPTION 'Activity date must fall within the trip stop date range';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trip_activities_validate_schedule
BEFORE INSERT OR UPDATE OF trip_stop_id, activity_id, activity_date ON trip_activities
FOR EACH ROW EXECUTE FUNCTION validate_trip_activity_schedule();
