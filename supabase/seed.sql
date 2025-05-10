INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
        ('00000000-0000-0000-0000-000000000000', '375e2244-aaee-4f49-898c-b4d204497d4b', 'authenticated', 'authenticated', 'kcurtet@gmail.com', crypt('password', gen_salt('bf')), '2025-05-09 23:54:25.619102+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-05-09 23:54:25.612932+00', '2025-05-09 23:54:25.619859+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
        ('375e2244-aaee-4f49-898c-b4d204497d4b', '375e2244-aaee-4f49-898c-b4d204497d4b', '{"sub": "375e2244-aaee-4f49-898c-b4d204497d4b", "email": "kcurtet@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2025-05-09 23:54:25.616319+00', '2025-05-09 23:54:25.616362+00', '2025-05-09 23:54:25.616362+00', '3dcd6895-e52f-42fe-9121-abd21f7bcea6');


-- Insert sample bike types
INSERT INTO public.bike_types (type_name) VALUES
('Mountain Bike'),
('Road Bike'),
('Electric Bike'),
('City Bike'),
('Kids Bike');

-- Insert sample customers
INSERT INTO public.customers (name, email, phone) VALUES
('John Doe', 'john.doe@email.com', '+1234567890'),
('Jane Smith', 'jane.smith@email.com', '+1987654321'),
('Bob Johnson', 'bob.johnson@email.com', '+1122334455'),
('Alice Brown', 'alice.brown@email.com', '+1555666777'),
('Charlie Wilson', 'charlie.wilson@email.com', '+1888999000');

-- Insert sample rental pricing
INSERT INTO public.rental_pricing (bike_type_id, duration, duration_unit, price, is_active) VALUES
(1, 1, 'hour', 15.00, true),    -- Mountain Bike hourly
(1, 1, 'day', 50.00, true),     -- Mountain Bike daily
(1, 1, 'week', 250.00, true),   -- Mountain Bike weekly
(2, 1, 'hour', 12.00, true),    -- Road Bike hourly
(2, 1, 'day', 40.00, true),     -- Road Bike daily
(3, 1, 'hour', 20.00, true),    -- Electric Bike hourly
(3, 1, 'day', 70.00, true),     -- Electric Bike daily
(4, 1, 'hour', 10.00, true),    -- City Bike hourly
(4, 1, 'day', 35.00, true),     -- City Bike daily
(5, 1, 'hour', 8.00, true);     -- Kids Bike hourly

-- Insert sample rentals
INSERT INTO public.rentals (customer_id, status, start_date) VALUES
(1, 'completed', '2024-05-01 09:00:00'),  -- John Doe's rental
(2, 'active', '2024-05-02 10:00:00'),     -- Jane Smith's rental
(3, 'completed', '2024-05-03 11:00:00'),  -- Bob Johnson's rental
(4, 'active', '2024-05-04 13:00:00'),     -- Alice Brown's rental
(5, 'canceled', '2024-05-05 14:00:00');   -- Charlie Wilson's rental

-- Insert sample rental items
INSERT INTO public.rental_items (rental_id, bike_type_id, rental_pricing_id) VALUES
(1, 1, 2),  -- John Doe rented a Mountain Bike for a day
(2, 3, 6),  -- Jane Smith rented an Electric Bike for an hour
(2, 4, 8),  -- Jane Smith also rented a City Bike for a day
(3, 2, 4),  -- Bob Johnson rented a Road Bike for an hour
(4, 4, 8),  -- Alice Brown rented a City Bike for a day
(5, 5, 10); -- Charlie Wilson's Kids Bike rental was canceled

-- Insert sample repairs
INSERT INTO public.repairs (customer_id, bike_model, repair_start, repair_end, delivery_date, price, notes, status) VALUES
(1, 'Trek Mountain Bike', '2024-05-01 09:00:00', '2024-05-02 17:00:00', '2024-05-03 10:00:00', 75.00, 'Regular maintenance and brake adjustment', 'completed'),
(2, 'Specialized Road Bike', '2024-05-03 10:00:00', '2024-05-04 16:00:00', '2024-05-05 14:00:00', 120.00, 'Chain replacement and gear tuning', 'completed'),
(3, 'Giant Electric Bike', '2024-05-05 11:00:00', NULL, '2024-05-07 16:00:00', 200.00, 'Battery replacement and motor check', 'in progress'),
(4, 'Cannondale City Bike', '2024-05-07 13:00:00', NULL, '2024-05-09 12:00:00', 50.00, 'Tire replacement', 'pending'),
(5, 'Schwinn Kids Bike', '2024-05-09 14:00:00', NULL, '2024-05-11 15:00:00', 30.00, 'Training wheels installation', 'pending');