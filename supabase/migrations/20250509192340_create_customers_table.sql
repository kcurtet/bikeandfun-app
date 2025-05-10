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

-- Create the Anonymous customer
INSERT INTO public.customers (name, email, phone) VALUES ('Anonymous', NULL, NULL);

-- Create a function to check if the customer being deleted is Anonymous
CREATE OR REPLACE FUNCTION prevent_anonymous_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.name = 'Anonymous' THEN
        RAISE EXCEPTION 'Cannot delete the Anonymous customer';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that runs before delete on the customers table
CREATE TRIGGER prevent_anonymous_deletion_trigger
    BEFORE DELETE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION prevent_anonymous_deletion();

-- Also prevent updating the Anonymous customer's name
CREATE OR REPLACE FUNCTION prevent_anonymous_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.name = 'Anonymous' AND NEW.name != 'Anonymous' THEN
        RAISE EXCEPTION 'Cannot modify the Anonymous customer name';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that runs before update on the customers table
CREATE TRIGGER prevent_anonymous_update_trigger
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION prevent_anonymous_update();