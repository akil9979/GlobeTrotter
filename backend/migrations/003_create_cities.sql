CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  country VARCHAR(150) NOT NULL,
  country_code CHAR(2) NOT NULL,
  region VARCHAR(150),
  description TEXT,
  image TEXT,
  cost_index NUMERIC(8, 2),
  popularity INTEGER,
  latitude NUMERIC(9, 6),
  longitude NUMERIC(9, 6),
  CONSTRAINT cities_name_country_unique UNIQUE (name, country, region),
  CONSTRAINT cities_cost_index_non_negative CHECK (cost_index IS NULL OR cost_index >= 0),
  CONSTRAINT cities_popularity_valid CHECK (popularity IS NULL OR popularity BETWEEN 0 AND 100),
  CONSTRAINT cities_latitude_valid CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT cities_longitude_valid CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  CONSTRAINT cities_country_code_uppercase CHECK (country_code = upper(country_code))
);

CREATE INDEX cities_name_search_idx ON cities USING gin (to_tsvector('simple', name));
CREATE INDEX cities_country_idx ON cities (country);
CREATE INDEX cities_popularity_idx ON cities (popularity DESC NULLS LAST);
