UPDATE public.achievements
SET description = replace(replace(replace(description, 'Practising', 'Practicing'), 'Practised', 'Practiced'), 'Practise', 'Practice')
WHERE description ~* 'practis(e|ed|ing)';

UPDATE public.insights
SET body = replace(replace(replace(body, 'Practising', 'Practicing'), 'Practised', 'Practiced'), 'Practise', 'Practice')
WHERE body ~* 'practis(e|ed|ing)';

UPDATE public.courses
SET description = replace(replace(replace(description, 'practising', 'practicing'), 'practised', 'practiced'), 'practise', 'practice')
WHERE description ~* 'practis(e|ed|ing)';