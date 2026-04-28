CREATE TABLE public.changelog_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'new' CHECK (category IN ('new', 'improved', 'fixed')),
  created_by UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view changelog entries"
ON public.changelog_entries FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert changelog entries"
ON public.changelog_entries FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND created_by = auth.uid());

CREATE POLICY "Admins can update changelog entries"
ON public.changelog_entries FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete changelog entries"
ON public.changelog_entries FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_changelog_entries_updated_at
BEFORE UPDATE ON public.changelog_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_changelog_entries_sent_at ON public.changelog_entries (sent_at);
CREATE INDEX idx_changelog_entries_created_at ON public.changelog_entries (created_at DESC);