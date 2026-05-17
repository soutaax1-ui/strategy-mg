export interface CharaData {
  companyName:   string;
  presidentName: string;
  characterId:   string;
}

export interface Player {
  id:        string;    // socket.id
  name:      string;
  charaData?: CharaData;
}

export interface Room {
  code: string;
  players: Player[];
  maxPlayers: number;
  hostId: string;
  createdAt: Date;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>(); // socketId → roomCode

// 紛らわしい文字 (0/O, 1/I/L) を除外した文字セット
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let code: string;
  do {
    code = Array.from(
      { length: 4 },
      () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
    ).join('');
  } while (rooms.has(code));
  return code;
}

export function createRoom(playerName: string, socketId: string, charaData?: CharaData): Room {
  // 既存ルームから退出
  leaveRoom(socketId);

  const code = generateCode();
  const room: Room = {
    code,
    players: [{ id: socketId, name: playerName, charaData }],
    maxPlayers: 4,
    hostId: socketId,
    createdAt: new Date(),
  };
  rooms.set(code, room);
  socketToRoom.set(socketId, code);
  return room;
}

export function joinRoom(
  code: string,
  playerName: string,
  socketId: string,
  charaData?: CharaData,
): { room: Room } | { error: string } {
  const key = code.toUpperCase();
  const room = rooms.get(key);
  if (!room) return { error: 'ルームが見つかりません' };
  if (room.players.length >= room.maxPlayers)
    return { error: `ルームが満員です (最大 ${room.maxPlayers} 人)` };
  if (room.players.some(p => p.id === socketId))
    return { error: 'すでに参加しています' };

  // 既存ルームから退出してから参加
  leaveRoom(socketId);

  room.players.push({ id: socketId, name: playerName, charaData });
  socketToRoom.set(socketId, key);
  return { room };
}

export function leaveRoom(socketId: string): { code: string; room: Room } | null {
  const code = socketToRoom.get(socketId);
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) {
    socketToRoom.delete(socketId);
    return null;
  }

  socketToRoom.delete(socketId);
  room.players = room.players.filter(p => p.id !== socketId);

  if (room.players.length === 0) {
    rooms.delete(code);
    return null;
  }

  // ホストが抜けたら次のプレイヤーに引き継ぎ
  if (room.hostId === socketId) {
    room.hostId = room.players[0].id;
  }

  return { code, room };
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function getRoomBySocketId(
  socketId: string,
): { code: string; room: Room } | null {
  const code = socketToRoom.get(socketId);
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) return null;
  return { code, room };
}

export function roomCount(): number {
  return rooms.size;
}
