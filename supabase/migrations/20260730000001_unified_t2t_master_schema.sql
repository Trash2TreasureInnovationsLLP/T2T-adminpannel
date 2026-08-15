-- ============================================================================
-- TRASH2TREASURE (T2T) ECOSYSTEM - UNIFIED MASTER SUPABASE DATABASE SCHEMA
-- Target Apps: User Application, Admin Panel, Business Portal, Super Admin Panel
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enum Types (Create if not exist pattern via DO block)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('super_admin', 'regional_admin', 'business_admin', 'moderator', 'support', 'viewer', 'user', 'business');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status_enum') THEN
        CREATE TYPE account_status_enum AS ENUM ('active', 'pending', 'suspended', 'banned', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_verification_status') THEN
        CREATE TYPE business_verification_status AS ENUM ('pending', 'approved', 'rejected', 'action_required');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'waste_category_enum') THEN
        CREATE TYPE waste_category_enum AS ENUM ('Plastic', 'Paper', 'Metal', 'Glass', 'E-Waste', 'Organic');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum') THEN
        CREATE TYPE transaction_type_enum AS ENUM ('credit', 'debit', 'reward', 'payout', 'redemption');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority_enum') THEN
        CREATE TYPE ticket_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status_enum') THEN
        CREATE TYPE ticket_status_enum AS ENUM ('open', 'in_progress', 'resolved', 'closed');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. CORE IDENTITY & LOCATION TABLES
-- ----------------------------------------------------------------------------

-- States Table
CREATE TABLE IF NOT EXISTS public.states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    status account_status_enum NOT NULL DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cities Table
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    state_code VARCHAR(10),
    status account_status_enum NOT NULL DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(state_id, name)
);

-- Profiles Table (Master metadata linked directly to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    role user_role_enum NOT NULL DEFAULT 'user',
    status account_status_enum NOT NULL DEFAULT 'active',
    state_id UUID REFERENCES public.states(id) ON DELETE SET NULL,
    city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
    is_mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users Table (Recycle/Customer App Profile linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_waste_kg NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_rewards_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reward_points_balance INTEGER NOT NULL DEFAULT 0,
    status account_status_enum NOT NULL DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admins Table (Admin Panel User linked to auth.users & public.users)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    admin_type user_role_enum NOT NULL DEFAULT 'regional_admin',
    assigned_state_id UUID REFERENCES public.states(id) ON DELETE SET NULL,
    assigned_city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
    status account_status_enum NOT NULL DEFAULT 'active',
    permissions JSONB DEFAULT '[]'::jsonb,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Businesses Table (Business Portal Entity linked to auth.users & public.users)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE,
    tax_id VARCHAR(100),
    license_url TEXT,
    address TEXT,
    city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
    state_id UUID REFERENCES public.states(id) ON DELETE SET NULL,
    verification_status business_verification_status NOT NULL DEFAULT 'pending',
    status account_status_enum NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    total_waste_collected_kg NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_payouts NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    store_visit_count INTEGER NOT NULL DEFAULT 0,
    redemption_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Super Admins Table (Super Admin Panel linked to auth.users & public.users)
CREATE TABLE IF NOT EXISTS public.super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status account_status_enum NOT NULL DEFAULT 'active',
    permissions JSONB DEFAULT '["*"]'::jsonb,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. RBAC & ORGANIZATIONS TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    status account_status_enum NOT NULL DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    status account_status_enum NOT NULL DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(feature, action)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(profile_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    status account_status_enum NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. WASTE & REWARDS TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.waste_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name waste_category_enum NOT NULL UNIQUE,
    points_per_kg INTEGER NOT NULL DEFAULT 10,
    price_per_kg NUMERIC(8, 2) NOT NULL DEFAULT 5.00,
    icon_name VARCHAR(50) DEFAULT 'Recycle',
    description TEXT,
    status account_status_enum NOT NULL DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.waste_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES public.waste_categories(id) ON DELETE RESTRICT,
    weight_kg NUMERIC(10, 2) NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,
    payout_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    image_url TEXT,
    status business_verification_status NOT NULL DEFAULT 'pending',
    ai_verification_result JSONB,
    admin_review_notes TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.points_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    points INTEGER NOT NULL,
    description TEXT,
    reference_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    points_balance INTEGER NOT NULL DEFAULT 0,
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    lifetime_redeemed INTEGER NOT NULL DEFAULT 0,
    status account_status_enum NOT NULL DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. BUSINESS MARKETING & COUPONS TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    discount_amount NUMERIC(10, 2) NOT NULL,
    max_uses INTEGER DEFAULT 100,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    status account_status_enum NOT NULL DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    spent_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    status account_status_enum NOT NULL DEFAULT 'active',
    metrics JSONB DEFAULT '{}'::jsonb,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    verified_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
    redemption_code VARCHAR(50) NOT NULL UNIQUE,
    status business_verification_status NOT NULL DEFAULT 'pending',
    points_spent INTEGER NOT NULL,
    discount_amount NUMERIC(10, 2) NOT NULL,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    type transaction_type_enum NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    points INTEGER DEFAULT 0,
    description TEXT,
    reference_id VARCHAR(100),
    status account_status_enum NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.store_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    redemption_id UUID REFERENCES public.coupon_redemptions(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
    visit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. SUPPORT, NOTIFICATIONS & AUDIT LOGS TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    priority ticket_priority_enum NOT NULL DEFAULT 'medium',
    status ticket_status_enum NOT NULL DEFAULT 'open',
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role user_role_enum,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'in_app',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    status account_status_enum NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.business_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100) NOT NULL,
    target_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. ADMIN SECURITY & MONITORING TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    otp_code VARCHAR(10) NOT NULL,
    otp_purpose VARCHAR(100) NOT NULL DEFAULT 'mfa',
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_login_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.admins(id) ON DELETE CASCADE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_status VARCHAR(50) NOT NULL DEFAULT 'success',
    failure_reason TEXT,
    login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.business_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    verification_status business_verification_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    status account_status_enum NOT NULL DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.business_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status business_verification_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. SUPER ADMIN CONTROL & CONFIG TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.super_admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rules JSONB DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES public.super_admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.global_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_audience user_role_enum DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.super_admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_management (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID NOT NULL REFERENCES public.super_admins(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.business_management (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID NOT NULL REFERENCES public.super_admins(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. BACKWARD COMPATIBILITY VIEWS & SYNCS
-- ----------------------------------------------------------------------------

-- View/Alias: waste_uploads -> waste_submissions
CREATE OR REPLACE VIEW public.waste_uploads AS
SELECT
    id,
    user_id,
    business_id,
    category_id,
    weight_kg,
    points_earned,
    payout_amount,
    image_url,
    status,
    verified_by AS verified_by,
    admin_review_notes AS notes,
    created_by,
    updated_by,
    created_at,
    updated_at
FROM public.waste_submissions;

-- View/Alias: reward_history -> points_history
CREATE OR REPLACE VIEW public.reward_history AS
SELECT
    id,
    user_id AS profile_id,
    action_type,
    points,
    description,
    'active'::account_status_enum AS status,
    NULL::uuid AS created_by,
    NULL::uuid AS updated_by,
    created_at,
    updated_at
FROM public.points_history;

-- View/Alias: reports -> support_tickets
CREATE OR REPLACE VIEW public.reports AS
SELECT
    id,
    user_id AS reporter_id,
    'user'::varchar AS reported_entity_type,
    user_id AS reported_entity_id,
    subject,
    description,
    resolution_notes,
    assigned_admin_id AS resolved_by,
    CASE 
        WHEN status = 'resolved' THEN 'approved'::business_verification_status 
        WHEN status = 'closed' THEN 'rejected'::business_verification_status 
        ELSE 'pending'::business_verification_status 
    END AS status,
    NULL::uuid AS created_by,
    NULL::uuid AS updated_by,
    created_at,
    updated_at
FROM public.support_tickets;

-- View/Alias: transactions -> reward_transactions
CREATE OR REPLACE VIEW public.transactions AS
SELECT
    id,
    user_id AS profile_id,
    business_id,
    type,
    amount,
    points,
    description,
    reference_id,
    status,
    NULL::uuid AS created_by,
    NULL::uuid AS updated_by,
    created_at,
    updated_at
FROM public.reward_transactions;

-- View/Alias: activity_logs -> audit_logs
CREATE OR REPLACE VIEW public.activity_logs AS
SELECT
    id,
    actor_id AS profile_id,
    action AS activity_type,
    action || ' on ' || target_entity AS description,
    payload AS metadata,
    'active'::account_status_enum AS status,
    NULL::uuid AS created_by,
    NULL::uuid AS updated_by,
    created_at,
    created_at AS updated_at
FROM public.audit_logs;

-- Synced Settings Table (for existing legacy components querying public.settings)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    status account_status_enum NOT NULL DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. AUTOMATED TRIGGERS & FUNCTIONS
-- ----------------------------------------------------------------------------

-- A. Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all mutable tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT c.table_name 
        FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        WHERE c.table_schema = 'public' AND c.column_name = 'updated_at' AND t.table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_update_updated_at ON public.%I', t);
        EXECUTE format('CREATE TRIGGER trg_update_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
    END LOOP;
END $$;

-- B. User Registration Trigger (Triggered when new user signs up in auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role user_role_enum := 'user';
    v_full_name text;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
        BEGIN
            v_role := (NEW.raw_user_meta_data->>'role')::user_role_enum;
        EXCEPTION WHEN OTHERS THEN
            v_role := 'user';
        END;
    END IF;

    -- 1. Create Profiles record
    BEGIN
        INSERT INTO public.profiles (id, email, full_name, role, status)
        VALUES (NEW.id, NEW.email, v_full_name, v_role, 'active')
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed creating profile: %', SQLERRM;
    END;

    -- 2. Create Users record
    BEGIN
        INSERT INTO public.users (id, auth_user_id, profile_id, status)
        VALUES (NEW.id, NEW.id, NEW.id, 'active')
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed creating user: %', SQLERRM;
    END;

    -- 3. Create Reward Points record
    BEGIN
        INSERT INTO public.reward_points (profile_id, points_balance, lifetime_earned, lifetime_redeemed)
        VALUES (NEW.id, 0, 0, 0)
        ON CONFLICT (profile_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed creating reward_points: %', SQLERRM;
    END;

    -- 4. Create Welcome Notification
    BEGIN
        INSERT INTO public.notifications (user_id, auth_user_id, title, message, channel)
        VALUES (NEW.id, NEW.id, 'Welcome to Trash2Treasure!', 'Your account has been created successfully. Start recycling today to earn points.', 'in_app');
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed creating notification: %', SQLERRM;
    END;

    -- 5. Create Audit Log
    BEGIN
        INSERT INTO public.audit_logs (actor_id, actor_role, action, target_entity, target_id, payload)
        VALUES (NEW.id, v_role::text, 'USER_REGISTERED', 'users', NEW.id, jsonb_build_object('email', NEW.email, 'role', v_role));
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed creating audit_log: %', SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_auth_user global error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- C. Waste Submission Verification Trigger
CREATE OR REPLACE FUNCTION public.handle_waste_submission_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- Execute only when status transitions to 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Update user points balance and total waste submitted
        UPDATE public.users
        SET reward_points_balance = reward_points_balance + NEW.points_earned,
            total_rewards_earned = total_rewards_earned + NEW.points_earned,
            total_waste_kg = total_waste_kg + NEW.weight_kg
        WHERE id = NEW.user_id;

        -- Update reward points profile balance
        UPDATE public.reward_points
        SET points_balance = points_balance + NEW.points_earned,
            lifetime_earned = lifetime_earned + NEW.points_earned
        WHERE profile_id = NEW.user_id;

        -- If linked to a business, update business waste total
        IF NEW.business_id IS NOT NULL THEN
            UPDATE public.businesses
            SET total_waste_collected_kg = total_waste_collected_kg + NEW.weight_kg
            WHERE id = NEW.business_id;
        END IF;

        -- Record in points_history
        INSERT INTO public.points_history (user_id, action_type, points, description, reference_id)
        VALUES (NEW.user_id, 'WASTE_VERIFIED', NEW.points_earned, format('Earned points for %s kg waste collection', NEW.weight_kg), NEW.id::text);

        -- Record in reward_transactions
        INSERT INTO public.reward_transactions (user_id, business_id, type, amount, points, description, reference_id)
        VALUES (NEW.user_id, NEW.business_id, 'credit', NEW.payout_amount, NEW.points_earned, format('Waste deposit verified: %s kg', NEW.weight_kg), NEW.id::text);

        -- Emit Notification
        INSERT INTO public.notifications (user_id, title, message, channel)
        VALUES (NEW.user_id, 'Waste Verification Approved!', format('Your deposit of %s kg waste was verified. You earned %s points!', NEW.weight_kg, NEW.points_earned), 'in_app');

        -- Log Audit
        INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, payload)
        VALUES (NEW.verified_by, 'VERIFY_WASTE_SUBMISSION', 'waste_submissions', NEW.id, jsonb_build_object('weight_kg', NEW.weight_kg, 'points', NEW.points_earned));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_waste_submission_verified ON public.waste_submissions;
CREATE TRIGGER trg_waste_submission_verified
    AFTER UPDATE ON public.waste_submissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_waste_submission_verification();

-- D. Coupon Redemption Trigger
CREATE OR REPLACE FUNCTION public.handle_coupon_redemption()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Increment coupon used count
        UPDATE public.coupons
        SET used_count = used_count + 1
        WHERE id = NEW.coupon_id;

        -- Deduct user points balance
        UPDATE public.users
        SET reward_points_balance = GREATEST(0, reward_points_balance - NEW.points_spent)
        WHERE id = NEW.user_id;

        UPDATE public.reward_points
        SET points_balance = GREATEST(0, points_balance - NEW.points_spent),
            lifetime_redeemed = lifetime_redeemed + NEW.points_spent
        WHERE profile_id = NEW.user_id;

        -- Increment business redemptions count
        IF NEW.business_id IS NOT NULL THEN
            UPDATE public.businesses
            SET redemption_count = redemption_count + 1
            WHERE id = NEW.business_id;

            -- Create Store Visit Record automatically
            INSERT INTO public.store_visits (user_id, business_id, redemption_id, verified_by, notes)
            VALUES (NEW.user_id, NEW.business_id, NEW.id, NEW.verified_by, 'Auto-recorded via coupon redemption');

            -- Create Business Notification
            INSERT INTO public.business_notifications (business_id, title, message)
            VALUES (NEW.business_id, 'New Coupon Redemption', format('Coupon %s redeemed by user', NEW.redemption_code));
        END IF;

        -- Record Points History
        INSERT INTO public.points_history (user_id, action_type, points, description, reference_id)
        VALUES (NEW.user_id, 'COUPON_REDEEMED', -NEW.points_spent, format('Redeemed coupon code %s', NEW.redemption_code), NEW.id::text);

        -- Emit Notification to User
        INSERT INTO public.notifications (user_id, title, message)
        VALUES (NEW.user_id, 'Coupon Redeemed Successfully', format('Your redemption for coupon code %s was completed.', NEW.redemption_code));

        -- Audit Log
        INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, payload)
        VALUES (NEW.user_id, 'REDEEM_COUPON', 'coupon_redemptions', NEW.id, jsonb_build_object('code', NEW.redemption_code, 'points_spent', NEW.points_spent));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_coupon_redemption ON public.coupon_redemptions;
CREATE TRIGGER trg_coupon_redemption
    AFTER UPDATE ON public.coupon_redemptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_coupon_redemption();

-- E. Store Visit Trigger
CREATE OR REPLACE FUNCTION public.handle_store_visit_created()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.businesses
    SET store_visit_count = store_visit_count + 1
    WHERE id = NEW.business_id;

    INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id)
    VALUES (NEW.user_id, 'STORE_VISIT_RECORDED', 'store_visits', NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_store_visit_created ON public.store_visits;
CREATE TRIGGER trg_store_visit_created
    AFTER INSERT ON public.store_visits
    FOR EACH ROW EXECUTE FUNCTION public.handle_store_visit_created();

-- ----------------------------------------------------------------------------
-- 12. RPC FUNCTIONS
-- ----------------------------------------------------------------------------

-- 1. verify_waste_submission()
CREATE OR REPLACE FUNCTION public.verify_waste_submission(
    p_submission_id UUID,
    p_admin_id UUID,
    p_status VARCHAR,
    p_weight_kg NUMERIC DEFAULT NULL,
    p_points INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_sub public.waste_submissions%ROWTYPE;
    v_cat public.waste_categories%ROWTYPE;
    v_final_weight NUMERIC;
    v_final_points INTEGER;
    v_payout NUMERIC;
BEGIN
    SELECT * INTO v_sub FROM public.waste_submissions WHERE id = p_submission_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Waste submission with ID % not found', p_submission_id;
    END IF;

    SELECT * INTO v_cat FROM public.waste_categories WHERE id = v_sub.category_id;

    v_final_weight := COALESCE(p_weight_kg, v_sub.weight_kg);
    v_final_points := COALESCE(p_points, (v_final_weight * v_cat.points_per_kg)::integer);
    v_payout := (v_final_weight * v_cat.price_per_kg);

    UPDATE public.waste_submissions
    SET status = p_status::business_verification_status,
        verified_by = p_admin_id,
        weight_kg = v_final_weight,
        points_earned = v_final_points,
        payout_amount = v_payout,
        admin_review_notes = COALESCE(p_notes, admin_review_notes)
    WHERE id = p_submission_id;

    RETURN jsonb_build_object(
        'success', true,
        'submission_id', p_submission_id,
        'status', p_status,
        'points_earned', v_final_points,
        'payout_amount', v_payout
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. approve_business()
CREATE OR REPLACE FUNCTION public.approve_business(
    p_business_id UUID,
    p_admin_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_biz public.businesses%ROWTYPE;
BEGIN
    SELECT * INTO v_biz FROM public.businesses WHERE id = p_business_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business with ID % not found', p_business_id;
    END IF;

    UPDATE public.businesses
    SET verification_status = 'approved',
        status = 'active',
        approved_by = p_admin_id
    WHERE id = p_business_id;

    IF v_biz.auth_user_id IS NOT NULL THEN
        UPDATE public.profiles SET status = 'active' WHERE id = v_biz.auth_user_id;
    END IF;

    INSERT INTO public.business_verifications (business_id, reviewed_by, status, notes)
    VALUES (p_business_id, p_admin_id, 'approved', p_notes);

    INSERT INTO public.business_notifications (business_id, title, message)
    VALUES (p_business_id, 'Business Account Approved!', 'Your business profile has been approved. You can now publish campaigns and verify customer coupons.');

    INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, payload)
    VALUES (p_admin_id, 'APPROVE_BUSINESS', 'businesses', p_business_id, jsonb_build_object('notes', p_notes));

    RETURN jsonb_build_object('success', true, 'business_id', p_business_id, 'status', 'approved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. reject_business()
CREATE OR REPLACE FUNCTION public.reject_business(
    p_business_id UUID,
    p_admin_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.businesses
    SET verification_status = 'rejected',
        status = 'rejected',
        rejection_reason = p_reason
    WHERE id = p_business_id;

    INSERT INTO public.business_verifications (business_id, reviewed_by, status, notes)
    VALUES (p_business_id, p_admin_id, 'rejected', p_reason);

    INSERT INTO public.business_notifications (business_id, title, message)
    VALUES (p_business_id, 'Business Application Status Update', format('Your business application was rejected. Reason: %s', p_reason));

    INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, payload)
    VALUES (p_admin_id, 'REJECT_BUSINESS', 'businesses', p_business_id, jsonb_build_object('reason', p_reason));

    RETURN jsonb_build_object('success', true, 'business_id', p_business_id, 'status', 'rejected');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. redeem_coupon()
CREATE OR REPLACE FUNCTION public.redeem_coupon(
    p_user_id UUID,
    p_coupon_id UUID,
    p_verified_by_admin_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_coupon public.coupons%ROWTYPE;
    v_user public.users%ROWTYPE;
    v_redemption_id UUID := gen_random_uuid();
    v_code VARCHAR(50);
BEGIN
    SELECT * INTO v_coupon FROM public.coupons WHERE id = p_coupon_id AND status = 'active';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Coupon not found or inactive';
    END IF;

    IF v_coupon.used_count >= v_coupon.max_uses THEN
        RAISE EXCEPTION 'Coupon usage limit reached';
    END IF;

    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
    IF v_user.reward_points_balance < v_coupon.points_required THEN
        RAISE EXCEPTION 'Insufficient points balance';
    END IF;

    v_code := 'RED-' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8));

    INSERT INTO public.coupon_redemptions (
        id, coupon_id, user_id, business_id, verified_by, redemption_code, status, points_spent, discount_amount
    )
    VALUES (
        v_redemption_id, p_coupon_id, p_user_id, v_coupon.business_id, p_verified_by_admin_id, v_code, 'approved', v_coupon.points_required, v_coupon.discount_amount
    );

    RETURN jsonb_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'redemption_code', v_code,
        'discount_amount', v_coupon.discount_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. award_points()
CREATE OR REPLACE FUNCTION public.award_points(
    p_user_id UUID,
    p_points INTEGER,
    p_reason TEXT,
    p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.users
    SET reward_points_balance = reward_points_balance + p_points,
        total_rewards_earned = total_rewards_earned + p_points
    WHERE id = p_user_id;

    UPDATE public.reward_points
    SET points_balance = points_balance + p_points,
        lifetime_earned = lifetime_earned + p_points
    WHERE profile_id = p_user_id;

    INSERT INTO public.points_history (user_id, action_type, points, description)
    VALUES (p_user_id, 'MANUAL_AWARD', p_points, p_reason);

    INSERT INTO public.notifications (user_id, title, message)
    VALUES (p_user_id, 'Bonus Points Awarded!', format('You received %s bonus points. Reason: %s', p_points, p_reason));

    INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, payload)
    VALUES (p_admin_id, 'AWARD_POINTS', 'users', p_user_id, jsonb_build_object('points', p_points, 'reason', p_reason));

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'points_awarded', p_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. create_admin()
CREATE OR REPLACE FUNCTION public.create_admin(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_admin_type TEXT DEFAULT 'regional_admin',
    p_created_by_super_admin_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_new_auth_id UUID;
    v_admin_id UUID := gen_random_uuid();
BEGIN
    v_new_auth_id := gen_random_uuid();

    -- Insert profile
    INSERT INTO public.profiles (id, email, full_name, role, status)
    VALUES (v_new_auth_id, p_email, p_full_name, p_admin_type::user_role_enum, 'active');

    -- Insert user
    INSERT INTO public.users (id, auth_user_id, profile_id, status)
    VALUES (v_new_auth_id, v_new_auth_id, v_new_auth_id, 'active');

    -- Insert admin record
    INSERT INTO public.admins (id, auth_user_id, user_id, profile_id, admin_type, status, created_by)
    VALUES (v_admin_id, v_new_auth_id, v_new_auth_id, v_new_auth_id, p_admin_type::user_role_enum, 'active', p_created_by_super_admin_id);

    IF p_created_by_super_admin_id IS NOT NULL THEN
        INSERT INTO public.admin_management (super_admin_id, admin_id, action, notes)
        VALUES (p_created_by_super_admin_id, v_admin_id, 'CREATE_ADMIN', format('Created %s for %s', p_admin_type, p_email));
    END IF;

    INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, payload)
    VALUES (p_created_by_super_admin_id, 'CREATE_ADMIN', 'admins', v_admin_id, jsonb_build_object('email', p_email, 'type', p_admin_type));

    RETURN jsonb_build_object('success', true, 'admin_id', v_admin_id, 'auth_user_id', v_new_auth_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. create_business()
CREATE OR REPLACE FUNCTION public.create_business(
    p_email TEXT,
    p_password TEXT,
    p_company_name TEXT,
    p_registration_number TEXT DEFAULT NULL,
    p_tax_id TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_auth_id UUID := gen_random_uuid();
    v_biz_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, status)
    VALUES (v_auth_id, p_email, p_company_name, 'business', 'pending');

    INSERT INTO public.users (id, auth_user_id, profile_id, status)
    VALUES (v_auth_id, v_auth_id, v_auth_id, 'pending');

    INSERT INTO public.businesses (
        id, auth_user_id, user_id, profile_id, company_name, registration_number, tax_id, address, verification_status, status
    )
    VALUES (
        v_biz_id, v_auth_id, v_auth_id, v_auth_id, p_company_name, p_registration_number, p_tax_id, p_address, 'pending', 'pending'
    );

    INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, payload)
    VALUES (v_auth_id, 'REGISTER_BUSINESS', 'businesses', v_biz_id, jsonb_build_object('company_name', p_company_name, 'email', p_email));

    RETURN jsonb_build_object('success', true, 'business_id', v_biz_id, 'auth_user_id', v_auth_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. suspend_user()
CREATE OR REPLACE FUNCTION public.suspend_user(
    p_user_id UUID,
    p_admin_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.users SET status = 'suspended' WHERE id = p_user_id;
    UPDATE public.profiles SET status = 'suspended' WHERE id = p_user_id;

    INSERT INTO public.notifications (user_id, title, message)
    VALUES (p_user_id, 'Account Suspended', format('Your account has been suspended. Reason: %s', COALESCE(p_reason, 'Policy violation')));

    INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, payload)
    VALUES (p_admin_id, 'SUSPEND_USER', 'users', p_user_id, jsonb_build_object('reason', p_reason));

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'status', 'suspended');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. suspend_business()
CREATE OR REPLACE FUNCTION public.suspend_business(
    p_business_id UUID,
    p_admin_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_biz public.businesses%ROWTYPE;
BEGIN
    SELECT * INTO v_biz FROM public.businesses WHERE id = p_business_id;

    UPDATE public.businesses SET status = 'suspended' WHERE id = p_business_id;
    IF v_biz.auth_user_id IS NOT NULL THEN
        UPDATE public.profiles SET status = 'suspended' WHERE id = v_biz.auth_user_id;
    END IF;

    INSERT INTO public.business_notifications (business_id, title, message)
    VALUES (p_business_id, 'Business Account Suspended', format('Your account has been suspended. Reason: %s', COALESCE(p_reason, 'Administrative decision')));

    INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, payload)
    VALUES (p_admin_id, 'SUSPEND_BUSINESS', 'businesses', p_business_id, jsonb_build_object('reason', p_reason));

    RETURN jsonb_build_object('success', true, 'business_id', p_business_id, 'status', 'suspended');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. delete_business()
CREATE OR REPLACE FUNCTION public.delete_business(
    p_business_id UUID,
    p_admin_id UUID
)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.businesses SET status = 'banned' WHERE id = p_business_id;

    INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id)
    VALUES (p_admin_id, 'DELETE_BUSINESS', 'businesses', p_business_id);

    RETURN jsonb_build_object('success', true, 'business_id', p_business_id, 'status', 'banned');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. lock_admin()
CREATE OR REPLACE FUNCTION public.lock_admin(
    p_admin_id UUID,
    p_super_admin_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_adm public.admins%ROWTYPE;
BEGIN
    SELECT * INTO v_adm FROM public.admins WHERE id = p_admin_id;
    UPDATE public.admins SET status = 'suspended' WHERE id = p_admin_id;

    IF v_adm.auth_user_id IS NOT NULL THEN
        UPDATE public.profiles SET status = 'suspended' WHERE id = v_adm.auth_user_id;
    END IF;

    INSERT INTO public.admin_management (super_admin_id, admin_id, action, notes)
    VALUES (p_super_admin_id, p_admin_id, 'LOCK_ADMIN', p_reason);

    INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, payload)
    VALUES (p_super_admin_id, 'LOCK_ADMIN', 'admins', p_admin_id, jsonb_build_object('reason', p_reason));

    RETURN jsonb_build_object('success', true, 'admin_id', p_admin_id, 'status', 'suspended');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. unlock_admin()
CREATE OR REPLACE FUNCTION public.unlock_admin(
    p_admin_id UUID,
    p_super_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_adm public.admins%ROWTYPE;
BEGIN
    SELECT * INTO v_adm FROM public.admins WHERE id = p_admin_id;
    UPDATE public.admins SET status = 'active' WHERE id = p_admin_id;

    IF v_adm.auth_user_id IS NOT NULL THEN
        UPDATE public.profiles SET status = 'active' WHERE id = v_adm.auth_user_id;
    END IF;

    INSERT INTO public.admin_management (super_admin_id, admin_id, action, notes)
    VALUES (p_super_admin_id, p_admin_id, 'UNLOCK_ADMIN', 'Account unlocked by Super Admin');

    INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id)
    VALUES (p_super_admin_id, 'UNLOCK_ADMIN', 'admins', p_admin_id);

    RETURN jsonb_build_object('success', true, 'admin_id', p_admin_id, 'status', 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. create_notification()
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_role VARCHAR DEFAULT NULL,
    p_title TEXT DEFAULT 'Notification',
    p_message TEXT DEFAULT '',
    p_channel VARCHAR DEFAULT 'in_app'
)
RETURNS JSONB AS $$
DECLARE
    v_notif_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO public.notifications (id, user_id, auth_user_id, target_role, title, message, channel)
    VALUES (v_notif_id, p_user_id, p_user_id, p_role::user_role_enum, p_title, p_message, p_channel);

    RETURN jsonb_build_object('success', true, 'notification_id', v_notif_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. system_statistics()
CREATE OR REPLACE FUNCTION public.system_statistics()
RETURNS JSONB AS $$
DECLARE
    v_total_users BIGINT;
    v_active_users BIGINT;
    v_total_businesses BIGINT;
    v_pending_businesses BIGINT;
    v_total_admins BIGINT;
    v_total_waste_kg NUMERIC;
    v_total_points BIGINT;
    v_total_coupons BIGINT;
    v_total_redemptions BIGINT;
    v_total_revenue NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total_users FROM public.users;
    SELECT COUNT(*) FROM public.users WHERE status = 'active' INTO v_active_users;
    SELECT COUNT(*) INTO v_total_businesses FROM public.businesses;
    SELECT COUNT(*) FROM public.businesses WHERE verification_status = 'pending' INTO v_pending_businesses;
    SELECT COUNT(*) INTO v_total_admins FROM public.admins;
    SELECT COALESCE(SUM(total_waste_kg), 0) INTO v_total_waste_kg FROM public.users;
    SELECT COALESCE(SUM(reward_points_balance), 0) INTO v_total_points FROM public.users;
    SELECT COUNT(*) INTO v_total_coupons FROM public.coupons;
    SELECT COUNT(*) INTO v_total_redemptions FROM public.coupon_redemptions;
    SELECT COALESCE(SUM(total_revenue), 0) INTO v_total_revenue FROM public.businesses;

    RETURN jsonb_build_object(
        'total_users', v_total_users,
        'active_users', v_active_users,
        'total_businesses', v_total_businesses,
        'pending_businesses', v_pending_businesses,
        'total_admins', v_total_admins,
        'total_waste_kg', v_total_waste_kg,
        'total_points_awarded', v_total_points,
        'total_coupons', v_total_coupons,
        'total_redemptions', v_total_redemptions,
        'total_revenue', v_total_revenue
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. impersonate_account()
CREATE OR REPLACE FUNCTION public.impersonate_account(
    p_target_auth_user_id UUID,
    p_super_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_prof public.profiles%ROWTYPE;
BEGIN
    -- Verify caller is super admin
    IF NOT EXISTS (SELECT 1 FROM public.super_admins WHERE auth_user_id = p_super_admin_id AND status = 'active') THEN
        RAISE EXCEPTION 'Access denied: caller is not an active Super Admin';
    END IF;

    SELECT * INTO v_prof FROM public.profiles WHERE id = p_target_auth_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    -- Audit trail log for security
    INSERT INTO public.audit_logs (actor_id, actor_role, action, target_entity, target_id, payload)
    VALUES (
        p_super_admin_id, 'super_admin', 'SUPER_ADMIN_IMPERSONATION', 'auth.users', p_target_auth_user_id,
        jsonb_build_object('target_email', v_prof.email, 'target_role', v_prof.role)
    );

    RETURN jsonb_build_object(
        'success', true,
        'target_user_id', p_target_auth_user_id,
        'email', v_prof.email,
        'role', v_prof.role,
        'impersonated_by', p_super_admin_id,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 13. ANALYTICS VIEWS
-- ----------------------------------------------------------------------------

-- 1. view_system_dashboard
CREATE OR REPLACE VIEW public.view_system_dashboard AS
SELECT
    (SELECT COUNT(*) FROM public.users) AS total_users,
    (SELECT COUNT(*) FROM public.users WHERE status = 'active') AS active_users,
    (SELECT COUNT(*) FROM public.businesses) AS total_businesses,
    (SELECT COUNT(*) FROM public.businesses WHERE verification_status = 'pending') AS pending_businesses,
    (SELECT COUNT(*) FROM public.admins) AS total_admins,
    (SELECT COALESCE(SUM(weight_kg), 0) FROM public.waste_submissions WHERE status = 'approved') AS total_waste_collected_kg,
    (SELECT COALESCE(SUM(points_earned), 0) FROM public.waste_submissions WHERE status = 'approved') AS total_points_issued,
    (SELECT COUNT(*) FROM public.coupon_redemptions WHERE status = 'approved') AS total_coupon_redemptions,
    (SELECT COALESCE(SUM(amount), 0) FROM public.reward_transactions WHERE type = 'payout') AS total_payouts_distributed;

-- 2. view_business_dashboard
CREATE OR REPLACE VIEW public.view_business_dashboard AS
SELECT
    b.id AS business_id,
    b.company_name,
    b.verification_status,
    b.total_waste_collected_kg,
    b.total_revenue,
    b.store_visit_count,
    b.redemption_count,
    COUNT(DISTINCT c.id) AS active_coupons_count,
    COUNT(DISTINCT camp.id) AS active_campaigns_count
FROM public.businesses b
LEFT JOIN public.coupons c ON c.business_id = b.id AND c.status = 'active'
LEFT JOIN public.campaigns camp ON camp.business_id = b.id AND camp.status = 'active'
GROUP BY b.id, b.company_name, b.verification_status, b.total_waste_collected_kg, b.total_revenue, b.store_visit_count, b.redemption_count;

-- 3. view_admin_dashboard
CREATE OR REPLACE VIEW public.view_admin_dashboard AS
SELECT
    (SELECT COUNT(*) FROM public.waste_submissions WHERE status = 'pending') AS pending_waste_reviews,
    (SELECT COUNT(*) FROM public.businesses WHERE verification_status = 'pending') AS pending_business_verifications,
    (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'open') AS open_support_tickets,
    (SELECT COUNT(*) FROM public.coupon_redemptions WHERE status = 'pending') AS pending_coupon_verifications;

-- 4. view_user_dashboard
CREATE OR REPLACE VIEW public.view_user_dashboard AS
SELECT
    u.id AS user_id,
    p.email,
    p.full_name,
    u.total_waste_kg,
    u.total_rewards_earned,
    u.reward_points_balance,
    (SELECT COUNT(*) FROM public.waste_submissions ws WHERE ws.user_id = u.id) AS total_submissions_count,
    (SELECT COUNT(*) FROM public.coupon_redemptions cr WHERE cr.user_id = u.id) AS total_redemptions_count
FROM public.users u
JOIN public.profiles p ON p.id = u.id;

-- 5. view_revenue_analytics
CREATE OR REPLACE VIEW public.view_revenue_analytics AS
SELECT
    DATE_TRUNC('day', created_at) AS date,
    type,
    SUM(amount) AS total_amount,
    COUNT(*) AS transaction_count
FROM public.reward_transactions
GROUP BY DATE_TRUNC('day', created_at), type
ORDER BY date DESC;

-- 6. view_points_analytics
CREATE OR REPLACE VIEW public.view_points_analytics AS
SELECT
    DATE_TRUNC('day', created_at) AS date,
    action_type,
    SUM(points) AS total_points,
    COUNT(*) AS total_events
FROM public.points_history
GROUP BY DATE_TRUNC('day', created_at), action_type
ORDER BY date DESC;

-- 7. view_waste_collection_analytics
CREATE OR REPLACE VIEW public.view_waste_collection_analytics AS
SELECT
    wc.name AS category_name,
    COUNT(ws.id) AS total_submissions,
    COALESCE(SUM(ws.weight_kg), 0) AS total_weight_kg,
    COALESCE(SUM(ws.points_earned), 0) AS total_points_issued,
    COALESCE(SUM(ws.payout_amount), 0) AS total_payout_amount
FROM public.waste_categories wc
LEFT JOIN public.waste_submissions ws ON ws.category_id = wc.id AND ws.status = 'approved'
GROUP BY wc.id, wc.name;

-- 8. view_campaign_performance
CREATE OR REPLACE VIEW public.view_campaign_performance AS
SELECT
    camp.id AS campaign_id,
    camp.title,
    b.company_name,
    camp.budget,
    camp.spent_amount,
    camp.status,
    camp.start_date,
    camp.end_date
FROM public.campaigns camp
JOIN public.businesses b ON b.id = camp.business_id;

-- 9. view_coupon_usage
CREATE OR REPLACE VIEW public.view_coupon_usage AS
SELECT
    c.id AS coupon_id,
    c.code,
    c.title,
    b.company_name,
    c.points_required,
    c.discount_amount,
    c.max_uses,
    c.used_count,
    c.status,
    c.expires_at
FROM public.coupons c
JOIN public.businesses b ON b.id = c.business_id;

-- 10. view_store_visits
CREATE OR REPLACE VIEW public.view_store_visits AS
SELECT
    sv.id AS visit_id,
    sv.visit_date,
    b.company_name,
    p.full_name AS user_name,
    p.email AS user_email,
    sv.notes
FROM public.store_visits sv
JOIN public.businesses b ON b.id = sv.business_id
JOIN public.profiles p ON p.id = sv.user_id;

-- 11. view_leaderboard
CREATE OR REPLACE VIEW public.view_leaderboard AS
SELECT
    u.id AS user_id,
    p.full_name,
    p.avatar_url,
    u.total_waste_kg,
    u.total_rewards_earned,
    RANK() OVER (ORDER BY u.total_waste_kg DESC) AS waste_rank,
    RANK() OVER (ORDER BY u.total_rewards_earned DESC) AS points_rank
FROM public.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.status = 'active'
LIMIT 100;

-- ----------------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- Helper Function: Check if current authenticated user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.super_admins
        WHERE auth_user_id = auth.uid() AND status = 'active'
    ) OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Function: Check if current authenticated user is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.admins
        WHERE auth_user_id = auth.uid() AND status = 'active'
    ) OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'regional_admin', 'business_admin', 'moderator', 'support') AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Function: Check if current authenticated user is Business
CREATE OR REPLACE FUNCTION public.is_business()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.businesses
        WHERE auth_user_id = auth.uid() AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
-- ADDITIONAL INTEGRATED TABLES & COMPATIBILITY MODULES
-- ----------------------------------------------------------------------------

-- Bins Table (Smart Recycling & Drop-off Locations)
CREATE TABLE IF NOT EXISTS public.bins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location_name VARCHAR(255),
    address TEXT,
    city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
    state_id UUID REFERENCES public.states(id) ON DELETE SET NULL,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    capacity_kg NUMERIC(10, 2) DEFAULT 100.00,
    current_fill_level_kg NUMERIC(10, 2) DEFAULT 0.00,
    status account_status_enum NOT NULL DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket Messages Table (Support Ticket Conversation History)
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    attachment_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Impersonation Sessions Table (Super Admin Portal)
CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID NOT NULL REFERENCES public.super_admins(id) ON DELETE CASCADE,
    target_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rewards Table (Business & Platform Reward Items)
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    points_required INTEGER NOT NULL CHECK (points_required >= 0),
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    expiry TIMESTAMPTZ,
    status account_status_enum NOT NULL DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Redemption Requests Table (User Reward Claims)
CREATE TABLE IF NOT EXISTS public.redemption_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    voucher_code VARCHAR(100),
    points_spent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reward History Table
-- (Note: public.reward_history is defined as a backward-compatibility view below)

-- Financial & Points Transactions Table
-- (Note: public.transactions is defined as a backward-compatibility view below)

-- Activity Logs Table
-- (Note: public.activity_logs is defined as a backward-compatibility view below)

-- Waste Uploads Table
-- (Note: public.waste_uploads is defined as a backward-compatibility view below)

-- System & User Reports Table
-- (Note: public.reports is defined as a backward-compatibility view below)

-- OTP Codes Table
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    phone VARCHAR(50),
    email VARCHAR(255),
    code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'verification',
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Safely Enable RLS on all base tables
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END LOOP;
END $$;



-- Master Policies for Super Admin (Full Read/Write Access to ALL tables)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS super_admin_all_%I ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY super_admin_all_%I ON public.%I FOR ALL USING (public.is_super_admin())', tbl, tbl);
    END LOOP;
END $$;

-- Admin Policies for Operational Tables
CREATE POLICY admin_read_write_waste ON public.waste_submissions FOR ALL USING (public.is_admin());
CREATE POLICY admin_read_write_businesses ON public.businesses FOR ALL USING (public.is_admin());
CREATE POLICY admin_read_write_tickets ON public.support_tickets FOR ALL USING (public.is_admin());
CREATE POLICY admin_read_write_coupons ON public.coupons FOR ALL USING (public.is_admin());
CREATE POLICY admin_read_write_redemptions ON public.coupon_redemptions FOR ALL USING (public.is_admin());
CREATE POLICY admin_read_users ON public.users FOR SELECT USING (public.is_admin());
CREATE POLICY business_own_read_write ON public.businesses FOR ALL USING (auth_user_id = auth.uid());
CREATE POLICY business_coupons_rw ON public.coupons FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE auth_user_id = auth.uid())
);
CREATE POLICY business_campaigns_rw ON public.campaigns FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE auth_user_id = auth.uid())
);
CREATE POLICY business_redemptions_read ON public.coupon_redemptions FOR SELECT USING (
    business_id IN (SELECT id FROM public.businesses WHERE auth_user_id = auth.uid())
);
CREATE POLICY business_notifs_read ON public.business_notifications FOR SELECT USING (
    business_id IN (SELECT id FROM public.businesses WHERE auth_user_id = auth.uid())
);

-- User Policies
CREATE POLICY user_own_profile ON public.profiles FOR ALL USING (id = auth.uid());
CREATE POLICY user_own_data ON public.users FOR ALL USING (id = auth.uid() OR auth_user_id = auth.uid());
CREATE POLICY user_waste_submissions ON public.waste_submissions FOR ALL USING (user_id = auth.uid());
CREATE POLICY user_points_history ON public.points_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_coupon_redemptions ON public.coupon_redemptions FOR ALL USING (user_id = auth.uid());
CREATE POLICY user_support_tickets ON public.support_tickets FOR ALL USING (user_id = auth.uid());
CREATE POLICY user_notifications ON public.notifications FOR ALL USING (user_id = auth.uid() OR auth_user_id = auth.uid());
CREATE POLICY user_read_categories ON public.waste_categories FOR SELECT USING (true);
CREATE POLICY user_read_coupons ON public.coupons FOR SELECT USING (status = 'active');

-- ----------------------------------------------------------------------------
-- 15. STORAGE BUCKETS SETUP
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('waste-images', 'waste-images', true),
    ('business-licenses', 'business-licenses', false),
    ('avatars', 'avatars', true),
    ('campaign-media', 'campaign-media', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage Policies
CREATE POLICY "Public Read Access for waste-images" ON storage.objects FOR SELECT USING (bucket_id = 'waste-images');
CREATE POLICY "Auth Insert Access for waste-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'waste-images' AND auth.role() = 'authenticated');
CREATE POLICY "Public Read Access for avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth Insert Access for avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Public Read Access for campaign-media" ON storage.objects FOR SELECT USING (bucket_id = 'campaign-media');

-- ----------------------------------------------------------------------------
-- 16. INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_admins_auth_user_id ON public.admins(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_auth_user_id ON public.businesses(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_super_admins_auth_user_id ON public.super_admins(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_waste_submissions_user_id ON public.waste_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_waste_submissions_status ON public.waste_submissions(status);
CREATE INDEX IF NOT EXISTS idx_waste_submissions_verified_by ON public.waste_submissions(verified_by);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id ON public.coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_business_id ON public.coupon_redemptions(business_id);
CREATE INDEX IF NOT EXISTS idx_coupons_business_id ON public.coupons(business_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_business_id ON public.campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_business_id ON public.store_visits(business_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_user_id ON public.store_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Reload Schema Cache Notification
NOTIFY pgrst, 'reload schema';



-- ----------------------------------------------------------------------------
-- Backward Compatibility View for Legacy 'customers' Queries
CREATE OR REPLACE VIEW public.customers AS
SELECT 
    u.id,
    p.id AS auth_user_id,
    p.full_name,
    p.email,
    p.phone,
    p.avatar_url,
    u.reward_points_balance AS reward_points,
    c.name AS city,
    s.name AS state,
    'India' AS country,
    CASE 
        WHEN p.status = 'active' THEN 'ACTIVE'
        WHEN p.status = 'suspended' THEN 'SUSPENDED'
        ELSE 'INACTIVE'
    END AS status,
    NULL::uuid AS referred_by,
    p.last_login_at AS last_login,
    u.created_at,
    u.updated_at,
    NULL::timestamptz AS deleted_at
FROM public.users u
JOIN public.profiles p ON u.profile_id = p.id
LEFT JOIN public.cities c ON p.city_id = c.id
LEFT JOIN public.states s ON p.state_id = s.id;

