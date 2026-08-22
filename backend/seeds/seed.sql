-- Reference data only: no users, trips, or other user-owned records are seeded.
INSERT INTO cities (name, country, country_code, region, description, image, cost_index, popularity, latitude, longitude)
VALUES
  ('Paris', 'France', 'FR', 'Île-de-France', 'France''s capital, known for art, architecture, and cafés.', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34', 82.50, 98, 48.856613, 2.352222),
  ('Rome', 'Italy', 'IT', 'Lazio', 'Historic capital with ancient ruins, food, and lively piazzas.', 'https://images.unsplash.com/photo-1552832230-c0197dd311b5', 71.25, 95, 41.902782, 12.496366),
  ('Tokyo', 'Japan', 'JP', 'Kantō', 'A dynamic city blending traditional shrines with modern neighborhoods.', 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf', 88.00, 99, 35.676200, 139.650000),
  ('Lisbon', 'Portugal', 'PT', 'Lisbon District', 'A hilly coastal city of tiled façades, trams, and viewpoints.', 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b', 57.75, 87, 38.722252, -9.139337)
ON CONFLICT (name, country, region) DO NOTHING;

INSERT INTO activities (city_id, name, description, category, duration_minutes, estimated_cost, image)
SELECT c.id, v.name, v.description, v.category, v.duration_minutes, v.estimated_cost, v.image
FROM (
  VALUES
    ('Paris', 'Louvre Museum', 'Explore landmark artworks including the Mona Lisa.', 'culture', 180, 22.00, 'https://images.unsplash.com/photo-1564399579883-451a5d44ec08'),
    ('Paris', 'Seine Evening Cruise', 'See Paris landmarks from the river at sunset.', 'sightseeing', 75, 19.00, 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34'),
    ('Rome', 'Colosseum and Roman Forum', 'Guided visit to Rome''s iconic ancient sites.', 'culture', 210, 35.00, 'https://images.unsplash.com/photo-1552832230-c0197dd311b5'),
    ('Rome', 'Trastevere Food Walk', 'Sample local Roman dishes in Trastevere.', 'food', 150, 45.00, 'https://images.unsplash.com/photo-1529260830199-42c24126f198'),
    ('Tokyo', 'Senso-ji Temple Visit', 'Morning visit to Tokyo''s oldest temple.', 'culture', 90, 0.00, 'https://images.unsplash.com/photo-1542931287-023b922fa89b'),
    ('Tokyo', 'Shibuya Crossing Photo Walk', 'Explore Shibuya''s famous crossing and side streets.', 'sightseeing', 120, 0.00, 'https://images.unsplash.com/photo-1542051841857-5f90071e7989'),
    ('Lisbon', 'Alfama Walking Tour', 'Discover Lisbon''s oldest neighborhood on foot.', 'sightseeing', 150, 18.00, 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b'),
    ('Lisbon', 'Fado Dinner Experience', 'Enjoy traditional Portuguese music with dinner.', 'entertainment', 180, 55.00, 'https://images.unsplash.com/photo-1513735492246-483525079686')
) AS v(city_name, name, description, category, duration_minutes, estimated_cost, image)
JOIN cities c ON c.name = v.city_name
ON CONFLICT DO NOTHING;
