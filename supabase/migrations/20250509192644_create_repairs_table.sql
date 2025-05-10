CREATE TABLE public.repairs (
    id bigint primary key generated always as identity,
    customer_id bigint references public.customers(id) on delete cascade,
    bike_model text not null,  -- Store the bike model for repairs
    repair_start timestamp with time zone not null,
    repair_end timestamp with time zone,
    delivery_date timestamp with time zone,
    price numeric(10, 2) not null,
    notes text,
    status text not null CHECK (status IN ('pending', 'in progress', 'completed', 'canceled')),
    created_at timestamp with time zone default now()
) WITH (OIDS=FALSE);
-- Enable RLS for the repairs table
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;

-- Policy for selecting repairs
CREATE POLICY select_repairs ON public.repairs
FOR SELECT
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to select repairs

-- Policy for inserting repairs
CREATE POLICY insert_repairs ON public.repairs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);  -- Allow only logged-in users to insert repairs

-- Policy for updating repairs
CREATE POLICY update_repairs ON public.repairs
FOR UPDATE
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to update repairs

-- Policy for deleting repairs
CREATE POLICY delete_repairs ON public.repairs
FOR DELETE
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to delete repairs