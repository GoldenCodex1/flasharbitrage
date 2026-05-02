-- Backfill: every existing 'admin' becomes super_admin too
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'super_admin'::public.app_role
FROM public.user_roles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- Helper: get current user's highest admin sub-role
CREATE OR REPLACE FUNCTION public.current_admin_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') THEN 'super_admin'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'trade_manager') THEN 'trade_manager'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'finance_manager') THEN 'finance_manager'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'support') THEN 'support'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'viewer') THEN 'viewer'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN 'super_admin'
    ELSE NULL
  END;
$$;

-- Helper: is the current user any kind of admin
CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin','super_admin','trade_manager','finance_manager','support','viewer')
  );
$$;

-- List admins (super_admin only)
CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE(user_id uuid, email text, full_name text, role text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id,
         au.email::text,
         p.full_name,
         (
           SELECT ur2.role::text
           FROM public.user_roles ur2
           WHERE ur2.user_id = ur.user_id
             AND ur2.role IN ('super_admin','trade_manager','finance_manager','support','viewer')
           ORDER BY CASE ur2.role::text
             WHEN 'super_admin' THEN 1
             WHEN 'trade_manager' THEN 2
             WHEN 'finance_manager' THEN 3
             WHEN 'support' THEN 4
             WHEN 'viewer' THEN 5
             ELSE 6 END
           LIMIT 1
         ) AS role,
         (SELECT min(ur3.created_at) FROM public.user_roles ur3 WHERE ur3.user_id = ur.user_id) AS created_at
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('admin','super_admin','trade_manager','finance_manager','support','viewer')
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  GROUP BY ur.user_id, au.email, p.full_name;
$$;

-- Promote/assign role by email (super_admin only)
CREATE OR REPLACE FUNCTION public.assign_admin_role(_email text, _role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super admins can assign roles');
  END IF;

  IF _role NOT IN ('super_admin','trade_manager','finance_manager','support','viewer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  SELECT id INTO _target FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _target IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No user found with that email');
  END IF;

  -- Remove existing admin sub-roles, keep base 'admin' for legacy compatibility
  DELETE FROM public.user_roles
  WHERE user_id = _target
    AND role IN ('super_admin','trade_manager','finance_manager','support','viewer');

  INSERT INTO public.user_roles (user_id, role) VALUES (_target, _role::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Ensure they also have generic 'admin' so existing has_role(...,'admin') checks work
  INSERT INTO public.user_roles (user_id, role) VALUES (_target, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.admin_action_logs (admin_id, section, field_name, old_value, new_value)
  VALUES (auth.uid(), 'admins', 'assign_role', _email, _role);

  RETURN jsonb_build_object('success', true, 'user_id', _target, 'role', _role);
END;
$$;

-- Deactivate admin: removes all admin roles (super_admin only, cannot self-deactivate)
CREATE OR REPLACE FUNCTION public.deactivate_admin(_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super admins can deactivate admins');
  END IF;

  IF _target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot deactivate yourself');
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _target_user_id
    AND role IN ('admin','super_admin','trade_manager','finance_manager','support','viewer');

  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.admin_action_logs (admin_id, section, field_name, old_value, new_value)
  VALUES (auth.uid(), 'admins', 'deactivate', _target_user_id::text, 'removed');

  RETURN jsonb_build_object('success', true);
END;
$$;