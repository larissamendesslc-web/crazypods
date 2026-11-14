-- Schema proposal for Lovable Cloud. Apply through the project's Lovable editor before release.
begin;

create schema if not exists crazy_orders_private;
revoke all on schema crazy_orders_private from public;
grant usage on schema crazy_orders_private to anon, authenticated;

create sequence crazy_orders_private.order_number start with 1 maxvalue 999999999999999;

create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  code text not null unique,
  customer_name text not null,
  phone text not null,
  address text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  sale_id uuid unique references public.sales(id),
  check ((confirmed_at is null) = (sale_id is null))
);

alter table public.shop_orders enable row level security;
revoke all on public.shop_orders from public, anon, authenticated;
grant select (id, code, customer_name, phone, address, items, total, created_at, confirmed_at, sale_id)
  on public.shop_orders to authenticated;

create policy shop_orders_admin_read on public.shop_orders
  for select to authenticated using ((select public.has_role(auth.uid(), 'admin')));

create index shop_orders_pending_idx on public.shop_orders (created_at desc, id desc)
  where confirmed_at is null;

create function crazy_orders_private.create_order(
  p_request_id uuid, p_name text, p_phone text, p_address text, p_items jsonb
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  line record;
  product public.products%rowtype;
  snapshot jsonb := '[]'::jsonb;
  order_total numeric := 0;
  existing_code text;
  order_number text;
  new_code text;
begin
  if p_request_id is null
    or char_length(trim(coalesce(p_name, ''))) not between 2 and 120
    or coalesce(p_phone, '') !~ '^(55)?[1-9][0-9]{9,10}$'
    or char_length(trim(coalesce(p_address, ''))) not between 8 and 500 then
    raise exception 'Confira seus dados de entrega.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Seu carrinho está vazio ou inválido.';
  end if;
  if jsonb_array_length(p_items) not between 1 and 100
    or octet_length(p_items::text) > 65536 then
    raise exception 'Seu carrinho está vazio ou excede o limite de itens.';
  end if;

  -- This key is generated randomly in the browser and only returns the short code.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text, 1999));
  select code into existing_code from public.shop_orders where request_id = p_request_id;
  if found then
    return existing_code;
  end if;

  for line in
    select product_id, coalesce(flavor, '') as flavor,
           sum(quantity) as quantity, min(expected_price) as min_price,
           max(expected_price) as max_price, count(expected_price) as prices, count(*) as lines
    from jsonb_to_recordset(p_items) as i(product_id uuid, flavor text, quantity integer, expected_price numeric)
    where quantity between 1 and 999
    group by product_id, coalesce(flavor, '')
  loop
    select * into product from public.products where id = line.product_id;
    if not found or product.sold_out then
      raise exception 'Um dos produtos do carrinho está indisponível.';
    end if;
    if (cardinality(product.flavors) = 0 and line.flavor <> '')
       or (cardinality(product.flavors) > 0 and not (line.flavor = any(product.flavors))) then
      raise exception 'Confira o sabor de % no carrinho.', product.name;
    end if;
    if line.quantity > 999 then
      raise exception 'A quantidade de % no carrinho é inválida.', product.name;
    end if;
    if line.prices <> line.lines or line.min_price <> product.price or line.max_price <> product.price then
      raise exception 'O preço de % mudou. Remova esse produto e adicione novamente.', product.name;
    end if;

    snapshot := snapshot || jsonb_build_array(jsonb_build_object(
      'product_id', product.id, 'product_name', product.name, 'flavor', line.flavor,
      'quantity', line.quantity, 'unit_price', product.price
    ));
    order_total := order_total + product.price * line.quantity;
  end loop;

  if jsonb_array_length(snapshot) = 0 or exists (
    select 1 from jsonb_to_recordset(p_items) as i(quantity integer)
    where quantity is null or quantity not between 1 and 999
  ) then
    raise exception 'Confira as quantidades do carrinho.';
  end if;

  order_number := nextval('crazy_orders_private.order_number')::text;
  new_code := lpad(order_number, greatest(4, length(order_number)), '0');
  insert into public.shop_orders (request_id, code, customer_name, phone, address, items, total)
  values (p_request_id, new_code, trim(p_name), p_phone, trim(p_address), snapshot, order_total);
  return new_code;
end;
$$;

create function crazy_orders_private.confirm_order(p_order_id uuid, p_payment text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  shop_order public.shop_orders%rowtype;
  sale_lines jsonb;
  missing_item text;
  sale uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;

  select * into shop_order from public.shop_orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;
  if shop_order.sale_id is not null then
    return shop_order.sale_id;
  end if;
  if p_payment is null or p_payment not in ('pix', 'cash', 'card', 'other') then
    raise exception 'Selecione a forma de pagamento.';
  end if;

  select jsonb_agg(jsonb_build_object('inventory_id', inventory.id,
           'quantity', line.quantity, 'unit_price', line.unit_price)),
         min(concat_ws(' · ', line.product_name, nullif(line.flavor, '')))
           filter (where inventory.id is null)
    into sale_lines, missing_item
  from jsonb_to_recordset(shop_order.items)
    as line(product_id uuid, product_name text, flavor text, quantity integer, unit_price numeric)
  left join public.inventory on inventory.product_id = line.product_id and inventory.flavor = line.flavor;
  if missing_item is not null then
    raise exception 'Cadastre o estoque de % antes de confirmar.', missing_item;
  end if;

  -- record_sale already locks inventory, decrements quantities, and writes the financial sale.
  sale := public.record_sale(sale_lines, shop_order.customer_name, p_payment,
    'Pedido #' || shop_order.code, now(), shop_order.id);

  update public.shop_orders set sale_id = sale, confirmed_at = now() where id = shop_order.id;
  return sale;
end;
$$;

-- Expose only the narrow checkout and admin RPC contracts to PostgREST.
create function public.create_shop_order(
  p_request_id uuid, p_name text, p_phone text, p_address text, p_items jsonb
) returns text language sql security invoker set search_path = ''
as $$ select crazy_orders_private.create_order(p_request_id, p_name, p_phone, p_address, p_items); $$;

create function public.confirm_shop_order(p_order_id uuid, p_payment text)
returns uuid language sql security invoker set search_path = ''
as $$ select crazy_orders_private.confirm_order(p_order_id, p_payment); $$;

revoke all on function crazy_orders_private.create_order(uuid,text,text,text,jsonb),
  public.create_shop_order(uuid,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function crazy_orders_private.create_order(uuid,text,text,text,jsonb),
  public.create_shop_order(uuid,text,text,text,jsonb) to anon, authenticated;

revoke all on function crazy_orders_private.confirm_order(uuid,text),
  public.confirm_shop_order(uuid,text) from public, anon, authenticated;
grant execute on function crazy_orders_private.confirm_order(uuid,text),
  public.confirm_shop_order(uuid,text) to authenticated;

notify pgrst, 'reload schema';

commit;
