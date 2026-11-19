-- Crazy Smoke Black Edition: presentation-only settings for the existing Crazy Pods home.
-- Keep products, customers, payments, orders, product image URLs and existing themes unchanged.
ALTER TABLE public.home_design
  ADD COLUMN IF NOT EXISTS smoke_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS smoke_intensity smallint NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS motion_preset text NOT NULL DEFAULT 'cinematic',
  ADD COLUMN IF NOT EXISTS show_side_art boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hero_art_scale smallint NOT NULL DEFAULT 95;
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.home_design'::regclass AND conname='home_design_smoke_intensity_range') THEN
    ALTER TABLE public.home_design ADD CONSTRAINT home_design_smoke_intensity_range CHECK (smoke_intensity BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.home_design'::regclass AND conname='home_design_motion_preset_allowed') THEN
    ALTER TABLE public.home_design ADD CONSTRAINT home_design_motion_preset_allowed CHECK (motion_preset IN ('off','subtle','cinematic'));
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.home_design'::regclass AND conname='home_design_art_scale_range') THEN
    ALTER TABLE public.home_design ADD CONSTRAINT home_design_art_scale_range CHECK (hero_art_scale BETWEEN 65 AND 125);
  END IF;
END $$;
-- The smoke theme is selected in the site's existing Admin > Aparência screen.
-- Do not automatically overwrite the chosen theme when applying this migration to another shop.
