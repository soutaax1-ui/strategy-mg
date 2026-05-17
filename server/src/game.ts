export interface PlayerAssignment {
  socketId: string;
  playerName: string;
  companyIdx: number; // 0-3
}

export interface GameSession {
  roomCode: string;
  hostSocketId: string;
  assignments: PlayerAssignment[];
  totalPeriods: number;
  difficulty: string;
  latestStateJson: string | null; // JSON of { gs, ui }
}

const sessions = new Map<string, GameSession>();

export function createSession(
  roomCode: string,
  hostSocketId: string,
  assignments: PlayerAssignment[],
  totalPeriods: number,
  difficulty: string,
): GameSession {
  const session: GameSession = {
    roomCode,
    hostSocketId,
    assignments,
    totalPeriods,
    difficulty,
    latestStateJson: null,
  };
  sessions.set(roomCode, session);
  return session;
}

export function getSession(roomCode: string): GameSession | undefined {
  return sessions.get(roomCode);
}

export function getSessionBySocket(socketId: string): GameSession | undefined {
  for (const s of sessions.values()) {
    if (s.assignments.some(a => a.socketId === socketId)) return s;
  }
  return undefined;
}

export function removeSocketFromSession(socketId: string): GameSession | undefined {
  const session = getSessionBySocket(socketId);
  if (!session) return undefined;
  session.assignments = session.assignments.filter(a => a.socketId !== socketId);
  if (session.assignments.length === 0) {
    sessions.delete(session.roomCode);
  }
  return session;
}

export function updateSessionState(roomCode: string, stateJson: string): void {
  const s = sessions.get(roomCode);
  if (s) s.latestStateJson = stateJson;
}

export function deleteSession(roomCode: string): void {
  sessions.delete(roomCode);
}
