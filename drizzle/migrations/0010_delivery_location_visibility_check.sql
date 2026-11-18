CREATE OR REPLACE FUNCTION public.can_read_delivery_location(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
 SELECT 1 FROM public.order_deliveries d JOIN public.orders o ON o.id=d.order_id
 WHERE d.order_id=_order_id AND d.state='em_rota' AND o.status='enviado'
 AND (d.customer_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR (d.courier_id=auth.uid() AND EXISTS(SELECT 1 FROM public.couriers c WHERE c.user_id=auth.uid() AND c.active)))
 );
$$;
REVOKE ALL ON FUNCTION public.can_read_delivery_location(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_delivery_location(uuid) TO authenticated,service_role;
DROP POLICY locations_active_read ON public.delivery_locations;
CREATE POLICY locations_active_read ON public.delivery_locations FOR SELECT TO authenticated USING(public.can_read_delivery_location(order_id));