CREATE TABLE public.rentals (
    id bigint primary key generated always as identity,
    customer_id bigint references public.customers(id) on delete cascade,
    status text not null CHECK (status IN ('active', 'completed', 'canceled')),
    start_date timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone default now()
) WITH (OIDS=FALSE);

CREATE TABLE public.rental_items (
    id bigint primary key generated always as identity,
    rental_id bigint references public.rentals(id) on delete cascade,
    bike_type_id bigint references public.bike_types(id) on delete cascade,
    rental_pricing_id bigint references public.rental_pricing(id) on delete cascade,
    quantity integer not null default 1,
    created_at timestamp with time zone default now()
) WITH (OIDS=FALSE);

-- Enable RLS for the rentals table
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- Policy for selecting rentals
CREATE POLICY select_rentals ON public.rentals
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy for inserting rentals
CREATE POLICY insert_rentals ON public.rentals
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy for updating rentals
CREATE POLICY update_rentals ON public.rentals
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Policy for deleting rentals
CREATE POLICY delete_rentals ON public.rentals
FOR DELETE
USING (auth.role() = 'authenticated');

-- Enable RLS for the rental_items table
ALTER TABLE public.rental_items ENABLE ROW LEVEL SECURITY;

-- Policy for selecting rental_items
CREATE POLICY select_rental_items ON public.rental_items
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy for inserting rental_items
CREATE POLICY insert_rental_items ON public.rental_items
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy for updating rental_items
CREATE POLICY update_rental_items ON public.rental_items
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Policy for deleting rental_items
CREATE POLICY delete_rental_items ON public.rental_items
FOR DELETE
USING (auth.role() = 'authenticated');
