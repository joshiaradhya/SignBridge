DELETE FROM public.signs
WHERE lesson_id IN (
  SELECT id FROM public.lessons
  WHERE slug IN ('asl-fingerspell-a-m','asl-fingerspell-n-z','asl-numbers-1-20','isl-fingerspell','isl-numbers')
);

WITH entries(language, lesson_slug, gloss, handshape, location, movement, ord) AS (
  VALUES
  ('ASL','asl-fingerspell-a-m','A','Closed fist; thumb rests along the index-finger side','Chest height, palm forward','Hold the shape steady',1),
  ('ASL','asl-fingerspell-a-m','B','Four fingers straight together; thumb folded across the palm','Chest height, palm forward','Hold the shape steady',2),
  ('ASL','asl-fingerspell-a-m','C','Fingers and thumb curve to form an open C','Chest height, palm angled sideways','Hold the rounded opening steady',3),
  ('ASL','asl-fingerspell-a-m','D','Index points up; thumb touches the curved middle finger; ring and little fingers curve down','Chest height, palm forward','Hold the shape steady',4),
  ('ASL','asl-fingerspell-a-m','E','All fingertips curl down toward the thumb across the palm','Chest height, palm forward','Hold the compact shape steady',5),
  ('ASL','asl-fingerspell-a-m','F','Thumb and index touch in a circle; other three fingers extend','Chest height, palm forward','Hold the circle clearly',6),
  ('ASL','asl-fingerspell-a-m','G','Index and thumb extend parallel sideways; other fingers close','Chest height, palm inward','Point the G shape sideways and hold',7),
  ('ASL','asl-fingerspell-a-m','H','Index and middle fingers extend together sideways; other fingers close','Chest height, palm inward','Point both fingers sideways and hold',8),
  ('ASL','asl-fingerspell-a-m','I','Little finger extends; all other fingers close over the thumb','Chest height, palm forward','Hold the little finger upright',9),
  ('ASL','asl-fingerspell-a-m','J','Begin with the I handshape','Chest height, palm forward','Trace a small J in the air with the little finger',10),
  ('ASL','asl-fingerspell-a-m','K','Index and middle fingers form a V; thumb touches the middle finger','Chest height, palm forward','Angle the V upward and hold',11),
  ('ASL','asl-fingerspell-a-m','L','Index points up and thumb extends sideways; other fingers close','Chest height, palm forward','Hold a clear right angle',12),
  ('ASL','asl-fingerspell-a-m','M','Thumb tucks beneath the index, middle, and ring fingers','Chest height, palm forward','Hold the three knuckles evenly',13),
  ('ASL','asl-fingerspell-n-z','N','Thumb tucks beneath the index and middle fingers','Chest height, palm forward','Hold the two knuckles evenly',1),
  ('ASL','asl-fingerspell-n-z','O','All fingertips curve to meet the thumb in a round O','Chest height, palm angled sideways','Keep a rounded opening',2),
  ('ASL','asl-fingerspell-n-z','P','K handshape rotated downward','Waist to chest height, palm down','Point the middle finger downward and hold',3),
  ('ASL','asl-fingerspell-n-z','Q','G handshape rotated downward','Waist to chest height, palm down','Point the index and thumb downward and hold',4),
  ('ASL','asl-fingerspell-n-z','R','Index and middle fingers extend and cross; other fingers close','Chest height, palm forward','Keep the crossed fingers visible',5),
  ('ASL','asl-fingerspell-n-z','S','Closed fist with thumb laid across the front of the fingers','Chest height, palm forward','Hold the fist steady',6),
  ('ASL','asl-fingerspell-n-z','T','Thumb tucks between the index and middle fingers','Chest height, palm forward','Show the thumb tip clearly',7),
  ('ASL','asl-fingerspell-n-z','U','Index and middle fingers extend together; other fingers close','Chest height, palm forward','Keep the two fingers touching',8),
  ('ASL','asl-fingerspell-n-z','V','Index and middle fingers extend apart; other fingers close','Chest height, palm forward','Keep a clear V gap',9),
  ('ASL','asl-fingerspell-n-z','W','Index, middle, and ring fingers extend apart; little finger and thumb close','Chest height, palm forward','Show three separated fingers',10),
  ('ASL','asl-fingerspell-n-z','X','Index finger bends into a hook; other fingers close','Chest height, palm forward','Keep the index visibly hooked',11),
  ('ASL','asl-fingerspell-n-z','Y','Thumb and little finger extend; middle fingers close','Chest height, palm forward','Spread thumb and little finger',12),
  ('ASL','asl-fingerspell-n-z','Z','Index finger extends; other fingers close','Chest height, palm forward','Trace a clear Z in the air',13),
  ('ASL','asl-numbers-1-20','0','All fingertips curve to meet the thumb in a round zero','Shoulder height, palm forward','Hold the rounded zero steady',1),
  ('ASL','asl-numbers-1-20','1','Index finger extends; other fingers close','Shoulder height, palm inward','Hold steady',2),
  ('ASL','asl-numbers-1-20','2','Index and middle fingers extend apart','Shoulder height, palm inward','Hold steady',3),
  ('ASL','asl-numbers-1-20','3','Thumb, index, and middle fingers extend','Shoulder height, palm inward','Hold steady',4),
  ('ASL','asl-numbers-1-20','4','Four fingers extend; thumb folds across the palm','Shoulder height, palm inward','Hold steady',5),
  ('ASL','asl-numbers-1-20','5','All five fingers extend and spread','Shoulder height, palm inward','Hold steady',6),
  ('ASL','asl-numbers-1-20','6','Thumb touches the little finger; three fingers extend','Shoulder height, palm forward','Hold the fingertip contact',7),
  ('ASL','asl-numbers-1-20','7','Thumb touches the ring finger; three fingers extend','Shoulder height, palm forward','Hold the fingertip contact',8),
  ('ASL','asl-numbers-1-20','8','Thumb touches the middle finger; three fingers extend','Shoulder height, palm forward','Hold the fingertip contact',9),
  ('ASL','asl-numbers-1-20','9','Thumb touches the index finger; three fingers extend','Shoulder height, palm forward','Hold the fingertip contact',10),
  ('ISL','isl-fingerspell','A','Non-dominant index points up; dominant index touches its side','Chest height, both palms visible','Touch and hold',1),
  ('ISL','isl-fingerspell','B','Non-dominant palm faces forward; dominant index rests across its fingers','Chest height, both palms visible','Touch and hold',2),
  ('ISL','isl-fingerspell','C','Both hands curve to outline a large C','Chest height, palms facing each other','Hold the rounded opening',3),
  ('ISL','isl-fingerspell','D','Non-dominant index points up; dominant curved fingers touch beside it','Chest height, both palms visible','Touch and hold',4),
  ('ISL','isl-fingerspell','E','Non-dominant palm faces forward; dominant index points across the fingertips','Chest height, both palms visible','Touch and hold',5),
  ('ISL','isl-fingerspell','F','Non-dominant index and middle fingers extend; dominant fingers cross them','Chest height, both palms visible','Touch and hold',6),
  ('ISL','isl-fingerspell','G','Both index fingers extend, one above the other','Chest height, palms inward','Hold the parallel lines',7),
  ('ISL','isl-fingerspell','H','Non-dominant palm is vertical; dominant flat hand crosses it','Chest height, both palms visible','Touch and hold',8),
  ('ISL','isl-fingerspell','I','Dominant little finger points to the non-dominant index','Chest height, both palms visible','Touch and hold',9),
  ('ISL','isl-fingerspell','J','Non-dominant index points up; dominant index traces a J beside it','Chest height, both palms visible','Trace a small J',10),
  ('ISL','isl-fingerspell','K','Non-dominant index points up; dominant index bends against its middle joint','Chest height, both palms visible','Touch and hold',11),
  ('ISL','isl-fingerspell','L','Dominant thumb and index form an L beside the non-dominant palm','Chest height, both palms visible','Hold the right angle',12),
  ('ISL','isl-fingerspell','M','Three dominant fingertips rest across the non-dominant palm','Chest height, palms facing each other','Touch and hold',13),
  ('ISL','isl-fingerspell','N','Two dominant fingertips rest across the non-dominant palm','Chest height, palms facing each other','Touch and hold',14),
  ('ISL','isl-fingerspell','O','Both hands curve together to outline an O','Chest height, palms facing each other','Join the curves and hold',15),
  ('ISL','isl-fingerspell','P','Dominant index points down along the non-dominant index','Chest height, both palms visible','Touch and hold',16),
  ('ISL','isl-fingerspell','Q','Dominant thumb and index point down beside the non-dominant hand','Chest height, both palms visible','Point downward and hold',17),
  ('ISL','isl-fingerspell','R','Dominant index and middle fingers cross over the non-dominant index','Chest height, both palms visible','Keep the crossing visible',18),
  ('ISL','isl-fingerspell','S','Dominant fist rests against the non-dominant palm','Chest height, both palms visible','Touch and hold',19),
  ('ISL','isl-fingerspell','T','Dominant index touches the top edge of the non-dominant palm','Chest height, both palms visible','Touch and hold',20),
  ('ISL','isl-fingerspell','U','Dominant index and middle fingers point up beside the non-dominant palm','Chest height, both palms visible','Keep the two fingers together',21),
  ('ISL','isl-fingerspell','V','Dominant index and middle fingers form a V beside the non-dominant palm','Chest height, both palms visible','Keep a clear V gap',22),
  ('ISL','isl-fingerspell','W','Dominant index, middle, and ring fingers extend beside the non-dominant palm','Chest height, both palms visible','Show three separated fingers',23),
  ('ISL','isl-fingerspell','X','Dominant hooked index rests across the non-dominant index','Chest height, both palms visible','Keep the hook visible',24),
  ('ISL','isl-fingerspell','Y','Dominant thumb and little finger extend beside the non-dominant palm','Chest height, both palms visible','Spread thumb and little finger',25),
  ('ISL','isl-fingerspell','Z','Dominant index traces a Z above the non-dominant palm','Chest height, both palms visible','Trace a clear Z',26),
  ('ISL','isl-numbers','0','Dominant fingertips meet the thumb to make a round zero','Shoulder height, palm forward','Hold the rounded zero steady',1),
  ('ISL','isl-numbers','1','Dominant index finger extends','Shoulder height, palm forward','Hold steady',2),
  ('ISL','isl-numbers','2','Dominant index and middle fingers extend','Shoulder height, palm forward','Hold steady',3),
  ('ISL','isl-numbers','3','Dominant index, middle, and ring fingers extend','Shoulder height, palm forward','Hold steady',4),
  ('ISL','isl-numbers','4','Four dominant fingers extend; thumb closes','Shoulder height, palm forward','Hold steady',5),
  ('ISL','isl-numbers','5','Dominant palm opens with all fingers spread','Shoulder height, palm forward','Hold steady',6),
  ('ISL','isl-numbers','6','Dominant thumb touches little finger; other fingers extend','Shoulder height, palm forward','Hold the fingertip contact',7),
  ('ISL','isl-numbers','7','Dominant thumb touches ring finger; other fingers extend','Shoulder height, palm forward','Hold the fingertip contact',8),
  ('ISL','isl-numbers','8','Dominant thumb touches middle finger; other fingers extend','Shoulder height, palm forward','Hold the fingertip contact',9),
  ('ISL','isl-numbers','9','Dominant thumb touches index finger; other fingers extend','Shoulder height, palm forward','Hold the fingertip contact',10)
)
INSERT INTO public.signs (
  lesson_id, slug, gloss, meaning, handshape, location, movement,
  expression, common_mistake, steps, image_key, order_index
)
SELECT
  l.id,
  e.language || '-' || l.slug || '-' || lower(e.gloss),
  e.gloss,
  CASE WHEN e.gloss ~ '^[A-Z]$' THEN 'Letter ' || e.gloss ELSE 'Number ' || e.gloss END,
  e.handshape,
  e.location,
  e.movement,
  'Keep a relaxed, attentive expression and look toward your conversation partner.',
  'Hiding the thumb, changing the palm direction, or moving before the complete handshape is visible.',
  ARRAY[
    'Relax your shoulders and raise your hands into the teaching frame.',
    'Form the handshape carefully: ' || e.handshape || '.',
    'Place it at ' || lower(e.location) || '.',
    e.movement || ', then relax.'
  ],
  lower(e.language || '-' || l.slug || '-' || e.gloss),
  e.ord
FROM entries e
JOIN public.lessons l ON l.slug = e.lesson_slug;

UPDATE public.lessons
SET title = 'Numbers 0–9',
    summary = 'Learn the ten foundational number handshapes from zero through nine.',
    estimated_minutes = 10
WHERE slug IN ('asl-numbers-1-20','isl-numbers');

UPDATE public.lessons
SET estimated_minutes = 14
WHERE slug IN ('asl-fingerspell-a-m','asl-fingerspell-n-z','isl-fingerspell');