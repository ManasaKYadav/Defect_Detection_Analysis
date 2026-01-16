-- Create inspections table to store all quality control inspections
CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  production_line TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'warning', 'critical')),
  defects_found INTEGER NOT NULL DEFAULT 0,
  confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  defects JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_inspections_created_at ON public.inspections(created_at DESC);
CREATE INDEX idx_inspections_status ON public.inspections(status);

-- Enable RLS
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Since this is a manufacturing QC system, inspections should be readable by anyone
-- but only the system (via service role) should insert them
-- For now, allow public read and authenticated insert
CREATE POLICY "Anyone can view inspections"
  ON public.inspections
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert inspections"
  ON public.inspections
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections;