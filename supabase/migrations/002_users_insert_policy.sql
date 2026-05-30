-- Allow authenticated users to insert their own profile row.
-- Required because the upsert in the OAuth callback and protected layout
-- runs as the authenticated user (subject to RLS), not as SECURITY DEFINER.
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);
