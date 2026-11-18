CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, address, city, zip)
  VALUES (NEW.id,
    left(coalesce(NEW.raw_user_meta_data->>'full_name',''),120),
    left(coalesce(NEW.raw_user_meta_data->>'phone',''),30),
    left(coalesce(NEW.raw_user_meta_data->>'address',''),300),
    left(coalesce(NEW.raw_user_meta_data->>'city',''),100),
    left(coalesce(NEW.raw_user_meta_data->>'zip',''),20));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- first admin bootstrap: only works while no admin exists
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(),'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin')
$$;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tagline text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.categories (name, slug, tagline, sort_order) VALUES
 ('Ignite','ignite','Intensidade sem limite',1),
 ('Waka','waka','Sabor que vicia no estilo',2),
 ('Elfbar','elfbar','O clássico que todo mundo conhece',3),
 ('Oxbar','oxbar','Potência em cada puxada',4),
 ('LostMary','lostmary','Doce, frutado, inesquecível',5),
 ('Nikbar','nikbar','Compacto e certeiro',6),
 ('THE BLACK SHEEP','the-black-sheep','Para quem foge do rebanho',7);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  compare_price numeric(10,2),
  cost numeric(10,2) NOT NULL DEFAULT 0,
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  flavors text[] NOT NULL DEFAULT '{}',
  puffs text NOT NULL DEFAULT '',
  image_url text,
  accent_color text NOT NULL DEFAULT '#c6ff3d',
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "products admin write" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
-- hide cost from public via column privileges
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (id, category_id, name, description, price, compare_price, stock, flavors, puffs, image_url, accent_color, featured, active, created_at, updated_at) ON public.products TO anon;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text),1,6)),
  user_id uuid NOT NULL,
  items jsonb NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'pix',
  status text NOT NULL DEFAULT 'pendente',
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  customer_address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders own read" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders admin update" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('entrada','saida')),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  description text NOT NULL DEFAULT '',
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_entries TO authenticated;
GRANT ALL ON public.cash_entries TO service_role;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash admin all" ON public.cash_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.site_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  theme text NOT NULL DEFAULT 'padrao',
  announcement text NOT NULL DEFAULT 'Entrega rápida • Pagamento via Pix',
  whatsapp text NOT NULL DEFAULT '5511986825360',
  pix_key text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.site_settings (id) VALUES (1);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings admin update" ON public.site_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- place order: validates price & stock server-side, decrements stock
CREATE OR REPLACE FUNCTION public.place_order(_items jsonb, _payment_method text, _notes text)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  it jsonb; p public.products; q int; sub numeric := 0; lines jsonb := '[]'::jsonb;
  prof public.profiles; o public.orders;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para comprar'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Carrinho vazio'; END IF;
  IF _payment_method NOT IN ('pix','dinheiro','cartao') THEN RAISE EXCEPTION 'Forma de pagamento inválida'; END IF;
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
  SELECT * INTO prof FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.orders (user_id, items, subtotal, total, payment_method, customer_name, customer_phone, customer_address, notes)
  VALUES (auth.uid(), lines, sub, sub, _payment_method, coalesce(prof.full_name,''), coalesce(prof.phone,''),
    trim(both ', ' from concat_ws(', ', prof.address, prof.city, prof.zip)), left(coalesce(_notes,''),500))
  RETURNING * INTO o;
  RETURN o;
END $$;
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb,text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb,text,text) TO authenticated;

-- admin: update order status; paid -> cash entry; cancelled -> restock
CREATE OR REPLACE FUNCTION public.set_order_status(_order_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders; it jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF _status NOT IN ('pendente','pago','enviado','entregue','cancelado') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF o.status = _status THEN RETURN; END IF;
  IF _status = 'cancelado' AND o.status <> 'cancelado' THEN
    FOR it IN SELECT * FROM jsonb_array_elements(o.items) LOOP
      UPDATE public.products SET stock = stock + (it->>'quantity')::int WHERE id = (it->>'product_id')::uuid;
    END LOOP;
    DELETE FROM public.cash_entries WHERE order_id = o.id;
  END IF;
  IF _status IN ('pago','enviado','entregue') AND NOT EXISTS (SELECT 1 FROM public.cash_entries WHERE order_id = o.id) THEN
    INSERT INTO public.cash_entries (kind, amount, description, order_id) VALUES ('entrada', o.total, 'Pedido #' || o.code, o.id);
  END IF;
  UPDATE public.orders SET status = _status WHERE id = o.id;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_order_status(uuid,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_order_status(uuid,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

CREATE POLICY "product images public read" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "product images admin insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "product images admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "product images admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));