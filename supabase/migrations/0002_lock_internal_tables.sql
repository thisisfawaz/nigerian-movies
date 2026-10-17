-- Lock internal tables to the service role (PRD §12.2, §8.6, §8.7).
--
-- `ai_classification_runs` and `admin_audit_logs` are operational tables that
-- the public and authenticated roles must never read or write. Enabling RLS
-- with NO policies denies all access to anon/authenticated; the service role
-- bypasses RLS and retains full access from server-side admin code.

alter table public.ai_classification_runs enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Defense in depth: also revoke any default table grants from the API roles.
revoke all on public.ai_classification_runs from anon, authenticated;
revoke all on public.admin_audit_logs from anon, authenticated;

-- Explicitly deny (no policies = denied). We still drop any stray policies that
-- may have been created accidentally so the intent is unambiguous.
drop policy if exists "public read ai_classification_runs" on public.ai_classification_runs;
drop policy if exists "public read admin_audit_logs" on public.admin_audit_logs;
