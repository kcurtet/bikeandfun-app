CREATE TABLE public.rentals (
    id bigint primary key generated always as identity,
    customer_id bigint references public.customers(id) on delete cascade,
    bike_type_id bigint references public.bike_types(id) on delete cascade,
    rental_pricing_id bigint references public.rental_pricing(id) on delete cascade,
    status text not null CHECK (status IN ('active', 'completed', 'canceled')),
    start_date timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone default now()
) WITH (OIDS=FALSE);
-- Enable RLS for the rentals table
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- Policy for selecting rentals
CREATE POLICY select_rentals ON public.rentals
FOR SELECT
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to select rentals

-- Policy for inserting rentals
CREATE POLICY insert_rentals ON public.rentals
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);  -- Allow only logged-in users to insert rentals

-- Policy for updating rentals
CREATE POLICY update_rentals ON public.rentals
FOR UPDATE
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to update rentals

-- Policy for deleting rentals
CREATE POLICY delete_rentals ON public.rentals
FOR DELETE
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to delete rentals
