ALTER TABLE public.orders ADD COLUMN change_for numeric(10,2);
ALTER TABLE public.orders ADD COLUMN payment_ref text;

DROP FUNCTION public.place_order(jsonb,text,text);
CREATE FUNCTION public.place_order(_items jsonb, _payment_method text, _notes text, _change_for numeric DEFAULT NULL)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  it jsonb; p public.products; q int; sub numeric := 0; lines jsonb := '[]'::jsonb;
  prof public.profiles; o public.orders;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para comprar'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Carrinho vazio'; END IF;
  IF _payment_method NOT IN ('online','dinheiro') THEN RAISE EXCEPTION 'Forma de pagamento inválida'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    q := (it->>'quantity')::int;
    IF q IS NULL OR q < 1 OR q > 99 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
    SELECT * INTO p FROM public.products WHERE id = (it->>'product_id')::uuid AND active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto indisponível'; END IF;
    IF p.stock < q THEN RAISE EXCEPTION 'Estoque insuficiente para %', p.name; END IF;
    UPDATE public.products SET stock = stock - q, updated_at = now() WHERE id = p.id;
    sub := sub + p.price * q;
    lines := lines || jsonb_build_object('product_id', p.id, 'name', p.name, 'flavor', left(coalesce(it->>'flavor',''),80), 'quantity', q, 'price', p.price, 'image_url', p.image_url);
  END LOOP;
  IF _payment_method = 'dinheiro' AND _change_for IS NOT NULL AND _change_for < sub THEN
    RAISE EXCEPTION 'O valor para troco deve ser maior ou igual ao total';
  END IF;
  SELECT * INTO prof FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.orders (user_id, items, subtotal, total, payment_method, customer_name, customer_phone, customer_address, notes, change_for)
  VALUES (auth.uid(), lines, sub, sub, _payment_method, coalesce(prof.full_name,''), coalesce(prof.phone,''),
    trim(both ', ' from concat_ws(', ', prof.address, prof.city, prof.zip)), left(coalesce(_notes,''),500),
    CASE WHEN _payment_method = 'dinheiro' THEN _change_for END)
  RETURNING * INTO o;
  RETURN o;
END $$;
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb,text,text,numeric) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb,text,text,numeric) TO authenticated;

-- called only by the payment webhook (service role)
CREATE FUNCTION public.confirm_online_payment(_order_id uuid, _paid boolean, _ref text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders; it jsonb;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND OR o.status <> 'pendente' THEN RETURN; END IF;
  IF _paid THEN
    UPDATE public.orders SET status = 'pago', payment_ref = _ref WHERE id = o.id;
    IF NOT EXISTS (SELECT 1 FROM public.cash_entries WHERE order_id = o.id) THEN
      INSERT INTO public.cash_entries (kind, amount, description, order_id) VALUES ('entrada', o.total, 'Pedido #' || o.code || ' (online)', o.id);
    END IF;
  ELSE
    FOR it IN SELECT * FROM jsonb_array_elements(o.items) LOOP
      UPDATE public.products SET stock = stock + (it->>'quantity')::int WHERE id = (it->>'product_id')::uuid;
    END LOOP;
    UPDATE public.orders SET status = 'cancelado', payment_ref = _ref WHERE id = o.id;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.confirm_online_payment(uuid,boolean,text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.confirm_online_payment(uuid,boolean,text) TO service_role;