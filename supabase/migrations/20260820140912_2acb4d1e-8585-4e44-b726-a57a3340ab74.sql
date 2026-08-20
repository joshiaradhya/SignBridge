
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Learner',
  xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  language TEXT NOT NULL,
  summary TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ASLLVD',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_read_all" ON public.lessons FOR SELECT USING (true);

CREATE TABLE public.signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  gloss TEXT NOT NULL,
  meaning TEXT NOT NULL,
  handshape TEXT NOT NULL,
  location TEXT NOT NULL,
  movement TEXT NOT NULL,
  expression TEXT NOT NULL,
  common_mistake TEXT NOT NULL,
  steps TEXT[] NOT NULL DEFAULT '{}',
  image_key TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.signs TO anon, authenticated;
GRANT ALL ON public.signs TO service_role;
ALTER TABLE public.signs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signs_read_all" ON public.signs FOR SELECT USING (true);

CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sign_id UUID REFERENCES public.signs(id) ON DELETE SET NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  feedback TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_select_own" ON public.attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "attempts_insert_own" ON public.attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "attempts_delete_own" ON public.attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.lessons (slug, title, language, summary, source, order_index) VALUES
('asl-everyday-basics', 'Everyday Basics', 'ASL', 'Four foundational American Sign Language signs for greeting, thanking, asking and apologising. Read the documentation, study the annotated stills, then practise on camera.', 'ASLLVD', 1),
('isl-everyday-basics', 'Everyday Basics', 'ISL', 'Four foundational Indian Sign Language signs used in daily conversation. Documented with annotated stills and written movement notes.', 'INCLUDE', 2);

INSERT INTO public.signs (lesson_id, slug, gloss, meaning, handshape, location, movement, expression, common_mistake, steps, image_key, order_index)
SELECT id, 'asl-hello', 'HELLO', 'Greeting', 'Flat B-hand, fingers together, thumb tucked alongside', 'Starts at the forehead, just above the eyebrow', 'Move the hand outward and slightly away from the head in one smooth arc, like a relaxed salute', 'Friendly, raised eyebrows, eye contact held throughout', 'Snapping the hand away too fast so it reads as a military salute instead of a greeting', ARRAY['Face your conversation partner and make eye contact.','Bring a flat hand up so the fingertips touch near your temple.','Arc the hand outward and forward about 20 cm.','Let the hand relax at chest height to close the sign.'], 'asl-hello', 1 FROM public.lessons WHERE slug = 'asl-everyday-basics';

INSERT INTO public.signs (lesson_id, slug, gloss, meaning, handshape, location, movement, expression, common_mistake, steps, image_key, order_index)
SELECT id, 'asl-thank-you', 'THANK YOU', 'Gratitude', 'Flat B-hand, palm facing you, fingers together', 'Fingertips start touching the chin', 'A single clear motion outward and downward from the chin toward the person you are thanking', 'Warm smile, slight nod of the head as the hand moves out', 'Moving both hands, or starting from the lips — this reads closer to "good"', ARRAY['Place the fingertips of a flat hand on your chin, palm inward.','Move the hand forward and slightly down in one motion.','Finish with the palm facing up toward your partner.','Add a nod so the facial expression matches the sentiment.'], 'asl-thank-you', 2 FROM public.lessons WHERE slug = 'asl-everyday-basics';

INSERT INTO public.signs (lesson_id, slug, gloss, meaning, handshape, location, movement, expression, common_mistake, steps, image_key, order_index)
SELECT id, 'asl-please', 'PLEASE', 'Request', 'Flat B-hand, palm flat against the chest', 'Centre of the chest', 'Rub the flat palm in a circle on the chest, two or three rotations, clockwise from your own view', 'Soft, slightly pleading; eyebrows raised for a question', 'Tapping instead of circling, which changes the meaning toward "enjoy"', ARRAY['Rest an open palm flat on the centre of your chest.','Circle the hand smoothly two to three times.','Keep the fingers together and the wrist relaxed.','Hold eye contact and raise your eyebrows if you are asking.'], 'asl-please', 3 FROM public.lessons WHERE slug = 'asl-everyday-basics';

INSERT INTO public.signs (lesson_id, slug, gloss, meaning, handshape, location, movement, expression, common_mistake, steps, image_key, order_index)
SELECT id, 'asl-sorry', 'SORRY', 'Apology', 'Closed A-hand, thumb resting along the side of the fist', 'Centre of the chest', 'Circle the fist on the chest two or three times', 'Apologetic — furrowed brows, slight head tilt', 'Using an open palm, which turns the sign into "please"', ARRAY['Make a fist with the thumb along the side.','Place the fist flat against the centre of your chest.','Rotate it in small circles two to three times.','Keep an apologetic facial expression — it carries the meaning.'], 'asl-sorry', 4 FROM public.lessons WHERE slug = 'asl-everyday-basics';

INSERT INTO public.signs (lesson_id, slug, gloss, meaning, handshape, location, movement, expression, common_mistake, steps, image_key, order_index)
SELECT id, 'isl-namaste', 'NAMASTE', 'Greeting', 'Both hands flat, palms pressed together', 'In front of the chest, at heart height', 'Bring both palms together and hold; add a small bow of the head', 'Respectful, calm, eyes softly lowered on the bow', 'Holding the hands too high or too far from the body', ARRAY['Bring both flat hands together in front of the chest.','Press the palms fully together, fingers pointing up.','Hold the position for about a second.','Add a small nod of the head to complete the greeting.'], 'isl-namaste', 1 FROM public.lessons WHERE slug = 'isl-everyday-basics';

INSERT INTO public.signs (lesson_id, slug, gloss, meaning, handshape, location, movement, expression, common_mistake, steps, image_key, order_index)
SELECT id, 'isl-thank-you', 'THANK YOU', 'Gratitude', 'Both hands flat, palms up, fingers together', 'Start near the chest', 'Both hands move forward and outward from the chest toward the person, palms opening upward', 'Warm smile with a small forward nod', 'Using only one hand — ISL commonly uses both for this sign', ARRAY['Hold both flat hands near your chest, palms up.','Move both hands forward and away from the body together.','Keep the palms open and facing upward.','Smile and nod as the hands finish moving.'], 'isl-thank-you', 2 FROM public.lessons WHERE slug = 'isl-everyday-basics';

INSERT INTO public.signs (lesson_id, slug, gloss, meaning, handshape, location, movement, expression, common_mistake, steps, image_key, order_index)
SELECT id, 'isl-help', 'HELP', 'Request for assistance', 'One flat palm supporting a closed fist with the thumb up', 'In front of the chest', 'Lift both hands together slightly upward and forward, the flat hand pushing the fist up', 'Direct and clear; eyebrows raised when asking', 'Letting the two hands move independently instead of as one unit', ARRAY['Make a fist with the thumb pointing up.','Rest that fist on the flat open palm of the other hand.','Lift both hands together a short distance upward and forward.','Keep both hands moving as one connected unit.'], 'isl-help', 3 FROM public.lessons WHERE slug = 'isl-everyday-basics';

INSERT INTO public.signs (lesson_id, slug, gloss, meaning, handshape, location, movement, expression, common_mistake, steps, image_key, order_index)
SELECT id, 'isl-water', 'WATER', 'Water / drink', 'A cupped C-hand, as if holding a small glass', 'Beside the mouth', 'Tilt the cupped hand toward the lips as if drinking, one clear tipping motion', 'Neutral; mouth slightly open on the tip', 'Touching the lips with the fingers instead of tipping an imagined glass', ARRAY['Curve your hand into a C shape as if holding a glass.','Raise it beside your mouth.','Tip the hand toward your lips in one clear motion.','Return the hand to a neutral position to close the sign.'], 'isl-water', 4 FROM public.lessons WHERE slug = 'isl-everyday-basics';
