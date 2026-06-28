# Deadline Rescue AI

> AI-powered productivity companion that rescues tight deadlines by intelligently scheduling focus blocks around your existing calendar commitments.

🌐 **Live Demo:** [Your Cloud Run URL Here]

🎯 **Built for:** Google Cloud Competition - Problem Statement: Last-Minute Deadline Rescue

## 🎯 Problem Statement

Professionals and students struggle with looming deadlines when their calendars are already packed with meetings and commitments. They need intelligent help to:
- Break down complex tasks into manageable subtasks
- Find available time slots in fragmented schedules
- Schedule optimal focus blocks based on task complexity
- Get realistic risk assessments for deadline feasibility

## 💡 Solution Overview

Deadline Rescue AI combines calendar intelligence with AI-powered task analysis to transform deadline anxiety into actionable plans:

1. **Analyzes Google Calendar** to find real available time windows
2. **Uses Gemini AI** to break down complex tasks with effort estimates
3. **Generates intelligent focus blocks** (30min - 4h) based on complexity
4. **Provides risk analysis** (Low/Medium/High) with rescue advice
5. **Integrates with JIRA/Confluence** for workflow management

## ✨ Key Features

### 🤖 AI-Powered Intelligence
- **Task Breakdown:** Gemini AI creates detailed subtask breakdowns with time estimates
- **Smart Scheduling:** Adaptive focus block duration based on:
  - Task complexity scoring
  - Available calendar windows
  - Research-backed optimal durations (ultradian rhythm: 90min, deep work: 2.5h)
- **Risk Assessment:** Real-time deadline feasibility analysis with personalized advice

### 📅 Calendar Integration
- **Google Calendar Sync:** OAuth 2.0 integration
- **Availability Detection:** Smart algorithm finds free time windows
- **Focus Block Creation:** One-click addition to Google Calendar
- **Conflict Avoidance:** Respects existing meetings

### 📊 Task Management
- **Task History:** Track all tasks with status management
- **Status Updates:** In Progress, Done, Blocked, Cancelled
- **Overdue Detection:** Visual indicators for past-deadline tasks
- **Filtering & Sorting:** By status, deadline, priority, creation date

### 🔗 Atlassian Integration
- **OAuth 2.0 Connection:** Secure JIRA and Confluence access
- **JIRA Export:** Create tasks with rescue plan, risk analysis, focus blocks
- **Confluence Export:** Generate formatted pages with:
  - Color-coded risk panels
  - Tabular task overview
  - Scheduled focus blocks
  - AI insights
- **Multi-site Support:** Multiple Atlassian cloud instances

### 🎨 Modern UI/UX
- **Responsive Design:** Desktop, tablet, mobile
- **Real-time Status:** Auth, Calendar, Atlassian indicators
- **Slide-out Task Drawer:** Quick access to history
- **Smart Error Handling:** User-friendly messages with retry logic

## 🛠️ Technologies Used

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI component library
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling

### Backend
- **Node.js 22** - Runtime environment
- **Next.js API Routes** - Serverless functions
- **Firebase Admin SDK** - Server-side Firebase operations

### AI & APIs
- **Google Gemini AI** (gemini-2.0-flash-exp) - Task breakdown and advice
- **Google Calendar API** - Calendar integration
- **Atlassian REST API v3** - JIRA and Confluence

### Database & Auth
- **Firebase Firestore** - NoSQL database
- **Firebase Authentication** - User management
- **OAuth 2.0** - Google, GitHub, Atlassian auth

### Infrastructure
- **Google Cloud Run** - Containerized deployment
- **Docker** - Application containerization
- **Cloud Build** - CI/CD pipeline

## 🎯 Google Technologies Utilized

1. **Google Gemini AI API**
   - Task complexity analysis
   - Intelligent subtask breakdown
   - Personalized rescue advice
   - Retry logic with exponential backoff

2. **Google Cloud Platform**
   - **Cloud Run:** Serverless container deployment
   - **Cloud Build:** Automated build pipeline
   - **Artifact Registry:** Container image storage
   - **IAM:** Security and access control

3. **Firebase**
   - **Firestore:** Real-time NoSQL database
   - **Firebase Admin SDK:** Server-side operations
   - **Firebase Authentication:** User management

4. **Google Calendar API**
   - OAuth 2.0 authentication
   - FreeBusy query for availability
   - Event creation for focus blocks

5. **Google Cloud Console**
   - OAuth credential management
   - API key management
   - Service account configuration

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
