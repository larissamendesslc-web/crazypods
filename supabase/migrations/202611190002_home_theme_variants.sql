-- Storefront themes must have independent, editable seasonal content.
-- Does not modify product, order, payment, delivery or authentication tables.
CREATE TABLE IF NOT EXISTS public.home_theme_variants (
 theme text PRIMARY KEY CHECK (theme IN ('smoke','natal','ano-novo','halloween','premium','padrao')),
 eyebrow text CHECK (eyebrow IS NULL OR char_length(eyebrow)<=90),
 title text CHECK (title IS NULL OR char_length(title)<=100),
 highlight text CHECK (highlight IS NULL OR char_length(highlight)<=75),
 subtitle text CHECK (subtitle IS NULL OR char_length(subtitle)<=260),
 background_url text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.home_theme_variants ENABLE ROW LEVEL SECURITY;
INSERT INTO public.home_theme_variants(theme) VALUES ('smoke'),('natal'),('ano-novo'),('halloween'),('premium'),('padrao') ON CONFLICT DO NOTHING;
DROP POLICY IF EXISTS home_theme_variants_public_read ON public.home_theme_variants;
CREATE POLICY home_theme_variants_public_read ON public.home_theme_variants
 FOR SELECT TO anon,authenticated USING(true);
DROP POLICY IF EXISTS home_theme_variants_admin_update ON public.home_theme_variants;
CREATE POLICY home_theme_variants_admin_update ON public.home_theme_variants
 FOR UPDATE TO authenticated
 USING(public.has_role(auth.uid(),'admin'::public.app_role))
 WITH CHECK(public.has_role(auth.uid(),'admin'::public.app_role));
REVOKE ALL ON public.home_theme_variants FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.home_theme_variants TO anon,authenticated;
GRANT UPDATE ON public.home_theme_variants TO authenticated;
