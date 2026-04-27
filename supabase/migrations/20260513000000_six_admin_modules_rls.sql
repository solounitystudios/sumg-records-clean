-- ============================================================
-- RLS for six admin modules
-- All tables are internal-only (no public read).
-- Policy: any authenticated user with an admin-tier role in
-- app_metadata may perform all operations.
-- Role array matches every other admin table in this repo.
-- Idempotent: safe to re-run.
-- ============================================================

-- ── Finance transactions ─────────────────────────────────────
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'finance_transactions'
      AND policyname  = 'admin_all_finance_transactions'
  ) THEN
    CREATE POLICY "admin_all_finance_transactions"
      ON finance_transactions FOR ALL
      USING (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      )
      WITH CHECK (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      );
  END IF;
END $$;

-- ── Publishing works ─────────────────────────────────────────
ALTER TABLE publishing_works ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'publishing_works'
      AND policyname  = 'admin_all_publishing_works'
  ) THEN
    CREATE POLICY "admin_all_publishing_works"
      ON publishing_works FOR ALL
      USING (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      )
      WITH CHECK (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      );
  END IF;
END $$;

-- ── Contracts ────────────────────────────────────────────────
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contracts'
      AND policyname  = 'admin_all_contracts'
  ) THEN
    CREATE POLICY "admin_all_contracts"
      ON contracts FOR ALL
      USING (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      )
      WITH CHECK (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      );
  END IF;
END $$;

-- ── Contract templates ───────────────────────────────────────
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contract_templates'
      AND policyname  = 'admin_all_contract_templates'
  ) THEN
    CREATE POLICY "admin_all_contract_templates"
      ON contract_templates FOR ALL
      USING (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      )
      WITH CHECK (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      );
  END IF;
END $$;

-- ── Documents ────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'documents'
      AND policyname  = 'admin_all_documents'
  ) THEN
    CREATE POLICY "admin_all_documents"
      ON documents FOR ALL
      USING (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      )
      WITH CHECK (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      );
  END IF;
END $$;

-- ── Message threads ──────────────────────────────────────────
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'message_threads'
      AND policyname  = 'admin_all_message_threads'
  ) THEN
    CREATE POLICY "admin_all_message_threads"
      ON message_threads FOR ALL
      USING (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      )
      WITH CHECK (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      );
  END IF;
END $$;

-- ── Message messages ─────────────────────────────────────────
ALTER TABLE message_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'message_messages'
      AND policyname  = 'admin_all_message_messages'
  ) THEN
    CREATE POLICY "admin_all_message_messages"
      ON message_messages FOR ALL
      USING (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      )
      WITH CHECK (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      );
  END IF;
END $$;

-- ── Admin tasks ──────────────────────────────────────────────
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'admin_tasks'
      AND policyname  = 'admin_all_admin_tasks'
  ) THEN
    CREATE POLICY "admin_all_admin_tasks"
      ON admin_tasks FOR ALL
      USING (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      )
      WITH CHECK (
        ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
          ARRAY['admin','editor','media_manager','release_manager']
        )
      );
  END IF;
END $$;
