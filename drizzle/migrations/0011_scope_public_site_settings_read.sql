ALTER POLICY "settings public read" ON public.site_settings
  TO anon, authenticated
  USING (id = 1);
COMMENT ON POLICY "settings public read" ON public.site_settings IS 'Public storefront configuration only: the singleton id = 1 contains intentionally customer-visible theme, announcement, contact and receiving Pix key. No unrestricted all-row read policy.';