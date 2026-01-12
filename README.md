# Chess Game

Full-stack chess game with AI opponent, built with React/Next.js frontend and Node.js/Express/Socket.io backend.

## Features

- Real-time multiplayer chess
- AI opponent (Groq/OpenAI/Google AI)
- Move history tracking
- Visual move indicators
- King in check warnings
- Pawn promotion dialog
- Responsive design

## Tech Stack

**Frontend:**
- Next.js 14
- React 18
- TailwindCSS
- react-chessboard
- chess.js
- Socket.io Client

**Backend:**
- Node.js
- Express
- Socket.io
- chess.js
- Groq SDK / OpenAI / Google AI

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys

# Frontend
cd frontend
npm install
```

### Run Locally

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit `http://localhost:3000`

## Environment Variables

### Backend (.env)
```
PORT=3001
FRONTEND_URL=http://localhost:3000
AI_PROVIDER=groq
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.1-8b-instant
AI_TIMEOUT_MS=30000
AI_MAX_RETRIES=3
AI_RETRY_DELAY_MS=2000
AI_THINKING_DELAY_MS=1000
```

### Frontend
Create `.env.local`:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Options:**
- **Vercel (Frontend) + Render (Backend)** - Recommended
- **Railway** - Single platform for both
- **Fly.io** - Alternative single platform

## License

MIT
