# Update lessons across every course

## Goal
Bring every course lesson screen up to date with the newer practice and progress features while keeping the current SignBridge graph-paper style.

## Changes
- Refresh the course lesson list into clearer, tactile numbered rows like the provided reference, with completion state, duration, and sign count.
- Add useful per-lesson actions so learners can open the documentation or jump directly into that lesson's first camera practice.
- Improve lesson navigation with a return link to its actual course and previous/next lesson controls.
- Make completion feedback reliable and immediately reflected in course progress.
- Handle empty or incomplete course lessons gracefully instead of showing a blank area.

## Technical details
- Reuse the existing course, lesson, sign, and progress data; no new database tables or paid services.
- Derive sign counts and first-sign practice links from current records so the update applies automatically to all 14 courses.
- Keep sign-in protection, dark mode, existing lesson documentation, and the current design tokens intact.
- Verify the updated pages in the live preview and confirm the latest build has no errors.
