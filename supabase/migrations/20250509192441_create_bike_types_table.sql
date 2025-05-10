CREATE TABLE public.bike_types (
    id bigint primary key generated always as identity,
    type_name text not null,
    created_at timestamp with time zone default now()
) WITH (OIDS=FALSE);

-- Enable RLS for the bike_types table
ALTER TABLE public.bike_types ENABLE ROW LEVEL SECURITY;

-- Policy for selecting bike_types
CREATE POLICY select_bike_types ON public.bike_types
FOR SELECT
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to select bike_types

-- Policy for inserting bike_types
CREATE POLICY insert_bike_types ON public.bike_types
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);  -- Allow only logged-in users to insert bike_types

-- Policy for updating bike_types
CREATE POLICY update_bike_types ON public.bike_types
FOR UPDATE
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to update bike_types

-- Policy for deleting bike_types
CREATE POLICY delete_bike_types ON public.bike_types
FOR DELETE
USING (auth.uid() IS NOT NULL);  -- Allow only logged-in users to delete bike_types