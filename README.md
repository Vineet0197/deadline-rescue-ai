# Deadline Rescue AI (FocusForge)

Deadline Rescue AI (FocusForge) is a Vibe2Ship hackathon application for **Problem Statement 1: The Last-Minute Life Saver**. It helps a user sign in, connect Google Calendar, create a deadline-driven task, calculate real availability, generate a rescue plan, get Gemini-powered task breakdown and advice, and write focus blocks back to Google Calendar.

## What It Does

```text
User signs in with email/password, Google, or GitHub
  -> connects Google Calendar
  -> creates task with deadline and effort
  -> server saves task in Firestore
  -> Google Calendar FreeBusy provides real busy slots
  -> planner calculates risk, priority, and focus blocks
  -> Gemini generates task breakdown and rescue advice
  -> user can write focus blocks back to Google Calendar
```

## Tech Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Firebase Admin SDK / Firestore
- App-owned auth with email/password, Google OAuth, and GitHub OAuth
- Google Calendar API
- Gemini API via `@google/genai`
- Google Cloud Run

## Architecture

```text
src/app/page.tsx
  -> calls app auth routes
  -> receives HttpOnly session cookie
  -> calls API routes with same-origin cookies

src/app/api/*
  -> verifies app session cookie
  -> orchestrates server-side use cases

RescueAgent
  -> TaskRepository
  -> CalendarProvider
  -> AIPlanner
  -> deterministic planner

Concrete providers
  -> FirebaseAdminTaskRepository
  -> GoogleCalendarProvider
  -> GeminiPlanner
```

The application keeps integrations behind interfaces so Firebase, Google Calendar, and Gemini can later be replaced with Postgres/MongoDB/Aurora, Outlook/Apple Calendar, or another AI provider.

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` in the project root:

```env
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/deadline-rescue-ai-service-account.json
FIREBASE_PROJECT_ID=your_firebase_project_id

# App sign-in with Google OAuth
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_AUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Google Calendar connection OAuth
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback

# App sign-in with GitHub OAuth
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_AUTH_REDIRECT_URI=http://localhost:3000/api/auth/github/callback

# Gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

You can reuse the same Google OAuth client for app sign-in and Calendar connection, but both redirect URIs must be registered in Google Cloud Console.

Firebase Admin local credentials:

1. Firebase Console -> Project settings -> Service accounts.
2. Generate a new private key.
3. Store the JSON outside this repo, for example:

```text
/Users/you/secrets/deadline-rescue-ai-service-account.json
```

4. Point `GOOGLE_APPLICATION_CREDENTIALS` to that file.

Google Calendar OAuth setup:

1. Enable Google Calendar API in Google Cloud Console.
2. Configure OAuth consent screen.
3. Create OAuth Client ID for a Web application.
4. Add redirect URIs:

```text
http://localhost:3000/api/auth/google/callback
http://localhost:3000/api/calendar/google/callback
```

GitHub OAuth setup:

1. GitHub Developer settings -> OAuth Apps -> New OAuth App.
2. Set the local callback URL:

```text
http://localhost:3000/api/auth/github/callback
```

Gemini setup:

1. Create an API key in Google AI Studio.
2. Set `GEMINI_API_KEY` in `.env.local`.

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Demo Flow

1. Sign in or create an account with email/password, Google, or GitHub.
2. Click **Connect Google Calendar**.
3. Complete Google OAuth.
4. Enter task title, deadline, effort, and priority.
5. Click **Generate Rescue Plan**.
6. Review risk, priority, focus blocks, and Gemini advice.
7. Click **Add Focus Blocks to Google Calendar**.

## Validation

```bash
npm run lint
npm run build
npm run dev
```

Manual checks:

- Submitting before sign-in or Calendar connection shows a clear requirement.
- Email/password, Google, and GitHub sign-in create records under `users/{userId}`.
- Sessions are stored under `sessions/{sessionHash}` and sent to the browser as HttpOnly cookies.
- Google Calendar OAuth stores `users/{userId}/calendarConnections/google`.
- Rescue generation stores `users/{userId}/tasks/{taskId}`.
- Rescue plans are stored under `users/{userId}/tasks/{taskId}/plans`.
- Focus blocks appear in Google Calendar after writeback.

## Cloud Run Deployment

Enable required services:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com calendar-json.googleapis.com
```

Build and deploy:

```bash
gcloud run deploy deadline-rescue-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_PROJECT_ID=your_project_id,GOOGLE_CLIENT_ID=your_google_client_id,GOOGLE_AUTH_REDIRECT_URI=https://YOUR_CLOUD_RUN_URL/api/auth/google/callback,GOOGLE_REDIRECT_URI=https://YOUR_CLOUD_RUN_URL/api/calendar/google/callback,GITHUB_CLIENT_ID=your_github_client_id,GITHUB_AUTH_REDIRECT_URI=https://YOUR_CLOUD_RUN_URL/api/auth/github/callback,GEMINI_MODEL=gemini-2.5-flash \
  --set-secrets GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,GITHUB_CLIENT_SECRET=GITHUB_CLIENT_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest
```

Cloud Run uses Application Default Credentials through its service account. Grant the service account Firestore access, and do not deploy a local service-account JSON file.

After deployment, add the Cloud Run callback URL to your OAuth client:

```text
https://YOUR_CLOUD_RUN_URL/api/auth/google/callback
https://YOUR_CLOUD_RUN_URL/api/calendar/google/callback
https://YOUR_CLOUD_RUN_URL/api/auth/github/callback
```
