CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  is_kyc_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loads (
  id TEXT PRIMARY KEY,
  shipper_user_id TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  drop_address TEXT NOT NULL,
  pickup_city TEXT NOT NULL,
  drop_city TEXT NOT NULL,
  material_type TEXT NOT NULL,
  weight_tons NUMERIC NOT NULL,
  quoted_price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  scheduled_pickup_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  load_id TEXT NOT NULL,
  driver_user_id TEXT NOT NULL,
  current_status TEXT NOT NULL DEFAULT 'ASSIGNED',
  vehicle_number TEXT NOT NULL,
  eta_hours INT NULL,
  current_lat DOUBLE PRECISION NULL,
  current_lng DOUBLE PRECISION NULL,
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL
);
