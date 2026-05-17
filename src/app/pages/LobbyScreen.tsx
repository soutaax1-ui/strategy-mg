import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, LogIn, LogOut, Wifi, WifiOff, Copy, Check, Play, Bot } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import {
  connectSocket,
  getSocket,
  type Room,
  type RoomRes,
} from '../../lib/socketClient';
import { useMultiplayer } from '../../lib/multiplayerContext';
import { setBgm } from '../../lib/sound';

const AI_SLOTS = [
  { name: 'アルファ商事', borderColor: 'border-mg-pink',  textColor: 'text-mg-pink'  },
  { name: 'ベータ工業',   borderColor: 'border-mg-gold',  textColor: 'text-mg-gold'  },
  { name: 'ガンマ商会',   borderColor: 'border-mg-lime',  textColor: 'text-mg-lime'  },
] as const;

type ConnState = 'disconnected' | 'connecting' | 'connected';
type View = 'menu' | 'room';

export function LobbyScreen() {
  const [connState, setConnState] = useState<ConnState>('disconnected');
  const [view,      setView]      = useState<View>('menu');
  const [playerName, setPlayerName] = useState('');
  const [joinCode,   setJoinCode]   = useState('');
  const [room,       setRoom]       = useState<Room | null>(null);
  const [myCode,     setMyCode]     = useState<string | null>(null);
  const [error,      setError]      = useState('');
  const [copied,     setCopied]     = useState(false);

  // ゲーム設定 (ホストのみ選択)
  const [totalPeriods, setTotalPeriods] = useState(10);
  const [difficulty,   setDifficulty]   = useState<'easy' | 'normal' | 'hard'>('normal');
  const [fillWithAi,   setFillWithAi]   = useState(true);

  const { startGame } = useMultiplayer();

  useEffect(() => { setBgm('title'); }, []);

  /* ── ソケット接続 ── */
  useEffect(() => {
    const socket = connectSocket();
    // すでに接続済みの場合は connect イベントが再発火しないため即時反映
    setConnState(socket.connected ? 'connected' : 'connecting');

    socket.on('connect',    () => setConnState('connected'));
    socket.on('disconnect', () => { setConnState('disconnected'); setRoom(null); setView('menu'); });
    socket.on('room_update', (updatedRoom: Room) => setRoom(updatedRoom));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room_update');
    };
  }, []);

  /* ── ルーム作成 ── */
  const handleCreate = useCallback(() => {
    setError('');
    if (!playerName.trim()) { setError('プレイヤー名を入力してください'); return; }
    const charaRaw  = sessionStorage.getItem('mp_chara');
    const charaData = charaRaw ? (() => { try { return JSON.parse(charaRaw); } catch { return undefined; } })() : undefined;
    getSocket().emit('create_room', { playerName: playerName.trim(), charaData }, (res: RoomRes) => {
      if (!res.ok) { setError(res.error); return; }
      setRoom(res.room);
      setMyCode(res.code);
      setView('room');
    });
  }, [playerName]);

  /* ── ルーム参加 ── */
  const handleJoin = useCallback(() => {
    setError('');
    if (!playerName.trim()) { setError('プレイヤー名を入力してください'); return; }
    if (!joinCode.trim())   { setError('ルームコードを入力してください'); return; }
    const charaRaw  = sessionStorage.getItem('mp_chara');
    const charaData = charaRaw ? (() => { try { return JSON.parse(charaRaw); } catch { return undefined; } })() : undefined;
    getSocket().emit('join_room', { code: joinCode.trim().toUpperCase(), playerName: playerName.trim(), charaData }, (res: RoomRes) => {
      if (!res.ok) { setError(res.error); return; }
      setRoom(res.room);
      setMyCode(res.code);
      setView('room');
    });
  }, [playerName, joinCode]);

  /* ── 退出 ── */
  const handleLeave = useCallback(() => {
    getSocket().emit('leave_room');
    setRoom(null);
    setMyCode(null);
    setView('menu');
  }, []);

  /* ── コードコピー ── */
  const handleCopy = useCallback(() => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [myCode]);

  /* ── ゲーム開始 ── */
  const handleStartGame = useCallback(() => {
    setError('');
    startGame(totalPeriods, difficulty, fillWithAi, setError);
  }, [startGame, totalPeriods, difficulty, fillWithAi]);

  const isHost = room ? getSocket().id === room.hostId : false;
  const canStart = isHost && (room?.players.length ?? 0) >= (fillWithAi ? 1 : 2);

  /* ── 接続インジケーター ── */
  const ConnBadge = () => (
    <div className={`flex items-center gap-2 text-xs font-mono px-3 py-1 border ${
      connState === 'connected'   ? 'border-mg-success text-mg-success' :
      connState === 'connecting'  ? 'border-mg-gold   text-mg-gold   animate-pulse' :
                                    'border-mg-danger  text-mg-danger'
    }`}>
      {connState === 'connected'
        ? <><Wifi size={13} /> 接続中</>
        : connState === 'connecting'
        ? <><Wifi size={13} /> 接続中...</>
        : <><WifiOff size={13} /> 未接続</>}
    </div>
  );

  const difficulties: { id: 'easy' | 'normal' | 'hard'; label: string; color: string }[] = [
    { id: 'easy',   label: 'Easy',   color: 'text-green-400' },
    { id: 'normal', label: 'Normal', color: 'text-mg-cyan'   },
    { id: 'hard',   label: 'Hard',   color: 'text-mg-danger' },
  ];

  return (
    <div className="min-h-screen w-full bg-mg-base flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
        <h1 className="font-press text-3xl text-mg-gold drop-shadow-[0_0_10px_rgba(255,186,8,0.5)]">
          オンライン対戦
        </h1>
        <ConnBadge />
      </div>

      <AnimatePresence mode="wait">

        {/* ── メニュー ── */}
        {view === 'menu' && (
          <motion.div
            key="menu"
            className="w-full max-w-2xl flex flex-col gap-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
          >
            {/* プレイヤー名 */}
            <Card className="p-6">
              <label className="font-dot text-sm text-mg-text-secondary mb-2 block">
                プレイヤー名
              </label>
              <input
                type="text"
                maxLength={16}
                placeholder="例: Taro"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full bg-transparent border-b-2 border-mg-border text-2xl font-mono outline-none focus:border-mg-cyan text-white py-1"
              />
            </Card>

            <div className="grid grid-cols-2 gap-4">
              {/* 作成 */}
              <Card className="p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2 font-dot text-lg text-mg-cyan">
                  <Plus size={20} /> ルーム作成
                </div>
                <p className="font-noto text-xs text-mg-text-secondary">
                  新しいルームを作成し、4桁のコードを仲間に教えましょう。
                </p>
                <Button
                  variant="primary"
                  onClick={handleCreate}
                  disabled={connState !== 'connected'}
                  className="shadow-[4px_4px_0px_#000]"
                >
                  <Plus size={16} className="mr-2" /> 作成する
                </Button>
              </Card>

              {/* 参加 */}
              <Card className="p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2 font-dot text-lg text-mg-gold">
                  <LogIn size={20} /> ルーム参加
                </div>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="4桁コード (例: AB3K)"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  className="w-full bg-transparent border-b-2 border-mg-border text-xl font-mono tracking-widest text-center outline-none focus:border-mg-gold text-white py-1"
                />
                <Button
                  variant="secondary"
                  onClick={handleJoin}
                  disabled={connState !== 'connected'}
                  className="shadow-[4px_4px_0px_#000]"
                >
                  <LogIn size={16} className="mr-2" /> 参加する
                </Button>
              </Card>
            </div>

            {error && (
              <div className="border border-mg-danger bg-mg-danger/10 text-mg-danger font-noto text-sm p-3 text-center">
                {error}
              </div>
            )}
          </motion.div>
        )}

        {/* ── ルーム画面 ── */}
        {view === 'room' && room && (
          <motion.div
            key="room"
            className="w-full max-w-2xl flex flex-col gap-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
          >
            {/* ルームコード */}
            <Card glowColor="cyan" className="p-5 flex flex-col items-center gap-2">
              <div className="font-dot text-sm text-mg-text-secondary">ルームコード</div>
              <div className="flex items-center gap-4">
                <span className="font-press text-5xl text-mg-cyan tracking-widest drop-shadow-[0_0_20px_rgba(0,217,255,0.6)]">
                  {room.code}
                </span>
                <button
                  onClick={handleCopy}
                  className="text-mg-text-secondary hover:text-mg-cyan transition-colors"
                  title="コードをコピー"
                >
                  {copied ? <Check size={22} className="text-mg-success" /> : <Copy size={22} />}
                </button>
              </div>
              <div className="font-noto text-xs text-mg-text-secondary">
                このコードを仲間に共有してください
              </div>
            </Card>

            {/* メンバー一覧 */}
            <Card className="p-5">
              <div className="flex items-center gap-2 font-dot text-base mb-3">
                <Users size={18} className="text-mg-cyan" />
                参加者 {room.players.length} / {room.maxPlayers}
                {canStart
                  ? <span className="ml-auto text-xs text-mg-success font-noto">開始可能</span>
                  : <span className="ml-auto text-xs text-mg-text-secondary font-noto">あと{2 - room.players.length}人必要</span>}
              </div>
              <div className="flex flex-col gap-2">
                {room.players.map((p, i) => (
                  <motion.div
                    key={p.id}
                    className={`flex items-center gap-3 p-3 border-l-4 bg-mg-elevated ${
                      p.id === room.hostId ? 'border-mg-gold' : 'border-mg-border'
                    }`}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <span className={`font-dot text-sm w-6 text-center ${
                      p.id === room.hostId ? 'text-mg-gold' : 'text-mg-text-secondary'
                    }`}>
                      {p.id === room.hostId ? '★' : `${i + 1}`}
                    </span>
                    <span className="font-mono text-white flex-1">{p.name}</span>
                    {p.id === room.hostId && (
                      <span className="text-xs bg-mg-gold text-[#000] px-2 py-0.5 font-dot">HOST</span>
                    )}
                    {p.id === getSocket().id && (
                      <span className="text-xs bg-mg-cyan text-[#000] px-2 py-0.5 font-dot">YOU</span>
                    )}
                  </motion.div>
                ))}
                {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => {
                  const slotIdx = room.players.length + i; // 0-based company index
                  const aiSlot  = fillWithAi ? AI_SLOTS[slotIdx - 1] : null;
                  return aiSlot ? (
                    <motion.div
                      key={`ai-${i}`}
                      className={`flex items-center gap-3 p-3 border-l-4 bg-mg-elevated/50 ${aiSlot.borderColor}`}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: (room.players.length + i) * 0.05 }}
                    >
                      <Bot size={14} className={`w-6 ${aiSlot.textColor}`} />
                      <span className={`font-mono flex-1 ${aiSlot.textColor}`}>{aiSlot.name}</span>
                      <span className="text-xs bg-mg-elevated border border-mg-border text-mg-text-secondary px-2 py-0.5 font-dot">AI</span>
                    </motion.div>
                  ) : (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center gap-3 p-3 border-l-4 border-mg-border/30 bg-mg-elevated/30 opacity-30"
                    >
                      <span className="font-dot text-sm w-6 text-center text-mg-border">
                        {slotIdx + 1}
                      </span>
                      <span className="font-noto text-mg-text-secondary text-sm">待機中...</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* ゲーム設定 (ホストのみ) */}
            {isHost && (
              <Card className="p-5">
                <div className="font-dot text-sm text-mg-text-secondary mb-3">ゲーム設定 (ホストのみ)</div>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-6 items-start">
                    {/* 期数 */}
                    <div>
                      <div className="font-dot text-xs text-mg-text-secondary mb-2">期数</div>
                      <div className="flex gap-2">
                        {[5, 10, 20].map(p => (
                          <button
                            key={p}
                            onClick={() => setTotalPeriods(p)}
                            className={`w-14 py-1.5 font-dot text-sm border-2 transition-colors ${
                              totalPeriods === p
                                ? 'border-mg-cyan bg-mg-cyan/10 text-mg-cyan'
                                : 'border-mg-border text-mg-text-secondary hover:border-mg-text-secondary'
                            }`}
                          >
                            {p}期
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* 難易度 */}
                    <div>
                      <div className="font-dot text-xs text-mg-text-secondary mb-2">難易度</div>
                      <div className="flex gap-2">
                        {difficulties.map(d => (
                          <button
                            key={d.id}
                            onClick={() => setDifficulty(d.id)}
                            className={`px-3 py-1.5 font-dot text-sm border-2 transition-colors ${
                              difficulty === d.id
                                ? 'border-mg-gold bg-mg-gold/10'
                                : 'border-mg-border text-mg-text-secondary hover:border-mg-text-secondary'
                            } ${d.color}`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* AI 空席埋め */}
                  <div className="flex items-center justify-between border-t border-mg-border pt-3">
                    <div>
                      <div className="font-dot text-xs text-white flex items-center gap-2">
                        <Bot size={14} className="text-mg-text-secondary" />
                        AI で空席を埋める
                      </div>
                      <div className="font-noto text-xs text-mg-text-secondary mt-0.5">
                        空席にアルファ商事・ベータ工業・ガンマ商会が参加
                      </div>
                    </div>
                    <button
                      onClick={() => setFillWithAi(v => !v)}
                      className={`relative w-12 h-6 border-2 transition-colors ${
                        fillWithAi ? 'border-mg-cyan bg-mg-cyan/20' : 'border-mg-border bg-transparent'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 transition-all ${
                        fillWithAi ? 'right-0.5 bg-mg-cyan' : 'left-0.5 bg-mg-border'
                      }`} />
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {/* フッター */}
            <div className="flex justify-between items-center">
              <Button variant="secondary" onClick={handleLeave}>
                <LogOut size={16} className="mr-2" /> 退出する
              </Button>
              {isHost ? (
                <Button
                  variant="primary"
                  disabled={!canStart}
                  onClick={handleStartGame}
                  className={`shadow-[4px_4px_0px_#000] ${!canStart ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <Play size={16} className="mr-2" />
                  ゲーム開始
                </Button>
              ) : (
                <div className="font-dot text-sm text-mg-text-secondary animate-pulse">
                  ホストの開始を待っています...
                </div>
              )}
            </div>

            {error && (
              <div className="border border-mg-danger bg-mg-danger/10 text-mg-danger font-noto text-sm p-3 text-center">
                {error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
