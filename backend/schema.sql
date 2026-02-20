-- Claw — database schema
-- Run this in the Supabase SQL Editor on a new project, then put the project's
-- URL and service key in backend/.env
--
-- Extracted from docs/capstone/Capstone_Final_Submission.md (Appendix).

-- Core user accounts
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,      -- bcrypt hash, never plaintext
  business_name VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Service offerings
CREATE TABLE services (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  duration   INTEGER NOT NULL,              -- minutes
  price      DECIMAL(10,2) NOT NULL,
  currency   VARCHAR(3) DEFAULT 'INR',
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client records
CREATE TABLE clients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  phone      VARCHAR(20) NOT NULL,
  email      VARCHAR(255),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointment bookings
CREATE TABLE appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id)    ON DELETE CASCADE,
  client_id           UUID REFERENCES clients(id)  ON DELETE CASCADE,
  service_id          UUID REFERENCES services(id) ON DELETE SET NULL,
  date_time           TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ NOT NULL,
  status              VARCHAR(20) DEFAULT 'pending',
  notes               TEXT,
  series_id           UUID,
  is_recurring        BOOLEAN DEFAULT false,
  recurrence_pattern  VARCHAR(20),
  recurrence_end_date TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset tokens (15-minute expiry)
CREATE TABLE password_resets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  code       VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- In-app ratings (one per user, upserted)
CREATE TABLE ratings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes serving the three most frequent read paths
CREATE INDEX idx_appointments_user_date ON appointments(user_id, date_time);
CREATE INDEX idx_clients_user           ON clients(user_id);
