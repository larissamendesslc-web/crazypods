REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.delivery_quotes FROM authenticated, anon;
REVOKE ALL ON public.delivery_quotes FROM anon;
GRANT SELECT ON public.delivery_quotes TO authenticated;
GRANT ALL ON public.delivery_quotes TO service_role;