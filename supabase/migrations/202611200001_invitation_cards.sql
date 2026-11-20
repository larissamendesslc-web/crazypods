-- CRAZY INVITES 1.0. Schema also applied to Lovable Cloud Supabase on 2026-11-19.
CREATE TABLE IF NOT EXISTS public.invitation_cards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9][a-z0-9-]{2,60}$'),
 eyebrow text NOT NULL DEFAULT 'CONVITE ESPECIAL' CHECK(char_length(eyebrow) BETWEEN 1 AND 60),
 title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 90),
 subtitle text NOT NULL DEFAULT '' CHECK(char_length(subtitle) <= 220),
 cta_label text NOT NULL DEFAULT 'Entrar na loja' CHECK(char_length(cta_label) BETWEEN 1 AND 50),
 destination text NOT NULL DEFAULT '/loja' CHECK(destination IN ('/','/loja')),
 theme text NOT NULL DEFAULT 'neon' CHECK(theme IN ('neon','smoke','gold')),
 image_url text CHECK(image_url IS NULL OR (char_length(image_url)<=1500 AND image_url ~ '^https://')),
 enabled boolean NOT NULL DEFAULT true,
 expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invitation_cards_public_idx ON public.invitation_cards(slug) WHERE enabled;
ALTER TABLE public.invitation_cards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invitation_cards FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.invitation_cards TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.invitation_cards TO authenticated;
DROP POLICY IF EXISTS invitation_cards_public_select ON public.invitation_cards;
CREATE POLICY invitation_cards_public_select ON public.invitation_cards FOR SELECT TO anon,authenticated
 USING(enabled AND (expires_at IS NULL OR expires_at>now()));
DROP POLICY IF EXISTS invitation_cards_admin_select ON public.invitation_cards;
CREATE POLICY invitation_cards_admin_select ON public.invitation_cards FOR SELECT TO authenticated
 USING(public.has_role(auth.uid(),'admin'::public.app_role));
DROP POLICY IF EXISTS invitation_cards_admin_insert ON public.invitation_cards;
CREATE POLICY invitation_cards_admin_insert ON public.invitation_cards FOR INSERT TO authenticated
 WITH CHECK(public.has_role(auth.uid(),'admin'::public.app_role));
DROP POLICY IF EXISTS invitation_cards_admin_update ON public.invitation_cards;
CREATE POLICY invitation_cards_admin_update ON public.invitation_cards FOR UPDATE TO authenticated
 USING(public.has_role(auth.uid(),'admin'::public.app_role))
 WITH CHECK(public.has_role(auth.uid(),'admin'::public.app_role));
DROP POLICY IF EXISTS invitation_cards_admin_delete ON public.invitation_cards;
CREATE POLICY invitation_cards_admin_delete ON public.invitation_cards FOR DELETE TO authenticated
 USING(public.has_role(auth.uid(),'admin'::public.app_role));
INSERT INTO public.invitation_cards(slug,eyebrow,title,subtitle,cta_label,destination,theme,enabled)
VALUES('convite-crazy','VOCÊ É NOSSO CONVIDADO','Entre para o universo Crazy',
 'Uma experiência diferente espera por você. Toque para conhecer nossa loja.',
 'Explorar a loja','/loja','neon',true)
ON CONFLICT(slug) DO NOTHING;
