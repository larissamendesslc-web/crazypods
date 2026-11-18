CREATE TABLE public.couriers (
 user_id uuid PRIMARY KEY,
 name text NOT NULL,
 phone text NOT NULL DEFAULT '',
 active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.couriers TO authenticated;
GRANT ALL ON public.couriers TO service_role;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY couriers_read ON public.couriers FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.order_deliveries (
 order_id uuid PRIMARY KEY REFERENCES public.orders(id),
 customer_id uuid NOT NULL,
 courier_id uuid NOT NULL REFERENCES public.couriers(user_id),
 courier_name text NOT NULL,
 state text NOT NULL DEFAULT 'atribuido' CHECK(state IN ('atribuido','em_rota','entregue','problema','cancelado')),
 issue text NOT NULL DEFAULT '',
 assigned_at timestamptz NOT NULL DEFAULT now(),
 started_at timestamptz,
 completed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_deliveries TO authenticated;
GRANT ALL ON public.order_deliveries TO service_role;
ALTER TABLE public.order_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY deliveries_read ON public.order_deliveries FOR SELECT TO authenticated USING (customer_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR (courier_id=auth.uid() AND EXISTS(SELECT 1 FROM public.couriers c WHERE c.user_id=auth.uid() AND c.active)));

CREATE TABLE public.delivery_locations (
 order_id uuid PRIMARY KEY REFERENCES public.order_deliveries(order_id),
 latitude double precision NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 accuracy double precision NOT NULL CHECK(accuracy BETWEEN 0 AND 5000),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_locations TO authenticated;
GRANT ALL ON public.delivery_locations TO service_role;
ALTER TABLE public.delivery_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY locations_active_read ON public.delivery_locations FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.order_deliveries d JOIN public.orders o ON o.id=d.order_id WHERE d.order_id=delivery_locations.order_id AND d.state='em_rota' AND o.status='enviado' AND (d.customer_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR (d.courier_id=auth.uid() AND EXISTS(SELECT 1 FROM public.couriers c WHERE c.user_id=auth.uid() AND c.active))))
);
CREATE INDEX deliveries_courier_state ON public.order_deliveries(courier_id,state);

CREATE OR REPLACE FUNCTION public.register_courier(_email text,_active boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid; prof public.profiles;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito ao administrador'; END IF;
 SELECT id INTO uid FROM auth.users WHERE lower(email)=lower(trim(_email));
 IF uid IS NULL THEN RAISE EXCEPTION 'O motoboy precisa criar uma conta com este e-mail primeiro'; END IF;
 SELECT * INTO prof FROM public.profiles WHERE id=uid;
 INSERT INTO public.couriers(user_id,name,phone,active) VALUES(uid,coalesce(nullif(prof.full_name,''),'Motoboy'),coalesce(prof.phone,''),_active)
 ON CONFLICT(user_id) DO UPDATE SET name=EXCLUDED.name,phone=EXCLUDED.phone,active=EXCLUDED.active;
 IF NOT _active THEN
  UPDATE public.order_deliveries SET state='problema',issue='Motoboy desativado. Aguarde a loja.',updated_at=now() WHERE courier_id=uid AND state IN ('atribuido','em_rota');
  DELETE FROM public.delivery_locations WHERE order_id IN (SELECT order_id FROM public.order_deliveries WHERE courier_id=uid);
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.assign_order_courier(_order_id uuid,_courier_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; c public.couriers;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito ao administrador'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=_order_id FOR UPDATE;
 IF NOT FOUND OR o.status NOT IN ('pendente','pago') THEN RAISE EXCEPTION 'Este pedido não permite atribuição'; END IF;
 IF o.payment_method='online' AND o.status<>'pago' THEN RAISE EXCEPTION 'Aguarde a aprovação do pagamento'; END IF;
 SELECT * INTO c FROM public.couriers WHERE user_id=_courier_id AND active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Motoboy indisponível'; END IF;
 DELETE FROM public.delivery_locations WHERE order_id=_order_id;
 INSERT INTO public.order_deliveries(order_id,customer_id,courier_id,courier_name) VALUES(o.id,o.user_id,c.user_id,c.name)
 ON CONFLICT(order_id) DO UPDATE SET courier_id=EXCLUDED.courier_id,courier_name=EXCLUDED.courier_name,state='atribuido',issue='',assigned_at=now(),started_at=NULL,completed_at=NULL,updated_at=now();
END $$;

CREATE OR REPLACE FUNCTION public.courier_delivery_action(_order_id uuid,_action text,_issue text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; d public.order_deliveries;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=_order_id FOR UPDATE;
 SELECT * INTO d FROM public.order_deliveries WHERE order_id=_order_id FOR UPDATE;
 IF d.courier_id IS DISTINCT FROM auth.uid() OR NOT EXISTS(SELECT 1 FROM public.couriers WHERE user_id=auth.uid() AND active) THEN RAISE EXCEPTION 'Entrega não autorizada'; END IF;
 IF o.status IN ('cancelado','entregue') OR d.state IN ('cancelado','entregue') THEN RAISE EXCEPTION 'Entrega encerrada'; END IF;
 IF _action='start' THEN
  IF d.state NOT IN ('atribuido','problema') OR o.status NOT IN ('pendente','pago','enviado') THEN RAISE EXCEPTION 'Entrega não pode ser iniciada'; END IF;
  IF o.payment_method='online' AND o.status NOT IN ('pago','enviado') THEN RAISE EXCEPTION 'Pagamento ainda não aprovado'; END IF;
  IF EXISTS(SELECT 1 FROM public.order_deliveries WHERE courier_id=auth.uid() AND state='em_rota' AND order_id<>_order_id) THEN RAISE EXCEPTION 'Finalize a entrega em andamento primeiro'; END IF;
  UPDATE public.order_deliveries SET state='em_rota',started_at=now(),issue='',updated_at=now() WHERE order_id=_order_id;
  UPDATE public.orders SET status='enviado' WHERE id=_order_id;
 ELSIF _action='complete' THEN
  IF d.state<>'em_rota' OR o.status<>'enviado' THEN RAISE EXCEPTION 'Inicie o trajeto antes de concluir'; END IF;
  UPDATE public.order_deliveries SET state='entregue',completed_at=now(),updated_at=now() WHERE order_id=_order_id;
  UPDATE public.orders SET status='entregue' WHERE id=_order_id;
  IF o.payment_method='dinheiro' AND NOT EXISTS(SELECT 1 FROM public.cash_entries WHERE order_id=o.id) THEN
   INSERT INTO public.cash_entries(kind,amount,description,order_id) VALUES('entrada',o.total,'Pedido #'||o.code||' (entrega)',o.id);
  END IF;
  DELETE FROM public.delivery_locations WHERE order_id=_order_id;
 ELSIF _action='issue' THEN
  IF length(trim(_issue))<3 OR length(_issue)>300 THEN RAISE EXCEPTION 'Descreva a ocorrência'; END IF;
  UPDATE public.order_deliveries SET state='problema',issue=trim(_issue),updated_at=now() WHERE order_id=_order_id;
  DELETE FROM public.delivery_locations WHERE order_id=_order_id;
 ELSE RAISE EXCEPTION 'Ação inválida'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_delivery_location(_order_id uuid,_latitude double precision,_longitude double precision,_accuracy double precision)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; d public.order_deliveries;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=_order_id FOR SHARE;
 SELECT * INTO d FROM public.order_deliveries WHERE order_id=_order_id FOR SHARE;
 IF d.courier_id IS DISTINCT FROM auth.uid() OR d.state IS DISTINCT FROM 'em_rota' OR o.status IS DISTINCT FROM 'enviado' OR NOT EXISTS(SELECT 1 FROM public.couriers WHERE user_id=auth.uid() AND active) THEN RAISE EXCEPTION 'Localização permitida somente na sua entrega ativa'; END IF;
 IF _latitude IS NULL OR _longitude IS NULL OR _accuracy IS NULL OR NOT (_latitude BETWEEN -90 AND 90) OR NOT (_longitude BETWEEN -180 AND 180) OR NOT (_accuracy BETWEEN 0 AND 5000) THEN RAISE EXCEPTION 'Localização inválida'; END IF;
 INSERT INTO public.delivery_locations(order_id,latitude,longitude,accuracy) VALUES(_order_id,_latitude,_longitude,_accuracy)
 ON CONFLICT(order_id) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,accuracy=EXCLUDED.accuracy,recorded_at=now();
END $$;

CREATE OR REPLACE FUNCTION public.courier_orders()
RETURNS TABLE(id uuid,code text,customer_name text,customer_phone text,customer_address text,notes text,total numeric,payment_method text,change_for numeric,status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT o.id,o.code,o.customer_name,o.customer_phone,o.customer_address,o.notes,o.total,o.payment_method,o.change_for,o.status
 FROM public.orders o JOIN public.order_deliveries d ON d.order_id=o.id JOIN public.couriers c ON c.user_id=d.courier_id
 WHERE c.user_id=auth.uid() AND c.active AND d.state IN ('atribuido','em_rota','problema') AND o.status NOT IN ('cancelado','entregue');
$$;

CREATE OR REPLACE FUNCTION public.sync_order_delivery_end()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status IN ('cancelado','entregue') AND NEW.status IS DISTINCT FROM OLD.status THEN
  UPDATE public.order_deliveries SET state=CASE WHEN NEW.status='cancelado' THEN 'cancelado' ELSE 'entregue' END,completed_at=now(),updated_at=now() WHERE order_id=NEW.id;
  DELETE FROM public.delivery_locations WHERE order_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_order_delivery_end AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sync_order_delivery_end();
REVOKE ALL ON FUNCTION public.register_courier(text,boolean),public.assign_order_courier(uuid,uuid),public.courier_delivery_action(uuid,text,text),public.update_delivery_location(uuid,double precision,double precision,double precision),public.courier_orders() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_courier(text,boolean),public.assign_order_courier(uuid,uuid),public.courier_delivery_action(uuid,text,text),public.update_delivery_location(uuid,double precision,double precision,double precision),public.courier_orders() TO authenticated,service_role;