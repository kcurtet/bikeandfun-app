-- Create the customers table
CREATE TABLE public.customers (
    id bigint primary key generated always as identity,
    name text not null,
    email text,
    phone text,
    created_at timestamp with time zone default now()
) WITH (OIDS=FALSE);
-- Enable RLS for the customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policy for selecting customers
CREATE POLICY select_customers ON public.customers
FOR SELECT
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to select customers

-- Policy for inserting customers
CREATE POLICY insert_customers ON public.customers
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);  -- Allow only logged-in users to insert customers

-- Policy for updating customers
CREATE POLICY update_customers ON public.customers
FOR UPDATE
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to update customers

-- Policy for deleting customers
CREATE POLICY delete_customers ON public.customers
FOR DELETE
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to delete customers