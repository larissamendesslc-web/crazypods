ALTER TABLE public.delivery_settings ADD COLUMN origin_zip text, ADD COLUMN second_origin_zip text, ADD COLUMN origin_whatsapp text, ADD COLUMN second_origin_whatsapp text;
ALTER TABLE public.orders ADD COLUMN delivery_whatsapp text;
CREATE OR REPLACE FUNCTION public.snapshot_delivery_origin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dq public.delivery_quotes; ds public.delivery_settings;
BEGIN
 IF NEW.delivery_quote_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO dq FROM public.delivery_quotes WHERE id = NEW.delivery_quote_id;
 SELECT * INTO ds FROM public.delivery_settings WHERE id = 1;
 IF dq.origin_store = 2 AND (ds.second_origin_address IS NULL OR ds.second_origin_lat IS NULL OR ds.second_origin_lng IS NULL) THEN RAISE EXCEPTION 'Calcule o frete novamente'; END IF;
 NEW.delivery_store := dq.origin_store;
 NEW.delivery_origin_address := CASE WHEN dq.origin_store = 2 THEN ds.second_origin_address ELSE ds.origin_address END;
 NEW.delivery_whatsapp := CASE WHEN dq.origin_store = 2 THEN ds.second_origin_whatsapp ELSE ds.origin_whatsapp END;
 RETURN NEW;
END $$;