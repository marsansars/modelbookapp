
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Agencies table
CREATE TABLE public.agencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_agent_percent NUMERIC NOT NULL DEFAULT 0,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  default_net_days INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agencies" ON public.agencies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON public.agencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  job_date TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  agent_percent NUMERIC NOT NULL DEFAULT 0,
  tax_percent NUMERIC NOT NULL DEFAULT 0,
  net_days INTEGER NOT NULL DEFAULT 60,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own jobs" ON public.jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  receipt TEXT,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  reimbursable BOOLEAN DEFAULT false,
  reimbursed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own expenses" ON public.expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_currency TEXT NOT NULL DEFAULT 'USD',
  custom_categories JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
