import type { Server, Socket } from 'socket.io';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomBySocketId,
  getRoom,
  roomCount,
  type Room,
} from './room.js';
import {
  createSession,
  getSessionBySocket,
  updateSessionState,
  deleteSession,
  removeSocketFromSession,
  scheduleDisconnect,
  reassignSocket,
  type PlayerAssignment,
} from './game.js';

type Callback<T> = (res: T) => void;
type ErrRes = { ok: false; error: string }
const DIFFICULTIES = new Set(['easy', 'normal', 'hard']);

const BLOCKED_ACTION_TYPES = new Set([
  'INIT_GAME', 'SET_STATE', 'AI_TAKE_TURN', 'AI_COUNTER_DECIDED',
  'ADVANCE_PERIOD', 'RESOLVE_AUCTION', 'END_PERIOD',
]);

function handleLeave(io: Server, socket: Socket): void {
  const result = leaveRoom(socket.id);
  if (result) {
    socket.leave(result.code);
    io.to(result.code).emit('room_update', result.room);
    console.log(`[leave] ${socket.id} left ${result.code} — ${result.room.players.length} remaining`);
  }
}

export function setupSocket(io: Server): void {
  io.on('connection', socket => {
    console.log(`[connect] ${socket.id}  (rooms: ${roomCount()})`);

    /* ── ルーム作成 ── */
    socket.on(
      'create_room',
      (playerName: string, cb: Callback<{ ok: true; code: string; room: Room } | ErrRes>) => {
        if (!playerName?.trim()) { cb({ ok: false, error: 'プレイヤー名を入力してください' }); return; }
        handleLeave(io, socket);
        const room = createRoom(playerName.trim(), socket.id);
        socket.join(room.code);
        console.log(`[create] ${socket.id} (${playerName}) → ${room.code}`);
        cb({ ok: true, code: room.code, room });
      },
    );

    /* ── ルーム参加 ── */
    socket.on(
      'join_room',
      (code: string, playerName: string, cb: Callback<{ ok: true; code: string; room: Room } | ErrRes>) => {
        if (!playerName?.trim()) { cb({ ok: false, error: 'プレイヤー名を入力してください' }); return; }
        if (!code?.trim())       { cb({ ok: false, error: 'ルームコードを入力してください' }); return; }
        // 旧ルームを先に記録 (joinRoom が内部で leaveRoom を呼ぶため事前保存が必要)
        const oldRoomInfo = getRoomBySocketId(socket.id);
        // バリデーション後に joinRoom (内部で旧ルームから自動退出)
        const result = joinRoom(code.trim(), playerName.trim(), socket.id);
        if ('error' in result) { cb({ ok: false, error: result.error }); return; }
        // 旧 Socket.io ルームを退出し残留メンバーに通知
        if (oldRoomInfo) {
          socket.leave(oldRoomInfo.code);
          const updatedOld = getRoom(oldRoomInfo.code);
          if (updatedOld) io.to(oldRoomInfo.code).emit('room_update', updatedOld);
          console.log(`[leave] ${socket.id} left ${oldRoomInfo.code}`);
        }
        socket.join(result.room.code);
        io.to(result.room.code).emit('room_update', result.room);
        console.log(`[join] ${socket.id} (${playerName}) → ${result.room.code}  (${result.room.players.length}/${result.room.maxPlayers})`);
        cb({ ok: true, code: result.room.code, room: result.room });
      },
    );

    /* ── ルーム退出 ── */
    socket.on('leave_room', (cb?: Callback<{ ok: true }>) => {
      const session = getSessionBySocket(socket.id);
      handleLeave(io, socket);
      if (session?.hostSocketId === socket.id) {
        io.to(session.roomCode).emit('host_disconnected');
        deleteSession(session.roomCode);
      } else {
        removeSocketFromSession(socket.id);
      }
      cb?.({ ok: true });
    });

    /* ── 現在のルーム情報取得 ── */
    socket.on('get_room', (cb: Callback<{ ok: true; room: Room } | ErrRes>) => {
      const found = getRoomBySocketId(socket.id);
      if (!found) { cb({ ok: false, error: 'ルームに未参加です' }); return; }
      cb({ ok: true, room: found.room });
    });

    /* ────────────────────────────────────────────────
     *  Stage B: ゲームイベント
     * ──────────────────────────────────────────────── */

    /* ── ゲーム開始 (ホストのみ) ── */
    socket.on(
      'start_game',
      (
        payload: { totalPeriods: number; difficulty: string; fillWithAi?: boolean },
        cb: Callback<{ ok: true; assignments: PlayerAssignment[] } | ErrRes>,
	      ) => {
	        const roomInfo = getRoomBySocketId(socket.id);
	        if (!roomInfo) { cb({ ok: false, error: 'ルームに参加していません' }); return; }
	        if (roomInfo.room.hostId !== socket.id) { cb({ ok: false, error: 'ホストのみゲームを開始できます' }); return; }
	        if (!DIFFICULTIES.has(payload.difficulty)) { cb({ ok: false, error: '不正な難易度です' }); return; }
	        const totalPeriods = Math.max(1, Math.min(50, Math.floor(Number(payload.totalPeriods) || 10)));

	        const fillWithAi = payload.fillWithAi ?? false;
        const playerCount = roomInfo.room.players.length;
        const maxPlayers  = roomInfo.room.maxPlayers;
        // fillWithAi=false は全スロットを人間で埋める必要がある
        if (!fillWithAi && playerCount < maxPlayers) {
          cb({ ok: false, error: `AIなしモードは${maxPlayers}人必要です (現在${playerCount}人)` });
          return;
        }
        if (playerCount < 1) {
          cb({ ok: false, error: 'ホストが必要です' });
          return;
        }

        // 参加順にプレイヤーを会社に割り当て
        const assignments: PlayerAssignment[] = roomInfo.room.players.map((p, i) => ({
          socketId: p.id,
          playerName: p.name,
          companyIdx: i,
        }));

	        createSession(
	          roomInfo.code,
	          socket.id,
	          assignments,
	          totalPeriods,
	          payload.difficulty,
	        );

	        const broadcastPayload = {
	          assignments,
	          totalPeriods,
	          difficulty: payload.difficulty,
	          roomCode: roomInfo.code,
	          hostSocketId: socket.id,
	          fillWithAi,
	        };

        io.to(roomInfo.code).emit('game_started', broadcastPayload);
        console.log(`[game_started] ${roomInfo.code}  players: ${assignments.length}`);
        cb({ ok: true, assignments });
      },
    );

    /* ── 状態同期 (ホスト → 全員) ── */
    socket.on('sync_state', (stateJson: string) => {
      const session = getSessionBySocket(socket.id);
      if (!session || session.hostSocketId !== socket.id) return;
      updateSessionState(session.roomCode, stateJson);
      // ホスト以外の全員に配信
      socket.to(session.roomCode).emit('game_state', stateJson);
    });

	    /* ── プレイヤーアクション (非ホスト → ホスト) ── */
	    socket.on('player_action', (actionJson: string, ack?: Callback<{ ok: boolean }>) => {
	      const session = getSessionBySocket(socket.id);
	      if (!session || session.hostSocketId === socket.id) { ack?.({ ok: false }); return; }

	      const assignment = session.assignments.find(a => a.socketId === socket.id);
	      if (!assignment) { ack?.({ ok: false }); return; }

	      let action: Record<string, unknown>;
	      try {
	        action = JSON.parse(actionJson);
	        if (typeof action !== 'object' || action === null || typeof action.type !== 'string') {
	          ack?.({ ok: false }); return;
	        }
	      } catch { ack?.({ ok: false }); return; }

	      if (BLOCKED_ACTION_TYPES.has(action.type)) { ack?.({ ok: false }); return; }

	      // サーバー検証済みの会社インデックスを注入（クライアントから偽造不可）
	      action._senderCompanyIdx = assignment.companyIdx;

	      io.to(session.hostSocketId).emit('player_action', JSON.stringify(action));
	      ack?.({ ok: true });
	    });

    /* ── 最新状態を要求 (再接続・遅延参加) ── */
    socket.on('request_state', (cb: Callback<{ ok: true; stateJson: string } | ErrRes>) => {
      const session = getSessionBySocket(socket.id);
      if (!session) { cb({ ok: false, error: 'セッションが見つかりません' }); return; }
      if (!session.latestStateJson) { cb({ ok: false, error: 'ゲームがまだ開始されていません' }); return; }
      cb({ ok: true, stateJson: session.latestStateJson });
    });

    /* ── セッション再接続 (再接続後に旧 socket ID で割り当て復元) ── */
    socket.on(
      'reconnect_session',
      (
        prevSocketId: string,
        cb: Callback<{ ok: true; roomCode: string; companyIdx: number; isHost: boolean; assignments: PlayerAssignment[] } | ErrRes>,
      ) => {
        if (typeof prevSocketId !== 'string' || !prevSocketId.trim()) {
          cb({ ok: false, error: '不正なリクエストです' }); return;
        }
        const result = reassignSocket(prevSocketId.trim(), socket.id);
        if (!result) { cb({ ok: false, error: '再接続トークンが無効または期限切れです' }); return; }

        const { session, companyIdx } = result;
        socket.join(session.roomCode);
        console.log(`[reconnect] ${prevSocketId} → ${socket.id}  room:${session.roomCode}  idx:${companyIdx}`);
        cb({
          ok: true,
          roomCode: session.roomCode,
          companyIdx,
          isHost: session.hostSocketId === socket.id,
          assignments: session.assignments,
        });
      },
    );

	    /* ── 切断 ── */
	    socket.on('disconnect', () => {
	      console.log(`[disconnect] ${socket.id}`);
	      const session = getSessionBySocket(socket.id);
	      handleLeave(io, socket);
	      // ホストが切断したら即通知・セッション削除
	      if (session && session.hostSocketId === socket.id) {
	        io.to(session.roomCode).emit('host_disconnected');
	        deleteSession(session.roomCode);
	      } else if (session) {
	        // 非ホスト: 30秒のグレースピリアドで再接続を待つ
	        scheduleDisconnect(socket.id, (roomCode) => {
	          console.log(`[grace-expired] ${socket.id} removed from ${roomCode}`);
	          io.to(roomCode).emit('player_disconnected', { socketId: socket.id });
	        });
	      }
	    });
  });
}
