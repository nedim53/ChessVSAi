import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import gameRoutes from './routes/gameRoutes.js';
import { setupSocketHandlers } from './sockets/socketHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

console.log('📁 Loading .env from:', join(__dirname, '.env'));
if (process.env.GOOGLE_AI_API_KEY) {
  console.log('✅ Google AI API key loaded from environment');
  console.log('   API Key:', process.env.GOOGLE_AI_API_KEY.substring(0, 10) + '...');
} else {
  console.log('⚠️  Google AI API key not found in environment variables');
  console.log('   Make sure .env file exists in backend directory with GOOGLE_AI_API_KEY');
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

app.use('/games', gameRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chess backend server is running' });
});

setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Chess backend server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
  console.log(`🔗 Backend URL: http://localhost:${PORT}`);
});
