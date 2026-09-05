# SignBridge

SignBridge (also called **Sign & See**) is a sign language learning and communication platform. It helps people learn ASL and ISL, practice signs with real-time feedback, and communicate live with sign-to-caption translation on video calls — all running client-side in the browser, with no video ever leaving the device for recognition.

https://signbridge.app

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How Sign Recognition Works](#how-sign-recognition-works)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Setup](#environment-setup)
- [Running Locally](#running-locally)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Database](#database)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Overview

SignBridge combines three learning/communication surfaces into one app:

1. **Learn** what signs look like through structured, image-based lessons.
2. **Practice** signs in front of your webcam and get scored feedback.
3. **Connect** with someone in real time on a video call, with your signs translated into live captions for the other person.

Progress across all of this is tracked through a dashboard with streaks, daily goals, and achievements, and you can add friends to see their progress too.

## Features

### SignConnect
A live video call room (`connect.$roomId.tsx`) that captures your hand movements through the webcam, segments them into discrete signs, and turns them into real-time captions for the other participant. Recognition runs entirely on-device using MediaPipe — no video is streamed anywhere for the purpose of sign detection.

### SignLab (Practice)
The Practice route lets you attempt a sign on camera and immediately get an accuracy score. Feedback is broken down into four criteria — **handshape**, **location**, **movement**, and **expression** — each with its own score, a note on what was detected, and a tip for improving it.

### Learn
Structured lessons and courses covering ASL and ISL, including full A–Z and 0–9 fingerspelling. Lessons are deliberately image- and text-based (documentation-style) rather than video-based, so they're lightweight and easy to maintain.

### Dashboard
Tracks daily streaks, daily goals, recent activity, and unlocked achievements, giving an at-a-glance view of your learning progress.

### Friends
Add friends and see their activity and progress alongside your own for a bit of social accountability.

## How Sign Recognition Works

SignBridge currently uses two independent, lightweight recognition approaches rather than a single trained ML model — this is an active area of development (see [Roadmap](#roadmap)):

- **`src/lib/sign-recognizer.ts`** (used by SignConnect): Uses MediaPipe's `HandLandmarker` to track hand landmarks locally in the browser, then matches a segment of landmarks between movement pauses against a small, hardcoded vocabulary (currently: `HELLO`, `THANK YOU`, `PLEASE`, `YES`, `NO`, `YOU`, `GOOD`, `SORRY`, `HELP`) using hand-written geometric rules. It also produces an instant local caption before a more polished phrasing is available.
- **`src/lib/attempt-analysis.ts`** (used by Practice/SignLab): Scores an attempt by analyzing frame-to-frame pixel motion — energy, fine-detail change, motion centroid, and jitter — rather than the actual geometry of the hand shape. This means it currently measures general motion quality rather than whether the *specific* sign was performed correctly, and it applies the same thresholds regardless of which sign is being attempted.

Both of these are known, intentional limitations of the current implementation and are the primary target for the ML work described in the roadmap.

## Tech Stack

- **Frontend:** React 19, TanStack Router, TanStack Query, TanStack Start, Vite
- **Language:** TypeScript
- **Styling/UI:** Tailwind CSS, Radix UI, shadcn-style components
- **Computer Vision:** MediaPipe Tasks Vision (`HandLandmarker`), running fully client-side
- **Backend:** Supabase (Postgres, Auth, Row-Level Security, SQL migrations)
- **Package management:** npm or Bun (a `bun.lock` is committed)
- **Tooling:** ESLint, Prettier

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm, or [Bun](https://bun.sh/) (a `bun.lock` is included for faster installs)
- A webcam and microphone for the live features (Chrome or Edge recommended for best MediaPipe/WebRTC support)
- A [Supabase](https://supabase.com/) project for auth, activity tracking, and data storage

### Installation

```sh
# 1. Clone the repository
git clone https://github.com/joshiaradhya/SignBridge.git

# 2. Navigate into the project directory
cd SignBridge

# 3. Install dependencies
npm install
# or, if using bun
bun install
```

## Environment Setup

SignBridge uses Supabase for authentication and data storage. To connect it to your own project:

1. Create a project at [supabase.com](https://supabase.com/).
2. Set the required Supabase URL and anon/public key as environment variables — see how the client is initialized in `src/integrations/supabase` for the exact variable names expected.
3. Apply the SQL migrations in `supabase/migrations` to your project (via the Supabase CLI or dashboard SQL editor) to create the required tables, policies, and seed/fix data.

## Running Locally

```sh
npm run dev
```

This starts the Vite dev server. Open the printed local URL in your browser and grant camera/microphone permissions to use SignConnect and Practice.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Production build |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint the codebase with ESLint |
| `npm run format` | Format the codebase with Prettier |

## Project Structure
