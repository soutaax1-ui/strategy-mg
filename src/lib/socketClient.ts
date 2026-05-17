import { io, type Socket } from 'socket.io-client';

// 本番ビルド時は同一オリジンに接続 (Railway では '' でサーバーと同居)
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001');

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SERVER_URL, { autoConnect: false });
  }
  return _socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
}

/* ── 共有型 (server/src/room.ts と合わせること) ── */
export interface CharaData {
  companyName:   string;
  presidentName: string;
  characterId:   string;
}

export interface RoomPlayer {
  id:        string;
  name:      string;
  charaData?: CharaData;
}

export interface Room {
  code: string;
  players: RoomPlayer[];
  maxPlayers: number;
  hostId: string;
  createdAt: string; // JSON化で string になる
}

export interface RoomOkRes  { ok: true;  code: string; room: Room }
export interface RoomErrRes { ok: false; error: string }
export type RoomRes = RoomOkRes | RoomErrRes;
