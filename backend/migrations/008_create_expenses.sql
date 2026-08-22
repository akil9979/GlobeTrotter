CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_stop_id UUID REFERENCES trip_stops(id) ON DELETE SET NULL,
  category VARCHAR(20) NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  expense_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT expenses_category_valid CHECK (category IN ('transport', 'accommodation', 'activity', 'meal', 'other')),
  CONSTRAINT expenses_amount_non_negative CHECK (amount >= 0)
);

CREATE INDEX expenses_trip_id_idx ON expenses (trip_id);
CREATE INDEX expenses_trip_stop_id_idx ON expenses (trip_stop_id);
CREATE INDEX expenses_trip_date_idx ON expenses (trip_id, expense_date);
CREATE INDEX expenses_trip_category_idx ON expenses (trip_id, category);

CREATE TRIGGER expenses_set_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION validate_expense_trip_stop()
RETURNS TRIGGER AS $$
DECLARE
  stop_trip_id UUID;
BEGIN
  IF NEW.trip_stop_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT trip_id INTO stop_trip_id FROM trip_stops WHERE id = NEW.trip_stop_id;

  IF stop_trip_id <> NEW.trip_id THEN
    RAISE EXCEPTION 'Expense trip stop must belong to the expense trip';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_validate_trip_stop
BEFORE INSERT OR UPDATE OF trip_id, trip_stop_id ON expenses
FOR EACH ROW EXECUTE FUNCTION validate_expense_trip_stop();
