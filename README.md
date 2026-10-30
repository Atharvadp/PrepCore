# PrepCore - Distraction-First Study Companion

PrepCore helps students stay focused, organized, and motivated through study sessions, task management, progress tracking, and AI-powered study assistance.

## Features

- Focus sessions with selectable durations and task association
- Task management
- Daily study streaks and analytics
- AI study assistance and Q&A
- Responsive interface

## Architecture

- **Frontend:** React, TypeScript, and Vite
- **Backend:** Node.js, Express, and TypeScript
- **Database:** MongoDB accessed through Mongoose
- **AI:** Groq requests are made by the backend using the server-only `GROQ_API_KEY`
- **Authentication:** Backend-managed authentication using an HTTP-only cookie

The frontend communicates with the backend API. AI provider credentials are not configured in the browser.

## Getting Started

### Prerequisites

- Node.js 18 or newer
- A MongoDB deployment compatible with the backend's transaction requirements
- A Groq API key to use the AI features

### Install dependencies

From the project root:

```sh
npm install
npm --prefix server install
```

Configure the backend environment using `server/.env.example` as a reference. Set the required MongoDB and authentication settings. Set `GROQ_API_KEY` in the server environment to enable AI requests; do not use a `VITE_`-prefixed variable for the key.

### Run the application

Start the backend in one terminal:

```sh
npm run server:dev
```

Start the frontend in another terminal:

```sh
npm run dev
```

Build the frontend and backend with:

```sh
npm run build
npm run server:build
```

See [`server/README.md`](./server/README.md) for backend configuration, API endpoints, and behavior.

## License

MIT
