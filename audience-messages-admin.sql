-- Rádió69 közönségüzenetek – főszerkesztői olvasás és státuszkezelés
-- Futtatás: Supabase Dashboard > SQL Editor > New query.
-- A nyilvános beküldési INSERT jogosultságot/policy-t megőrzi.

BEGIN;

ALTER TABLE public.audience_messages ENABLE ROW LEVEL SECURITY;

-- A nyilvános látogatók továbbra is csak új üzenetet küldhetnek be.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON TABLE public.audience_messages TO anon, authenticated;

-- Bejelentkezett főszerkesztő olvashat és csak a status oszlopot módosíthatja.
GRANT SELECT ON TABLE public.audience_messages TO authenticated;
GRANT UPDATE (status) ON TABLE public.audience_messages TO authenticated;

DROP POLICY IF EXISTS "Chief editor can read audience messages" ON public.audience_messages;
CREATE POLICY "Chief editor can read audience messages"
ON public.audience_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.editor_profiles AS editor
    WHERE editor.user_id = (SELECT auth.uid())
      AND editor.role = 'chief_editor'
  )
);

DROP POLICY IF EXISTS "Chief editor can update audience message status" ON public.audience_messages;
CREATE POLICY "Chief editor can update audience message status"
ON public.audience_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.editor_profiles AS editor
    WHERE editor.user_id = (SELECT auth.uid())
      AND editor.role = 'chief_editor'
  )
)
WITH CHECK (
  status IN ('new', 'in_progress', 'closed')
  AND EXISTS (
    SELECT 1
    FROM public.editor_profiles AS editor
    WHERE editor.user_id = (SELECT auth.uid())
      AND editor.role = 'chief_editor'
  )
);

COMMIT;
