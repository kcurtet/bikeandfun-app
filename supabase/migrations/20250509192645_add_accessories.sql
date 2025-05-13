-- Add helmet and lock columns to rentals table
ALTER TABLE public.rentals
ADD COLUMN helmet_quantity integer NOT NULL DEFAULT 0,
ADD COLUMN lock_quantity integer NOT NULL DEFAULT 0;

-- Create settings table
CREATE TABLE public.settings (
    id bigint primary key generated always as identity,
    helmet_price decimal(10,2) NOT NULL DEFAULT 0,
    lock_price decimal(10,2) NOT NULL DEFAULT 0,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
) WITH (OIDS=FALSE);

-- Insert default settings
INSERT INTO public.settings (helmet_price, lock_price)
VALUES (5.00, 3.00);

-- Enable RLS for the settings table
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policy for selecting settings
CREATE POLICY select_settings ON public.settings
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy for inserting settings
CREATE POLICY insert_settings ON public.settings
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy for updating settings
CREATE POLICY update_settings ON public.settings
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Policy for deleting settings
CREATE POLICY delete_settings ON public.settings
FOR DELETE
USING (auth.role() = 'authenticated'); 