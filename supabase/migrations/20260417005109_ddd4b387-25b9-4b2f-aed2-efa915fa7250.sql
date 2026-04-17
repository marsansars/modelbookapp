
-- 1) Restrict "Users manage own ..." policies to authenticated role only
DROP POLICY IF EXISTS "Users manage own jobs" ON public.jobs;
CREATE POLICY "Users manage own jobs"
ON public.jobs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own agencies" ON public.agencies;
CREATE POLICY "Users manage own agencies"
ON public.agencies
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own expenses" ON public.expenses;
CREATE POLICY "Users manage own expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own invoices" ON public.invoices;
CREATE POLICY "Users manage own invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own settings" ON public.user_settings;
CREATE POLICY "Users manage own settings"
ON public.user_settings
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) Allow users to update/delete their own feedback screenshots
CREATE POLICY "Users can update their own feedback screenshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'feedback-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'feedback-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own feedback screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'feedback-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
