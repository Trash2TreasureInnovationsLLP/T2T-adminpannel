-- ============================================================================
-- TRASH2TREASURE (T2T) - PRODUCTION CENTRAL EMAIL SYSTEM DATABASE MIGRATION
-- Migration: 20260822000001_email_system_schema.sql
-- ============================================================================

-- 1. Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient VARCHAR(255) NOT NULL,
    sender VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    template VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general', -- auth, users, waste, ecopoints, rewards, pickups, bins, payments, admin, system, marketing
    provider VARCHAR(50) NOT NULL DEFAULT 'resend',
    provider_message_id VARCHAR(255),
    idempotency_key VARCHAR(255) UNIQUE,
    event_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, sent, delivered, failed, retrying, cancelled
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ
);

-- Indexes for fast query, queue processing, and reporting in Admin Email Center
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_category ON public.email_logs(category);
CREATE INDEX IF NOT EXISTS idx_email_logs_provider ON public.email_logs(provider);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON public.email_logs(template);
CREATE INDEX IF NOT EXISTS idx_email_logs_idempotency ON public.email_logs(idempotency_key);

-- Enable RLS on email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Service Role Policy (Full access for backend API & Server Actions)
DROP POLICY IF EXISTS "Service role full access on email_logs" ON public.email_logs;
CREATE POLICY "Service role full access on email_logs"
    ON public.email_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Admin read-only policy for dashboard Email Center
DROP POLICY IF EXISTS "Admins read email_logs" ON public.email_logs;
CREATE POLICY "Admins read email_logs"
    ON public.email_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admins
            WHERE admins.auth_user_id = auth.uid()
            AND admins.status = 'active'
        )
    );
