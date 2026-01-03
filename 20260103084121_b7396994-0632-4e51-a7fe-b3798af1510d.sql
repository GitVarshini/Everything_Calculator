-- Create calculators table for storing generated calculators
CREATE TABLE public.calculators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  formula TEXT NOT NULL,
  output_label TEXT DEFAULT 'Result',
  author_name TEXT,
  author_email TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ratings table for calculator ratings
CREATE TABLE public.calculator_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calculator_id UUID NOT NULL REFERENCES public.calculators(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.calculators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (anonymous browsing)
CREATE POLICY "Anyone can view calculators" 
ON public.calculators 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create calculators" 
ON public.calculators 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update view count" 
ON public.calculators 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can view ratings" 
ON public.calculator_ratings 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can rate calculators" 
ON public.calculator_ratings 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_calculators_updated_at
BEFORE UPDATE ON public.calculators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for search performance
CREATE INDEX idx_calculators_title ON public.calculators USING gin(to_tsvector('english', title));
CREATE INDEX idx_calculators_created_at ON public.calculators(created_at DESC);
CREATE INDEX idx_calculator_ratings_calculator_id ON public.calculator_ratings(calculator_id);