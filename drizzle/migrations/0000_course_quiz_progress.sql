CREATE TABLE public.course_quiz_progress (
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  total_attempts integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  completed_quizzes integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE ON public.course_quiz_progress TO authenticated;
GRANT ALL ON public.course_quiz_progress TO service_role;
ALTER TABLE public.course_quiz_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY course_quiz_progress_read_own ON public.course_quiz_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY course_quiz_progress_insert_own ON public.course_quiz_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY course_quiz_progress_update_own ON public.course_quiz_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());