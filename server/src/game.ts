export interface PlayerAssignment {
  socketId:   string;
  playerName: string;
  companyIdx: number; // 0-3
  charaData?: {
    companyName:   string;
    presidentName: string;
    characterId:   string;
  };
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

const RECONNECT_GRACE_MS = 30_000;

interface PendingDisconnect {
  roomCode: string;
  companyIdx: number;
  playerName: string;
  timerId: ReturnType<typeof setTimeout>;
}

const pendingDisconnects = new Map<string, PendingDisconnect>();

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

export function scheduleDisconnect(
  socketId: string,
  onExpire: (roomCode: string) => void,
): void {
  const session = getSessionBySocket(socketId);
  if (!session) return;
  const assignment = session.assignments.find(a => a.socketId === socketId);
  if (!assignment) return;

  const timerId = setTimeout(() => {
    pendingDisconnects.delete(socketId);
    session.assignments = session.assignments.filter(a => a.socketId !== socketId);
    if (session.assignments.length === 0) sessions.delete(session.roomCode);
    onExpire(session.roomCode);
  }, RECONNECT_GRACE_MS);

  pendingDisconnects.set(socketId, {
    roomCode: session.roomCode,
    companyIdx: assignment.companyIdx,
    playerName: assignment.playerName,
    timerId,
  });
}

export function reassignSocket(
  prevSocketId: string,
  newSocketId: string,
): { session: GameSession; companyIdx: number; playerName: string } | undefined {
  const pending = pendingDisconnects.get(prevSocketId);
  if (!pending) return undefined;

  clearTimeout(pending.timerId);
  pendingDisconnects.delete(prevSocketId);

  const session = sessions.get(pending.roomCode);
  if (!session) return undefined;

  session.assignments = session.assignments.map(a =>
    a.socketId === prevSocketId ? { ...a, socketId: newSocketId } : a,
  );
  if (session.hostSocketId === prevSocketId) {
    session.hostSocketId = newSocketId;
  }
  return { session, companyIdx: pending.companyIdx, playerName: pending.playerName };
}

export function updateSessionState(roomCode: string, stateJson: string): void {
  const s = sessions.get(roomCode);
  if (s) s.latestStateJson = stateJson;
}

export function deleteSession(roomCode: string): void {
  sessions.delete(roomCode);
}
