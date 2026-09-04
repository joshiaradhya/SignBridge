UPDATE public.signs SET image_key = slug
WHERE slug NOT IN ('asl-hello','asl-thank-you','asl-please','asl-sorry','isl-namaste','isl-thank-you','isl-help','isl-water');
UPDATE public.signs SET image_key = slug
WHERE slug IN ('asl-hello','asl-thank-you','asl-please','asl-sorry','isl-namaste','isl-thank-you','isl-help','isl-water');