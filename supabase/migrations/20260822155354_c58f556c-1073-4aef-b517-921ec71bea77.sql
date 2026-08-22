
-- ============ COURSES ============
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  language text NOT NULL,
  difficulty text NOT NULL,
  topic text NOT NULL,
  description text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY courses_read_all ON public.courses FOR SELECT USING (true);

ALTER TABLE public.lessons ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public.lessons ADD COLUMN estimated_minutes integer NOT NULL DEFAULT 6;

-- ============ LESSON PROGRESS ============
CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed',
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY lp_own ON public.lesson_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ DAILY ACTIVITY / GOAL / STREAK ============
ALTER TABLE public.profiles ADD COLUMN daily_goal integer NOT NULL DEFAULT 3;
ALTER TABLE public.profiles ADD COLUMN best_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN last_active_date date;

CREATE TABLE public.daily_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  lessons_completed integer NOT NULL DEFAULT 0,
  practice_sessions integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, activity_date)
);
GRANT SELECT, INSERT, UPDATE ON public.daily_activity TO authenticated;
GRANT ALL ON public.daily_activity TO service_role;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY da_own ON public.daily_activity FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ ACHIEVEMENTS ============
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  criteria_type text NOT NULL,
  criteria_value integer NOT NULL DEFAULT 1,
  icon text NOT NULL DEFAULT 'trophy',
  order_index integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY achievements_read_all ON public.achievements FOR SELECT USING (true);

CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY ua_own ON public.user_achievements FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ FRIENDS ============
CREATE TABLE public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sender_id, receiver_id),
  CHECK (sender_id <> receiver_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_requests TO authenticated;
GRANT ALL ON public.friend_requests TO service_role;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY fr_read ON public.friend_requests FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY fr_send ON public.friend_requests FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY fr_respond ON public.friend_requests FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid() OR sender_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid() OR sender_id = auth.uid());
CREATE POLICY fr_delete ON public.friend_requests FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id),
  CHECK (user_id <> friend_id)
);
GRANT SELECT, INSERT, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY fs_read ON public.friendships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY fs_insert ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY fs_delete ON public.friendships FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- accepting a request creates both friendship directions
CREATE OR REPLACE FUNCTION public.accept_friend_request(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.friend_requests;
BEGIN
  SELECT * INTO r FROM public.friend_requests WHERE id = _request_id;
  IF r IS NULL OR r.receiver_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.friend_requests SET status = 'accepted' WHERE id = _request_id;
  INSERT INTO public.friendships (user_id, friend_id) VALUES (r.sender_id, r.receiver_id)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.friendships (user_id, friend_id) VALUES (r.receiver_id, r.sender_id)
    ON CONFLICT DO NOTHING;
END; $$;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;

-- ============ INSIGHTS ============
CREATE TABLE public.insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  excerpt text NOT NULL,
  body text NOT NULL,
  read_minutes integer NOT NULL DEFAULT 4,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.insights TO anon, authenticated;
GRANT ALL ON public.insights TO service_role;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY insights_read_all ON public.insights FOR SELECT USING (true);

-- ============ SEED: COURSES ============
INSERT INTO public.courses (slug, title, language, difficulty, topic, description, order_index) VALUES
('asl-alphabet-numbers','Alphabet & Numbers','ASL','basic','Foundations','Fingerspell the manual alphabet and count with confidence.',1),
('asl-greetings','Greetings & Introductions','ASL','basic','Greetings','Say hello, thank you and introduce yourself politely.',2),
('asl-common-signs','Everyday Common Signs','ASL','basic','Daily life','The signs you will use every single day.',3),
('asl-family-home','Family & Home','ASL','intermediate','Family','Talk about the people you live with and your home.',4),
('asl-school-work','School & Work','ASL','intermediate','Work','Vocabulary for classrooms, offices and study.',5),
('asl-emotions','Feelings & Emotions','ASL','intermediate','Emotions','Express how you feel with face and body.',6),
('asl-grammar','Grammar & Sentence Structure','ASL','advanced','Grammar','Topic-comment order, classifiers and non-manual markers.',7),
('asl-everyday-conversation','Everyday Conversations','ASL','conversation','Conversation','Small talk, questions and natural back-and-forth.',8),
('asl-travel-shopping','Travel & Shopping','ASL','conversation','Travel','Order, ask for directions and shop without speaking.',9),
('isl-alphabet-numbers','Alphabet & Numbers','ISL','basic','Foundations','The two-handed ISL alphabet and number system.',10),
('isl-greetings','Greetings & Introductions','ISL','basic','Greetings','Namaste, thank you and polite openers in ISL.',11),
('isl-family-food','Family & Food','ISL','intermediate','Family','Household, relatives and meals.',12),
('isl-school-work','School & Work','ISL','intermediate','Work','Classroom and workplace vocabulary in ISL.',13),
('isl-daily-conversation','Daily Conversations','ISL','conversation','Conversation','Practical exchanges for markets, travel and visits.',14);

-- attach existing lessons to their courses
UPDATE public.lessons SET course_id = (SELECT id FROM public.courses WHERE slug='asl-greetings') WHERE slug='asl-everyday-basics';
UPDATE public.lessons SET course_id = (SELECT id FROM public.courses WHERE slug='isl-greetings') WHERE slug='isl-everyday-basics';

-- ============ SEED: LESSONS ============
INSERT INTO public.lessons (slug, title, language, summary, source, order_index, course_id)
SELECT v.slug, v.title, c.language, v.summary, 'SignBridge', v.ord, c.id
FROM (VALUES
('asl-fingerspell-a-m','Fingerspelling A–M','Handshapes for the first half of the manual alphabet.','asl-alphabet-numbers',1),
('asl-fingerspell-n-z','Fingerspelling N–Z','Finish the manual alphabet and spell your name.','asl-alphabet-numbers',2),
('asl-numbers-1-20','Numbers 1–20','Counting handshapes and palm orientation rules.','asl-alphabet-numbers',3),
('asl-polite-openers','Polite Openers','Nice to meet you, my name is, how are you.','asl-greetings',2),
('asl-daily-common','Common Daily Signs','Eat, drink, sleep, go, want, more.','asl-common-signs',1),
('asl-time-days','Time & Days','Today, tomorrow, morning, night, week.','asl-common-signs',2),
('asl-family-people','Family Members','Mother, father, sister, brother, baby.','asl-family-home',1),
('asl-home-objects','Around the Home','House, kitchen, room, door, table.','asl-family-home',2),
('asl-classroom','In the Classroom','Teacher, student, book, learn, question.','asl-school-work',1),
('asl-workplace','At Work','Work, meeting, computer, busy, break.','asl-school-work',2),
('asl-core-emotions','Core Emotions','Happy, sad, angry, tired, excited.','asl-emotions',1),
('asl-nuanced-feelings','Nuanced Feelings','Nervous, proud, confused, calm.','asl-emotions',2),
('asl-topic-comment','Topic–Comment Order','How ASL sentences put the topic first.','asl-grammar',1),
('asl-nonmanual','Non-Manual Markers','Eyebrows, mouth morphemes and question faces.','asl-grammar',2),
('asl-small-talk','Small Talk','Weather, weekend, how was your day.','asl-everyday-conversation',1),
('asl-asking-questions','Asking Questions','Who, what, where, when, why, how.','asl-everyday-conversation',2),
('asl-directions','Getting Directions','Left, right, straight, near, far.','asl-travel-shopping',1),
('asl-shopping','Shopping & Money','Buy, price, expensive, card, receipt.','asl-travel-shopping',2),
('isl-fingerspell','Two-Handed Fingerspelling','How the ISL alphabet uses both hands.','isl-alphabet-numbers',1),
('isl-numbers','Numbers & Counting','Counting one to twenty in ISL.','isl-alphabet-numbers',2),
('isl-polite-openers','Polite Openers','Namaste, please, sorry, welcome.','isl-greetings',2),
('isl-family','Family Members','Mother, father, sister, brother.','isl-family-food',1),
('isl-food','Food & Meals','Eat, rice, water, tea, hungry.','isl-family-food',2),
('isl-classroom','In the Classroom','Teacher, student, book, write.','isl-school-work',1),
('isl-workplace','At Work','Work, office, money, time.','isl-school-work',2),
('isl-market','At the Market','How much, buy, cheap, bag.','isl-daily-conversation',1),
('isl-travel','Travel & Directions','Bus, train, where, near, help.','isl-daily-conversation',2)
) AS v(slug,title,summary,course_slug,ord)
JOIN public.courses c ON c.slug = v.course_slug;

-- ============ SEED: SIGNS ============
INSERT INTO public.signs (lesson_id, slug, gloss, meaning, handshape, location, movement, expression, common_mistake, steps, image_key, order_index)
SELECT l.id,
       l.slug || '-' || lower(replace(v.gloss,' ','-')),
       v.gloss, v.meaning, v.handshape, v.loc, v.movement,
       'Neutral, engaged face; raise brows for questions.',
       'Rushing the movement so the handshape never fully forms.',
       ARRAY['Form the handshape: ' || v.handshape, 'Place it at ' || v.loc, v.movement, 'Hold briefly, then relax'],
       CASE WHEN l.language = 'ASL' THEN 'asl-hello' ELSE 'isl-namaste' END,
       v.ord
FROM (VALUES
('asl-fingerspell-a-m','A','Letter A','Closed fist, thumb alongside','chest height, palm out','Hold steady',1),
('asl-fingerspell-a-m','B','Letter B','Flat hand, thumb across palm','chest height, palm out','Hold steady',2),
('asl-fingerspell-a-m','C','Letter C','Curved hand forming a C','chest height, palm left','Hold steady',3),
('asl-fingerspell-a-m','M','Letter M','Thumb under three fingers','chest height, palm out','Hold steady',4),
('asl-fingerspell-n-z','N','Letter N','Thumb under two fingers','chest height, palm out','Hold steady',1),
('asl-fingerspell-n-z','S','Letter S','Fist with thumb across front','chest height, palm out','Hold steady',2),
('asl-fingerspell-n-z','Y','Letter Y','Thumb and pinky extended','chest height, palm out','Hold steady',3),
('asl-fingerspell-n-z','Z','Letter Z','Index finger extended','chest height, palm out','Draw a Z in the air',4),
('asl-numbers-1-20','ONE','Number 1','Index finger up','shoulder height, palm in','Hold steady',1),
('asl-numbers-1-20','FIVE','Number 5','Open hand, fingers spread','shoulder height, palm in','Hold steady',2),
('asl-numbers-1-20','TEN','Number 10','Fist with thumb up','shoulder height','Shake the thumb slightly',3),
('asl-numbers-1-20','TWENTY','Number 20','Index and thumb pinching','shoulder height, palm out','Pinch open and closed twice',4),
('asl-polite-openers','MY NAME','My name is','Flat hand then H hands','chest, then in front','Touch chest, then tap H hands twice',1),
('asl-polite-openers','NICE TO MEET YOU','Nice to meet you','Flat hands then index fingers','chest, then neutral space','Slide palm forward, bring index fingers together',2),
('asl-polite-openers','HOW ARE YOU','How are you?','Curved hands then index','chest, then forward','Roll knuckles out, then point',3),
('asl-polite-openers','GOODBYE','Goodbye','Open hand','shoulder height','Wave fingers down twice',4),
('asl-daily-common','EAT','To eat','Flattened O hand','at the mouth','Tap fingertips to lips twice',1),
('asl-daily-common','DRINK','To drink','C hand','at the mouth','Tip the hand toward the mouth',2),
('asl-daily-common','SLEEP','To sleep','Open hand closing','in front of the face','Draw down and close the fingers',3),
('asl-daily-common','WANT','To want','Claw hands','in front of the chest','Pull both hands toward you',4),
('asl-time-days','TODAY','Today','Y hands','waist height','Drop both hands down twice',1),
('asl-time-days','TOMORROW','Tomorrow','A hand, thumb up','on the cheek','Arc the thumb forward',2),
('asl-time-days','MORNING','Morning','Flat hand on forearm','in front of the body','Lift the forearm like a rising sun',3),
('asl-time-days','NIGHT','Night','Flat hand over bent arm','waist height','Tap the wrist downward',4),
('asl-family-people','MOTHER','Mother','Open 5 hand','thumb on chin','Tap the chin twice',1),
('asl-family-people','FATHER','Father','Open 5 hand','thumb on forehead','Tap the forehead twice',2),
('asl-family-people','SISTER','Sister','L hand from jaw','jaw then neutral space','Move down, then bring L hands together',3),
('asl-family-people','BABY','Baby','Cradled arms','in front of the body','Rock arms gently side to side',4),
('asl-home-objects','HOUSE','House','Flat hands','above the head','Trace a roof then the walls',1),
('asl-home-objects','KITCHEN','Kitchen','Flat hand','in front of the body','Flip the palm over twice',2),
('asl-home-objects','DOOR','Door','B hands together','chest height','Swing one hand open like a door',3),
('asl-home-objects','TABLE','Table','Flat arms stacked','waist height','Pat the forearm twice',4),
('asl-classroom','TEACHER','Teacher','Flattened O hands','at the temples','Push forward, then draw person markers down',1),
('asl-classroom','STUDENT','Student','Flattened O to flat hand','forehead then chest','Take from the head, then person marker',2),
('asl-classroom','BOOK','Book','Flat palms together','chest height','Open the palms like a book',3),
('asl-classroom','LEARN','To learn','Claw hand to forehead','palm then forehead','Lift information from the palm to the head',4),
('asl-workplace','WORK','To work','S hands','in front of the body','Tap one wrist on the other twice',1),
('asl-workplace','MEETING','Meeting','Open hands closing','chest height','Bring fingertips together twice',2),
('asl-workplace','COMPUTER','Computer','C hand','on the forearm','Arc the C along the arm',3),
('asl-workplace','BREAK','Break time','B hands','chest height','Separate hands outward once',4),
('asl-core-emotions','HAPPY','Happy','Flat hands','on the chest','Brush upward in circles',1),
('asl-core-emotions','SAD','Sad','Open 5 hands','in front of the face','Draw both hands down slowly',2),
('asl-core-emotions','ANGRY','Angry','Claw hand','in front of the face','Pull the claw away sharply',3),
('asl-core-emotions','TIRED','Tired','Bent hands','on the chest','Let both hands drop inward',4),
('asl-nuanced-feelings','NERVOUS','Nervous','Open 5 hands','in front of the body','Shake both hands lightly',1),
('asl-nuanced-feelings','PROUD','Proud','A hand, thumb up','from stomach to chest','Slide the thumb upward',2),
('asl-nuanced-feelings','CONFUSED','Confused','Index then claw hands','forehead then chest','Point to the head, then circle both hands',3),
('asl-nuanced-feelings','CALM','Calm','Flat hands','in front of the face','Press both hands slowly down',4),
('asl-topic-comment','TOPIC-FIRST','Topic first','Both hands neutral','neutral signing space','Sign the topic, pause, then the comment',1),
('asl-topic-comment','TIME-FIRST','Time first','Index hand','shoulder height','Place the time sign before the sentence',2),
('asl-topic-comment','RHETORICAL','Rhetorical question','Open hands','neutral space','Sign the question, raise brows, then answer',3),
('asl-nonmanual','YES-NO-Q','Yes/no question face','No hands required','face','Raise the eyebrows and lean forward',1),
('asl-nonmanual','WH-Q','WH question face','No hands required','face','Furrow the eyebrows and tilt the head',2),
('asl-nonmanual','CS-MOUTH','Mouth morpheme CS','No hands required','face','Press the lips and tense the cheek for very close',3),
('asl-small-talk','WEATHER','Weather','W hands','chest height','Rotate both hands together',1),
('asl-small-talk','WEEKEND','Weekend','W then D hands','neutral space','Sign week, then end',2),
('asl-small-talk','FINE','I am fine','Open 5 hand','thumb on chest','Tap the chest and move forward',3),
('asl-asking-questions','WHO','Who','L hand','at the chin','Bend the index finger near the chin',1),
('asl-asking-questions','WHAT','What','Open hands','chest height','Shake both palms up',2),
('asl-asking-questions','WHERE','Where','Index finger up','shoulder height','Shake side to side',3),
('asl-asking-questions','WHY','Why','Y hand from forehead','forehead then out','Touch the forehead and pull into a Y',4),
('asl-directions','LEFT','Left','L hand','shoulder height','Move to the left',1),
('asl-directions','RIGHT','Right','R hand','shoulder height','Move to the right',2),
('asl-directions','STRAIGHT','Straight ahead','Flat hand','chest height','Push the hand straight forward',3),
('asl-directions','NEAR','Near','Bent hands','in front of the body','Bring the back hand toward the front hand',4),
('asl-shopping','BUY','To buy','Flattened O on palm','chest height','Move the hand forward off the palm',1),
('asl-shopping','HOW MUCH','How much','Closed hand opening','chest height','Flick the fingers open',2),
('asl-shopping','EXPENSIVE','Expensive','Flattened O on palm','chest height','Lift off the palm and drop sharply',3),
('asl-shopping','CARD','Card payment','Bent L hands','chest height','Trace a small rectangle',4),
('isl-fingerspell','ISL-A','Letter A (two hands)','Index touches the other thumb','chest height','Touch and hold',1),
('isl-fingerspell','ISL-B','Letter B (two hands)','Flat hand against four fingers','chest height','Touch and hold',2),
('isl-fingerspell','ISL-C','Letter C (two hands)','Curved hands forming a C','chest height','Bring both hands together',3),
('isl-numbers','ISL-ONE','Number 1','Index finger up','shoulder height','Hold steady',1),
('isl-numbers','ISL-FIVE','Number 5','Open palm, fingers spread','shoulder height','Hold steady',2),
('isl-numbers','ISL-TEN','Number 10','Both open palms','chest height','Show both hands briefly',3),
('isl-polite-openers','PLEASE','Please','Flat palm','on the chest','Circle the palm on the chest',1),
('isl-polite-openers','SORRY','Sorry','Fist','on the chest','Rub the fist in a circle',2),
('isl-polite-openers','WELCOME','Welcome','Both open palms','waist height','Sweep both palms inward',3),
('isl-family','MOTHER','Mother','Index finger','on the nose then chest','Touch the nose, then the chest',1),
('isl-family','FATHER','Father','Index finger','on the forehead','Touch and lower to the chest',2),
('isl-family','SISTER','Sister','Index finger','on the cheek','Slide down the cheek',3),
('isl-family','BROTHER','Brother','Index finger','at the chin','Slide along the jaw',4),
('isl-food','EAT','To eat','Pinched fingers','at the mouth','Bring fingertips to the mouth twice',1),
('isl-food','WATER','Water','Cupped hand','at the mouth','Tip the hand toward the lips',2),
('isl-food','RICE','Rice','Pinched fingers over palm','chest height','Sprinkle fingers over the flat palm',3),
('isl-food','TEA','Tea','C hand','at the mouth','Lift like a cup and sip',4),
('isl-classroom','TEACHER','Teacher','Flat hands','forehead then forward','Push forward from the head',1),
('isl-classroom','STUDENT','Student','Flat palm','chest height','Open the palm like a page and point to self',2),
('isl-classroom','BOOK','Book','Flat palms together','chest height','Open the palms like a book',3),
('isl-classroom','WRITE','To write','Pinched fingers on palm','chest height','Trace writing on the palm',4),
('isl-workplace','WORK','To work','Fists','waist height','Tap the fists together twice',1),
('isl-workplace','OFFICE','Office','Flat hands','chest height','Trace a square in the air',2),
('isl-workplace','MONEY','Money','Rubbing fingers','chest height','Rub the thumb across the fingertips',3),
('isl-workplace','TIME','Time','Index on wrist','in front of the body','Tap the wrist twice',4),
('isl-market','HOW MUCH','How much','Open hand','chest height','Rub fingers and raise the brows',1),
('isl-market','BUY','To buy','Flat hand on palm','chest height','Push the hand forward',2),
('isl-market','CHEAP','Cheap','Flat hand','chest height','Sweep the hand downward',3),
('isl-market','BAG','Bag','Curved hand','at the side','Mime holding a handle',4),
('isl-travel','BUS','Bus','Fists gripping','chest height','Mime holding a steering wheel',1),
('isl-travel','TRAIN','Train','Flat hands','chest height','Slide one hand along the other',2),
('isl-travel','WHERE','Where','Index finger','shoulder height','Shake side to side with raised brows',3),
('isl-travel','HELP','Help','Fist on flat palm','chest height','Lift both hands together',4)
) AS v(lesson_slug,gloss,meaning,handshape,loc,movement,ord)
JOIN public.lessons l ON l.slug = v.lesson_slug;

-- ============ SEED: ACHIEVEMENTS ============
INSERT INTO public.achievements (code, name, description, criteria_type, criteria_value, icon, order_index) VALUES
('first_step','First Step','Complete your first lesson.','lessons',1,'footprints',1),
('getting_started','Getting Started','Complete your first course.','courses',1,'rocket',2),
('streak_7','7-Day Learner','Maintain a 7-day learning streak.','streak',7,'flame',3),
('streak_30','30-Day Learner','Maintain a 30-day learning streak.','streak',30,'flame',4),
('course_master','Course Master','Complete three full courses.','courses',3,'graduation-cap',5),
('conversation_ready','Conversation Ready','Complete a conversation-focused course.','conversation_course',1,'messages-square',6),
('eagle_eye','Eagle Eye','Practise 50 signs in SignLab.','attempts',50,'eye',7),
('speed_learner','Speed Learner','Complete 10 lessons.','lessons',10,'zap',8),
('gesture_master','Gesture Master','Score 90% or higher on a practice attempt.','high_score',90,'hand',9),
('bridge_builder','Bridge Builder','Add your first friend.','friends',1,'users',10);

-- ============ SEED: INSIGHTS ============
INSERT INTO public.insights (slug, title, category, excerpt, body, read_minutes, order_index) VALUES
('what-is-deaf-culture','What Deaf Culture Actually Is','Culture','Deaf culture is a living community with its own language, humour, art and social rules.','Deaf culture is not defined by the absence of hearing. It is a community identity built around a shared visual language, shared history and shared social norms.

Members often write Deaf with a capital D to signal cultural identity rather than an audiological measurement. Within the community, directness is valued: sustained eye contact is polite, tapping a shoulder or waving is the normal way to get attention, and flicking the lights is how you call a room to order.

Storytelling, ASL poetry and visual humour are central art forms. Many Deaf people describe deafness not as a loss to be repaired but as a different, complete way of experiencing the world.',4,1),
('sign-languages-are-real-languages','Sign Languages Are Full Languages','Language','They have grammar, regional accents and evolve over time just like spoken languages.','Sign languages are not gestured versions of spoken languages. ASL is not English on the hands, and ISL is not Hindi on the hands.

Each has its own grammar. ASL commonly uses topic-comment ordering, so "Do you like coffee?" becomes COFFEE YOU LIKE with raised eyebrows. Meaning is carried simultaneously by handshape, location, movement, palm orientation and non-manual markers like eyebrow position and mouth shapes.

There are also accents. Signers from different regions and generations use different variants for the same word, and new signs are coined constantly for new technology and ideas.',5,2),
('history-of-asl','A Short History of ASL','History','From Martha''s Vineyard to Gallaudet, ASL was shaped by community, not committees.','American Sign Language emerged in the early nineteenth century when French Sign Language, brought by Laurent Clerc, blended with existing home sign systems and the thriving village sign language of Martha''s Vineyard.

The founding of the American School for the Deaf in 1817 gave the language a hub. Deaf students carried signs home and back again, and the language matured rapidly.

The 1880 Milan Congress then pushed oralism and banned signing in many schools for nearly a century. ASL survived because Deaf communities kept using it outside the classroom. The 1988 Deaf President Now protest at Gallaudet University marked the modern turning point in Deaf self-determination.',6,3),
('indian-sign-language','Indian Sign Language in Focus','Language','ISL serves millions of signers and uses a distinctive two-handed alphabet.','Indian Sign Language is used across India by an estimated several million signers, making it one of the most-used sign languages in the world, yet it has historically been under-resourced.

ISL uses a two-handed manual alphabet, unlike the one-handed ASL alphabet. Its grammar is largely independent of Hindi or English, and mouthings borrowed from local spoken languages vary by region.

The Indian Sign Language Research and Training Centre, established in 2015, has driven dictionary standardisation and interpreter training, and ISL is increasingly recognised in schools and public broadcasting.',5,4),
('deaf-etiquette','Etiquette When Meeting a Deaf Person','Etiquette','Small habits make conversation dramatically easier and more respectful.','Face the person and keep your hands away from your mouth. Many Deaf people use some lipreading, and lipreading at best captures roughly a third of English sounds, so clear line of sight matters.

Get attention with a light tap on the shoulder or a wave in the field of vision. Do not shout, and do not exaggerate mouth movements.

If an interpreter is present, speak directly to the Deaf person, not to the interpreter. Say "What do you think?" rather than "Ask her what she thinks." Keep eye contact with the person you are talking to.

If you do not understand a sign, ask for it again. Repair is normal and welcomed.',4,5),
('accessibility-tech','Technology That Actually Helps','Accessibility','Captions, video relay and visual alerts do more than most people realise.','Real-time captioning has moved from specialist equipment to something available on a phone, but quality varies enormously and automatic captions still struggle with names, accents and crosstalk.

Video relay and video remote interpreting let a Deaf person call a hearing person through a live interpreter. Visual and haptic alerts replace doorbells, alarms and timers.

The important principle is that technology should sit beside sign language, not replace it. Tools like on-device gesture recognition help hearing people meet signers halfway, but a fluent human interpreter remains the gold standard for anything high-stakes such as medical or legal settings.',4,6),
('learning-tips','How to Actually Get Fluent','Learning','Consistency, mirrors and real conversations beat marathon study sessions.','Short daily practice beats long weekly sessions. Fifteen focused minutes a day builds motor memory far better than two hours on a Sunday.

Practise in front of a mirror or camera. Sign language is visual, so you need to see what your audience sees, including your facial expressions, which carry grammar rather than decoration.

Learn phrases, not isolated words. Fingerspelling drills are useful, but conversation is the goal.

Most importantly, meet real signers. Deaf coffee chats, community events and video calls with other learners expose you to accents, speed and repair strategies no course can teach.',4,7),
('myths-about-deafness','Five Myths Worth Dropping','Culture','Sign language is not universal, and Deaf people are not looking to be fixed.','Myth one: sign language is universal. There are well over two hundred distinct sign languages, and ASL and British Sign Language are mutually unintelligible.

Myth two: all Deaf people can lipread well. Most cannot rely on it alone.

Myth three: hearing aids and implants restore normal hearing. They help some people in some environments and are not a cure.

Myth four: writing notes is always enough. For many Deaf people, a sign language is their first language and written English or Hindi is a second one.

Myth five: deafness is a tragedy. Most culturally Deaf people describe their identity as something they would not trade.',5,8);
