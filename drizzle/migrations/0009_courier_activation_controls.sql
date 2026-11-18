CREATE UNIQUE INDEX one_active_delivery_per_courier ON public.order_deliveries(courier_id) WHERE state='em_rota';
CREATE OR REPLACE FUNCTION public.set_courier_active(_courier_id uuid,_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito ao administrador'; END IF;
 UPDATE public.couriers SET active=_active WHERE user_id=_courier_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Motoboy não encontrado'; END IF;
 IF NOT _active THEN
  UPDATE public.order_deliveries SET state='problema',issue='Motoboy desativado. Aguarde a loja.',updated_at=now() WHERE courier_id=_courier_id AND state IN ('atribuido','em_rota');
  DELETE FROM public.delivery_locations WHERE order_id IN (SELECT order_id FROM public.order_deliveries WHERE courier_id=_courier_id);
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_courier_active(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_courier_active(uuid,boolean) TO authenticated,service_role;