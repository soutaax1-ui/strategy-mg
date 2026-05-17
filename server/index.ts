import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { setupSocket } from './src/socket.js';
import { roomCount } from './src/room.js';

const PORT = Number(process.env.PORT ?? 3001);
const IS_PROD = process.env.NODE_ENV === 'production';
const __serverDir = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__serverDir, '../dist');

const devOrigins = (process.env.CLIENT_ORIGINS ?? 'http://localhost:5173,http://localhost:4173').split(',');

const app = express();
app.use(express.json());

if (IS_PROD) {
  app.use(express.static(distPath));
} else {
  app.use(cors({ origin: devOrigins }));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: roomCount(), timestamp: new Date().toISOString() });
});

const httpServer = createServer(app);

const io = new Server(httpServer, IS_PROD ? {} : {
  cors: { origin: devOrigins, methods: ['GET', 'POST'] },
});

setupSocket(io);

if (IS_PROD) {
  // SPA フォールバック: /health 等の API 以外はすべて index.html を返す
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`🎮  strategy-mg server  →  http://localhost:${PORT}`);
  if (!IS_PROD) {
    console.log(`    CORS origins: ${devOrigins.join(', ')}`);
  }
});
