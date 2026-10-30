-- Rádió69 – válaszüzenetek előzményei és főszerkesztői jogosultságok
-- Futtatás: Supabase Dashboard > SQL Editor > New query.
-- Csak a chief_editor szerepkörű, bejelentkezett felhasználó olvashatja és kezelheti.

BEGIN;

CREATE TABLE IF NOT EXISTS public.audience_message_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_message_id uuid NOT NULL
    REFERENCES public.audience_messages(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE RESTRICT,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sending'
    CHECK (status IN ('sending', 'sent', 'failed')),
  resend_email_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT audience_reply_recipient_length
    CHECK (char_length(recipient_email) BETWEEN 3 AND 160),
  CONSTRAINT audience_reply_subject_length
    CHECK (char_length(btrim(subject)) BETWEEN 3 AND 180),
  CONSTRAINT audience_reply_body_length
    CHECK (char_length(btrim(body)) BETWEEN 5 AND 5000)
);

CREATE INDEX IF NOT EXISTS audience_message_replies_message_created_idx
  ON public.audience_message_replies (audience_message_id, created_at DESC);

ALTER TABLE public.audience_message_replies ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.audience_message_replies FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON TABLE public.audience_message_replies TO authenticated;
GRANT UPDATE (status, resend_email_id, error_message, sent_at)
  ON TABLE public.audience_message_replies TO authenticated;

DROP POLICY IF EXISTS "Chief editor can read audience replies"
  ON public.audience_message_replies;
CREATE POLICY "Chief editor can read audience replies"
  ON public.audience_message_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.editor_profiles AS editor
      WHERE editor.user_id = (SELECT auth.uid())
        AND editor.role = 'chief_editor'
    )
  );

DROP POLICY IF EXISTS "Chief editor can create audience replies"
  ON public.audience_message_replies;
CREATE POLICY "Chief editor can create audience replies"
  ON public.audience_message_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = (SELECT auth.uid())
    AND status = 'sending'
    AND EXISTS (
      SELECT 1 FROM public.editor_profiles AS editor
      WHERE editor.user_id = (SELECT auth.uid())
        AND editor.role = 'chief_editor'
    )
  );

DROP POLICY IF EXISTS "Chief editor can update audience reply delivery state"
  ON public.audience_message_replies;
CREATE POLICY "Chief editor can update audience reply delivery state"
  ON public.audience_message_replies
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.editor_profiles AS editor
      WHERE editor.user_id = (SELECT auth.uid())
        AND editor.role = 'chief_editor'
    )
  )
  WITH CHECK (
    status IN ('sending', 'sent', 'failed')
    AND EXISTS (
      SELECT 1 FROM public.editor_profiles AS editor
      WHERE editor.user_id = (SELECT auth.uid())
        AND editor.role = 'chief_editor'
    )
  );

COMMIT;
