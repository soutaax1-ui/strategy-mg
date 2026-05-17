import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useNavigate, useLocation } from 'react-router';
import { connectSocket, getSocket } from './socketClient';
import { useGame } from './gameContext';
import { DIFF } from './constants';
import type { GameAction, UiState, GameState } from './types';

/* ── 型 ── */
export interface PlayerAssignment {
  socketId:   string;
  playerName: string;
  companyIdx: number;
  charaData?: {
    companyName:   string;
    presidentName: string;
    characterId:   string;
  };
}

interface StartedPayload {
  assignments: PlayerAssignment[];
  totalPeriods: number;
  difficulty: 'easy' | 'normal' | 'hard';
  roomCode: string;
  hostSocketId: string;
  fillWithAi: boolean;
}

interface MultiplayerSession {
  isMultiplayer: boolean;
  isHost:        boolean;
  myCompanyIdx:  number;
  assignments:   PlayerAssignment[];
  roomCode:      string | null;
}

interface MultiplayerContextValue extends MultiplayerSession {
  startGame: (totalPeriods: number, difficulty: 'easy' | 'normal' | 'hard', fillWithAi: boolean, onError?: (error: string) => void) => void;
  /* Bridge が state を更新するための setter (screens からは使わない) */
  _setSession: Dispatch<SetStateAction<MultiplayerSession>>;
}

const defaultSession: MultiplayerSession = {
  isMultiplayer: false,
  isHost:        false,
  myCompanyIdx:  -1,
  assignments:   [],
  roomCode:      null,
};

const MultiplayerContext = createContext<MultiplayerContextValue>({
  ...defaultSession,
  startGame:   () => { /* noop */ },
  _setSession: () => { /* noop */ },
});

/* ── Provider ── */
export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MultiplayerSession>(defaultSession);

  const startGame = useCallback(
    (
      totalPeriods: number,
      difficulty: 'easy' | 'normal' | 'hard',
      fillWithAi: boolean,
      onError?: (error: string) => void,
    ) => {
      getSocket().emit(
        'start_game',
        { totalPeriods, difficulty, fillWithAi },
        (res: { ok: true } | { ok: false; error: string }) => {
          if (!res.ok) onError?.(res.error);
        },
      );
    },
    [],
  );

  return (
    <MultiplayerContext.Provider
      value={{ ...session, startGame, _setSession: setSession }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
}

/* ── useMultiplayer ── */
export function useMultiplayer(): Omit<MultiplayerContextValue, '_setSession'> {
  const { _setSession: _, ...rest } = useContext(MultiplayerContext);
  return rest;
}

/* ────────────────────────────────────────────────────────────
 * MultiplayerBridge
 * Layout.tsx 内に配置する。
 * Router (useNavigate) + GameContext (dispatch) + MultiplayerContext
 * のすべてに同時アクセスできる唯一のコンポーネント。
 * ──────────────────────────────────────────────────────────── */
export function MultiplayerBridge() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { gs, ui, dispatch } = useGame();
  const { isMultiplayer, isHost, assignments, _setSession } = useContext(MultiplayerContext);

  /* ホスト: 前回 gs と比較してブロードキャスト */
  const prevGsRef = useRef<GameState | null>(null);

  /* Stale-closure 回避: 最新の gs / isHost / assignments を ref で追跡 */
  const currentGsRef    = useRef<GameState | null>(null);
  const isHostRef       = useRef(isHost);
  const assignmentsRef  = useRef(assignments);
  currentGsRef.current   = gs;
  isHostRef.current      = isHost;
  assignmentsRef.current = assignments;

  /* ── ソケットイベント登録 ── */
  useEffect(() => {
    const socket = connectSocket();

    /* 再接続時: 旧 socket ID でセッション復元を試みる */
    function handleConnect() {
      const prevId = sessionStorage.getItem('_mp_socket_id');
      sessionStorage.setItem('_mp_socket_id', socket.id!);
      if (!prevId || prevId === socket.id) return;
      socket.emit(
        'reconnect_session',
        prevId,
        (res: { ok: true; roomCode: string; companyIdx: number; isHost: boolean; assignments: PlayerAssignment[] } | { ok: false; error: string }) => {
          if (!res.ok) return;
          _setSession({
            isMultiplayer: true,
            isHost: res.isHost,
            myCompanyIdx: res.companyIdx,
            assignments: res.assignments,
            roomCode: res.roomCode,
          });
          socket.emit(
            'request_state',
            (stateRes: { ok: true; stateJson: string } | { ok: false; error: string }) => {
              if (!stateRes.ok) return;
              try {
                const { gs: syncGs, ui: syncUi } = JSON.parse(stateRes.stateJson) as { gs: GameState; ui: UiState };
                dispatch({ type: 'SET_STATE', gs: syncGs, ui: syncUi });
                navigate('/dashboard');
              } catch {}
            },
          );
        },
      );
    }
    socket.on('connect', handleConnect);

    /* game_started: 全員が受信 */
    socket.on('game_started', (payload: StartedPayload) => {
      const myId     = socket.id!;
      sessionStorage.setItem('_mp_socket_id', myId);
      const myAssign = payload.assignments.find(a => a.socketId === myId);
      const iAmHost  = myId === payload.hostSocketId;

      _setSession({
        isMultiplayer: true,
        isHost:        iAmHost,
        myCompanyIdx:  myAssign?.companyIdx ?? -1,
        assignments:   payload.assignments,
        roomCode:      payload.roomCode,
      });

      if (iAmHost) {
        const config = DIFF[payload.difficulty];
        // 全人間プレイヤーの会社を 'player' 型・プレイヤー名にオーバーライド
        // charaData がある場合は companyName/presidentName/characterId も注入
        const mpOverrides = payload.assignments.map(a => ({
          idx:           a.companyIdx,
          name:          a.playerName,
          type:          'player' as const,
          companyName:   a.charaData?.companyName,
          presidentName: a.charaData?.presidentName,
          characterId:   a.charaData?.characterId as import('./mascotTypes').MascotId | undefined,
        }));
        dispatch({
          type: 'INIT_GAME',
          totalPeriods: payload.totalPeriods,
          config,
          mpOverrides,
        });
        navigate('/dashboard');
      } else {
        // 非ホスト: 最新状態を要求してからゲーム画面へ
        socket.emit(
          'request_state',
          (res: { ok: true; stateJson: string } | { ok: false; error: string }) => {
            if (res.ok) {
              try {
                const { gs: syncGs, ui: syncUi } = JSON.parse(res.stateJson) as {
                  gs: GameState; ui: UiState;
                };
                dispatch({ type: 'SET_STATE', gs: syncGs, ui: syncUi });
                navigate('/dashboard');
              } catch {}
            }
          },
        );
      }
    });

    /* game_state: 非ホストがホストの状態を受信 */
    socket.on('game_state', (stateJson: string) => {
      try {
        const { gs: syncGs, ui: syncUi } = JSON.parse(stateJson) as {
          gs: GameState; ui: UiState;
        };
        dispatch({ type: 'SET_STATE', gs: syncGs, ui: syncUi });
        if (location.pathname === '/lobby' || location.pathname === '/') {
          navigate('/dashboard');
        }
      } catch (e) {
        console.warn('[mp] game_state parse error', e);
      }
    });

    /* player_action: ホストが非ホストのアクションを受信して dispatch */
    socket.on('player_action', (actionJson: string) => {
      try {
        const action = JSON.parse(actionJson) as GameAction & { _senderCompanyIdx?: unknown };
        const senderIdx = action._senderCompanyIdx;
        // サーバーが注入した _senderCompanyIdx がない場合は不正パケットとして棄却
        if (typeof senderIdx !== 'number') return;

        const currentGs = currentGsRef.current;
        if (currentGs) {
          const senderCompany = currentGs.companies[senderIdx];
          if (!senderCompany) return;

          // ターンベースのアクション: 送信者の手番か検証
          const TURN_ACTIONS = new Set<string>([
            'DRAW_MAIN_CARD', 'EXECUTE_ACTION', 'APPLY_RISK_CARD',
          ]);
          if (TURN_ACTIONS.has(action.type as string)) {
            if (currentGs.playerIdx !== senderIdx) return;
          }

          // action.company が存在する場合、gs の正規データで上書き (偽装防止)
          if ('company' in action && (action as Record<string, unknown>).company !== undefined) {
            (action as Record<string, unknown>).company = senderCompany;
          }
        }

        dispatch(action);
      } catch (e) {
        console.warn('[mp] player_action parse error', e);
      }
    });

    /* ホスト切断 */
    socket.on('host_disconnected', () => {
      _setSession(defaultSession);
      dispatch({ type: 'RESET_GAME' });
      navigate('/');
    });

    /* 非ホストプレイヤー切断: 30秒猶予後に発火 */
    socket.on('player_disconnected', ({ socketId }: { socketId: string }) => {
      const assignment = assignmentsRef.current.find(a => a.socketId === socketId);
      if (!assignment) return;
      // 全クライアント: マスコット playerLeave
      dispatch({ type: 'TRIGGER_MASCOT_EVENT', event: 'playerLeave' });
      // ホストのみ: 当該会社を AI に変換して進行継続
      if (isHostRef.current) {
        dispatch({ type: 'PLAYER_DISCONNECTED', companyIdx: assignment.companyIdx });
      }
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('game_started');
      socket.off('game_state');
      socket.off('player_action');
      socket.off('host_disconnected');
      socket.off('player_disconnected');
    };
  }, [_setSession, dispatch, navigate, location.pathname]);

  /* ── ホスト: gs/ui 変化をブロードキャスト ── */
  useEffect(() => {
    if (!isMultiplayer || !isHost || !gs) return;
    if (prevGsRef.current === gs) return;
    prevGsRef.current = gs;
    const socket = getSocket();
    if (!socket.connected) return;
    socket.emit('sync_state', JSON.stringify({ gs, ui }));
  }); // 毎レンダーチェック (変化なければスキップ)

  /* ── 非ホスト: phase に応じてナビゲーション ── */
  useEffect(() => {
    if (!isMultiplayer || isHost) return;
    if (ui.phase === 'auction' && location.pathname !== '/bidding') {
      navigate('/bidding');
    }
    if (
      ui.phase !== 'auction' &&
      location.pathname === '/bidding' &&
      !gs?.currentAuction?.resolved
    ) {
      navigate('/dashboard');
    }
  }, [ui.phase, isMultiplayer, isHost, location.pathname, navigate, gs]);

  return null;
}

/* ── useMpDispatch: マルチプレイヤー対応 dispatch ── */
export function useMpDispatch() {
  const { dispatch }  = useGame();
  const { isMultiplayer, isHost } = useMultiplayer();

  return useCallback(
    (action: GameAction) => {
      if (!isMultiplayer || isHost) {
        dispatch(action);
      } else {
        getSocket().emit('player_action', JSON.stringify(action));
      }
    },
    [dispatch, isMultiplayer, isHost],
  );
}
