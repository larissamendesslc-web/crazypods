-- Crazy Pods Premium Home. Pure presentation data: never inserts products, orders or inventory.
-- Compatible with the existing Crazy Pods Supabase schema and has_role()/app_role.
CREATE TABLE IF NOT EXISTS public.home_design (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  eyebrow text NOT NULL DEFAULT 'UMA NOVA EXPERIÊNCIA CRAZY PODS' CHECK (char_length(eyebrow) <= 90),
  title text NOT NULL DEFAULT 'O extraordinário' CHECK (char_length(title) <= 100),
  highlight text NOT NULL DEFAULT 'do seu jeito.' CHECK (char_length(highlight) <= 75),
  subtitle text NOT NULL DEFAULT 'Conheça nossa vitrine e descubra o que combina com você. Tudo com a identidade Crazy Pods.' CHECK (char_length(subtitle) <= 260),
  primary_label text NOT NULL DEFAULT 'Explorar a loja' CHECK (char_length(primary_label) <= 48),
  primary_link text NOT NULL DEFAULT '/loja' CHECK (char_length(primary_link) <= 240),
  secondary_label text NOT NULL DEFAULT 'Ver destaques' CHECK (char_length(secondary_label) <= 48),
  secondary_link text NOT NULL DEFAULT '#destaques' CHECK (char_length(secondary_link) <= 240),
  background_url text,
  center_image_url text,
  left_image_url text,
  right_image_url text,
  center_caption text NOT NULL DEFAULT 'Vitrine Crazy' CHECK (char_length(center_caption) <= 60),
  left_caption text NOT NULL DEFAULT 'Seu estilo' CHECK (char_length(left_caption) <= 60),
  right_caption text NOT NULL DEFAULT 'Seu próximo favorito' CHECK (char_length(right_caption) <= 60),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.home_feature_cards (
  slot smallint PRIMARY KEY CHECK (slot BETWEEN 1 AND 4),
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 80),
  subtitle text NOT NULL DEFAULT '' CHECK (char_length(subtitle) <= 140),
  image_url text,
  target_link text NOT NULL DEFAULT '/loja' CHECK (char_length(target_link) <= 240),
  active boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.home_design ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_feature_cards ENABLE ROW LEVEL SECURITY;
INSERT INTO public.home_design(id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.home_feature_cards(slot) VALUES (1), (2), (3), (4) ON CONFLICT (slot) DO NOTHING;

DROP POLICY IF EXISTS home_design_read ON public.home_design;
CREATE POLICY home_design_read ON public.home_design FOR SELECT TO anon, authenticated USING (id = 1);
DROP POLICY IF EXISTS home_design_admin_update ON public.home_design;
CREATE POLICY home_design_admin_update ON public.home_design FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (id = 1 AND public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS home_feature_read ON public.home_feature_cards;
CREATE POLICY home_feature_read ON public.home_feature_cards FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS home_feature_admin_update ON public.home_feature_cards;
CREATE POLICY home_feature_admin_update ON public.home_feature_cards FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT ON public.home_design, public.home_feature_cards TO anon, authenticated;
GRANT UPDATE ON public.home_design, public.home_feature_cards TO authenticated;
REVOKE INSERT, DELETE ON public.home_design, public.home_feature_cards FROM anon, authenticated;

-- Public read of published marketing images, admin-only upload / write.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('home-media','home-media',true,10485760,ARRAY['image/png','image/jpeg','image/webp','image/avif'])
  ON CONFLICT(id) DO UPDATE SET
    public=true,file_size_limit=10485760,allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp','image/avif'];
DROP POLICY IF EXISTS home_media_admin_insert ON storage.objects;
DROP POLICY IF EXISTS home_media_admin_update ON storage.objects;
DROP POLICY IF EXISTS home_media_admin_delete ON storage.objects;
CREATE POLICY home_media_admin_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK(bucket_id='home-media' AND public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY home_media_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING(bucket_id='home-media' AND public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK(bucket_id='home-media' AND public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY home_media_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING(bucket_id='home-media' AND public.has_role(auth.uid(),'admin'::public.app_role));
