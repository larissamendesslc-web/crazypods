DROP POLICY IF EXISTS delivery_settings_read ON public.delivery_settings;
CREATE POLICY delivery_settings_admin_read ON public.delivery_settings
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE SELECT ON public.delivery_settings FROM anon;
GRANT SELECT ON public.delivery_settings TO authenticated;
GRANT ALL ON public.delivery_settings TO service_role;

CREATE OR REPLACE FUNCTION public.get_delivery_availability()
RETURNS TABLE(enabled boolean, updated_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ds.enabled, ds.updated_at
  FROM public.delivery_settings AS ds
  WHERE ds.id = 1 AND auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_delivery_availability() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_delivery_availability() TO authenticated, service_role;