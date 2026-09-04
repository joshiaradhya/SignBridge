DROP POLICY IF EXISTS "room members create call signals" ON public.call_signals;

CREATE POLICY "room members create call signals"
ON public.call_signals FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND recipient_id <> auth.uid()
  AND public.is_room_member(room_id, auth.uid())
);