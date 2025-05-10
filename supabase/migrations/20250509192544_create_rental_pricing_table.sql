-- Create duration_unit type
CREATE TYPE duration_unit AS ENUM ('hour', 'day', 'week');

-- Create rental_pricing table
CREATE TABLE IF NOT EXISTS public.rental_pricing (
    id bigint primary key generated always as identity,
    bike_type_id bigint references public.bike_types(id) on delete cascade,
    duration integer NOT NULL,
    duration_unit duration_unit NOT NULL,
    price numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
) WITH (OIDS=FALSE);

-- Enable RLS for the rental_pricing table
ALTER TABLE public.rental_pricing ENABLE ROW LEVEL SECURITY;

-- Policy for selecting rental_pricing
CREATE POLICY select_rental_pricing ON public.rental_pricing
FOR SELECT
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to select rental_pricing

-- Policy for inserting rental_pricing
CREATE POLICY insert_rental_pricing ON public.rental_pricing
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);  -- Allow only logged-in users to insert rental_pricing

-- Policy for updating rental_pricing
CREATE POLICY update_rental_pricing ON public.rental_pricing
FOR UPDATE
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to update rental_pricing

-- Policy for deleting rental_pricing
CREATE POLICY delete_rental_pricing ON public.rental_pricing
FOR DELETE
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to delete rental_pricing
