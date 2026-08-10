--
-- PostgreSQL database dump
--

\restrict gPVaPJ5IvixeTfgMBggIH9wJn0clbaUGATaJeBDDVBWafLLIcmrer7M8pqgcjtk

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: erp_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.erp_settings (key, value, updated_at) VALUES ('erp_logo_url', NULL, '2026-08-06 11:17:22.905045');
INSERT INTO public.erp_settings (key, value, updated_at) VALUES ('erp_name', 'IgniteX.ai', '2026-08-06 11:17:22.905045');
INSERT INTO public.erp_settings (key, value, updated_at) VALUES ('erp_subtitle', 'ENTERPRICES ERP', '2026-08-06 11:17:22.905045');
INSERT INTO public.erp_settings (key, value, updated_at) VALUES ('favicon_url', NULL, '2026-08-06 11:17:22.905045');
INSERT INTO public.erp_settings (key, value, updated_at) VALUES ('footer_company', 'IgniteX.ai', '2026-08-06 11:17:22.905045');


--
-- Data for Name: master_lookup; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (1, 'DEPARTMENT', 'IT', 'Information Technology', NULL, 1, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (2, 'DEPARTMENT', 'SALES', 'Sales', NULL, 2, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (3, 'DEPARTMENT', 'PURCHASE', 'Purchase', NULL, 3, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (4, 'DEPARTMENT', 'ACCOUNTS', 'Accounts', NULL, 4, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (5, 'DEPARTMENT', 'ADMIN', 'Administration', NULL, 5, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (6, 'DEPARTMENT', 'HR', 'Human Resources', NULL, 6, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (7, 'DEPARTMENT', 'DESIGN', 'Design & Production', NULL, 7, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (8, 'DEPARTMENT', 'STORE', 'Store Operations', NULL, 8, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (9, 'PARTY_TYPE', 'CUSTOMER', 'Customer', NULL, 1, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (10, 'PARTY_TYPE', 'SUPPLIER', 'Supplier', NULL, 2, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (11, 'PARTY_TYPE', 'BOTH', 'Both (Customer & Supplier)', NULL, 3, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (12, 'METAL_TYPE', 'GOLD', 'Gold', NULL, 1, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (13, 'METAL_TYPE', 'SILVER', 'Silver', NULL, 2, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (14, 'METAL_TYPE', 'PLATINUM', 'Platinum', NULL, 3, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (15, 'METAL_TYPE', 'DIAMOND', 'Diamond', NULL, 4, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (16, 'PURITY', '24K', '24 Karat (999)', NULL, 1, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (17, 'PURITY', '22K', '22 Karat (916)', NULL, 2, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (18, 'PURITY', '18K', '18 Karat (750)', NULL, 3, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (19, 'PURITY', '14K', '14 Karat (585)', NULL, 4, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (20, 'ORDER_STATUS', 'PENDING', 'Pending', NULL, 1, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (21, 'ORDER_STATUS', 'CONFIRMED', 'Confirmed', NULL, 2, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (22, 'ORDER_STATUS', 'PROCESSING', 'Processing', NULL, 3, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (23, 'ORDER_STATUS', 'DELIVERED', 'Delivered', NULL, 4, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (24, 'ORDER_STATUS', 'CANCELLED', 'Cancelled', NULL, 5, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (25, 'GENDER', 'MALE', 'Male', NULL, 1, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (26, 'GENDER', 'FEMALE', 'Female', NULL, 2, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (27, 'GENDER', 'UNISEX', 'Unisex', NULL, 3, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (28, 'OCCASION', 'WEDDING', 'Wedding', NULL, 1, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (29, 'OCCASION', 'ENGAGEMENT', 'Engagement', NULL, 2, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (30, 'OCCASION', 'ANNIVERSARY', 'Anniversary', NULL, 3, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (31, 'OCCASION', 'CASUAL', 'Casual Wear', NULL, 4, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (32, 'OCCASION', 'FESTIVAL', 'Festival', NULL, 5, NULL, true, '2026-08-06 11:17:22.389305', '2026-08-06 11:17:23.05975', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (41, 'KARAT_COLOR', 'YG22', '22KT Yellow Gold', NULL, 1, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (42, 'KARAT_COLOR', 'YG18', '18KT Yellow Gold', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (43, 'KARAT_COLOR', 'WG18', '18KT White Gold', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (44, 'KARAT_COLOR', 'RG18', '18KT Rose Gold', NULL, 4, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (45, 'KARAT_COLOR', 'PT950', 'Platinum 950', NULL, 5, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (46, 'KARAT_COLOR', 'SLV925', 'Silver 925', NULL, 6, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (47, 'WEIGHT_BAND', 'LT2G', 'Below 2 gm', NULL, 1, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (48, 'WEIGHT_BAND', '2_5G', '2 to 5 gm', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (49, 'WEIGHT_BAND', '5_10G', '5 to 10 gm', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (50, 'WEIGHT_BAND', '10_20G', '10 to 20 gm', NULL, 4, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (51, 'WEIGHT_BAND', 'GT20G', 'Above 20 gm', NULL, 5, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (52, 'JEWELLERY_TYPE', 'RING', 'Ring', NULL, 1, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (53, 'JEWELLERY_TYPE', 'NECKLACE', 'Necklace', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (54, 'JEWELLERY_TYPE', 'EARRING', 'Earring', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (55, 'JEWELLERY_TYPE', 'BRACELET', 'Bracelet', NULL, 4, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (56, 'JEWELLERY_TYPE', 'PENDANT', 'Pendant', NULL, 5, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (57, 'JEWELLERY_TYPE', 'BANGLE', 'Bangle', NULL, 6, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (58, 'JEWELLERY_TYPE', 'ANKLET', 'Anklet', NULL, 7, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (59, 'JEWELLERY_TYPE', 'BROOCH', 'Brooch', NULL, 8, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (63, 'GENDER', 'LADIES', 'Ladies', NULL, 1, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (64, 'GENDER', 'GENTS', 'Gents', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (65, 'GENDER', 'KIDS', 'Kids', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (67, 'TECH_TYPE', 'CASTING', 'Casting', NULL, 1, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (68, 'TECH_TYPE', 'HANDMADE', 'Handmade', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (69, 'TECH_TYPE', 'MACHINE', 'Machine Made', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (70, 'TECH_TYPE', 'EF', 'Electroforming', NULL, 4, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (71, 'TECH_TYPE', 'STAMPING', 'Stamping', NULL, 5, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (72, 'MFG_LEVEL', 'L1', 'Level 1 – Basic', NULL, 1, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (73, 'MFG_LEVEL', 'L2', 'Level 2 – Intermediate', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (74, 'MFG_LEVEL', 'L3', 'Level 3 – Advanced', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (76, 'OCCASION', 'BRIDAL', 'Bridal', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (77, 'OCCASION', 'FESTIVE', 'Festive', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (79, 'OCCASION', 'PARTY', 'Party Wear', NULL, 5, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (80, 'GROUP_SALES', 'RETAIL', 'Retail', NULL, 1, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (81, 'GROUP_SALES', 'WHOLESALE', 'Wholesale', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (82, 'GROUP_SALES', 'EXPORT', 'Export', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (83, 'SUB_CATEGORY', 'PLAIN', 'Plain Gold', NULL, 1, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (84, 'SUB_CATEGORY', 'STUDDED', 'Studded', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (85, 'SUB_CATEGORY', 'DIAMOND', 'Diamond', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (86, 'SUB_CATEGORY', 'KUNDAN', 'Kundan', NULL, 4, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (87, 'SUB_CATEGORY', 'MEENAKARI', 'Meenakari', NULL, 5, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (88, 'STYLE_TONE', 'SINGLE', 'Single Tone', NULL, 1, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (89, 'STYLE_TONE', 'TWO_TONE', 'Two Tone', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (90, 'STYLE_TONE', 'THREE_TONE', 'Three Tone', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (91, 'SHAPE', 'FLAT', 'Flat', NULL, 1, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (92, 'SHAPE', 'ROUND', 'Round', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (93, 'SHAPE', 'OVAL', 'Oval', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (94, 'SHAPE', 'SQUARE', 'Square', NULL, 4, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (95, 'SHAPE', 'RECTANGULAR', 'Rectangular', NULL, 5, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (99, 'METAL_TYPE', 'RHODIUM', 'Rhodium', NULL, 4, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (100, 'UOM', 'GM', 'Gram', NULL, 1, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (101, 'UOM', 'CT', 'Carat', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (102, 'UOM', 'PCS', 'Pieces', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (103, 'UOM', 'KG', 'Kilogram', NULL, 4, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (104, 'STONE_TYPE', 'DIAMOND', 'Diamond', NULL, 1, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (105, 'STONE_TYPE', 'RUBY', 'Ruby', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (106, 'STONE_TYPE', 'EMERALD', 'Emerald', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (107, 'STONE_TYPE', 'SAPPHIRE', 'Sapphire', NULL, 4, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (108, 'STONE_TYPE', 'CZ', 'Cubic Zirconia', NULL, 5, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (109, 'STONE_TYPE', 'PEARL', 'Pearl', NULL, 6, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (110, 'STONE_TYPE', 'MOISSANITE', 'Moissanite', NULL, 7, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (111, 'SETTING_TYPE', 'PRONG', 'Prong Setting', NULL, 1, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (112, 'SETTING_TYPE', 'BEZEL', 'Bezel Setting', NULL, 2, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (113, 'SETTING_TYPE', 'CHANNEL', 'Channel Setting', NULL, 3, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (114, 'SETTING_TYPE', 'PAVE', 'Pavé Setting', NULL, 4, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (115, 'SETTING_TYPE', 'INVISIBLE', 'Invisible Setting', NULL, 5, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (116, 'SETTING_TYPE', 'FLUSH', 'Flush Setting', NULL, 6, NULL, true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (117, 'STN_SHAPE', 'ROUND', 'Round', NULL, 1, NULL, true, '2026-08-06 11:17:23.397772', '2026-08-06 11:17:23.397772', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (118, 'STN_SHAPE', 'OVAL', 'Oval', NULL, 2, NULL, true, '2026-08-06 11:17:23.397772', '2026-08-06 11:17:23.397772', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (119, 'STN_SHAPE', 'PEAR', 'Pear', NULL, 3, NULL, true, '2026-08-06 11:17:23.397772', '2026-08-06 11:17:23.397772', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (120, 'STN_SHAPE', 'MARQUISE', 'Marquise', NULL, 4, NULL, true, '2026-08-06 11:17:23.397772', '2026-08-06 11:17:23.397772', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (121, 'STN_SHAPE', 'PRINCESS', 'Princess', NULL, 5, NULL, true, '2026-08-06 11:17:23.397772', '2026-08-06 11:17:23.397772', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (122, 'STN_SHAPE', 'CUSHION', 'Cushion', NULL, 6, NULL, true, '2026-08-06 11:17:23.397772', '2026-08-06 11:17:23.397772', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (123, 'STN_SHAPE', 'RADIANT', 'Radiant', NULL, 7, NULL, true, '2026-08-06 11:17:23.397772', '2026-08-06 11:17:23.397772', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (124, 'STN_SHAPE', 'HEART', 'Heart', NULL, 8, NULL, true, '2026-08-06 11:17:23.397772', '2026-08-06 11:17:23.397772', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (125, 'STN_SHAPE', 'ASSCHER', 'Asscher', NULL, 9, NULL, true, '2026-08-06 11:17:23.397772', '2026-08-06 11:17:23.397772', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (126, 'COMPONENT_TYPE', 'CASTING', 'Casting', NULL, 1, NULL, true, '2026-08-06 11:17:23.451463', '2026-08-06 11:17:23.451463', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (127, 'COMPONENT_TYPE', 'STAMPING', 'Stamping', NULL, 2, NULL, true, '2026-08-06 11:17:23.451463', '2026-08-06 11:17:23.451463', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (128, 'BUSINESS_RELATIONSHIP', 'SUPPLIER', 'Supplier', NULL, 1, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (129, 'BUSINESS_RELATIONSHIP', 'CONTRACTOR', 'Contractor', NULL, 2, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (130, 'BUSINESS_RELATIONSHIP', 'SERVICE_PROVIDER', 'Service Provider', NULL, 3, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (131, 'ORGANIZATION_TYPE', 'PROPRIETORSHIP', 'Proprietorship', NULL, 1, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (132, 'ORGANIZATION_TYPE', 'PARTNERSHIP', 'Partnership', NULL, 2, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (133, 'ORGANIZATION_TYPE', 'PRIVATE_LIMITED', 'Private Limited', NULL, 3, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (134, 'ORGANIZATION_TYPE', 'PUBLIC_LIMITED', 'Public Limited', NULL, 4, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (135, 'ORGANIZATION_TYPE', 'LLP', 'LLP', NULL, 5, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (136, 'GST_TREATMENT', 'REGISTERED', 'Registered Business', NULL, 1, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (137, 'GST_TREATMENT', 'UNREGISTERED', 'Unregistered Business', NULL, 2, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (138, 'GST_TREATMENT', 'OVERSEAS', 'Overseas', NULL, 3, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (139, 'ACCOUNT_TYPE', 'SAVINGS', 'Savings', NULL, 1, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (140, 'ACCOUNT_TYPE', 'CURRENT', 'Current', NULL, 2, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (141, 'ACCOUNT_TYPE', 'CORPORATE', 'Corporate', NULL, 3, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (142, 'COUNTRY', 'IN', 'India (+91)', NULL, 1, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (143, 'COUNTRY', 'US', 'United States (+1)', NULL, 2, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (144, 'COUNTRY', 'GB', 'United Kingdom (+44)', NULL, 3, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (145, 'COUNTRY', 'AE', 'UAE (+971)', NULL, 4, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (146, 'COUNTRY', 'AU', 'Australia (+61)', NULL, 5, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (147, 'COUNTRY', 'CA', 'Canada (+1)', NULL, 6, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (148, 'COUNTRY', 'SG', 'Singapore (+65)', NULL, 7, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (149, 'COUNTRY', 'HK', 'Hong Kong (+852)', NULL, 8, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (150, 'COUNTRY', 'JP', 'Japan (+81)', NULL, 9, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (151, 'COUNTRY', 'DE', 'Germany (+49)', NULL, 10, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (152, 'COUNTRY', 'FR', 'France (+33)', NULL, 11, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (153, 'COUNTRY', 'IT', 'Italy (+39)', NULL, 12, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (154, 'COUNTRY', 'CH', 'Switzerland (+41)', NULL, 13, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (155, 'COUNTRY', 'ZA', 'South Africa (+27)', NULL, 14, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (156, 'COUNTRY', 'NL', 'Netherlands (+31)', NULL, 15, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (157, 'STATE', 'AP', 'Andhra Pradesh', NULL, 1, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (158, 'STATE', 'AR', 'Arunachal Pradesh', NULL, 2, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (159, 'STATE', 'AS', 'Assam', NULL, 3, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (160, 'STATE', 'BR', 'Bihar', NULL, 4, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (161, 'STATE', 'CG', 'Chhattisgarh', NULL, 5, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (162, 'STATE', 'GA', 'Goa', NULL, 6, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (163, 'STATE', 'GJ', 'Gujarat', NULL, 7, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (164, 'STATE', 'HR', 'Haryana', NULL, 8, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (165, 'STATE', 'HP', 'Himachal Pradesh', NULL, 9, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (166, 'STATE', 'JH', 'Jharkhand', NULL, 10, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (167, 'STATE', 'KA', 'Karnataka', NULL, 11, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (168, 'STATE', 'KL', 'Kerala', NULL, 12, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (169, 'STATE', 'MP', 'Madhya Pradesh', NULL, 13, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (170, 'STATE', 'MH', 'Maharashtra', NULL, 14, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (171, 'STATE', 'MN', 'Manipur', NULL, 15, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (172, 'STATE', 'ML', 'Meghalaya', NULL, 16, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (173, 'STATE', 'MZ', 'Mizoram', NULL, 17, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (174, 'STATE', 'NGA', 'Nagaland', NULL, 18, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (175, 'STATE', 'OD', 'Odisha', NULL, 19, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (176, 'STATE', 'PB', 'Punjab', NULL, 20, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (177, 'STATE', 'RJ', 'Rajasthan', NULL, 21, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (178, 'STATE', 'SK', 'Sikkim', NULL, 22, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (179, 'STATE', 'TN', 'Tamil Nadu', NULL, 23, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (180, 'STATE', 'TS', 'Telangana', NULL, 24, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (181, 'STATE', 'TR', 'Tripura', NULL, 25, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (182, 'STATE', 'UP', 'Uttar Pradesh', NULL, 26, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (183, 'STATE', 'UT', 'Uttarakhand', NULL, 27, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (184, 'STATE', 'WB', 'West Bengal', NULL, 28, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (185, 'STATE', 'AN', 'Andaman & Nicobar', NULL, 29, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (186, 'STATE', 'CHD', 'Chandigarh', NULL, 30, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (187, 'STATE', 'DL', 'Delhi', NULL, 31, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (188, 'STATE', 'JK', 'Jammu & Kashmir', NULL, 32, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (189, 'STATE', 'LA', 'Ladakh', NULL, 33, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (190, 'STATE', 'LD', 'Lakshadweep', NULL, 34, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (191, 'STATE', 'PY', 'Puducherry', NULL, 35, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (192, 'STATE', 'DDN', 'Dadra & Nagar Haveli & Daman & Diu', NULL, 36, NULL, true, '2026-08-06 11:17:23.49821', '2026-08-06 11:17:23.49821', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (193, 'CUSTOMER_TYPE', 'RETAIL', 'Retail', NULL, 1, NULL, true, '2026-08-06 11:17:23.620304', '2026-08-06 11:17:23.620304', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (194, 'CUSTOMER_TYPE', 'WHOLESALE', 'Wholesale', NULL, 2, NULL, true, '2026-08-06 11:17:23.620304', '2026-08-06 11:17:23.620304', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (195, 'CUSTOMER_TYPE', 'CORPORATE', 'Corporate', NULL, 3, NULL, true, '2026-08-06 11:17:23.620304', '2026-08-06 11:17:23.620304', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (196, 'CUSTOMER_TYPE', 'ONLINE', 'Online', NULL, 4, NULL, true, '2026-08-06 11:17:23.620304', '2026-08-06 11:17:23.620304', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (197, 'CUSTOMER_TYPE', 'WALK_IN', 'Walk-In', NULL, 5, NULL, true, '2026-08-06 11:17:23.620304', '2026-08-06 11:17:23.620304', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (198, 'TAX_PAYER_TYPE', 'REGULAR', 'Regular', NULL, 1, NULL, true, '2026-08-06 11:17:23.620304', '2026-08-06 11:17:23.620304', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (199, 'TAX_PAYER_TYPE', 'COMPOSITION', 'Composition', NULL, 2, NULL, true, '2026-08-06 11:17:23.620304', '2026-08-06 11:17:23.620304', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (200, 'TAX_PAYER_TYPE', 'CONSUMER', 'Consumer', NULL, 3, NULL, true, '2026-08-06 11:17:23.620304', '2026-08-06 11:17:23.620304', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (201, 'TAX_PAYER_TYPE', 'UNREGISTERED', 'Unregistered', NULL, 4, NULL, true, '2026-08-06 11:17:23.620304', '2026-08-06 11:17:23.620304', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (202, 'GSTIN_STATUS', 'ACTIVE', 'Active', NULL, 1, NULL, true, '2026-08-06 11:17:23.620304', '2026-08-06 11:17:23.620304', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (203, 'GSTIN_STATUS', 'CANCELLED', 'Cancelled', NULL, 2, NULL, true, '2026-08-06 11:17:23.620304', '2026-08-06 11:17:23.620304', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (204, 'GSTIN_STATUS', 'SUSPENDED', 'Suspended', NULL, 3, NULL, true, '2026-08-06 11:17:23.620304', '2026-08-06 11:17:23.620304', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (205, 'GSTIN_STATUS', 'PROVISIONAL', 'Provisional', NULL, 4, NULL, true, '2026-08-06 11:17:23.620304', '2026-08-06 11:17:23.620304', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (206, 'PURITY', '999', '99.9% (24KT Pure)', NULL, 1, NULL, true, '2026-08-06 11:17:23.872165', '2026-08-06 11:17:23.872165', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (207, 'PURITY', '916', '91.6% (22KT)', NULL, 2, NULL, true, '2026-08-06 11:17:23.872165', '2026-08-06 11:17:23.872165', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (208, 'PURITY', '750', '75.0% (18KT)', NULL, 3, NULL, true, '2026-08-06 11:17:23.872165', '2026-08-06 11:17:23.872165', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (209, 'PURITY', '585', '58.5% (14KT)', NULL, 4, NULL, true, '2026-08-06 11:17:23.872165', '2026-08-06 11:17:23.872165', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (210, 'PURITY', '375', '37.5% (9KT)', NULL, 5, NULL, true, '2026-08-06 11:17:23.872165', '2026-08-06 11:17:23.872165', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (211, 'PURITY', '925', '92.5% (Silver)', NULL, 6, NULL, true, '2026-08-06 11:17:23.872165', '2026-08-06 11:17:23.872165', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (212, 'PURITY', '950', '95.0% (Platinum)', NULL, 7, NULL, true, '2026-08-06 11:17:23.872165', '2026-08-06 11:17:23.872165', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (215, 'VENDOR_TYPE', 'DOMESTIC', 'Domestic', NULL, 1, NULL, true, '2026-08-06 11:17:24.093529', '2026-08-06 11:17:24.093529', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (216, 'VENDOR_TYPE', 'INTERNATIONAL', 'International', NULL, 2, NULL, true, '2026-08-06 11:17:24.093529', '2026-08-06 11:17:24.093529', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (217, 'VENDOR_TYPE', 'SEZ_ZONE_MERCHANT', 'SEZ Zone Merchant', NULL, 3, NULL, true, '2026-08-06 11:17:24.093529', '2026-08-06 11:17:24.093529', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (218, 'STATUS', 'DRAFT', 'Draft', NULL, 1, NULL, true, '2026-08-06 11:17:24.17476', '2026-08-06 11:17:24.17476', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (219, 'STATUS', 'ACTIVE', 'Active', NULL, 2, NULL, true, '2026-08-06 11:17:24.17476', '2026-08-06 11:17:24.17476', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (220, 'STATUS', 'HOLD', 'On Hold', NULL, 3, NULL, true, '2026-08-06 11:17:24.17476', '2026-08-06 11:17:24.17476', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (221, 'STATUS', 'DISC', 'Discontinued', NULL, 4, NULL, true, '2026-08-06 11:17:24.17476', '2026-08-06 11:17:24.17476', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (223, 'COMPONENT_DESC', 'SP', 'Spring', NULL, 1, NULL, true, '2026-08-06 11:17:24.608867', '2026-08-06 11:17:24.608867', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (224, 'METAL_NAME', 'GB', 'Gold Bar', NULL, 1, NULL, true, '2026-08-06 11:17:24.65824', '2026-08-06 11:17:24.65824', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (225, 'METAL_NAME', 'WG', 'White Gold', NULL, 2, NULL, true, '2026-08-06 11:17:24.65824', '2026-08-06 11:17:24.65824', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (226, 'METAL_NAME', 'YG', 'Yellow Gold', NULL, 3, NULL, true, '2026-08-06 11:17:24.65824', '2026-08-06 11:17:24.65824', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (227, 'METAL_NAME', 'RG', 'Rose Gold', NULL, 4, NULL, true, '2026-08-06 11:17:24.65824', '2026-08-06 11:17:24.65824', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (228, 'METAL_NAME', 'GN', 'Gold Nugget', NULL, 5, NULL, true, '2026-08-06 11:17:24.65824', '2026-08-06 11:17:24.65824', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (229, 'METAL_NAME', 'SLV', 'Silver', NULL, 6, NULL, true, '2026-08-06 11:17:24.65824', '2026-08-06 11:17:24.65824', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (230, 'METAL_NAME', 'PT', 'Platinum', NULL, 7, NULL, true, '2026-08-06 11:17:24.65824', '2026-08-06 11:17:24.65824', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (231, 'DESIGN_SOURCE', 'IN_HOUSE', 'In-House', NULL, 1, NULL, true, '2026-08-06 11:17:24.745501', '2026-08-06 11:17:24.745501', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (232, 'DESIGN_SOURCE', 'VENDOR', 'Vendor', NULL, 2, NULL, true, '2026-08-06 11:17:24.745501', '2026-08-06 11:17:24.745501', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (233, 'ALLOY_METAL_CATEGORY', 'GOLD', 'Gold', NULL, 1, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (234, 'ALLOY_METAL_CATEGORY', 'SILVER', 'Silver', NULL, 2, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (235, 'ALLOY_METAL_CATEGORY', 'SPECIAL', 'Special', NULL, 3, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (236, 'ALLOY_METAL_CATEGORY', 'EXPERIMENTAL', 'Experimental', NULL, 4, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (237, 'ALLOY_PURITY_TARGET', '22K', '22K', NULL, 1, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (238, 'ALLOY_PURITY_TARGET', '18K', '18K', NULL, 2, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (239, 'ALLOY_PURITY_TARGET', '14K', '14K', NULL, 3, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (240, 'ALLOY_PURITY_TARGET', '9K', '9K', NULL, 4, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (241, 'ALLOY_PURITY_TARGET', '10K', '10K', NULL, 5, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (242, 'ALLOY_PURITY_TARGET', '925SS', '925ss', NULL, 6, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (243, 'ALLOY_STATUS', 'ACTIVE', 'Active', NULL, 1, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (244, 'ALLOY_STATUS', 'INACTIVE', 'Inactive', NULL, 2, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (245, 'ALLOY_STATUS', 'TRIAL', 'Trial (Timebond)', NULL, 3, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (246, 'ALLOY_STATUS', 'DISAPPROVED', 'DisApproved', NULL, 4, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (247, 'ALLOY_YN', 'YES', 'Yes', NULL, 1, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (248, 'ALLOY_YN', 'NO', 'No', NULL, 2, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (249, 'ALLOY_ADDITIVE_TYPE', 'COPPER', 'Copper', NULL, 1, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (250, 'ALLOY_ADDITIVE_TYPE', 'ZINC', 'Zinc', NULL, 2, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (251, 'ALLOY_ADDITIVE_TYPE', 'PALLADIUM', 'Palladium', NULL, 3, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (252, 'ALLOY_ADDITIVE_TYPE', 'RHODIUM', 'Rhodium', NULL, 4, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (253, 'ALLOY_ADDITIVE_TYPE', 'PLATINUM', 'Platinum', NULL, 5, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (254, 'ALLOY_ADDITIVE_TYPE', 'SILICON', 'Silicon', NULL, 6, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (255, 'ALLOY_COLOR_TONE', 'YELLOW', 'Yellow', NULL, 1, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (256, 'ALLOY_COLOR_TONE', 'ROSE', 'Rose', NULL, 2, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (257, 'ALLOY_COLOR_TONE', 'WHITE', 'White', NULL, 3, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (258, 'ALLOY_COLOR_TONE', 'CUSTOM', 'Custom', NULL, 4, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (259, 'ALLOY_FINISH', 'MATTE', 'Matte', NULL, 1, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (260, 'ALLOY_FINISH', 'HIGH_POLISH', 'High-polish', NULL, 2, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (261, 'ALLOY_FINISH', 'DIAMOND_CUT', 'Diamond Cut Family', NULL, 3, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (262, 'ALLOY_MELTING_METHOD', 'MANUAL', 'Manual', NULL, 1, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (263, 'ALLOY_MELTING_METHOD', 'MANUAL_INDUCTION', 'Manual-induction', NULL, 2, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (264, 'ALLOY_MELTING_METHOD', 'CONTINUOUS', 'Continuous Melting', NULL, 3, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (265, 'ALLOY_MELTING_METHOD', 'VACUUM_CASTING', 'Vacuum Casting', NULL, 4, NULL, true, '2026-08-06 11:17:24.769901', '2026-08-06 11:17:24.769901', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (266, 'FG_ITEM_TYPE', 'FINDING', 'Finding', NULL, 1, NULL, true, '2026-08-06 11:17:24.846086', '2026-08-06 11:17:24.846086', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (267, 'FG_ITEM_TYPE', 'STONE', 'Stone', NULL, 2, NULL, true, '2026-08-06 11:17:24.846086', '2026-08-06 11:17:24.846086', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (268, 'FG_ITEM_TYPE', 'METAL', 'Metal', NULL, 3, NULL, true, '2026-08-06 11:17:24.846086', '2026-08-06 11:17:24.846086', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (269, 'FG_ITEM_TYPE', 'COMPONENT', 'Component', NULL, 4, NULL, true, '2026-08-06 11:17:24.846086', '2026-08-06 11:17:24.846086', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (270, 'FG_SKU_TYPE', 'FG', 'Finished Goods', NULL, 1, NULL, true, '2026-08-06 11:17:24.876783', '2026-08-06 11:17:24.876783', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (271, 'FIN_SKU_TYPE', 'FIN', 'Findings', NULL, 1, NULL, true, '2026-08-06 11:17:24.876783', '2026-08-06 11:17:24.876783', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (272, 'FIN_ITEM_TYPE', 'STONE', 'Stone', NULL, 1, NULL, true, '2026-08-06 11:17:25.33895', '2026-08-06 11:17:25.33895', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (273, 'FIN_ITEM_TYPE', 'METAL', 'Metal', NULL, 2, NULL, true, '2026-08-06 11:17:25.33895', '2026-08-06 11:17:25.33895', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (274, 'FIN_ITEM_TYPE', 'COMPONENT', 'Component', NULL, 3, NULL, true, '2026-08-06 11:17:25.33895', '2026-08-06 11:17:25.33895', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (275, 'MACHINE_TYPE', 'MT_LASER', 'Laser Machine', NULL, 1, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (276, 'MACHINE_TYPE', 'MT_CNC', 'CNC Machine', NULL, 2, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (277, 'MACHINE_TYPE', 'MT_EF', 'EF Machine', NULL, 3, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (278, 'MACHINE_TYPE', 'MT_CASTING', 'Casting Machine', NULL, 4, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (279, 'MACHINE_TYPE', 'MT_INVEST', 'Investment Machine', NULL, 5, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (280, 'MACHINE_TYPE', 'MT_POLISH', 'Polishing', NULL, 6, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (281, 'MACHINE_TYPE', 'MT_PLATING', 'Plating Tank', NULL, 7, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (282, 'MACHINE_TYPE', 'MT_ENAMEL', 'Enamel Machine', NULL, 8, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (283, 'MACHINE_TYPE', 'MT_LASER_ENG', 'Laser Engraver', NULL, 9, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (284, 'MACHINE_TYPE', 'MT_STAMP', 'Stamping Press', NULL, 10, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (285, 'MACHINE_TYPE', 'MT_ROLLING', 'Rolling Mill', NULL, 11, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (286, 'MACHINE_TYPE', 'MT_WIRE', 'Wire Drawing', NULL, 12, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (287, 'MACHINE_TYPE', 'MT_CHAIN', 'Chain Machine', NULL, 13, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (288, 'MACHINE_TYPE', 'MT_WEIGH', 'Weighing Scale', NULL, 14, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (289, 'MACHINE_TYPE', 'MT_LABEL', 'Label Printer', NULL, 15, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (290, 'MACHINE_TYPE', 'MT_HUID', 'HUID Machine', NULL, 16, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (291, 'MACHINE_TYPE', 'MT_ASSAY', 'Assay Machine', NULL, 17, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (292, 'MACHINE_TYPE', 'MT_3D', '3D Printer', NULL, 18, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (293, 'MACHINE_TYPE', 'MT_CLEAN', 'Cleaning Machine', NULL, 19, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (294, 'MAKE_BRAND', 'MB_TANAKA', 'Tanaka / Italian', NULL, 1, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (295, 'MAKE_BRAND', 'MB_LOCAL_IMP', 'Local/Import', NULL, 2, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (296, 'MAKE_BRAND', 'MB_TAIWAN', 'Taiwan Import', NULL, 3, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (297, 'MAKE_BRAND', 'MB_CUSTOM', 'Custom/In-house', NULL, 4, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (298, 'MAKE_BRAND', 'MB_NEUTEC', 'Neutec/Indutherm', NULL, 5, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (299, 'MAKE_BRAND', 'MB_LOCAL', 'Local', NULL, 6, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (300, 'MAKE_BRAND', 'MB_IMPORT', 'Import', NULL, 7, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (301, 'MAKE_BRAND', 'MB_TROTEC', 'Trotec / Epilog', NULL, 8, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (302, 'MAKE_BRAND', 'MB_SHIMADZU', 'Shimadzu / AND', NULL, 9, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (303, 'MAKE_BRAND', 'MB_ZEBRA', 'Zebra / Honeywell', NULL, 10, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (304, 'MAKE_BRAND', 'MB_BIS', 'BIS Approved', NULL, 11, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (305, 'MAKE_BRAND', 'MB_OLYMPUS', 'Olympus/Niton', NULL, 12, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (306, 'MAKE_BRAND', 'MB_SOLIDSCAPE', 'Solidscape / 3DSystems', NULL, 13, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (307, 'CAPACITY_SPEED', 'CS_60100', '60-100 gm/hr', NULL, 1, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (308, 'CAPACITY_SPEED', 'CS_80120', '80-120 gm/hr', NULL, 2, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (309, 'CAPACITY_SPEED', 'CS_VAR', 'Variable', NULL, 3, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (310, 'CAPACITY_SPEED', 'CS_50PB', '50 pcs/batch', NULL, 4, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (311, 'CAPACITY_SPEED', 'CS_200G', '200g gold/cycle', NULL, 5, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (312, 'CAPACITY_SPEED', 'CS_150G', '150g/cycle', NULL, 6, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (313, 'CAPACITY_SPEED', 'CS_2KG', '2kg invest/batch', NULL, 7, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (314, 'CAPACITY_SPEED', 'CS_100PH', '100 pcs/hr', NULL, 8, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (315, 'CAPACITY_SPEED', 'CS_200PH', '200 pcs/hr', NULL, 9, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (316, 'CAPACITY_SPEED', 'CS_200PB', '200 pcs/batch', NULL, 10, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (317, 'CAPACITY_SPEED', 'CS_150PB', '150 pcs/batch', NULL, 11, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (318, 'CAPACITY_SPEED', 'CS_0001G', '0.001g precision', NULL, 12, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (319, 'CAPACITY_SPEED', 'CS_001G', '0.01g precision', NULL, 13, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (320, 'CAPACITY_SPEED', 'CS_60S', '< 60 sec/test', NULL, 14, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (321, 'CAPACITY_SPEED', 'CS_LTANK', 'Large tank', NULL, 15, NULL, true, '2026-08-06 11:17:25.378723', '2026-08-06 11:17:25.378723', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (322, 'PROCESS_BY', 'PB_MACHINE', 'Machine', NULL, 1, NULL, true, '2026-08-06 11:17:25.453136', '2026-08-06 11:17:25.453136', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (323, 'PROCESS_BY', 'PB_MANUAL', 'Manual (Karigar)', NULL, 2, NULL, true, '2026-08-06 11:17:25.453136', '2026-08-06 11:17:25.453136', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (324, 'PROCESS_BY', 'PB_SEMI', 'Semi-Automatic', NULL, 3, NULL, true, '2026-08-06 11:17:25.453136', '2026-08-06 11:17:25.453136', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (325, 'PROCESS_BY', 'PB_AUTO', 'Automated', NULL, 4, NULL, true, '2026-08-06 11:17:25.453136', '2026-08-06 11:17:25.453136', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (326, 'PROCESS_BY', 'PB_OUTSOURCE', 'Outsource', NULL, 5, NULL, true, '2026-08-06 11:17:25.453136', '2026-08-06 11:17:25.453136', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (327, 'SALES_ORDER_TYPE', 'STK', 'FG Stock Order', NULL, 1, NULL, true, '2026-08-06 11:17:26.100792', '2026-08-06 11:17:26.100792', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (328, 'SALES_ORDER_TYPE', 'CUS', 'FG Customer Order', NULL, 2, NULL, true, '2026-08-06 11:17:26.100792', '2026-08-06 11:17:26.100792', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (329, 'SALES_ORDER_TYPE', 'FIO', 'Finding Order', NULL, 3, NULL, true, '2026-08-06 11:17:26.100792', '2026-08-06 11:17:26.100792', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (330, 'CURRENCY', 'INR', 'INR', NULL, 1, NULL, true, '2026-08-06 11:17:26.103647', '2026-08-06 11:17:26.103647', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (331, 'CURRENCY', 'USD', 'USD', NULL, 2, NULL, true, '2026-08-06 11:17:26.103647', '2026-08-06 11:17:26.103647', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (332, 'PAYMENT_TERM', 'ADVANCE', 'Advance', NULL, 1, NULL, true, '2026-08-06 11:17:26.229323', '2026-08-06 11:17:26.229323', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (333, 'PAYMENT_TERM', 'DUE_ON_RECEIPT', 'Due on Receipt', NULL, 2, NULL, true, '2026-08-06 11:17:26.229323', '2026-08-06 11:17:26.229323', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (334, 'PAYMENT_TERM', 'NET_15', 'Net 15 Days', NULL, 3, NULL, true, '2026-08-06 11:17:26.229323', '2026-08-06 11:17:26.229323', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (335, 'PAYMENT_TERM', 'NET_30', 'Net 30 Days', NULL, 4, NULL, true, '2026-08-06 11:17:26.229323', '2026-08-06 11:17:26.229323', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (336, 'PAYMENT_TERM', 'NET_45', 'Net 45 Days', NULL, 5, NULL, true, '2026-08-06 11:17:26.229323', '2026-08-06 11:17:26.229323', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (337, 'PAYMENT_TERM', 'NET_60', 'Net 60 Days', NULL, 6, NULL, true, '2026-08-06 11:17:26.229323', '2026-08-06 11:17:26.229323', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (338, 'PAYMENT_TERM', 'COD', 'Cash on Delivery', NULL, 7, NULL, true, '2026-08-06 11:17:26.229323', '2026-08-06 11:17:26.229323', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (339, 'UOM_RC', 'GM', 'Gram', NULL, 1, NULL, true, '2026-08-06 11:17:26.244748', '2026-08-06 11:17:26.244748', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (340, 'UOM_RC', 'CT', 'Carat', NULL, 2, NULL, true, '2026-08-06 11:17:26.244748', '2026-08-06 11:17:26.244748', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (341, 'UOM_RC', 'PCS', 'Pieces', NULL, 3, NULL, true, '2026-08-06 11:17:26.244748', '2026-08-06 11:17:26.244748', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (342, 'ADRESS_TYPE', 'BILL_TO', 'Bill To', NULL, 1, NULL, true, '2026-08-06 11:17:26.367383', '2026-08-06 11:17:26.367383', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (343, 'ADRESS_TYPE', 'SHIP_TO', 'Ship To', NULL, 2, NULL, true, '2026-08-06 11:17:26.367383', '2026-08-06 11:17:26.367383', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (344, 'SALES_ORDER_TYPE', 'STANDARD', 'Standard', NULL, 1, NULL, false, '2026-08-06 11:21:17.328293', '2026-08-06 11:21:17.616047', 'Retired — order type now selects the item master (FG / Finding)', '2026-08-06 11:21:17.616047');
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (360, 'FG_ITEM_TYPE', 'FG', 'FG', NULL, 10, NULL, true, '2026-08-06 11:21:17.664778', '2026-08-06 11:21:17.664778', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (363, 'PR_REQUEST_SOURCE', 'SALES_ORDER', 'Sales Order', NULL, 1, NULL, true, '2026-08-06 11:21:18.358419', '2026-08-06 11:21:18.358419', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (364, 'PR_REQUEST_SOURCE', 'MIN_MAX', 'Min-Max Planning', NULL, 2, NULL, true, '2026-08-06 11:21:18.358419', '2026-08-06 11:21:18.358419', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (365, 'PR_REQUEST_SOURCE', 'PRODUCTION', 'Production Order', NULL, 3, NULL, true, '2026-08-06 11:21:18.358419', '2026-08-06 11:21:18.358419', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (366, 'PR_REQUEST_SOURCE', 'STOCK_REPLN', 'Stock Replenishment', NULL, 4, NULL, true, '2026-08-06 11:21:18.358419', '2026-08-06 11:21:18.358419', NULL, NULL);
INSERT INTO public.master_lookup (id, lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code, is_active, created_at, updated_at, deactivation_reason, deactivated_at) VALUES (367, 'PR_REQUEST_SOURCE', 'MANUAL', 'Manual Request', NULL, 5, NULL, true, '2026-08-06 11:21:18.358419', '2026-08-06 11:21:18.358419', NULL, NULL);


--
-- Data for Name: menu_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (1, NULL, 'DASHBOARD', 'Dashboard', '/dashboard', 'HomeIcon', 1, 1, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (2, NULL, 'MASTER_MGMT', 'Master Management', NULL, 'CircleStackIcon', 2, 1, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (3, NULL, 'PURCHASE_MGMT', 'Purchase Management', NULL, 'TruckIcon', 3, 1, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (4, NULL, 'INVENTORY_MGMT', 'Inventory Management', NULL, 'CubeIcon', 4, 1, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (5, NULL, 'PRODUCTION_MGMT', 'Production Management', NULL, 'FactoryIcon', 5, 1, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (6, NULL, 'QUALITY_CTRL', 'Quality Control (QC)', NULL, 'ShieldCheckIcon', 6, 1, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (7, NULL, 'ORDER_MGMT', 'Order Management', NULL, 'ShoppingBagIcon', 7, 1, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (8, NULL, 'INTEGRATION', 'Integration', NULL, 'LinkIcon', 8, 1, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (9, NULL, 'REPORTS_DASH', 'Reports & Dashboards', NULL, 'ChartBarIcon', 9, 1, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (10, NULL, 'SYSTEM_ADMIN', 'System admin', NULL, 'Cog6ToothIcon', 10, 1, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (21, 2, 'MM_LOOKUP', 'Lookup Master', '/master-mgmt/lookup', 'ListBulletIcon', 1, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (22, 2, 'MM_FG_ITEMS', 'FG Master', '/master-mgmt/finished-goods', 'GemIcon', 2, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (24, 2, 'MM_COMP_ITEMS', 'Component Master', '/master-mgmt/components', 'CubeIcon', 4, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (26, 2, 'MM_STONE_ITEMS', 'Stone Items', '/master-mgmt/stone-items', 'SparklesIcon', 5, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (27, 2, 'MM_FG_BOM', 'Bill of Materials(FG BOM)', '/master-mgmt/fg-bom', 'ClipboardListIcon', 6, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (28, 2, 'MM_SUPPLIER', 'Supplier Master', '/master-mgmt/supplier', 'UserGroupIcon', 8, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (29, 2, 'MM_SUPP_RATE', 'Supplier Rate Contract', '/master-mgmt/supplier-rate', 'TagIcon', 9, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (30, 2, 'MM_CUSTOMER', 'Customer Master', '/master-mgmt/customer', 'UserGroupIcon', 10, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (31, 2, 'MM_CUST_PRICE', 'Customer Price Master', '/master-mgmt/customer-price', 'TagIcon', 11, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (33, 2, 'MM_CAPACITY', 'Capacity Master', '/master-mgmt/capacity', 'ChartBarIcon', 13, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (35, 2, 'MM_WORK_DEF', 'Work Definition', '/master-mgmt/work-definition', 'ListBulletIcon', 15, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (36, 2, 'MM_MIN_MAX', 'Min Max Planning', '/master-mgmt/min-max-planning', 'ChartBarIcon', 16, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (37, 2, 'MM_SFG_BOM', 'Bill of Materials (Finding BOM)', '/master-mgmt/sfg-bom', 'ClipboardListIcon', 7, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (38, 2, 'MM_DEPT_MASTER', 'Department Master', '/master-mgmt/departments', 'BuildingOffice2Icon', 17, 2, true, '2026-08-06 11:17:24.283977');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (39, 2, 'MM_MACHINE_MASTER', 'Machine Master', '/master-mgmt/machines', 'CogIcon', 18, 2, true, '2026-08-06 11:17:24.283977');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (40, 2, 'MM_OPERATION_MASTER', 'Operation Master', '/master-mgmt/operations', 'WrenchScrewdriverIcon', 19, 2, true, '2026-08-06 11:17:24.283977');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (41, 2, 'MM_ALLOY_MASTER', 'Alloy Master', '/master-mgmt/alloys', 'BeakerIcon', 19, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (43, 3, 'PM_BLANKET', 'Blanket Agreements', '/purchase-mgmt/blanket-agreements', 'FolderIcon', 3, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (61, 5, 'PROD_SCHED', 'Scheduling', '/production/scheduling', 'CalendarIcon', 1, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (62, 5, 'PROD_RESCHED', 'Re-scheduling', '/production/re-scheduling', 'RefreshCwIcon', 2, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (63, 5, 'PROD_PROCESS', 'Production process', '/production/process', 'FactoryIcon', 3, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (71, 6, 'QC_INCOMING', 'Incoming', '/quality/incoming', 'ShieldCheckIcon', 1, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (72, 6, 'QC_IN_PROCESS', 'In-Process', '/quality/in-process', 'ShieldCheckIcon', 2, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (73, 6, 'QC_PRE_DISPATCH', 'Pre-Dispatch', '/quality/pre-dispatch', 'TruckIcon', 3, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (81, 7, 'ORD_SALES', 'Sales Order', '/order-mgmt/sales-order', 'ShoppingBagIcon', 1, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (82, 7, 'ORD_FULFILMENT', 'Order fulfilment', '/order-mgmt/fulfilment', 'ShoppingBagIcon', 2, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (91, 8, 'INT_AP', 'AP Integration', '/integration/ap', 'LinkIcon', 1, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (92, 8, 'INT_AR', 'AR Integration', '/integration/ar', 'LinkIcon', 2, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (93, 8, 'INT_CUSTOMER', 'Customer Master', '/integration/customer', 'UserGroupIcon', 3, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (94, 8, 'INT_VENDOR', 'Vendor Master', '/integration/vendor', 'UserGroupIcon', 4, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (95, 8, 'INT_PORTAL', 'Customer Portal', '/integration/portal', 'GlobeIcon', 5, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (101, 9, 'RPT_SALES', 'Sales', '/reports-dash/sales', 'ChartBarIcon', 1, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (102, 9, 'RPT_PURCHASE', 'Purchase', '/reports-dash/purchase', 'ChartBarIcon', 2, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (103, 9, 'RPT_PRODUCTION', 'Production', '/reports-dash/production', 'ChartBarIcon', 3, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (104, 9, 'RPT_INVENTORY', 'Inventory', '/reports-dash/inventory', 'ChartBarIcon', 4, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (111, 10, 'SA_USER_MASTER', 'User Master', '/settings/users', 'UsersIcon', 1, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (112, 10, 'SA_ROLES_RESP', 'Roles & Responsibility', '/settings/roles', 'ShieldCheckIcon', 2, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (113, 10, 'SA_USER_ROLE', 'User-Role Assignment', '/settings/user-roles', 'UsersIcon', 3, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (114, 10, 'SA_LOGIN_LOGS', 'User Login Logs', '/settings/login-logs', 'ClipboardList', 7, 2, true, '2026-08-06 11:17:22.790993');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (115, 10, 'SA_ERROR_LOGS', 'Error Logs', '/settings/error-logs', 'AlertTriangle', 8, 2, true, '2026-08-06 11:17:22.790993');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (116, 10, 'SA_AUDIT_LOGS', 'Audit Logs', '/settings/audit-logs', 'ClipboardCheck', 9, 2, true, '2026-08-06 11:17:22.790993');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (117, 10, 'SA_USER_PROFILE', 'User Profile', '/profile', 'UserCircle', 1, 2, true, '2026-08-06 11:17:22.872556');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (118, 10, 'SA_ERP_CONFIG', 'ERP Configuration', '/settings/erp-config', 'Settings2', 0, 2, true, '2026-08-06 11:17:22.907445');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (141, 10, 'OTH_MENU_MSTR', 'Menu Configuration', '/settings/menus', 'ListBulletIcon', 4, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (142, 10, 'OTH_PERM_MSTR', 'User Permission Management', '/settings/permissions', 'ShieldCheckIcon', 5, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (143, 10, 'OTH_MAIL_CONF', 'Mail Configuration', '/settings/mail-config', 'EnvelopeIcon', 6, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (201, 10, 'SA_WF_CONFIG', 'Workflow Configuration', 'master-mgmt/workflow', 'AdjustmentsHorizontalIcon', 10, 2, true, '2026-08-06 11:17:23.955816');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (202, 2, 'MM_METAL_MASTER', 'Metal Master', '/master-mgmt/metal-master', 'BeakerIcon', 3, 2, true, '2026-08-06 11:17:24.579816');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (203, 2, 'MM_FIN_ITEMS', 'Finding Master', '/master-mgmt/finding-master', 'WrenchScrewdriverIcon', 3, 2, true, '2026-08-06 11:17:24.91224');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (205, 10, 'SA_USER_PERM', 'User-wise Permission Override', '/settings/user-permissions', 'ShieldCheckIcon', 11, 2, true, '2026-08-06 11:17:25.62552');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (206, 2, 'MM_DAILY_RATE', 'Daily Rate', '/master-mgmt/daily-rate', 'CurrencyRupeeIcon', 12, 2, true, '2026-08-06 11:21:18.220642');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (207, 3, 'PM_REQUISITIONS', 'Purchase Requisition', '/purchase-mgmt/requisitions', 'ClipboardListIcon', 1, 2, true, '2026-08-06 11:21:18.366362');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (42, 3, 'PM_ORDERS', 'Purchase Order', '/purchase-mgmt/orders', 'TruckIcon', 2, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (51, 4, 'IM_ON_HAND', 'On Hand Stock', '/inventory-mgmt/on-hand', 'CubeIcon', 2, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (52, 4, 'IM_COSTING', 'Costing Module', '/inventory-mgmt/costing', 'CircleStackIcon', 3, 2, true, '2026-08-06 11:17:22.578731');
INSERT INTO public.menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active, created_at) VALUES (208, 4, 'IM_METAL_RECEIPT', 'Metal Receipt', '/inventory-mgmt/metal-receipt', 'ArrowDownTrayIcon', 1, 2, true, '2026-08-06 11:21:18.696511');


--
-- Data for Name: project_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (1, 'login_get', '
SELECT u.user_id, u.employee_id, u.password_hash, u.first_name, u.last_name,
       u.emp_email, u.mobile_number, u.profile_image, u.user_status,
       (u.start_date > CURRENT_DATE) AS not_started,
       (u.expiry_date IS NOT NULL AND u.expiry_date < CURRENT_DATE) AS expired,
       EXISTS (SELECT 1 FROM user_role ur WHERE ur.user_id = u.user_id) AS has_any_role,
       EXISTS (
         SELECT 1 FROM user_role ur JOIN role_master rm ON rm.id = ur.role_id
         WHERE ur.user_id = u.user_id AND rm.is_active = TRUE
       ) AS has_active_role,
       (
         SELECT rm.role_name FROM user_role ur JOIN role_master rm ON rm.id = ur.role_id
         WHERE ur.user_id = u.user_id AND ur.is_default = TRUE LIMIT 1
       ) AS role_name
FROM user_master u
WHERE u.employee_id = :userid AND u.user_status = TRUE
', 'Login user fetch query', 'query', true, '2026-08-06 11:17:22.384563', '2026-08-06 11:17:25.998575');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (2, 'user_list_get', 'SELECT u.user_id, u.employee_id, u.first_name, u.last_name, CONCAT(u.first_name, '' '', COALESCE(u.last_name, '''')) AS full_name, u.emp_email, u.mobile_number, u.user_status, u.department_id, u.designation, u.created_at FROM user_master u WHERE u.user_status = TRUE ORDER BY u.first_name, u.last_name', 'Get all active users', 'query', true, '2026-08-06 11:17:22.384563', '2026-08-06 11:17:22.384563');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (4, 'party_list_get', 'SELECT * FROM party_master WHERE is_active = TRUE ORDER BY party_name', 'Get all active parties', 'query', true, '2026-08-06 11:17:22.384563', '2026-08-06 11:17:22.384563');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (5, 'party_by_id_get', 'SELECT * FROM party_master WHERE id = :id AND is_active = TRUE', 'Get party by ID', 'query', true, '2026-08-06 11:17:22.384563', '2026-08-06 11:17:22.384563');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (9, 'lookup_by_type_get', 'SELECT * FROM master_lookup WHERE lookup_type = :lookup_type AND is_active = TRUE ORDER BY display_order', 'Get lookups by type', 'query', true, '2026-08-06 11:17:22.384563', '2026-08-06 11:17:22.384563');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (13, 'login_history_get', 'SELECT lh.*, CONCAT(u.first_name, '' '', COALESCE(u.last_name, '''')) AS full_name FROM login_history lh LEFT JOIN user_master u ON lh.user_id = u.user_id ORDER BY lh.login_time DESC LIMIT 50', 'Get login history', 'query', true, '2026-08-06 11:17:22.384563', '2026-08-06 11:17:22.384563');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (14, 'mail_config_get', 'SELECT key_code, key_value, description FROM project_config WHERE key_code LIKE ''mail_%'' AND is_active = TRUE ORDER BY key_code', 'Get all mail configuration settings', 'query', true, '2026-08-06 11:17:22.384563', '2026-08-06 11:17:22.384563');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (15, 'mail_config_update', 'UPDATE project_config SET key_value = :key_value, updated_at = NOW() WHERE key_code = :key_code', 'Update a single mail configuration key', 'query', true, '2026-08-06 11:17:22.384563', '2026-08-06 11:17:22.384563');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (16, 'mail_driver', 'smtp', 'Mail transport driver (smtp / sendmail / log)', 'mail', true, '2026-08-06 11:17:22.387733', '2026-08-06 11:17:22.387733');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (17, 'mail_host', 'smtp.gmail.com', 'SMTP server hostname', 'mail', true, '2026-08-06 11:17:22.387733', '2026-08-06 11:17:22.387733');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (18, 'mail_port', '587', 'SMTP server port', 'mail', true, '2026-08-06 11:17:22.387733', '2026-08-06 11:17:22.387733');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (19, 'mail_encryption', 'tls', 'Encryption protocol (none / tls / ssl)', 'mail', true, '2026-08-06 11:17:22.387733', '2026-08-06 11:17:22.387733');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (20, 'mail_auth', 'true', 'Require SMTP authentication (true / false)', 'mail', true, '2026-08-06 11:17:22.387733', '2026-08-06 11:17:22.387733');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (21, 'mail_username', '', 'SMTP authentication username / email', 'mail', true, '2026-08-06 11:17:22.387733', '2026-08-06 11:17:22.387733');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (22, 'mail_password', '', 'SMTP authentication password', 'mail', true, '2026-08-06 11:17:22.387733', '2026-08-06 11:17:22.387733');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (23, 'mail_from_email', 'noreply@ignitex.ai', 'Default From email address', 'mail', true, '2026-08-06 11:17:22.387733', '2026-08-06 11:17:22.387733');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (24, 'mail_from_name', 'IgniteX.ai ERP', 'Default From display name', 'mail', true, '2026-08-06 11:17:22.387733', '2026-08-06 11:17:22.387733');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (25, 'mail_reply_to', '', 'Reply-To email address (leave blank for From)', 'mail', true, '2026-08-06 11:17:22.387733', '2026-08-06 11:17:22.387733');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (26, 'mail_timeout', '30', 'SMTP connection timeout in seconds', 'mail', true, '2026-08-06 11:17:22.387733', '2026-08-06 11:17:22.387733');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (27, 'mail_is_active', 'true', 'Enable / disable outgoing email (true / false)', 'mail', true, '2026-08-06 11:17:22.387733', '2026-08-06 11:17:22.387733');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (29, 'fg_item_list_get', 'SELECT i.id, i.design_code, i.design_no, i.manufacturing_name, i.collection_name, i.product_name, i.sub_category, i.jewellery_type, i.sku_type, i.gender, i.tech_type, i.manufacturing_level, i.occasion, i.group_sales, i.status, i.is_active, i.deactivation_reason, i.deactivated_at, i.created_at, STRING_AGG(v.sku_code, '', '' ORDER BY v.sku_code) AS sku_code FROM fg_item_master i LEFT JOIN fg_item_variant v ON v.item_id = i.id AND v.is_active = TRUE WHERE (i.is_active = CASE WHEN :status = ''active'' THEN TRUE WHEN :status = ''inactive'' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '''') = '''' OR i.design_code ILIKE ''%'' || :search || ''%'' OR i.product_name ILIKE ''%'' || :search || ''%'' OR i.manufacturing_name ILIKE ''%'' || :search || ''%'' OR i.collection_name ILIKE ''%'' || :search || ''%'') GROUP BY i.id ORDER BY i.design_code LIMIT :limit OFFSET :offset', 'FG items worklist — paginated, searchable, sku_code aggregated from variants', 'query', true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (30, 'fg_item_get_by_id', 'SELECT i.*, d.design_attributes::text AS design_attributes_json, d.design_image FROM fg_item_master i LEFT JOIN design_master d ON d.design_code = i.design_code WHERE i.id = :id', 'FG item by id (incl. design_image)', 'query', true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (33, 'fg_item_toggle', 'UPDATE fg_item_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN :reason ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN CURRENT_TIMESTAMP ELSE NULL END,
    updated_at          = CURRENT_TIMESTAMP
WHERE id = :id
RETURNING id, design_code, is_active', 'Toggle FG item status', 'query', true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (34, 'fg_variant_list_get', '
SELECT iv.*,
  bf.id           AS bom_id,
  COALESCE(bf.bom_status, ''NO_BOM'') AS bom_status
FROM fg_item_variant iv
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fg
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE
WHERE iv.item_id = :item_id AND iv.is_active = TRUE
ORDER BY iv.sku_code
', 'Variants for an item', 'query', true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (32, 'fg_item_update', 'UPDATE fg_item_master SET manufacturing_name=:manufacturing_name, jewellery_type=:jewellery_type, sku_type=:sku_type, gender=:gender, tech_type=:tech_type, manufacturing_level=:manufacturing_level, occasion=:occasion, group_sales=:group_sales, sub_category=:sub_category, product_category=:product_category, status=:status, uom1=:uom1, uom2=:uom2, video_upload=:video_upload, video_360=:video_360, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *', 'Update FG item classification', 'query', true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.225116');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (3, 'menu_get', 'SELECT m.*, rm.can_view, rm.can_create, rm.can_update, rm.can_delete, rm.can_print, rm.can_export
   FROM menu_master m
   LEFT JOIN role_menu_mapping rm ON m.id = rm.menu_id AND rm.role_id = :role_id
   WHERE m.is_active = TRUE
   ORDER BY m.menu_level, m.menu_order', 'Get menus by role', 'query', true, '2026-08-06 11:17:22.384563', '2026-08-06 11:17:22.384563');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (37, 'fg_variant_toggle', 'UPDATE fg_item_variant SET is_active = NOT is_active, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id, sku_code, is_active', 'Toggle variant status', 'query', true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (46, 'fg_item_list_count', 'SELECT COUNT(*)::int AS total FROM fg_item_master i WHERE (i.is_active = CASE WHEN :status = ''active'' THEN TRUE WHEN :status = ''inactive'' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '''') = '''' OR i.design_code ILIKE ''%'' || :search || ''%'' OR i.product_name ILIKE ''%'' || :search || ''%'' OR i.manufacturing_name ILIKE ''%'' || :search || ''%'' OR i.collection_name ILIKE ''%'' || :search || ''%'')', 'Count FG items with search + status filter', 'query', true, '2026-08-06 11:17:23.276755', '2026-08-06 11:17:23.276755');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (47, 'fg_item_stats', 'SELECT COUNT(CASE WHEN is_active = TRUE THEN 1 END)::int AS active, COUNT(CASE WHEN is_active = FALSE THEN 1 END)::int AS inactive FROM fg_item_master', 'FG item active / inactive totals', 'query', true, '2026-08-06 11:17:23.278336', '2026-08-06 11:17:23.278336');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (48, 'design_next_no', 'SELECT LPAD((COALESCE(MAX(CASE WHEN design_no ~ ''^[0-9]+$'' THEN design_no::integer ELSE 0 END), 0) + 1)::text, 3, ''0'') AS next_no FROM design_master WHERE product_name = :product_name AND collection_name = :collection_name AND is_active = TRUE', 'Next design_no for a product_name + collection_name combination', 'query', true, '2026-08-06 11:17:23.30053', '2026-08-06 11:17:23.30053');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (52, 'fg_variant_client_get', 'SELECT id, variant_id, customer_name, customer_variant_code, customer_variant_name, alloy_code, group_sales FROM fg_item_variant_client WHERE variant_id=:variant_id AND is_active=TRUE ORDER BY id', 'Client variants for a SKU variant', 'query', true, '2026-08-06 11:17:23.817683', '2026-08-06 11:17:23.817683');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (53, 'fg_variant_client_delete_all', 'DELETE FROM fg_item_variant_client WHERE variant_id=:variant_id', 'Delete all client variants for a SKU variant', 'query', true, '2026-08-06 11:17:23.817683', '2026-08-06 11:17:23.817683');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (54, 'fg_variant_client_create', 'INSERT INTO fg_item_variant_client (variant_id, customer_name, customer_variant_code, customer_variant_name, alloy_code, group_sales) VALUES (:variant_id, :customer_name, :customer_variant_code, :customer_variant_name, :alloy_code, :group_sales) RETURNING *', 'Create client variant row', 'query', true, '2026-08-06 11:17:23.817683', '2026-08-06 11:17:23.817683');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (55, 'fg_bom_list_select', 'SELECT
  iv.id           AS variant_id,
  iv.sku_code,
  iv.karat_color,
  iv.weight_band,
  iv.size,
  im.collection_name,
  im.design_code,
  im.design_no,
  im.product_name,
  bf.id           AS bom_id,
  COALESCE(bf.bom_status, ''NO_BOM'') AS bom_status,
  bf.bom_version,
  bf.gross_weight,
  bf.net_weight,
  bf.min_weight,
  bf.max_weight,
  bf.stone_cts,
  bf.stone_gms,
  bf.updated_at   AS bom_updated_at
FROM fg_item_variant iv
JOIN fg_item_master im ON iv.item_id = im.id
LEFT JOIN LATERAL (
  SELECT id, bom_status, bom_version, gross_weight, net_weight,
         min_weight, max_weight, stone_cts, stone_gms, updated_at
  FROM   bom_fg
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE', 'FG BOM list — SELECT + FROM/JOIN (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (56, 'fg_bom_list_count', 'SELECT COUNT(*) AS total
FROM fg_item_variant iv
JOIN fg_item_master im ON iv.item_id = im.id
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fg
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE', 'FG BOM list — COUNT + FROM/JOIN (controller appends WHERE)', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (57, 'fg_bom_stats', 'SELECT
  COUNT(*) FILTER (WHERE bf.bom_status = ''DRAFT'' OR bf.id IS NULL) AS draft,
  COUNT(*) FILTER (WHERE bf.bom_status = ''PENDING_APPROVAL'')       AS pending_approval,
  COUNT(*) FILTER (WHERE bf.bom_status = ''ACTIVE'')                 AS active
FROM fg_item_variant iv
JOIN fg_item_master im ON iv.item_id = im.id
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fg
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE
WHERE iv.is_active = TRUE
  AND im.is_active = TRUE', 'FG BOM tab counts by status', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (58, 'fg_bom_variant_header', 'SELECT iv.id AS variant_id, iv.sku_code, iv.karat_color, iv.weight_band, iv.size,
       im.collection_name, im.design_code, im.design_no, im.product_name
FROM   fg_item_variant iv
JOIN   fg_item_master  im ON iv.item_id = im.id
WHERE  iv.id = $1 AND iv.is_active = TRUE', 'FG BOM — variant info header (sku, design, product fields)', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (45, 'design_update', 'UPDATE design_master SET design_no=:design_no, collection_name=:collection_name, product_name=:product_name, design_attributes=:design_attributes::jsonb, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *', 'Update design master record', 'query', true, '2026-08-06 11:17:23.208424', '2026-08-06 11:21:17.897093');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (36, 'fg_variant_update', '
UPDATE fg_item_variant SET
  karat_color              = :karat_color,
  sku_type                 = :sku_type,
  group_sales              = :group_sales,
  old_erp_variant          = :old_erp_variant,
  weight_band              = :weight_band,
  size                     = :size,
  width_size               = :width_size,
  style_tone               = :style_tone,
  design_source            = :design_source,
  standard_alloy           = :standard_alloy,
  catalogue_reference      = :catalogue_reference,
  vendor_name              = :vendor_name,
  vendor_variant_code      = :vendor_variant_code,
  vendor_variant_name      = :vendor_variant_name,
  shape                    = :shape,
  product_description      = :product_description,
  pipe_thickness           = :pipe_thickness,
  diamond_cut              = :diamond_cut,
  squeezing                = :squeezing,
  setting_size             = :setting_size,
  wire_size                = :wire_size,
  hammering                = :hammering,
  combination_line         = :combination_line,
  compacting               = :compacting,
  machine_used             = :machine_used,
  kada_salai_size          = :kada_salai_size,
  lead_time                = :lead_time,
  rfid_chip_number         = :rfid_chip_number,
  file_link                = :file_link,
  cad_file_url             = :cad_file_url,
  manufacturing_drawing_url = :manufacturing_drawing_url,
  technical_documents_url  = :technical_documents_url,
  rubber_die_number        = :rubber_die_number,
  wax_resin_weight         = :wax_resin_weight,
  ef_batch_number          = :ef_batch_number,
  zinc_surface             = :zinc_surface,
  zinc_die_number          = :zinc_die_number,
  zinc_weight              = :zinc_weight,
  seo_words                = :seo_words,
  usp                      = :usp,
  short_description        = :short_description,
  long_description         = :long_description,
  retail_brand             = :retail_brand,
  keywords_tags            = :keywords_tags,
  product_title            = :product_title,
  updated_at               = CURRENT_TIMESTAMP
WHERE id = :id
RETURNING *
', 'Update variant', 'query', true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (44, 'design_create', 'INSERT INTO design_master (design_code, design_no, collection_name, product_name, design_attributes, design_type) VALUES (:design_code, :design_no, :collection_name, :product_name, :design_attributes::jsonb, :design_type) RETURNING *', 'Create a new design record', 'query', true, '2026-08-06 11:17:23.208424', '2026-08-06 11:21:17.891474');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (59, 'fg_bom_by_variant', 'SELECT bf.*,
       TRIM(COALESCE(su.first_name,'''') || '' '' || COALESCE(su.last_name,'''')) AS submitted_by_name,
       TRIM(COALESCE(au.first_name,'''') || '' '' || COALESCE(au.last_name,'''')) AS approved_by_name,
       TRIM(COALESCE(ru.first_name,'''') || '' '' || COALESCE(ru.last_name,'''')) AS rejected_by_name
FROM   bom_fg bf
LEFT   JOIN user_master su ON su.user_id = bf.submitted_by
LEFT   JOIN user_master au ON au.user_id = bf.approved_by
LEFT   JOIN user_master ru ON ru.user_id = bf.rejected_by
WHERE  bf.variant_id = $1 AND bf.is_active = TRUE
ORDER  BY bf.created_at DESC LIMIT 1', 'FG BOM — latest active BOM for a variant with user names', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (60, 'fg_bom_detail_get', '
SELECT id, bom_id, bom_type, item_type, seq_no, item_id, item_code, item_name,
       item_quantity, uom1_code, purity_code, gross_weight, net_weight,
       stone_cts, stone_gms, component_weight, remarks
FROM bom_fg_detail WHERE bom_id = $1 AND is_active = TRUE ORDER BY bom_type, seq_no
', 'FG BOM — all detail lines for a BOM ordered by type and seq', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:25.976708');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (61, 'fg_bom_variant_check', 'SELECT id FROM fg_item_variant WHERE id = $1 AND is_active = TRUE', 'Check variant exists and is active — returns id or empty', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (62, 'fg_bom_status_check', 'SELECT bom_status FROM bom_fg WHERE id = $1', 'Get BOM bom_status by id', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (63, 'fg_bom_active_get', '
SELECT variant_id, bom_status, min_weight, max_weight, gross_weight, net_weight,
       stone_cts, stone_gms, component_weight, effective_from, effective_to, remarks
FROM bom_fg WHERE id = $1 AND is_active = TRUE
', 'Get full BOM row (active only) — used for RFC validation', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:25.982654');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (64, 'fg_bom_version_new', 'SELECT COUNT(*) + 1 AS nv FROM bom_fg WHERE variant_id = $1', 'Next version number when creating a new BOM (COUNT + 1)', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (65, 'fg_bom_version_rfc', 'SELECT COUNT(*) AS nv FROM bom_fg WHERE variant_id = $1', 'Next version number for RFC new draft (COUNT, then +1 in controller)', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (66, 'fg_bom_create', 'INSERT INTO bom_fg
  (variant_id, bom_version, bom_status, min_weight, max_weight,
   gross_weight, net_weight, stone_cts, stone_gms, component_weight,
   effective_from, effective_to, remarks, created_by, updated_by)
VALUES ($1,$2,''DRAFT'',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
RETURNING id', 'Insert new BOM header — returns id', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (67, 'fg_bom_update', 'UPDATE bom_fg SET
  min_weight = $1, max_weight = $2, effective_from = $3, effective_to = $4,
  remarks = $5, gross_weight = $6, net_weight = $7, stone_cts = $8, stone_gms = $9,
  component_weight = $10, updated_by = $11, updated_at = NOW()
WHERE id = $12', 'Update existing BOM header fields', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (68, 'fg_bom_detail_delete', 'DELETE FROM bom_fg_detail WHERE bom_id = $1', 'Delete all detail lines for a BOM before re-insert', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (69, 'fg_bom_detail_insert', 'INSERT INTO bom_fg_detail
  (bom_id, bom_type, item_type, seq_no, item_id, item_code, item_name,
   item_quantity, uom1_code, item_weight, uom2_code,
   purity_code, pure_weight, weight_gms,
   gross_weight, net_weight, stone_cts, stone_gms, component_weight,
   remarks, created_by)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)', 'Insert one BOM detail line (controller loops per line)', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (70, 'fg_bom_submit', 'UPDATE bom_fg
SET bom_status = ''PENDING_APPROVAL'', submitted_by = $1, submitted_at = NOW(), updated_at = NOW()
WHERE id = $2', 'Submit BOM — set status to PENDING_APPROVAL', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (71, 'fg_bom_approve', 'UPDATE bom_fg
SET bom_status = ''ACTIVE'', approved_by = $1, approved_at = NOW(), updated_at = NOW()
WHERE id = $2', 'Approve BOM — set status to ACTIVE', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (72, 'fg_bom_approve_wf_sync', 'UPDATE wf_request SET wf_status = ''APPROVED'', updated_at = NOW()
WHERE record_type = ''FG_BOM'' AND record_id = $1 AND wf_status != ''APPROVED''', 'Sync wf_request to APPROVED after legacy approve', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (73, 'fg_bom_reject', 'UPDATE bom_fg
SET bom_status = ''DRAFT'', rejected_by = $1, rejected_at = NOW(),
    rejection_reason = $2, submitted_by = NULL, submitted_at = NULL, updated_at = NOW()
WHERE id = $3', 'Reject BOM — reset to DRAFT with rejection_reason', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (74, 'fg_bom_reject_wf_sync', 'UPDATE wf_request
SET wf_status = ''DRAFT'', current_step = 1, updated_at = NOW()
WHERE record_type = ''FG_BOM'' AND record_id = $1', 'Sync wf_request to REJECTED after legacy reject', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (75, 'fg_bom_rfc_create', 'INSERT INTO bom_fg
  (variant_id, bom_version, bom_status,
   min_weight, max_weight, gross_weight, net_weight,
   stone_cts, stone_gms, component_weight, effective_from, effective_to,
   remarks, created_by, updated_by)
VALUES ($1,$2,''DRAFT'',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
RETURNING id', 'Insert new DRAFT BOM for RFC — returns id', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (76, 'fg_bom_rfc_detail_copy', 'INSERT INTO bom_fg_detail
  (bom_id, bom_type, item_type, seq_no, item_id, item_code, item_name,
   item_quantity, uom1_code, item_weight, uom2_code,
   purity_code, pure_weight, weight_gms,
   gross_weight, net_weight, stone_cts, stone_gms, component_weight,
   remarks, created_by)
SELECT $1, bom_type, item_type, seq_no, item_id, item_code, item_name,
       item_quantity, uom1_code, item_weight, uom2_code,
       purity_code, pure_weight, weight_gms,
       gross_weight, net_weight, stone_cts, stone_gms, component_weight,
       remarks, $2
FROM   bom_fg_detail
WHERE  bom_id = $3 AND is_active = TRUE
ORDER  BY item_type, seq_no', 'Copy all detail lines from source BOM to new RFC BOM', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (77, 'fg_bom_lov_variants', 'SELECT iv.id,
       iv.sku_code                    AS code,
       iv.sku_code                    AS name,
       iv.karat_color, iv.weight_band,
       im.collection_name
FROM   fg_item_variant iv
JOIN   fg_item_master  im ON iv.item_id = im.id
WHERE  iv.is_active = TRUE AND iv.sku_code ILIKE $1
ORDER  BY iv.sku_code LIMIT 60', 'LOV: FG variant search by sku_code', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (78, 'fg_bom_lov_components', 'SELECT id,
       component_code AS code,
       COALESCE(CONCAT_WS('' - '', component_name, component_desc), component_code) AS name,
       component_type
FROM   component_master
WHERE  is_active = TRUE
  AND (component_code ILIKE $1
    OR COALESCE(component_name,'''') ILIKE $1
    OR COALESCE(component_desc,'''') ILIKE $1)
ORDER  BY component_code LIMIT 60', 'LOV: component item search by code or name', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (79, 'fg_bom_lov_stones', 'SELECT id,
       stn_code AS code,
       TRIM(CONCAT_WS('' '', stn_type, stn_shape,
         COALESCE(stn_quality,''''), COALESCE(stn_size,''''))) AS name,
       stn_type, stn_shape, stn_quality, stn_color, stn_size, std_cts
FROM   stone_item_master
WHERE  is_active = TRUE AND stn_code ILIKE $1
ORDER  BY stn_code LIMIT 60', 'LOV: stone item search — includes std_cts for BOM auto-fill', 'query', true, '2026-08-06 11:17:24.063955', '2026-08-06 11:17:24.063955');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (186, 'fin_bom_list_count', 'SELECT COUNT(*) AS total
FROM fin_item_variant iv
JOIN fin_item_master im ON iv.item_id = im.id
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fin
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE', 'Finding BOM list — count base (controller appends WHERE)', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (80, 'stone_item_list_select', 'SELECT s.id, s.stn_code, s.stn_type, s.stn_shape, s.stn_quality, s.stn_color, s.stn_size,
       s.std_cts, s.is_active, s.created_at, s.updated_at,
       (EXISTS(SELECT 1 FROM bom_fg_detail  d WHERE d.item_id = s.id AND d.item_type = ''STONE'' AND d.is_active = TRUE)
        OR EXISTS(SELECT 1 FROM bom_fin_detail d WHERE d.item_id = s.id AND d.item_type = ''STONE'' AND d.is_active = TRUE)
       ) AS used_in_bom
FROM stone_item_master s', 'Stone items list — SELECT + FROM (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (81, 'stone_item_list_count', 'SELECT COUNT(*) AS total FROM stone_item_master', 'Stone items list — COUNT + FROM (controller appends WHERE)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (82, 'stone_item_stats', 'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM stone_item_master', 'Stone items active/inactive counts', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (83, 'stone_item_create', 'INSERT INTO stone_item_master
  (stn_type, stn_shape, stn_quality, stn_color, stn_size,
   std_cts, is_active, created_by, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,NOW(),NOW())
RETURNING id, stn_code', 'Insert new stone item — stn_code generated by DB trigger', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (84, 'stone_item_update', 'UPDATE stone_item_master
SET stn_type = $1, stn_shape = $2, stn_quality = $3,
    stn_color = $4, stn_size = $5, std_cts = $6,
    updated_by = $7, updated_at = NOW()
WHERE id = $8
RETURNING id, stn_code', 'Update stone item — stn_code regenerated by DB trigger', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (85, 'stone_item_toggle', 'UPDATE stone_item_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, stn_code', 'Toggle stone item active/inactive status', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (86, 'comp_item_list_select', 'SELECT m.id, m.metal_code, m.metal_type, m.karat_color, m.purity, m.metal_name,
       m.is_active, m.created_at, m.updated_at,
       (EXISTS(SELECT 1 FROM bom_fg_detail  d WHERE d.item_id = m.id AND d.item_type = ''METAL'' AND d.is_active = TRUE)
        OR EXISTS(SELECT 1 FROM bom_fin_detail d WHERE d.item_id = m.id AND d.item_type = ''METAL'' AND d.is_active = TRUE)
       ) AS used_in_bom
FROM metal_master m', 'Component items list — SELECT + FROM (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (87, 'comp_item_list_count', 'SELECT COUNT(*) AS total FROM metal_master', 'Component items list — COUNT + FROM (controller appends WHERE)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (88, 'comp_item_stats', 'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM metal_master', 'Component items active/inactive counts', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (89, 'comp_item_create', 'INSERT INTO metal_master
  (metal_type, karat_color, purity, metal_name,
   is_active, created_by, created_at, updated_at)
VALUES ($1,$2,$3,$4,TRUE,$5,NOW(),NOW())
RETURNING id, metal_code', 'Insert new component item — comp_code generated by DB trigger', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (90, 'comp_item_update', 'UPDATE metal_master
SET metal_type  = $1,
    karat_color = $2,
    purity      = $3,
    metal_name  = $4,
    updated_by  = $5,
    updated_at  = NOW()
WHERE id = $6
RETURNING id, metal_code', 'Update component item — comp_code regenerated by DB trigger', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (91, 'comp_item_toggle', 'UPDATE metal_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, metal_code', 'Toggle component item active/inactive status', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (92, 'lookup_list_select', 'SELECT id, lookup_type, lookup_code, lookup_name, lookup_value,
       display_order, parent_code, is_active, created_at, updated_at
FROM   master_lookup', 'Lookup master list — SELECT + FROM (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (93, 'lookup_list_count', 'SELECT COUNT(*) AS total FROM master_lookup', 'Lookup master list — COUNT + FROM (controller appends WHERE)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (94, 'lookup_stats', 'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM master_lookup', 'Lookup master active/inactive counts', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (95, 'lookup_types', 'SELECT DISTINCT lookup_type FROM master_lookup ORDER BY lookup_type', 'Distinct lookup types for filter dropdown', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (96, 'lookup_dup_check', 'SELECT id FROM master_lookup WHERE lookup_type = $1 AND lookup_code = $2', 'Check for duplicate lookup type+code before insert', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (97, 'lookup_create', 'INSERT INTO master_lookup
  (lookup_type, lookup_code, lookup_name, lookup_value,
   display_order, parent_code, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,NOW())
RETURNING id', 'Insert new lookup entry', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (98, 'lookup_update', 'UPDATE master_lookup
SET lookup_name = $1, lookup_value = $2, display_order = $3,
    parent_code = $4, updated_at = NOW()
WHERE id = $5
RETURNING id', 'Update lookup name, value, order, parent', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (99, 'lookup_toggle', 'UPDATE master_lookup
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, lookup_type, lookup_code', 'Toggle lookup active/inactive status', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (100, 'supplier_list_select', 'SELECT sm.id, sm.vendor_code, sm.vendor_company_name, sm.bus_relationship,
       sm.country_code, sm.pan_card, sm.organization_type, sm.vendor_type,
       sm.is_msme_reg, sm.is_active, sm.created_at, sm.updated_at
FROM   supplier_master sm', 'Supplier list — SELECT + FROM (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (101, 'supplier_list_count', 'SELECT COUNT(*) AS total FROM supplier_master sm', 'Supplier list — COUNT + FROM (controller appends WHERE)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (102, 'supplier_stats', 'SELECT
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END)     AS active,
  SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END) AS inactive
FROM supplier_master', 'Supplier active/inactive counts', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (103, 'supplier_get_main', 'SELECT * FROM supplier_master WHERE id = $1', 'Get supplier main row by id', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (104, 'supplier_get_contacts', 'SELECT * FROM supplier_contact_info WHERE supplier_id = $1 ORDER BY id', 'Get supplier contacts by supplier_id', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (105, 'supplier_get_addresses', 'SELECT * FROM supplier_address_info WHERE supplier_id = $1 ORDER BY id', 'Get supplier addresses by supplier_id', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (106, 'supplier_get_banks', 'SELECT * FROM supplier_bank_detail WHERE supplier_id = $1 ORDER BY id', 'Get supplier bank details by supplier_id', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (107, 'supplier_create', 'INSERT INTO supplier_master
  (vendor_company_name, bus_relationship, country_code, pan_card,
   organization_type, vendor_type, is_msme_reg, vendor_url,
   gstin_uin_number, place_of_supply, msme_udyam_reg_number, gst_treatment,
   is_active, created_by, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE,$13,NOW(),NOW())
RETURNING id, vendor_code', 'Insert new supplier main row — returns id and vendor_code', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (108, 'supplier_update', 'UPDATE supplier_master SET
  vendor_company_name = $1, bus_relationship = $2, country_code = $3, pan_card = $4,
  organization_type = $5, vendor_type = $6, is_msme_reg = $7, vendor_url = $8,
  gstin_uin_number = $9, place_of_supply = $10, msme_udyam_reg_number = $11,
  gst_treatment = $12, updated_by = $13, updated_at = NOW()
WHERE id = $14', 'Update supplier main row', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (109, 'supplier_contact_delete', 'DELETE FROM supplier_contact_info WHERE supplier_id = $1', 'Delete all contacts for a supplier', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (110, 'supplier_address_delete', 'DELETE FROM supplier_address_info WHERE supplier_id = $1', 'Delete all addresses for a supplier', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (111, 'supplier_bank_delete', 'DELETE FROM supplier_bank_detail WHERE supplier_id = $1', 'Delete all bank details for a supplier', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (112, 'supplier_contact_insert', 'INSERT INTO supplier_contact_info
  (supplier_id, cont_first_name, cont_last_name, cont_email, cont_job_title,
   cont_country_code, cont_mobile, cont_is_admin, cont_is_supplier_portal,
   created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())', 'Insert one supplier contact row (controller loops)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (113, 'supplier_address_insert', 'INSERT INTO supplier_address_info
  (supplier_id, adrs_name, adrs_country_code, adrs_1, adrs_2, adrs_3,
   adrs_city_name, adrs_state_code, adrs_pincode, adrs_email,
   adrs_phone_number_country_code, adrs_phone_number, adrs_extension,
   created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())', 'Insert one supplier address row (controller loops)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (114, 'supplier_bank_insert', 'INSERT INTO supplier_bank_detail
  (supplier_id, bank_country_code, bank_name, bank_branch_name,
   bank_account_number, bank_account_holder, bank_account_type,
   bank_account_currency_code, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())', 'Insert one supplier bank detail row (controller loops)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (115, 'supplier_doc_update', 'UPDATE supplier_master SET upload_doc = $1 WHERE id = $2', 'Update supplier upload_doc JSON after file save', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (116, 'supplier_toggle', 'UPDATE supplier_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, vendor_code, vendor_company_name', 'Toggle supplier active/inactive status', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (117, 'customer_list_select', 'SELECT cm.id, cm.customer_code, cm.customer_name, cm.customer_company_name,
       cm.customer_display_name, cm.bus_relationship, cm.country_code,
       cm.pan_card, cm.organization_type, cm.customer_type,
       cm.is_active, cm.created_at, cm.updated_at
FROM   customer_master cm', 'Customer list — SELECT + FROM (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (118, 'customer_list_count', 'SELECT COUNT(*) AS total FROM customer_master cm', 'Customer list — COUNT + FROM (controller appends WHERE)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (119, 'customer_stats', 'SELECT
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END)     AS active,
  SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END) AS inactive
FROM customer_master', 'Customer active/inactive counts', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (120, 'customer_get_main', 'SELECT * FROM customer_master WHERE id = $1', 'Get customer main row by id', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (121, 'customer_get_contacts', 'SELECT * FROM customer_contact_info WHERE customer_id = $1 ORDER BY id', 'Get customer contacts by customer_id', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (122, 'customer_get_addresses', 'SELECT * FROM customer_address_info WHERE customer_id = $1 ORDER BY id', 'Get customer addresses by customer_id', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (123, 'customer_create', 'INSERT INTO customer_master
  (customer_name, customer_company_name, customer_display_name,
   bus_relationship, country_code, pan_card, organization_type,
   customer_type, is_msme_reg, website_url,
   tax_payer_type, gstin_status, gstin_uin_number,
   place_of_supply, gst_treatment,
   credit_limit_by_value, credit_limit_by_grams, payment_terms,
   is_active, created_by, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,TRUE,$19,NOW(),NOW())
RETURNING id, customer_code', 'Insert new customer main row — returns id and customer_code', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (124, 'customer_update', 'UPDATE customer_master SET
  customer_name = $1, customer_company_name = $2, customer_display_name = $3,
  bus_relationship = $4, country_code = $5, pan_card = $6,
  organization_type = $7, customer_type = $8, is_msme_reg = $9, website_url = $10,
  tax_payer_type = $11, gstin_status = $12, gstin_uin_number = $13,
  place_of_supply = $14, gst_treatment = $15,
  credit_limit_by_value = $16, credit_limit_by_grams = $17, payment_terms = $18,
  updated_by = $19, updated_at = NOW()
WHERE id = $20', 'Update customer main row', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (125, 'customer_contact_delete', 'DELETE FROM customer_contact_info WHERE customer_id = $1', 'Delete all contacts for a customer', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (126, 'customer_address_delete', 'DELETE FROM customer_address_info WHERE customer_id = $1', 'Delete all addresses for a customer', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (127, 'customer_contact_insert', 'INSERT INTO customer_contact_info
  (customer_id, cont_first_name, cont_last_name, cont_email, cont_job_title,
   cont_country_code, cont_mobile, cont_is_admin, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())', 'Insert one customer contact row (controller loops)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (128, 'customer_address_insert', 'INSERT INTO customer_address_info
  (customer_id, adrs_name, adrs_country_code, adrs_1, adrs_2, adrs_3,
   adrs_city_name, adrs_state_code, adrs_pincode, adrs_email,
   adrs_phone_number_country_code, adrs_phone_number, adrs_extension,
   created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())', 'Insert one customer address row (controller loops)', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (129, 'customer_doc_update', 'UPDATE customer_master SET upload_doc = $1 WHERE id = $2', 'Update customer upload_doc JSON after file save', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (130, 'customer_toggle', 'UPDATE customer_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, customer_code, customer_company_name', 'Toggle customer active/inactive status', 'query', true, '2026-08-06 11:17:24.078305', '2026-08-06 11:17:24.078305');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (131, 'supplier_check_name', 'SELECT EXISTS(
  SELECT 1 FROM supplier_master
  WHERE LOWER(TRIM(vendor_company_name)) = LOWER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists', 'Check if vendor_company_name already exists (case-insensitive, excludes given id)', 'query', true, '2026-08-06 11:17:24.107824', '2026-08-06 11:17:24.107824');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (132, 'supplier_check_pan', 'SELECT EXISTS(
  SELECT 1 FROM supplier_master
  WHERE UPPER(TRIM(pan_card)) = UPPER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists', 'Check if pan_card already exists (excludes given id)', 'query', true, '2026-08-06 11:17:24.123017', '2026-08-06 11:17:24.123017');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (133, 'supplier_check_gstin', 'SELECT EXISTS(
  SELECT 1 FROM supplier_master
  WHERE UPPER(TRIM(gstin_uin_number)) = UPPER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists', 'Check if gstin_uin_number already exists (excludes given id)', 'query', true, '2026-08-06 11:17:24.123017', '2026-08-06 11:17:24.123017');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (134, 'supplier_check_bank_account', 'SELECT EXISTS(
  SELECT 1 FROM supplier_bank_detail sbd
  JOIN supplier_master sm ON sm.id = sbd.supplier_id
  WHERE TRIM(sbd.bank_account_number) = TRIM($1)
  AND ($2::int IS NULL OR sbd.supplier_id != $2)
) AS exists', 'Check if bank account number exists across any supplier', 'query', true, '2026-08-06 11:17:24.123017', '2026-08-06 11:17:24.123017');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (135, 'customer_check_name', 'SELECT EXISTS(
  SELECT 1 FROM customer_master
  WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists', 'Check if customer_name already exists (case-insensitive, excludes given id)', 'query', true, '2026-08-06 11:17:24.13981', '2026-08-06 11:17:24.13981');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (136, 'customer_check_company', 'SELECT EXISTS(
  SELECT 1 FROM customer_master
  WHERE LOWER(TRIM(customer_company_name)) = LOWER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists', 'Check if customer_company_name already exists (case-insensitive, excludes given id)', 'query', true, '2026-08-06 11:17:24.13981', '2026-08-06 11:17:24.13981');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (137, 'customer_check_pan', 'SELECT EXISTS(
  SELECT 1 FROM customer_master
  WHERE UPPER(TRIM(pan_card)) = UPPER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists', 'Check if pan_card already exists (case-insensitive, excludes given id)', 'query', true, '2026-08-06 11:17:24.13981', '2026-08-06 11:17:24.13981');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (138, 'customer_check_gstin', 'SELECT EXISTS(
  SELECT 1 FROM customer_master
  WHERE UPPER(TRIM(gstin_uin_number)) = UPPER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists', 'Check if gstin_uin_number already exists (case-insensitive, excludes given id)', 'query', true, '2026-08-06 11:17:24.13981', '2026-08-06 11:17:24.13981');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (139, 'dept_list_select', 'SELECT id, dept_code, dept_name, sub_dept, is_active, created_at, updated_at
FROM dept_master', 'Department master list SELECT (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (140, 'dept_list_count', 'SELECT COUNT(*) AS total FROM dept_master', 'Department master list COUNT (controller appends WHERE)', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (141, 'dept_stats', 'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM dept_master', 'Department master active/inactive counts', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (142, 'dept_create', 'INSERT INTO dept_master (dept_code, dept_name, sub_dept, created_by, updated_by)
VALUES ($1,$2,$3,$4,$4)
RETURNING id, dept_code', 'Insert new department — code supplied by user', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (143, 'dept_update', 'UPDATE dept_master
SET dept_name=$1, sub_dept=$2, updated_by=$3, updated_at=NOW()
WHERE id=$4
RETURNING id, dept_code', 'Update department name / sub_dept (code is immutable)', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (144, 'dept_toggle', 'UPDATE dept_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, dept_code', 'Toggle department active/inactive status', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (145, 'machine_list_select', 'SELECT m.id, m.machine_code, m.machine_name, m.machine_type,
       m.dept_id, d.dept_name, d.dept_code AS dept_ref_code,
       m.make_brand, m.capacity_speed, m.machine_remarks,
       m.deactivation_reason, m.deactivated_at,
       m.is_active, m.created_at, m.updated_at
FROM machine_master m
LEFT JOIN dept_master d ON d.id = m.dept_id', 'Machine master list SELECT with dept join (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (146, 'machine_list_count', 'SELECT COUNT(*) AS total FROM machine_master m LEFT JOIN dept_master d ON d.id = m.dept_id', 'Machine master list COUNT (controller appends WHERE)', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (147, 'machine_stats', 'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM machine_master', 'Machine master active/inactive counts', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (148, 'machine_create', 'INSERT INTO machine_master
  (machine_code, machine_name, machine_type, dept_id,
   make_brand, capacity_speed, machine_remarks, created_by, updated_by)
VALUES
  (''MC'' || LPAD(nextval(''machine_code_seq'')::text, 4, ''0''),
   $1, $2, $3, $4, $5, $6, $7, $7)
RETURNING id, machine_code', 'Insert new machine', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (149, 'machine_update', 'UPDATE machine_master
SET machine_name=$1, machine_type=$2, dept_id=$3,
    make_brand=$4, capacity_speed=$5, machine_remarks=$6,
    updated_by=$7, updated_at=NOW()
WHERE id=$8
RETURNING id, machine_code', 'Update machine (code is immutable)', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (150, 'machine_toggle', 'UPDATE machine_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, machine_code', 'Toggle machine active/inactive status', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (151, 'operation_list_select', 'SELECT o.id, o.operation_code, o.operation_name,
       o.dept_id, d.dept_name, d.dept_code AS dept_ref_code,
       o.machine_ids,
       (SELECT STRING_AGG(m.machine_name, '', '' ORDER BY m.machine_name)
        FROM machine_master m WHERE m.id = ANY(o.machine_ids)) AS machine_names,
       o.std_time, o.yield_percentage, o.process_by,
       o.deactivation_reason, o.deactivated_at,
       o.is_active, o.created_at, o.updated_at
FROM operation_master o
LEFT JOIN dept_master d ON d.id = o.dept_id', 'Operation master list SELECT with dept join (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (152, 'operation_list_count', 'SELECT COUNT(*) AS total
FROM operation_master o
LEFT JOIN dept_master d ON d.id = o.dept_id', 'Operation master list COUNT (controller appends WHERE)', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (153, 'operation_stats', 'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM operation_master', 'Operation master active/inactive counts', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (154, 'operation_create', 'INSERT INTO operation_master
  (operation_code, operation_name, dept_id, machine_ids,
   std_time, yield_percentage, process_by, created_by, updated_by)
VALUES
  (''OP'' || LPAD(nextval(''operation_code_seq'')::text, 4, ''0''),
   $1, $2, $3::INT[], $4, $5, $6, $7, $7)
RETURNING id, operation_code', 'Insert new operation', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (155, 'operation_update', 'UPDATE operation_master
SET operation_name=$1, dept_id=$2, machine_ids=$3::INT[],
    std_time=$4, yield_percentage=$5, process_by=$6,
    updated_by=$7, updated_at=NOW()
WHERE id=$8
RETURNING id, operation_code', 'Update operation (code is immutable)', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (156, 'operation_toggle', 'UPDATE operation_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, operation_code', 'Toggle operation active/inactive status', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (157, 'alloy_list_select', 'SELECT id, alloy_code, alloy_name, karat, purity_pct, description,
        metal_category, purity_target, application_type, alloy_status,
        with_silver, silver_percentage, alloy_additives_type, alloy_density,
        composition_remark, alloy_hardness, tensile_strength, ductility_elongation,
        melting_range, color_tone, finish_behaviour, max_drawing_reduction,
        alloy_required, breakage_sensitivity, melting_method,
        alloy_cost_per_gram, indicative_alloy_cost_per_gram,
        supplier_name, alloy_brand, alloy_hazardous,
        is_active, created_at, updated_at
FROM alloy_master', 'Alloy master list SELECT (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (158, 'alloy_list_count', 'SELECT COUNT(*) AS total FROM alloy_master', 'Alloy master list COUNT (controller appends WHERE)', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (159, 'alloy_stats', 'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM alloy_master', 'Alloy master active/inactive counts', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (160, 'alloy_create', 'INSERT INTO alloy_master (
  alloy_code, alloy_name, karat, purity_pct, description,
  metal_category, purity_target, application_type, alloy_status,
  with_silver, silver_percentage, alloy_additives_type, alloy_density,
  composition_remark, alloy_hardness, tensile_strength, ductility_elongation,
  melting_range, color_tone, finish_behaviour, max_drawing_reduction,
  alloy_required, breakage_sensitivity, melting_method,
  alloy_cost_per_gram, indicative_alloy_cost_per_gram,
  supplier_name, alloy_brand, alloy_hazardous,
  created_by, updated_by
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
  $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$30
) RETURNING id, alloy_code', 'Insert new alloy', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (161, 'alloy_update', 'UPDATE alloy_master SET
  alloy_name=$1, karat=$2, purity_pct=$3, description=$4,
  metal_category=$5, purity_target=$6, application_type=$7, alloy_status=$8,
  with_silver=$9, silver_percentage=$10, alloy_additives_type=$11, alloy_density=$12,
  composition_remark=$13, alloy_hardness=$14, tensile_strength=$15, ductility_elongation=$16,
  melting_range=$17, color_tone=$18, finish_behaviour=$19, max_drawing_reduction=$20,
  alloy_required=$21, breakage_sensitivity=$22, melting_method=$23,
  alloy_cost_per_gram=$24, indicative_alloy_cost_per_gram=$25,
  supplier_name=$26, alloy_brand=$27, alloy_hazardous=$28,
  updated_by=$29, updated_at=NOW()
WHERE id=$30
RETURNING id, alloy_code', 'Update alloy (code is immutable)', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (162, 'alloy_toggle', 'UPDATE alloy_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, alloy_code', 'Toggle alloy active/inactive status', 'query', true, '2026-08-06 11:17:24.283977', '2026-08-06 11:17:24.283977');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (163, 'comp_master_list_select', 'SELECT c.id, c.component_code, c.component_type, c.component_name, c.component_desc,
       c.is_active, c.created_at, c.updated_at,
       (EXISTS(SELECT 1 FROM bom_fg_detail  d WHERE d.item_id = c.id AND d.item_type = ''COMPONENT'' AND d.is_active = TRUE)
        OR EXISTS(SELECT 1 FROM bom_fin_detail d WHERE d.item_id = c.id AND d.item_type = ''COMPONENT'' AND d.is_active = TRUE)
       ) AS used_in_bom
FROM component_master c', 'Component master list — SELECT + FROM (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:24.608867', '2026-08-06 11:17:24.608867');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (164, 'comp_master_list_count', 'SELECT COUNT(*) AS total FROM component_master', 'Component master list — COUNT + FROM (controller appends WHERE)', 'query', true, '2026-08-06 11:17:24.608867', '2026-08-06 11:17:24.608867');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (165, 'comp_master_stats', 'SELECT
   SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
   SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
 FROM component_master', 'Component master active/inactive counts', 'query', true, '2026-08-06 11:17:24.608867', '2026-08-06 11:17:24.608867');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (166, 'comp_master_create', 'INSERT INTO component_master
   (component_type, component_name, component_desc,
    is_active, created_by, created_at, updated_at)
 VALUES ($1,$2,$3,TRUE,$4,NOW(),NOW())
 RETURNING id, component_code', 'Insert new component — component_code auto-generated by trigger', 'query', true, '2026-08-06 11:17:24.608867', '2026-08-06 11:17:24.608867');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (167, 'comp_master_update', 'UPDATE component_master
 SET component_type = $1,
     component_name = $2,
     component_desc = $3,
     updated_by     = $4,
     updated_at     = NOW()
 WHERE id = $5
 RETURNING id, component_code', 'Update component fields — component_code is NOT regenerated on update', 'query', true, '2026-08-06 11:17:24.608867', '2026-08-06 11:17:24.608867');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (168, 'comp_master_toggle', 'UPDATE component_master
 SET is_active           = NOT is_active,
     deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
     deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
     updated_at          = NOW()
 WHERE id = $1
 RETURNING id, is_active, component_code', 'Toggle component active/inactive status', 'query', true, '2026-08-06 11:17:24.608867', '2026-08-06 11:17:24.608867');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (169, 'fg_bom_lov_metals', 'SELECT id,
       metal_code AS code,
       COALESCE(CONCAT_WS('' - '', metal_name, karat_color, purity), metal_code) AS name,
       metal_type, karat_color, purity
FROM   metal_master
WHERE  is_active = TRUE
  AND (metal_code ILIKE $1 OR COALESCE(metal_name,'''') ILIKE $1)
ORDER  BY metal_code LIMIT 60', 'LOV: metal master search by metal_code or metal_name', 'query', true, '2026-08-06 11:17:24.846086', '2026-08-06 11:17:24.846086');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (170, 'fin_item_list_get', 'SELECT i.id, i.design_code, i.design_no, i.manufacturing_name, i.collection_name, i.product_name, i.sub_category, i.jewellery_type, i.sku_type, i.gender, i.tech_type, i.manufacturing_level, i.occasion, i.group_sales, i.status, i.is_active, i.deactivation_reason, i.deactivated_at, i.created_at, COUNT(v.id)::int AS variant_count, STRING_AGG(v.sku_code, '', '' ORDER BY v.sku_code) AS sku_code, EXISTS (SELECT 1 FROM fin_item_variant v2 WHERE v2.item_id = i.id AND (EXISTS(SELECT 1 FROM bom_fg_detail  d WHERE d.item_id = v2.id AND d.item_type = ''FINDING'' AND d.is_active = TRUE) OR EXISTS(SELECT 1 FROM bom_fin_detail d WHERE d.item_id = v2.id AND d.item_type = ''FINDING'' AND d.is_active = TRUE))) AS used_in_bom FROM fin_item_master i LEFT JOIN fin_item_variant v ON v.item_id = i.id AND v.is_active = TRUE WHERE (i.is_active = CASE WHEN :status = ''active'' THEN TRUE WHEN :status = ''inactive'' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '''') = '''' OR i.design_code ILIKE ''%'' || :search || ''%'' OR i.product_name ILIKE ''%'' || :search || ''%'' OR i.manufacturing_name ILIKE ''%'' || :search || ''%'' OR i.collection_name ILIKE ''%'' || :search || ''%'') GROUP BY i.id ORDER BY i.design_code LIMIT :limit OFFSET :offset', 'Finding items worklist — server-side search + pagination', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (171, 'fin_item_list_count', 'SELECT COUNT(*)::int AS total FROM fin_item_master i WHERE (i.is_active = CASE WHEN :status = ''active'' THEN TRUE WHEN :status = ''inactive'' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '''') = '''' OR i.design_code ILIKE ''%'' || :search || ''%'' OR i.product_name ILIKE ''%'' || :search || ''%'' OR i.manufacturing_name ILIKE ''%'' || :search || ''%'' OR i.collection_name ILIKE ''%'' || :search || ''%'')', 'Count Finding items with search + status filter', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (172, 'fin_item_stats', 'SELECT COUNT(CASE WHEN is_active = TRUE THEN 1 END)::int AS active, COUNT(CASE WHEN is_active = FALSE THEN 1 END)::int AS inactive FROM fin_item_master', 'Finding item active / inactive totals', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (173, 'fin_item_get_by_id', 'SELECT i.*, d.design_attributes::text AS design_attributes_json, d.design_image FROM fin_item_master i LEFT JOIN design_master d ON d.design_code = i.design_code WHERE i.id = :id', 'Finding item by id (incl. design_image)', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (174, 'fin_item_create', 'INSERT INTO fin_item_master (design_id, design_code, design_no, collection_name, product_name, manufacturing_name, jewellery_type, sku_type, gender, tech_type, manufacturing_level, occasion, group_sales, sub_category, status, uom1, uom2, video_upload, video_360) VALUES (:design_id, :design_code, :design_no, :collection_name, :product_name, :manufacturing_name, :jewellery_type, :sku_type, :gender, :tech_type, :manufacturing_level, :occasion, :group_sales, :sub_category, :status, :uom1, :uom2, :video_upload, :video_360) RETURNING *', 'Create Finding item', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (175, 'fin_item_update', 'UPDATE fin_item_master SET manufacturing_name=:manufacturing_name, jewellery_type=:jewellery_type, sku_type=:sku_type, gender=:gender, tech_type=:tech_type, manufacturing_level=:manufacturing_level, occasion=:occasion, group_sales=:group_sales, sub_category=:sub_category, status=:status, uom1=:uom1, uom2=:uom2, video_upload=:video_upload, video_360=:video_360, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *', 'Update Finding item', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (176, 'fin_item_toggle', 'UPDATE fin_item_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN :reason ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN CURRENT_TIMESTAMP ELSE NULL END,
    updated_at          = CURRENT_TIMESTAMP
WHERE id = :id
RETURNING id, design_code, is_active', 'Toggle Finding item active / deactivation', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (177, 'fin_variant_list_get', 'SELECT fiv.*,
  bf.id AS bom_id,
  COALESCE(bf.bom_status, ''NO_BOM'') AS bom_status
FROM fin_item_variant fiv
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM bom_fin
  WHERE variant_id = fiv.id AND is_active = TRUE
  ORDER BY created_at DESC LIMIT 1
) bf ON TRUE
WHERE fiv.item_id = :item_id AND fiv.is_active = TRUE
ORDER BY fiv.sku_code', 'Variants for a Finding item', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (180, 'fin_variant_toggle', 'UPDATE fin_item_variant SET is_active = NOT is_active, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id, sku_code, is_active', 'Toggle Finding variant status', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (181, 'fin_variant_client_get', 'SELECT id, variant_id, customer_name, customer_variant_code, customer_variant_name, alloy_code, group_sales FROM fin_item_variant_client WHERE variant_id=:variant_id AND is_active=TRUE ORDER BY id', 'Client variants for a Finding SKU variant', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (182, 'fin_variant_client_delete_all', 'DELETE FROM fin_item_variant_client WHERE variant_id=:variant_id', 'Delete all client variants for a Finding SKU variant', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (183, 'fin_variant_client_create', 'INSERT INTO fin_item_variant_client (variant_id, customer_name, customer_variant_code, customer_variant_name, alloy_code, group_sales) VALUES (:variant_id, :customer_name, :customer_variant_code, :customer_variant_name, :alloy_code, :group_sales) RETURNING *', 'Create Finding client variant row', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (184, 'fg_bom_lov_findings', 'SELECT iv.id,
       iv.sku_code AS code,
       CONCAT_WS('' — '', iv.sku_code,
         COALESCE(im.product_name, im.collection_name)) AS name,
       bf.gross_weight,
       bf.net_weight,
       bf.stone_cts
FROM   bom_fin bf
JOIN   fin_item_variant iv ON iv.id = bf.variant_id
JOIN   fin_item_master  im ON im.id = iv.item_id
WHERE  bf.bom_status  = ''ACTIVE''
  AND  bf.is_active   = TRUE
  AND  iv.is_active   = TRUE
  AND  im.is_active   = TRUE
  AND (iv.sku_code                        ILIKE $1
    OR COALESCE(im.product_name,    '''') ILIKE $1
    OR COALESCE(im.collection_name, '''') ILIKE $1)
ORDER  BY iv.sku_code LIMIT 60', 'LOV: Finding BOM (ACTIVE) search by SKU code or product name', 'query', true, '2026-08-06 11:17:25.01345', '2026-08-06 11:17:25.361726');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (185, 'fin_bom_list_select', 'SELECT
  iv.id           AS variant_id,
  iv.sku_code,
  iv.karat_color,
  iv.weight_band,
  iv.size,
  im.collection_name,
  im.design_code,
  im.design_no,
  im.product_name,
  bf.id           AS bom_id,
  COALESCE(bf.bom_status, ''NO_BOM'') AS bom_status,
  bf.bom_version,
  bf.gross_weight,
  bf.net_weight,
  bf.min_weight,
  bf.max_weight,
  bf.stone_cts,
  bf.stone_gms,
  bf.updated_at   AS bom_updated_at
FROM fin_item_variant iv
JOIN fin_item_master im ON iv.item_id = im.id
LEFT JOIN LATERAL (
  SELECT id, bom_status, bom_version, gross_weight, net_weight,
         min_weight, max_weight, stone_cts, stone_gms, updated_at
  FROM   bom_fin
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE', 'Finding BOM list — select base (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (187, 'fin_bom_stats', 'SELECT
  COUNT(*) FILTER (WHERE bf.bom_status = ''DRAFT'' OR bf.id IS NULL) AS draft,
  COUNT(*) FILTER (WHERE bf.bom_status = ''PENDING_APPROVAL'')       AS pending_approval,
  COUNT(*) FILTER (WHERE bf.bom_status = ''ACTIVE'')                 AS active
FROM fin_item_variant iv
JOIN fin_item_master im ON iv.item_id = im.id
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fin
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE
WHERE iv.is_active = TRUE AND im.is_active = TRUE', 'Finding BOM tab counts by status', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (188, 'fin_bom_variant_header', 'SELECT iv.id AS variant_id, iv.sku_code, iv.karat_color, iv.weight_band, iv.size,
       im.collection_name, im.design_code, im.design_no, im.product_name
FROM   fin_item_variant iv
JOIN   fin_item_master  im ON iv.item_id = im.id
WHERE  iv.id = $1 AND iv.is_active = TRUE', 'Finding BOM — variant info header', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (189, 'fin_bom_by_variant', 'SELECT bf.*,
       TRIM(COALESCE(su.first_name,'''') || '' '' || COALESCE(su.last_name,'''')) AS submitted_by_name,
       TRIM(COALESCE(au.first_name,'''') || '' '' || COALESCE(au.last_name,'''')) AS approved_by_name,
       TRIM(COALESCE(ru.first_name,'''') || '' '' || COALESCE(ru.last_name,'''')) AS rejected_by_name
FROM   bom_fin bf
LEFT   JOIN user_master su ON su.user_id = bf.submitted_by
LEFT   JOIN user_master au ON au.user_id = bf.approved_by
LEFT   JOIN user_master ru ON ru.user_id = bf.rejected_by
WHERE  bf.variant_id = $1 AND bf.is_active = TRUE
ORDER  BY bf.created_at DESC LIMIT 1', 'Finding BOM — latest active BOM for a variant with user names', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (190, 'fin_bom_detail_get', '
SELECT id, bom_id, bom_type, item_type, seq_no, item_id, item_code, item_name,
       item_quantity, uom1_code, purity_code, gross_weight, net_weight,
       stone_cts, stone_gms, component_weight, remarks
FROM bom_fin_detail WHERE bom_id = $1 AND is_active = TRUE ORDER BY bom_type, seq_no
', 'Finding BOM — all detail lines for a BOM', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.984294');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (191, 'fin_bom_variant_check', 'SELECT id FROM fin_item_variant WHERE id = $1 AND is_active = TRUE', 'Check finding variant exists and is active', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (192, 'fin_bom_status_check', 'SELECT bom_status FROM bom_fin WHERE id = $1', 'Get Finding BOM bom_status by id', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (193, 'fin_bom_active_get', '
SELECT variant_id, bom_status, min_weight, max_weight, gross_weight, net_weight,
       component_weight, stone_cts, stone_gms, effective_from, effective_to, remarks
FROM bom_fin WHERE id = $1 AND is_active = TRUE
', 'Get full Finding BOM row (active only) — used for RFC validation', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.986023');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (194, 'fin_bom_version_new', 'SELECT COUNT(*) + 1 AS nv FROM bom_fin WHERE variant_id = $1', 'Next version number when creating a new Finding BOM', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (195, 'fin_bom_version_rfc', 'SELECT COUNT(*) AS nv FROM bom_fin WHERE variant_id = $1', 'Next version number for Finding BOM RFC', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (196, 'fin_bom_create', 'INSERT INTO bom_fin
  (variant_id, bom_version, bom_status, min_weight, max_weight,
   gross_weight, net_weight, stone_cts, stone_gms, component_weight,
   effective_from, effective_to, remarks, created_by, updated_by)
VALUES ($1,$2,''DRAFT'',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
RETURNING id', 'Insert new Finding BOM header — returns id', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (197, 'fin_bom_update', 'UPDATE bom_fin SET
  min_weight = $1, max_weight = $2, effective_from = $3, effective_to = $4,
  remarks = $5, gross_weight = $6, net_weight = $7, stone_cts = $8, stone_gms = $9,
  component_weight = $10, updated_by = $11, updated_at = NOW()
WHERE id = $12', 'Update existing Finding BOM header fields', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (198, 'fin_bom_detail_delete', 'DELETE FROM bom_fin_detail WHERE bom_id = $1', 'Delete all detail lines for a Finding BOM', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (199, 'fin_bom_detail_insert', 'INSERT INTO bom_fin_detail
  (bom_id, bom_type, item_type, seq_no, item_id, item_code, item_name,
   item_quantity, uom1_code, item_weight, uom2_code,
   purity_code, pure_weight, weight_gms,
   gross_weight, net_weight, stone_cts, stone_gms, component_weight,
   remarks, created_by)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)', 'Insert one Finding BOM detail line', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (200, 'fin_bom_submit', 'UPDATE bom_fin
SET bom_status = ''PENDING_APPROVAL'', submitted_by = $1, submitted_at = NOW(), updated_at = NOW()
WHERE id = $2', 'Submit Finding BOM — set status to PENDING_APPROVAL', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (201, 'fin_bom_approve', 'UPDATE bom_fin
SET bom_status = ''ACTIVE'', approved_by = $1, approved_at = NOW(), updated_at = NOW()
WHERE id = $2', 'Approve Finding BOM — set status to ACTIVE', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (202, 'fin_bom_approve_wf_sync', 'UPDATE wf_request SET wf_status = ''APPROVED'', updated_at = NOW()
WHERE record_type = ''FINDING_BOM'' AND record_id = $1 AND wf_status != ''APPROVED''', 'Sync wf_request to APPROVED after Finding BOM approve', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (203, 'fin_bom_reject', 'UPDATE bom_fin
SET bom_status = ''DRAFT'', rejected_by = $1, rejected_at = NOW(),
    rejection_reason = $2, submitted_by = NULL, submitted_at = NULL, updated_at = NOW()
WHERE id = $3', 'Reject Finding BOM — reset to DRAFT', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (204, 'fin_bom_reject_wf_sync', 'UPDATE wf_request
SET wf_status = ''DRAFT'', current_step = 1, updated_at = NOW()
WHERE record_type = ''FINDING_BOM'' AND record_id = $1', 'Sync wf_request to DRAFT after Finding BOM reject', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (205, 'fin_bom_rfc_create', 'INSERT INTO bom_fin
  (variant_id, bom_version, bom_status,
   min_weight, max_weight, gross_weight, net_weight,
   stone_cts, stone_gms, component_weight, effective_from, effective_to,
   remarks, created_by, updated_by)
VALUES ($1,$2,''DRAFT'',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
RETURNING id', 'Insert new DRAFT Finding BOM for RFC — returns id', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (206, 'fin_bom_rfc_detail_copy', 'INSERT INTO bom_fin_detail
  (bom_id, bom_type, item_type, seq_no, item_id, item_code, item_name,
   item_quantity, uom1_code, item_weight, uom2_code,
   purity_code, pure_weight, weight_gms,
   gross_weight, net_weight, stone_cts, stone_gms, component_weight,
   remarks, created_by)
SELECT $1, bom_type, item_type, seq_no, item_id, item_code, item_name,
       item_quantity, uom1_code, item_weight, uom2_code,
       purity_code, pure_weight, weight_gms,
       gross_weight, net_weight, stone_cts, stone_gms, component_weight,
       remarks, $2
FROM   bom_fin_detail
WHERE  bom_id = $3 AND is_active = TRUE
ORDER  BY bom_type, seq_no', 'Copy all detail lines from source Finding BOM to new RFC BOM', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (207, 'fin_bom_lov_components', 'SELECT id,
       component_code AS code,
       COALESCE(CONCAT_WS('' - '', component_name, component_desc), component_code) AS name,
       component_type
FROM   component_master
WHERE  is_active = TRUE
  AND (component_code ILIKE $1
    OR COALESCE(component_name,'''') ILIKE $1
    OR COALESCE(component_desc,'''') ILIKE $1)
ORDER  BY component_code LIMIT 60', 'LOV: component item search for Finding BOM', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (208, 'fin_bom_lov_metals', 'SELECT id,
       metal_code AS code,
       COALESCE(CONCAT_WS('' - '', metal_name, karat_color, purity), metal_code) AS name,
       metal_type, karat_color, purity
FROM   metal_master
WHERE  is_active = TRUE
  AND (metal_code ILIKE $1 OR COALESCE(metal_name,'''') ILIKE $1)
ORDER  BY metal_code LIMIT 60', 'LOV: metal master search for Finding BOM', 'query', true, '2026-08-06 11:17:25.267714', '2026-08-06 11:17:25.267714');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (210, 'role_master_deactivate', 'UPDATE role_master SET is_active=FALSE, deactivation_reason=:reason,
       deactivated_at=NOW(), updated_at=NOW() WHERE id=:id RETURNING id, is_active', 'Deactivate role with reason and timestamp', 'query', true, '2026-08-06 11:17:25.602062', '2026-08-06 11:17:25.602062');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (211, 'role_master_activate', 'UPDATE role_master SET is_active=TRUE, deactivation_reason=NULL,
       deactivated_at=NULL, updated_at=NOW() WHERE id=:id RETURNING id, is_active', 'Activate role and clear deactivation info', 'query', true, '2026-08-06 11:17:25.602062', '2026-08-06 11:17:25.602062');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (212, 'min_max_list_select', 'SELECT id, itemtype, sku_code,
       min_quantity, max_quantity, moq_quantity,
       min_weight, max_weight, moq_weight,
       order_base, remarks, is_active, created_at, updated_at
FROM   min_max_planning_master', 'Min/Max planning list — SELECT + FROM (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:25.671471', '2026-08-06 11:17:25.671471');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (213, 'min_max_list_count', 'SELECT COUNT(*) AS total FROM min_max_planning_master', 'Min/Max planning list — COUNT + FROM (controller appends WHERE)', 'query', true, '2026-08-06 11:17:25.671471', '2026-08-06 11:17:25.671471');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (214, 'min_max_stats', 'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM min_max_planning_master', 'Min/Max planning active/inactive counts', 'query', true, '2026-08-06 11:17:25.671471', '2026-08-06 11:17:25.671471');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (215, 'min_max_create', 'INSERT INTO min_max_planning_master
  (itemtype, sku_code, min_quantity, max_quantity, moq_quantity,
   min_weight, max_weight, moq_weight, order_base, remarks,
   is_active, created_by, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11,NOW(),NOW())
RETURNING id, sku_code', 'Insert new min/max planning row', 'query', true, '2026-08-06 11:17:25.671471', '2026-08-06 11:17:25.671471');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (216, 'min_max_update', 'UPDATE min_max_planning_master
SET itemtype = $1, sku_code = $2,
    min_quantity = $3, max_quantity = $4, moq_quantity = $5,
    min_weight = $6, max_weight = $7, moq_weight = $8,
    order_base = $9, remarks = $10,
    updated_by = $11, updated_at = NOW()
WHERE id = $12
RETURNING id, sku_code', 'Update min/max planning row', 'query', true, '2026-08-06 11:17:25.671471', '2026-08-06 11:17:25.671471');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (217, 'min_max_toggle', 'UPDATE min_max_planning_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, sku_code', 'Toggle min/max planning active/inactive status', 'query', true, '2026-08-06 11:17:25.671471', '2026-08-06 11:17:25.671471');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (218, 'supp_rate_list_select', 'SELECT src.id, src.vendor_id, sm.vendor_code, sm.vendor_company_name,
       src.itemtype, src.sku_code, src.rate_basis, src.rate_type, src.rate_value, src.uom,
       src.remarks, src.is_active, src.created_at, src.updated_at
FROM   supplier_rate_contract src
JOIN   supplier_master sm ON sm.id = src.vendor_id', 'Supplier rate contract list — SELECT + FROM (controller appends WHERE/ORDER/LIMIT)', 'query', true, '2026-08-06 11:17:25.789434', '2026-08-06 11:17:25.789434');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (219, 'supp_rate_list_count', 'SELECT COUNT(*) AS total
FROM   supplier_rate_contract src
JOIN   supplier_master sm ON sm.id = src.vendor_id', 'Supplier rate contract list — COUNT + FROM (controller appends WHERE)', 'query', true, '2026-08-06 11:17:25.789434', '2026-08-06 11:17:25.789434');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (220, 'supp_rate_stats', 'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM supplier_rate_contract', 'Supplier rate contract active/inactive counts', 'query', true, '2026-08-06 11:17:25.789434', '2026-08-06 11:17:25.789434');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (221, 'supp_rate_create', 'INSERT INTO supplier_rate_contract
  (vendor_id, itemtype, sku_code, rate_basis, rate_type, rate_value, uom, remarks,
   is_active, created_by, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,NOW(),NOW())
RETURNING id, sku_code', 'Insert new supplier rate contract row', 'query', true, '2026-08-06 11:17:25.789434', '2026-08-06 11:17:25.789434');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (222, 'supp_rate_update', 'UPDATE supplier_rate_contract
SET vendor_id = $1, itemtype = $2, sku_code = $3,
    rate_basis = $4, rate_type = $5, rate_value = $6, uom = $7, remarks = $8,
    updated_by = $9, updated_at = NOW()
WHERE id = $10
RETURNING id, sku_code', 'Update supplier rate contract row', 'query', true, '2026-08-06 11:17:25.789434', '2026-08-06 11:17:25.789434');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (223, 'supp_rate_toggle', 'UPDATE supplier_rate_contract
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, sku_code', 'Toggle supplier rate contract active/inactive status', 'query', true, '2026-08-06 11:17:25.789434', '2026-08-06 11:17:25.789434');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (31, 'fg_item_create', 'INSERT INTO fg_item_master (design_id, design_code, design_no, collection_name, product_name, product_category, manufacturing_name, jewellery_type, sku_type, gender, tech_type, manufacturing_level, occasion, group_sales, sub_category, status, uom1, uom2, video_upload, video_360) VALUES (:design_id, :design_code, :design_no, :collection_name, :product_name, :product_category, :manufacturing_name, :jewellery_type, :sku_type, :gender, :tech_type, :manufacturing_level, :occasion, :group_sales, :sub_category, :status, :uom1, :uom2, :video_upload, :video_360) RETURNING *', 'Create FG item', 'query', true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (35, 'fg_variant_create', '
INSERT INTO fg_item_variant
  (item_id, sku_code, karat_color, sku_type, group_sales,
   old_erp_variant, weight_band, size, width_size, style_tone,
   design_source, standard_alloy, catalogue_reference, vendor_name,
   vendor_variant_code, vendor_variant_name,
   shape, product_description, pipe_thickness, diamond_cut, squeezing,
   setting_size, wire_size, hammering, combination_line, compacting,
   machine_used, kada_salai_size, lead_time, rfid_chip_number, file_link,
   cad_file_url, manufacturing_drawing_url, technical_documents_url,
   rubber_die_number, wax_resin_weight, ef_batch_number,
   zinc_surface, zinc_die_number, zinc_weight,
   seo_words, usp, short_description, long_description,
   retail_brand, keywords_tags, product_title)
VALUES
  (:item_id, :sku_code, :karat_color, :sku_type, :group_sales,
   :old_erp_variant, :weight_band, :size, :width_size, :style_tone,
   :design_source, :standard_alloy, :catalogue_reference, :vendor_name,
   :vendor_variant_code, :vendor_variant_name,
   :shape, :product_description, :pipe_thickness, :diamond_cut, :squeezing,
   :setting_size, :wire_size, :hammering, :combination_line, :compacting,
   :machine_used, :kada_salai_size, :lead_time, :rfid_chip_number, :file_link,
   :cad_file_url, :manufacturing_drawing_url, :technical_documents_url,
   :rubber_die_number, :wax_resin_weight, :ef_batch_number,
   :zinc_surface, :zinc_die_number, :zinc_weight,
   :seo_words, :usp, :short_description, :long_description,
   :retail_brand, :keywords_tags, :product_title)
RETURNING *
', 'Create variant', 'query', true, '2026-08-06 11:17:23.092087', '2026-08-06 11:17:23.092087');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (178, 'fin_variant_create', '
INSERT INTO fin_item_variant
  (item_id, sku_code, karat_color, sku_type, group_sales,
   old_erp_variant, weight_band, size, width_size, style_tone,
   design_source, standard_alloy, catalogue_reference, vendor_name,
   vendor_variant_code, vendor_variant_name,
   shape, product_description, pipe_thickness, diamond_cut, squeezing,
   setting_size, wire_size, hammering, combination_line, compacting,
   machine_used, kada_salai_size, lead_time, rfid_chip_number, file_link,
   cad_file_url, manufacturing_drawing_url, technical_documents_url,
   rubber_die_number, gross_weight, net_weight,
   wax_resin_weight, ef_batch_number,
   zinc_surface, zinc_die_number, zinc_weight,
   seo_words, usp, short_description, long_description,
   retail_brand, keywords_tags, product_title)
VALUES
  (:item_id, :sku_code, :karat_color, :sku_type, :group_sales,
   :old_erp_variant, :weight_band, :size, :width_size, :style_tone,
   :design_source, :standard_alloy, :catalogue_reference, :vendor_name,
   :vendor_variant_code, :vendor_variant_name,
   :shape, :product_description, :pipe_thickness, :diamond_cut, :squeezing,
   :setting_size, :wire_size, :hammering, :combination_line, :compacting,
   :machine_used, :kada_salai_size, :lead_time, :rfid_chip_number, :file_link,
   :cad_file_url, :manufacturing_drawing_url, :technical_documents_url,
   :rubber_die_number, :gross_weight, :net_weight,
   :wax_resin_weight, :ef_batch_number,
   :zinc_surface, :zinc_die_number, :zinc_weight,
   :seo_words, :usp, :short_description, :long_description,
   :retail_brand, :keywords_tags, :product_title)
RETURNING *
', 'Create Finding variant', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (28, 'design_list_get', 'SELECT id, design_code, design_no, collection_name, product_name, design_attributes::text AS design_attributes, design_image FROM design_master WHERE is_active = TRUE AND (design_type = :design_type OR design_type IS NULL) ORDER BY design_code', 'List all active designs (incl. design_image)', 'query', true, '2026-08-06 11:17:23.092087', '2026-08-06 11:21:17.893832');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (179, 'fin_variant_update', '
UPDATE fin_item_variant SET
  karat_color              = :karat_color,
  sku_type                 = :sku_type,
  group_sales              = :group_sales,
  old_erp_variant          = :old_erp_variant,
  weight_band              = :weight_band,
  size                     = :size,
  width_size               = :width_size,
  style_tone               = :style_tone,
  design_source            = :design_source,
  standard_alloy           = :standard_alloy,
  catalogue_reference      = :catalogue_reference,
  vendor_name              = :vendor_name,
  vendor_variant_code      = :vendor_variant_code,
  vendor_variant_name      = :vendor_variant_name,
  shape                    = :shape,
  product_description      = :product_description,
  pipe_thickness           = :pipe_thickness,
  diamond_cut              = :diamond_cut,
  squeezing                = :squeezing,
  setting_size             = :setting_size,
  wire_size                = :wire_size,
  hammering                = :hammering,
  combination_line         = :combination_line,
  compacting               = :compacting,
  machine_used             = :machine_used,
  kada_salai_size          = :kada_salai_size,
  lead_time                = :lead_time,
  rfid_chip_number         = :rfid_chip_number,
  file_link                = :file_link,
  cad_file_url             = :cad_file_url,
  manufacturing_drawing_url = :manufacturing_drawing_url,
  technical_documents_url  = :technical_documents_url,
  rubber_die_number        = :rubber_die_number,
  gross_weight             = :gross_weight,
  net_weight               = :net_weight,
  wax_resin_weight         = :wax_resin_weight,
  ef_batch_number          = :ef_batch_number,
  zinc_surface             = :zinc_surface,
  zinc_die_number          = :zinc_die_number,
  zinc_weight              = :zinc_weight,
  seo_words                = :seo_words,
  usp                      = :usp,
  short_description        = :short_description,
  long_description         = :long_description,
  retail_brand             = :retail_brand,
  keywords_tags            = :keywords_tags,
  product_title            = :product_title,
  updated_at               = CURRENT_TIMESTAMP
WHERE id = :id
RETURNING *
', 'Update Finding variant', 'query', true, '2026-08-06 11:17:24.91224', '2026-08-06 11:17:24.91224');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (224, 'menu_master_list_get', 'SELECT m.id, m.parent_id, m.menu_code, m.menu_name, m.menu_url, m.menu_icon, m.menu_order, m.menu_level, m.is_active, m.created_at, pm.menu_name as parent_name FROM menu_master m LEFT JOIN menu_master pm ON pm.id = m.parent_id ORDER BY m.menu_level, m.menu_order, m.id', 'Get all menus with parent name', 'query', true, '2026-08-10 04:56:50.504111', '2026-08-10 04:56:50.504111');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (225, 'menu_master_create', 'INSERT INTO menu_master (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active) VALUES (:parent_id, :menu_code, :menu_name, :menu_url, :menu_icon, :menu_order, :menu_level, :is_active) RETURNING *', 'Create new menu item', 'query', true, '2026-08-10 04:56:50.504111', '2026-08-10 04:56:50.504111');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (226, 'menu_master_update', 'UPDATE menu_master SET parent_id=:parent_id, menu_name=:menu_name, menu_url=:menu_url, menu_icon=:menu_icon, menu_order=:menu_order, menu_level=:menu_level, is_active=:is_active WHERE id=:id RETURNING *', 'Update menu item', 'query', true, '2026-08-10 04:56:50.504111', '2026-08-10 04:56:50.504111');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (227, 'menu_master_delete', 'UPDATE menu_master SET is_active=FALSE WHERE id=:id RETURNING id', 'Soft delete menu item', 'query', true, '2026-08-10 04:56:50.504111', '2026-08-10 04:56:50.504111');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (229, 'role_master_create', 'INSERT INTO role_master (role_code, role_name, description, is_active) VALUES (:role_code, :role_name, :description, :is_active) RETURNING *', 'Create new role', 'query', true, '2026-08-10 04:56:50.504111', '2026-08-10 04:56:50.504111');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (231, 'role_master_delete', 'UPDATE role_master SET is_active=FALSE, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id', 'Soft delete role', 'query', true, '2026-08-10 04:56:50.504111', '2026-08-10 04:56:50.504111');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (234, 'permission_remove', 'DELETE FROM role_menu_mapping WHERE role_id=:role_id AND menu_id=:menu_id RETURNING id', 'Remove a role-menu permission mapping', 'query', true, '2026-08-10 04:56:50.504111', '2026-08-10 04:56:50.504111');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (233, 'permission_upsert', 'INSERT INTO role_menu_mapping
     (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export, is_active)
   VALUES
     (:role_id, :menu_id, :can_view, :can_create, :can_update, :can_delete, :can_print, :can_export, TRUE)
   ON CONFLICT (role_id, menu_id) DO UPDATE SET
     can_view   = EXCLUDED.can_view,
     can_create = EXCLUDED.can_create,
     can_update = EXCLUDED.can_update,
     can_delete = EXCLUDED.can_delete,
     can_print  = EXCLUDED.can_print,
     can_export = EXCLUDED.can_export,
     is_active  = TRUE
   RETURNING *', 'Upsert a single role-menu permission row', 'query', true, '2026-08-10 04:56:50.504111', '2026-08-10 04:56:50.504111');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (232, 'permission_menus_by_role_get', 'SELECT
     m.id          AS menu_id,
     m.menu_code,
     m.menu_name,
     m.parent_id,
     m.menu_level,
     m.menu_order,
     pm.menu_name  AS parent_name,
     COALESCE(rm.can_view,   FALSE) AS can_view,
     COALESCE(rm.can_create, FALSE) AS can_create,
     COALESCE(rm.can_update, FALSE) AS can_update,
     COALESCE(rm.can_delete, FALSE) AS can_delete,
     COALESCE(rm.can_print,  FALSE) AS can_print,
     COALESCE(rm.can_export, FALSE) AS can_export
   FROM menu_master m
   LEFT JOIN role_menu_mapping rm
     ON m.id = rm.menu_id AND rm.role_id = :role_id
   LEFT JOIN menu_master pm
     ON pm.id = m.parent_id AND pm.is_active = TRUE
   WHERE m.is_active = TRUE
     AND (m.parent_id IS NULL OR m.parent_id IN (
       SELECT id FROM menu_master WHERE is_active = TRUE
     ))
   ORDER BY m.menu_level, m.menu_order', 'Get all menus with permission flags for a specific role', 'query', true, '2026-08-10 04:56:50.504111', '2026-08-10 04:56:50.504111');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (228, 'role_master_list_get', 'SELECT id, role_code, role_name, description, is_active, created_at, updated_at FROM role_master ORDER BY id', 'Get all roles', 'query', true, '2026-08-10 04:56:50.504111', '2026-08-10 04:56:50.504111');
INSERT INTO public.project_config (id, key_code, key_value, description, config_type, is_active, created_at, updated_at) VALUES (230, 'role_master_update', 'UPDATE role_master SET role_name=:role_name, description=:description, is_active=:is_active, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *', 'Update role', 'query', true, '2026-08-10 04:56:50.504111', '2026-08-10 04:56:50.504111');


--
-- Data for Name: role_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.role_master (id, role_code, role_name, description, is_active, created_at, updated_at) VALUES (1, 'SYS_ADMIN', 'System Administrator', 'Full system access', true, '2026-08-06 11:17:22.357235', '2026-08-06 11:17:22.659487');
INSERT INTO public.role_master (id, role_code, role_name, description, is_active, created_at, updated_at) VALUES (2, 'PROCESS_ADMIN', 'Process Admin', 'Process administration access', true, '2026-08-06 11:17:22.357235', '2026-08-06 11:17:22.659487');
INSERT INTO public.role_master (id, role_code, role_name, description, is_active, created_at, updated_at) VALUES (3, 'MANAGER', 'Manager', 'Managerial access', true, '2026-08-06 11:17:22.357235', '2026-08-06 11:17:22.659487');
INSERT INTO public.role_master (id, role_code, role_name, description, is_active, created_at, updated_at) VALUES (4, 'SUPERVISOR', 'Supervisor', 'Supervisory access', true, '2026-08-06 11:17:22.357235', '2026-08-06 11:17:22.659487');
INSERT INTO public.role_master (id, role_code, role_name, description, is_active, created_at, updated_at) VALUES (5, 'OPERATOR', 'Operator', 'Operational access', true, '2026-08-06 11:17:22.357235', '2026-08-06 11:17:22.659487');
INSERT INTO public.role_master (id, role_code, role_name, description, is_active, created_at, updated_at) VALUES (6, 'VIEWER', 'Viewer', 'Read-only access', true, '2026-08-06 11:17:22.659487', '2026-08-06 11:17:22.659487');


--
-- Data for Name: role_menu_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (274, 2, 1, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (275, 2, 2, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (276, 2, 3, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (277, 2, 4, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (278, 2, 5, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (279, 2, 6, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (280, 2, 7, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (281, 2, 8, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (282, 2, 9, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (284, 2, 21, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (285, 2, 22, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (286, 2, 24, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (287, 2, 26, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (288, 2, 27, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (289, 2, 37, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (290, 2, 28, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (291, 2, 29, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (292, 2, 30, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (293, 2, 31, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (295, 2, 33, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (297, 2, 35, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (298, 2, 36, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (299, 2, 41, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (300, 2, 42, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (301, 2, 43, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (302, 2, 51, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (303, 2, 52, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (304, 2, 61, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (305, 2, 62, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (306, 2, 63, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (307, 2, 71, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (308, 2, 72, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (309, 2, 73, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (310, 2, 81, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (311, 2, 82, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (312, 2, 91, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (313, 2, 92, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (314, 2, 93, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (315, 2, 94, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (316, 2, 95, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (317, 2, 101, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (318, 2, 102, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (319, 2, 103, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (320, 2, 104, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (340, 3, 1, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (341, 3, 2, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (342, 3, 3, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (343, 3, 4, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (344, 3, 5, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (345, 3, 6, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (346, 3, 7, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (347, 3, 8, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (348, 3, 9, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (350, 3, 21, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (351, 3, 22, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (352, 3, 24, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (353, 3, 26, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (354, 3, 27, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (355, 3, 37, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (356, 3, 28, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (357, 3, 29, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (358, 3, 30, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (359, 3, 31, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (361, 3, 33, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (363, 3, 35, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (364, 3, 36, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (365, 3, 41, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (366, 3, 42, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (367, 3, 43, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (368, 3, 51, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (369, 3, 52, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (370, 3, 61, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (371, 3, 62, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (372, 3, 63, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (373, 3, 71, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (374, 3, 72, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (375, 3, 73, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (376, 3, 81, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (377, 3, 82, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (378, 3, 91, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (379, 3, 92, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (380, 3, 93, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (381, 3, 94, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (382, 3, 95, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (383, 3, 101, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (384, 3, 102, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (385, 3, 103, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (386, 3, 104, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (406, 4, 1, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (407, 4, 2, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (408, 4, 3, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (409, 4, 4, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (410, 4, 5, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (411, 4, 6, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (412, 4, 7, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (413, 4, 8, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (414, 4, 9, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (416, 4, 21, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (417, 4, 22, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (418, 4, 24, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (419, 4, 26, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (420, 4, 27, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (421, 4, 37, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (422, 4, 28, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (423, 4, 29, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (424, 4, 30, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (425, 4, 31, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (427, 4, 33, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (429, 4, 35, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (430, 4, 36, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (431, 4, 41, true, true, true, true, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (432, 4, 42, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (433, 4, 43, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (434, 4, 51, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (435, 4, 52, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (436, 4, 61, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (437, 4, 62, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (438, 4, 63, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (439, 4, 71, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (440, 4, 72, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (441, 4, 73, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (442, 4, 81, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (443, 4, 82, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (444, 4, 91, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (445, 4, 92, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (446, 4, 93, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (447, 4, 94, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (448, 4, 95, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (449, 4, 101, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (450, 4, 102, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (451, 4, 103, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (452, 4, 104, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (472, 5, 1, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (473, 5, 3, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (474, 5, 4, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (475, 5, 5, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (476, 5, 6, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (477, 5, 7, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (479, 5, 41, true, true, true, true, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (480, 5, 42, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (481, 5, 43, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (482, 5, 51, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (483, 5, 52, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (484, 5, 61, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (485, 5, 62, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (486, 5, 63, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (487, 5, 71, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (488, 5, 72, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (489, 5, 73, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (490, 5, 81, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (491, 5, 82, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (497, 6, 1, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (498, 6, 2, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (499, 6, 3, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (500, 6, 4, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (501, 6, 5, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (502, 6, 6, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (503, 6, 7, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (504, 6, 8, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (505, 6, 9, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (507, 6, 21, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (508, 6, 22, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (509, 6, 24, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (510, 6, 26, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (511, 6, 27, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (512, 6, 37, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (513, 6, 28, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (514, 6, 29, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (515, 6, 30, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (516, 6, 31, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (518, 6, 33, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (520, 6, 35, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (521, 6, 36, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (522, 6, 41, true, true, true, true, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (523, 6, 42, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (524, 6, 43, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (525, 6, 51, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (526, 6, 52, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (527, 6, 61, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (528, 6, 62, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (529, 6, 63, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (530, 6, 71, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (531, 6, 72, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (532, 6, 73, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (533, 6, 81, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (534, 6, 82, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (535, 6, 91, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (536, 6, 92, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (537, 6, 93, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (538, 6, 94, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (539, 6, 95, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (540, 6, 101, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (541, 6, 102, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (542, 6, 103, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (543, 6, 104, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (568, 2, 112, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (569, 4, 141, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (570, 5, 28, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (571, 5, 118, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (572, 2, 10, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (573, 5, 35, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (574, 3, 141, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (575, 5, 36, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (576, 5, 103, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (577, 5, 104, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (578, 5, 101, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (580, 6, 116, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (581, 6, 114, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (582, 6, 142, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (583, 5, 102, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (584, 5, 143, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (585, 4, 10, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (586, 6, 111, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (587, 3, 112, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (588, 6, 115, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (589, 2, 141, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (590, 5, 91, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (591, 4, 112, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (592, 3, 10, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (593, 4, 117, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (594, 2, 113, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (595, 5, 94, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (596, 6, 143, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (597, 3, 117, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (598, 5, 111, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (599, 5, 92, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (600, 5, 115, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (601, 5, 142, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (602, 5, 26, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (603, 5, 21, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (604, 5, 116, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (605, 5, 114, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (606, 5, 95, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (607, 5, 22, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (608, 6, 118, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (609, 5, 31, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (610, 3, 113, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (611, 4, 113, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (612, 2, 117, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (613, 5, 29, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (614, 5, 30, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (615, 5, 8, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (616, 2, 118, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (617, 5, 10, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (618, 5, 33, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (619, 5, 93, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (620, 4, 143, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (621, 5, 24, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (622, 5, 112, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (623, 6, 117, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (624, 3, 143, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (625, 5, 141, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (626, 6, 113, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (627, 3, 118, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (628, 2, 143, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (629, 4, 118, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (630, 5, 2, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (632, 4, 114, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (633, 4, 116, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (634, 2, 142, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (635, 3, 114, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (636, 3, 116, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (637, 2, 111, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (638, 2, 115, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (639, 6, 141, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (640, 5, 113, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (641, 3, 115, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (642, 6, 112, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (643, 3, 111, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (644, 5, 117, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (645, 4, 111, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (646, 6, 10, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (647, 5, 9, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (648, 4, 115, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (649, 5, 27, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (650, 4, 142, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (651, 2, 116, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (652, 5, 37, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (653, 3, 142, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (654, 2, 114, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (663, 4, 38, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (664, 6, 38, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (665, 2, 38, true, true, true, true, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (666, 3, 38, true, true, true, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (667, 5, 38, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (669, 4, 39, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (670, 6, 39, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (671, 2, 39, true, true, true, true, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (672, 3, 39, true, true, true, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (673, 5, 39, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (675, 4, 40, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (676, 6, 40, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (677, 2, 40, true, true, true, true, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (678, 3, 40, true, true, true, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (679, 5, 40, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (687, 4, 202, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (688, 6, 202, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (689, 2, 202, true, true, true, true, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (690, 3, 202, true, true, true, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (691, 5, 202, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (699, 2, 203, true, true, true, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (702, 2, 206, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (703, 3, 206, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (704, 4, 206, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (705, 6, 206, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (706, 5, 206, false, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (708, 2, 207, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (709, 3, 207, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (710, 4, 207, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (711, 5, 207, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (712, 6, 207, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (720, 2, 208, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (721, 3, 208, true, true, true, false, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (722, 4, 208, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (723, 5, 208, true, true, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (724, 6, 208, true, false, false, false, true, false, false);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (200, 1, 1, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (201, 1, 2, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (202, 1, 3, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (203, 1, 4, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (204, 1, 5, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (205, 1, 6, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (206, 1, 7, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (207, 1, 8, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (208, 1, 9, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (209, 1, 10, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (211, 1, 21, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (212, 1, 22, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (213, 1, 24, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (214, 1, 26, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (215, 1, 27, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (217, 1, 28, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (218, 1, 29, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (219, 1, 30, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (220, 1, 31, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (222, 1, 33, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (224, 1, 35, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (225, 1, 36, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (216, 1, 37, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (662, 1, 38, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (668, 1, 39, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (674, 1, 40, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (226, 1, 41, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (228, 1, 43, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (231, 1, 61, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (232, 1, 62, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (233, 1, 63, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (234, 1, 71, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (235, 1, 72, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (236, 1, 73, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (237, 1, 81, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (238, 1, 82, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (239, 1, 91, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (240, 1, 92, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (241, 1, 93, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (242, 1, 94, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (243, 1, 95, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (244, 1, 101, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (245, 1, 102, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (246, 1, 103, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (247, 1, 104, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (248, 1, 111, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (249, 1, 112, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (250, 1, 113, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (565, 1, 114, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (567, 1, 115, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (563, 1, 116, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (564, 1, 117, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (566, 1, 118, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (271, 1, 141, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (272, 1, 142, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (273, 1, 143, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (781, 1, 201, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (686, 1, 202, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (698, 1, 203, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (700, 1, 205, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (701, 1, 206, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (707, 1, 207, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (227, 1, 42, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (229, 1, 51, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (230, 1, 52, true, true, true, true, true, true, true);
INSERT INTO public.role_menu_mapping (id, role_id, menu_id, can_view, can_create, can_update, can_delete, is_active, can_print, can_export) VALUES (719, 1, 208, true, true, true, true, true, true, true);


--
-- Data for Name: user_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.user_master (user_id, employee_id, password_hash, first_name, last_name, emp_email, mobile_number, profile_image, department_id, designation, manager_id, user_status, jwt_token, jwt_token_update, start_date, expiry_date, timezone, language, last_login_at, login_ip, created_by, created_at, updated_by, updated_at, inactive_date, inactive_reason, reset_otp_hash, reset_otp_expiry, reset_otp_attempts, reset_token, reset_token_expiry, activation_token, activation_token_expiry) VALUES (2, 'EMP002', '$2b$10$nNh48ihKHGGlYpPeHuyn8uWykZ3x5BPjkjXGpTtqFjzzEgmigkhn6', 'Store', 'Manager', 'manager@ignitex.ai', NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, 'Asia/Kolkata', 'en', NULL, NULL, NULL, '2026-08-06 11:17:22.360902+00', NULL, '2026-08-06 11:17:22.360902+00', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);
INSERT INTO public.user_master (user_id, employee_id, password_hash, first_name, last_name, emp_email, mobile_number, profile_image, department_id, designation, manager_id, user_status, jwt_token, jwt_token_update, start_date, expiry_date, timezone, language, last_login_at, login_ip, created_by, created_at, updated_by, updated_at, inactive_date, inactive_reason, reset_otp_hash, reset_otp_expiry, reset_otp_attempts, reset_token, reset_token_expiry, activation_token, activation_token_expiry) VALUES (3, 'EMP003', '$2b$10$nNh48ihKHGGlYpPeHuyn8uWykZ3x5BPjkjXGpTtqFjzzEgmigkhn6', 'Sales', 'Executive', 'sales@ignitex.ai', NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, 'Asia/Kolkata', 'en', NULL, NULL, NULL, '2026-08-06 11:17:22.360902+00', NULL, '2026-08-06 11:17:22.360902+00', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);
INSERT INTO public.user_master (user_id, employee_id, password_hash, first_name, last_name, emp_email, mobile_number, profile_image, department_id, designation, manager_id, user_status, jwt_token, jwt_token_update, start_date, expiry_date, timezone, language, last_login_at, login_ip, created_by, created_at, updated_by, updated_at, inactive_date, inactive_reason, reset_otp_hash, reset_otp_expiry, reset_otp_attempts, reset_token, reset_token_expiry, activation_token, activation_token_expiry) VALUES (1, 'EMP001', '$2b$10$nNh48ihKHGGlYpPeHuyn8uWykZ3x5BPjkjXGpTtqFjzzEgmigkhn6', 'System', 'Administrator', 'admin@ignitex.ai', NULL, NULL, NULL, NULL, NULL, true, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1wbG95ZWVfaWQiOiJFTVAwMDEiLCJmaXJzdF9uYW1lIjoiU3lzdGVtIiwibGFzdF9uYW1lIjoiQWRtaW5pc3RyYXRvciIsImlhdCI6MTc4NjMzODEwMywiZXhwIjoxNzg2MzY2OTAzfQ.8opec_J7gM5hol798RZVLGCuUK_aFC8J9CkhL6YH7Y8', '2026-08-10 13:01:43.32+00', NULL, NULL, 'Asia/Kolkata', 'en', '2026-08-10 05:01:43.323785+00', '::1', NULL, '2026-08-06 11:17:22.360902+00', NULL, '2026-08-10 05:01:43.323785+00', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);


--
-- Data for Name: user_menu_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_role; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.user_role (id, user_id, role_id, is_default, created_at) VALUES (2, 2, 3, true, '2026-08-06 11:22:47.158405');
INSERT INTO public.user_role (id, user_id, role_id, is_default, created_at) VALUES (3, 3, 5, true, '2026-08-06 11:22:47.158405');
INSERT INTO public.user_role (id, user_id, role_id, is_default, created_at) VALUES (1, 1, 1, true, '2026-08-06 11:22:47.158405');
INSERT INTO public.user_role (id, user_id, role_id, is_default, created_at) VALUES (5, 1, 2, false, '2026-08-06 11:22:47.452278');
INSERT INTO public.user_role (id, user_id, role_id, is_default, created_at) VALUES (6, 1, 3, false, '2026-08-06 11:22:47.452278');
INSERT INTO public.user_role (id, user_id, role_id, is_default, created_at) VALUES (7, 1, 4, false, '2026-08-06 11:22:47.452278');
INSERT INTO public.user_role (id, user_id, role_id, is_default, created_at) VALUES (8, 1, 5, false, '2026-08-06 11:22:47.452278');
INSERT INTO public.user_role (id, user_id, role_id, is_default, created_at) VALUES (9, 1, 6, false, '2026-08-06 11:22:47.452278');


--
-- Name: master_lookup_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.master_lookup_id_seq', 367, true);


--
-- Name: menu_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.menu_master_id_seq', 208, true);


--
-- Name: project_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_config_id_seq', 234, true);


--
-- Name: role_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.role_master_id_seq', 6, true);


--
-- Name: role_menu_mapping_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.role_menu_mapping_id_seq', 790, true);


--
-- Name: user_master_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_master_user_id_seq', 3, true);


--
-- Name: user_menu_mapping_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_menu_mapping_id_seq', 1, true);


--
-- Name: user_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_role_id_seq', 9, true);


--
-- PostgreSQL database dump complete
--

\unrestrict gPVaPJ5IvixeTfgMBggIH9wJn0clbaUGATaJeBDDVBWafLLIcmrer7M8pqgcjtk

