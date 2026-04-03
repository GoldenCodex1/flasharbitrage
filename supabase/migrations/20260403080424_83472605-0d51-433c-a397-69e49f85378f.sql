
-- Applications table
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  country text NOT NULL,
  city text NOT NULL,
  experience text NOT NULL DEFAULT '',
  network_size text NOT NULL DEFAULT '',
  motivation text NOT NULL DEFAULT '',
  selected_role text NOT NULL DEFAULT 'regional_head',
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "Anyone can submit application"
  ON public.applications FOR INSERT
  WITH CHECK (true);

-- Admins full access
CREATE POLICY "Admins can manage applications"
  ON public.applications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Country slots table
CREATE TABLE public.country_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL UNIQUE,
  max_leaders integer NOT NULL DEFAULT 5,
  approved_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.country_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view country_slots"
  ON public.country_slots FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage country_slots"
  ON public.country_slots FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
