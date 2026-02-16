
-- Drop the overly permissive update policy
DROP POLICY "Anyone authenticated can update requests" ON public.space_join_requests;
DROP POLICY "Users can cancel own requests" ON public.space_join_requests;

-- Create a single update policy: either the requester (cancel) or any authenticated user acting as host
CREATE POLICY "Authenticated users can update requests"
  ON public.space_join_requests FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
