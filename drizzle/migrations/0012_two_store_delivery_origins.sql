ALTER TABLE public.delivery_settings ADD COLUMN second_origin_address text, ADD COLUMN second_origin_lat double precision, ADD COLUMN second_origin_lng double precision;
ALTER TABLE public.delivery_quotes ADD COLUMN origin_store smallint NOT NULL DEFAULT 1 CHECK (origin_store IN (1,2));
ALTER TABLE public.orders ADD COLUMN delivery_store smallint, ADD COLUMN delivery_origin_address text;
CREATE FUNCTION public.snapshot_delivery_origin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dq public.delivery_quotes; ds public.delivery_settings;
BEGIN
 IF NEW.delivery_quote_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO dq FROM public.delivery_quotes WHERE id = NEW.delivery_quote_id;
 SELECT * INTO ds FROM public.delivery_settings WHERE id = 1;
 IF dq.origin_store = 2 AND (ds.second_origin_address IS NULL OR ds.second_origin_lat IS NULL OR ds.second_origin_lng IS NULL) THEN RAISE EXCEPTION 'Calcule o frete novamente'; END IF;
 NEW.delivery_store := dq.origin_store;
 NEW.delivery_origin_address := CASE WHEN dq.origin_store = 2 THEN ds.second_origin_address ELSE ds.origin_address END;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.snapshot_delivery_origin() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER snapshot_delivery_origin_before_insert BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.snapshot_delivery_origin();