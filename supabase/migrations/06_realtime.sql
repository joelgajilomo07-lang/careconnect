-- =====================================================================
-- CARECONNECT — REALTIME PUBLICATION SETUP
-- Migration: 06_realtime.sql
-- =====================================================================

-- Ensure notifications table broadcasts full row changes for realtime subscribers
alter table public.notifications replica identity full;

-- Add notifications to the supabase_realtime publication
alter publication supabase_realtime add table public.notifications;
