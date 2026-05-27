-- ==========================================
-- CCBRIDE: COMPLETE DATABASE SCHEMA
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ==========================================
-- 1. TABLES
-- ==========================================

-- USERS TABLE
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('DRIVER', 'PASSENGER')) NOT NULL,
  phone_number TEXT NOT NULL,
  default_location TEXT
);

-- RIDE PARTIES TABLE
CREATE TABLE public.ride_parties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  driver_id UUID REFERENCES public.users(id) NOT NULL,
  status TEXT CHECK (status IN ('OPEN', 'CLOSED', 'FINISHED')) DEFAULT 'OPEN',
  max_seats INT NOT NULL,
  available_seats INT NOT NULL,
  time_range_start TEXT NOT NULL, -- Stored as TEXT to prevent formatting crashes
  time_range_end TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RIDE REQUESTS TABLE
CREATE TABLE public.ride_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  passenger_id UUID REFERENCES public.users(id) NOT NULL,
  party_id UUID REFERENCES public.ride_parties(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('PENDING', 'ACCEPTED', 'CANCELED', 'FINISHED')) DEFAULT 'PENDING',
  pickup_location TEXT NOT NULL,
  time_preference TEXT,
  assigned_time TEXT, -- Stored as TEXT
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Ride Parties
CREATE POLICY "Parties are viewable by everyone" ON public.ride_parties FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Drivers can insert their own parties" ON public.ride_parties FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Drivers can update their own parties" ON public.ride_parties FOR UPDATE USING (auth.uid() = driver_id);

-- Ride Requests
CREATE POLICY "Requests viewable by authenticated users" ON public.ride_requests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Passengers can insert own requests" ON public.ride_requests FOR INSERT WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY "Passengers can update own requests" ON public.ride_requests FOR UPDATE USING (auth.uid() = passenger_id);
CREATE POLICY "Drivers can update requests" ON public.ride_requests FOR UPDATE USING (
  status = 'PENDING' OR party_id IN (SELECT id FROM public.ride_parties WHERE driver_id = auth.uid())
);

-- ==========================================
-- 3. AUTOMATED TRIGGERS & FUNCTIONS
-- ==========================================

-- A. The Atomic Seat Manager
-- Automatically handles subtracting and adding seats when passenger statuses change.
CREATE OR REPLACE FUNCTION manage_party_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Passenger Accepted: Subtract seat & auto-close if full
  IF OLD.status = 'PENDING' AND NEW.status = 'ACCEPTED' THEN
    UPDATE public.ride_parties
    SET available_seats = available_seats - 1,
        status = CASE WHEN available_seats - 1 <= 0 THEN 'CLOSED' ELSE status END
    WHERE id = NEW.party_id;
  END IF;

  -- Passenger Leaves or is Kicked: Add seat back & auto-open
  IF OLD.status = 'ACCEPTED' AND NEW.status IN ('CANCELED', 'PENDING') THEN
    UPDATE public.ride_parties
    SET available_seats = available_seats + 1,
        status = CASE WHEN status = 'CLOSED' THEN 'OPEN' ELSE status END
    WHERE id = OLD.party_id AND status != 'FINISHED';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_request_status_change
AFTER UPDATE ON public.ride_requests
FOR EACH ROW EXECUTE FUNCTION manage_party_seats();

-- B. The Auto-Finish Cascade
-- When a driver finishes a party, all accepted passengers are also marked finished.
CREATE OR REPLACE FUNCTION auto_finish_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'FINISHED' AND OLD.status != 'FINISHED' THEN
    UPDATE public.ride_requests SET status = 'FINISHED' WHERE party_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_party_finished
AFTER UPDATE ON public.ride_parties
FOR EACH ROW EXECUTE FUNCTION auto_finish_requests();

-- ==========================================
-- 4. CRON JOBS (AUTOMATED CLEANUP)
-- ==========================================

-- Auto-delete CANCELED requests older than 24 hours
SELECT cron.schedule(
  'cleanup_canceled_requests',
  '0 * * * *', 
  $$ DELETE FROM public.ride_requests WHERE status = 'CANCELED' AND created_at < NOW() - INTERVAL '24 hours'; $$
);

-- Auto-delete finished/old parties (and cascade to requests) after 1 week (168 hours)
SELECT cron.schedule(
  'cleanup_old_parties',
  '0 * * * *', 
  $$ DELETE FROM public.ride_parties WHERE created_at < NOW() - INTERVAL '168 hours'; $$
);