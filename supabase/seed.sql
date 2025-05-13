INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
        ('00000000-0000-0000-0000-000000000000', '375e2244-aaee-4f49-898c-b4d204497d4b', 'authenticated', 'authenticated', 'kcurtet@gmail.com', crypt('password', gen_salt('bf')), '2025-05-09 23:54:25.619102+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-05-09 23:54:25.612932+00', '2025-05-09 23:54:25.619859+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
        ('375e2244-aaee-4f49-898c-b4d204497d4b', '375e2244-aaee-4f49-898c-b4d204497d4b', '{"sub": "375e2244-aaee-4f49-898c-b4d204497d4b", "email": "kcurtet@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2025-05-09 23:54:25.616319+00', '2025-05-09 23:54:25.616362+00', '2025-05-09 23:54:25.616362+00', '3dcd6895-e52f-42fe-9121-abd21f7bcea6');

-- Insert sample bike types
INSERT INTO public.bike_types (type_name) VALUES
('Bicicleta de Montaña'),
('Bicicleta de Ruta'),
('Bicicleta Eléctrica'),
('Bicicleta Urbana'),
('Bicicleta Infantil');

-- Insert sample customers
INSERT INTO customers (name, email, phone) VALUES
  ('Juan Pérez', 'juan@example.com', '123456789'),
  ('María García', 'maria@example.com', '987654321'),
  ('Carlos López', 'carlos@example.com', '456789123');

-- Insert sample rental pricing
INSERT INTO public.rental_pricing (bike_type_id, duration, duration_unit, price, is_active) VALUES
(1, 1, 'hour', 15.00, true),    -- Bicicleta de Montaña por hora
(1, 4, 'hour', 45.00, true),    -- Bicicleta de Montaña 4 horas
(1, 1, 'day', 50.00, true),     -- Bicicleta de Montaña por día
(1, 1, 'week', 250.00, true), -- Bicicleta de Montaña por semana
(2, 1, 'hour', 12.00, true),    -- Bicicleta de Ruta por hora
(2, 2, 'day', 75.00, true),     -- Bicicleta de Ruta 2 días
(2, 1, 'day', 40.00, true),     -- Bicicleta de Ruta por día
(3, 1, 'hour', 20.00, true),    -- Bicicleta Eléctrica por hora
(3, 1, 'day', 70.00, true),     -- Bicicleta Eléctrica por día
(3, 1, 'week', 350.00, true), -- Bicicleta Eléctrica por semana
(4, 1, 'hour', 10.00, true),    -- Bicicleta Urbana por hora
(4, 1, 'day', 35.00, true),     -- Bicicleta Urbana por día
(5, 1, 'hour', 8.00, true);     -- Bicicleta Infantil por hora

-- Insert sample repairs
INSERT INTO repairs (customer_id, bike_model, repair_start, repair_end, delivery_date, price, notes, status) VALUES
  (1, 'Trek FX 2', NULL, NULL, '2024-03-21 18:00:00+00', 50.00, 'Cambio de frenos y ajuste de cambios', 'pending'),
  (2, 'Specialized Sirrus', '2024-03-19 15:30:00+00', '2024-03-20 12:00:00+00', '2024-03-20 18:00:00+00', 75.00, 'Revisión completa y limpieza', 'completed'),
  (3, 'Giant Escape', NULL, NULL, '2024-03-22 14:00:00+00', 30.00, 'Pinchazo en rueda trasera', 'pending');

-- Insert sample rentals
INSERT INTO rentals (customer_id, status, start_date) VALUES
  (1, 'active', '2024-03-20 09:00:00+00'),
  (2, 'completed', '2024-03-19 10:00:00+00'),
  (3, 'active', '2024-03-21 14:00:00+00');

-- Insert sample rental items
INSERT INTO public.rental_items (rental_id, bike_type_id, rental_pricing_id, quantity) VALUES
(1, 1, 3, 2),  -- 2 Mountain Bikes for 1 day ($50 each)
(1, 3, 8, 1),  -- 1 Electric Bike for 1 day ($70)
(2, 1, 1, 2),  -- 2 Mountain Bikes for 1 hour
(2, 2, 4, 1),  -- 1 Road Bike for 1 day
(3, 2, 6, 1);  -- 1 Road Bike for 2 days