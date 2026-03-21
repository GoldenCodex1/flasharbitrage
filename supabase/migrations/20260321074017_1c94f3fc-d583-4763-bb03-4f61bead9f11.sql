
-- Create a security definer function so admins can fetch user emails from auth.users
CREATE OR REPLACE FUNCTION public.get_user_emails()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id as user_id, au.email::text
  FROM auth.users au
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
$$;

-- Function to get a single user's email
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.email::text
  FROM auth.users au
  WHERE au.id = _user_id
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
$$;
