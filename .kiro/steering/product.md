# Product Overview

Celline's OBGYN Prep is a spaced repetition learning application for medical exam preparation, specifically targeting OBGYN board exams.

## Core Features

- **Flashcards & MCQs**: Dual card types with markdown rendering support
- **SM-2 Algorithm**: Spaced repetition scheduling based on user performance (Again/Hard/Good/Easy ratings)
- **Bulk Import**: Create MCQs from PDF source materials with AI assistance
- **Shared Library**: Deck templates that can be public or private, with subscription model
- **Gamification**: Daily streaks, study heatmaps, and progress tracking
- **Course Hierarchy**: Courses → Units → Lessons → Items structure for organized learning

## Data Architecture

The app uses a two-layer data model:
1. **Content Layer**: `deck_templates` and `card_templates` (shared content)
2. **Progress Layer**: `user_decks` and `user_card_progress` (per-user SRS state)

This separation allows content sharing while maintaining individual progress tracking.

## Key User Flows

1. Browse/subscribe to deck templates in the library
2. Study due cards with spaced repetition scheduling
3. Create custom decks and cards (flashcards or MCQs)
4. Track progress via dashboard (streaks, heatmap, due counts)
