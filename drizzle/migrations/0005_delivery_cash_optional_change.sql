CREATE OR REPLACE FUNCTION public.place_order(_items jsonb,_payment_method text,_notes text,_change_for numeric,_delivery_quote_id uuid)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE it jsonb; p public.products; q int; sub numeric:=0; lines jsonb:='[]'::jsonb; prof public.profiles; o public.orders; ds public.delivery_settings; dq public.delivery_quotes; fee numeric; eta int;
BEGIN
 _change_for:=nullif(_change_for,0);
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para comprar'; END IF;
 SELECT * INTO ds FROM public.delivery_settings WHERE id=1 FOR SHARE;
 IF NOT FOUND OR NOT ds.enabled THEN RAISE EXCEPTION 'Delivery indisponível no momento'; END IF;
 SELECT * INTO dq FROM public.delivery_quotes WHERE id=_delivery_quote_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR dq.used_at IS NOT NULL OR dq.expires_at<=now() OR dq.settings_version<>ds.updated_at THEN RAISE EXCEPTION 'Calcule o frete novamente antes de confirmar'; END IF;
 IF dq.distance_meters>ds.max_km*1000 THEN RAISE EXCEPTION 'Endereço fora da área de entrega'; END IF;
 fee:=public.delivery_fee(ds.base_fee,ds.per_km,dq.distance_meters);
 eta:=ds.preparation_minutes+ceil(dq.travel_seconds/60.0);
 IF jsonb_typeof(_items)<>'array' OR jsonb_array_length(_items)=0 OR jsonb_array_length(_items)>100 THEN RAISE EXCEPTION 'Carrinho inválido'; END IF;
 IF _payment_method NOT IN ('online','dinheiro') THEN RAISE EXCEPTION 'Forma de pagamento inválida'; END IF;
 FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
  q:=(it->>'quantity')::int;
  IF q IS NULL OR q<1 OR q>99 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  SELECT * INTO p FROM public.products WHERE id=(it->>'product_id')::uuid AND active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto indisponível'; END IF;
  IF p.stock<q THEN RAISE EXCEPTION 'Estoque insuficiente para %',p.name; END IF;
  UPDATE public.products SET stock=stock-q,updated_at=now() WHERE id=p.id;
  sub:=sub+p.price*q;
  lines:=lines||jsonb_build_object('product_id',p.id,'name',p.name,'flavor',left(coalesce(it->>'flavor',''),80),'quantity',q,'price',p.price,'image_url',p.image_url);
 END LOOP;
 IF _payment_method='dinheiro' AND _change_for IS NOT NULL AND _change_for<sub+fee THEN RAISE EXCEPTION 'O valor para troco deve ser maior ou igual ao total com frete'; END IF;
 SELECT * INTO prof FROM public.profiles WHERE id=auth.uid();
 IF NOT FOUND OR length(trim(prof.full_name))<2 OR length(trim(prof.phone))<10 THEN RAISE EXCEPTION 'Informe nome e telefone'; END IF;
 INSERT INTO public.orders(user_id,items,subtotal,total,payment_method,customer_name,customer_phone,customer_address,notes,change_for,shipping_fee,delivery_distance_meters,delivery_minutes,delivery_quote_id)
 VALUES(auth.uid(),lines,sub,sub+fee,_payment_method,prof.full_name,prof.phone,dq.customer_address,left(coalesce(_notes,''),500),CASE WHEN _payment_method='dinheiro' THEN _change_for END,fee,dq.distance_meters,eta,dq.id) RETURNING * INTO o;
 UPDATE public.delivery_quotes SET used_at=now() WHERE id=dq.id;
 RETURN o;
END $$;