
-- Sign-specific steps instead of the generic template
UPDATE public.signs s
SET steps = ARRAY[
  'Relax your shoulders and face your partner, then form the handshape: ' || s.handshape || '.',
  'Bring the hand to its place: ' || s.location || '.',
  'Make the movement: ' || s.movement || '.',
  'Hold the final position for a beat so it reads clearly, then return your hand to rest.'
]
WHERE array_length(s.steps, 1) IS NOT NULL
  AND s.steps[1] LIKE 'Form the handshape:%';

-- Topic-aware facial expression guidance
UPDATE public.signs s
SET expression = CASE c.topic
  WHEN 'Foundations' THEN 'Calm, neutral face — let the hand do the work, keep the shape crisp and still.'
  WHEN 'Greetings' THEN 'Warm and open: raised eyebrows, a small smile and steady eye contact.'
  WHEN 'Emotions' THEN 'Match your face to the feeling — the facial expression carries as much meaning as the hand.'
  WHEN 'Conversation' THEN 'Raise your eyebrows for yes/no questions, furrow them for who/what/where questions.'
  WHEN 'Grammar' THEN 'Use eyebrows and head tilt as grammar: raised for topics and questions, lowered for negation.'
  WHEN 'Family' THEN 'Friendly and relaxed, with a slight nod when you name the person.'
  WHEN 'Travel' THEN 'Alert and clear; widen your eyes slightly when asking for directions or help.'
  WHEN 'Work' THEN 'Neutral and attentive, with a small nod to confirm you are understood.'
  ELSE 'Neutral, attentive face with steady eye contact.'
END
FROM public.lessons l, public.courses c
WHERE s.lesson_id = l.id AND l.course_id = c.id
  AND s.expression = 'Neutral, engaged face; raise brows for questions.';

-- Topic-aware, more useful common mistakes
UPDATE public.signs s
SET common_mistake = CASE c.topic
  WHEN 'Foundations' THEN 'Letting the handshape drift or bouncing the hand — hold it still in one clear spot so it is not read as a different letter or number.'
  WHEN 'Greetings' THEN 'Signing without eye contact or a facial expression, which makes the greeting look mechanical.'
  WHEN 'Emotions' THEN 'Keeping a flat face — without the matching expression the sign loses its meaning.'
  WHEN 'Conversation' THEN 'Signing too fast and skipping the pause between signs, so the sentence blurs together.'
  WHEN 'Grammar' THEN 'Adding English word order or mouthing every word instead of using space and eyebrows to carry the grammar.'
  WHEN 'Family' THEN 'Placing the hand at the wrong height — family signs rely on forehead versus chin placement to separate meanings.'
  WHEN 'Travel' THEN 'Making the movement too small, so the sign is hard to read from across a room.'
  WHEN 'Work' THEN 'Dropping the non-dominant hand, which is needed as the base for many of these two-handed signs.'
  ELSE 'Rushing the movement so the handshape never fully forms.'
END
FROM public.lessons l, public.courses c
WHERE s.lesson_id = l.id AND l.course_id = c.id
  AND s.common_mistake = 'Rushing the movement so the handshape never fully forms.';
