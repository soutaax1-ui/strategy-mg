import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, Factory, Users, Cpu, Beaker, MapPin,
  AlertTriangle, TrendingUp, ChevronRight, Clock, Bot, Megaphone,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ActionModal } from '../components/ActionModal';
import { useGame, usePlayer } from '../../lib/gameContext';
import { CITIES } from '../../lib/constants';
import { drawFromRiskDeck, prodCap } from '../../lib/gameState';
import type { Company, GameState } from '../../lib/types';
import { setBgm, playSfx } from '../../lib/sound';
import { useMultiplayer, useMpDispatch } from '../../lib/multiplayerContext';
import { PresidentMascot } from '../components/PresidentMascot';

const COLOR_MAP: Record<string, string> = {
  player: 'cyan', alpha: 'pink', beta: 'gold', gamma: 'lime',
};

const CHART_COLORS: Record<string, string> = {
  player: '#00d9ff', alpha: '#ff4d8d', beta: '#ffba08', gamma: '#80ed99',
};
const TEXT_COLOR: Record<string, string> = {
  player: 'text-mg-cyan', alpha: 'text-mg-pink', beta: 'text-mg-gold', gamma: 'text-mg-lime',
};

/* ── 順位バッジスタイル ── */
const RANK_BADGE: Record<number, string> = {
  1: 'bg-mg-gold   text-[#000] border-mg-gold',
  2: 'bg-[#B0B8C8] text-[#000] border-[#B0B8C8]',
  3: 'bg-[#C47E32] text-[#000] border-[#C47E32]',
  4: 'bg-mg-elevated text-mg-text-secondary border-mg-border',
};

/* ── 前期比ステータス判定 ── */
function getCompanyStatus(company: Company) {
  const h = company.history;
  if (h.length < 1) return null;

  let pct: number;
  if (h.length >= 2) {
    const d1 = h[h.length - 1] - h[h.length - 2];
    const d2 = h.length >= 3 ? h[h.length - 2] - h[h.length - 3] : null;
    pct = d2 !== null && Math.abs(d2) > 0.1
      ? (d1 - d2) / Math.abs(d2) * 100
      : d1 > 0 ? 30 : d1 < 0 ? -30 : 0;
  } else {
    const op = company.result?.opProfit ?? 0;
    pct = op > 0 ? 25 : op < 0 ? -25 : 0;
  }

  if (pct >= 20)  return { label: '絶好調', stars: '★4.5', cls: 'text-mg-success  border-mg-success  bg-mg-success/10'  };
  if (pct >= 0)   return { label: '好調',   stars: '★3.5', cls: 'text-blue-400   border-blue-400   bg-blue-400/10'   };
  if (pct >= -20) return { label: '安定',   stars: '★3.0', cls: 'text-yellow-400 border-yellow-400 bg-yellow-400/10' };
  return           { label: '低調',   stars: '★1.5', cls: 'text-mg-danger   border-mg-danger   bg-mg-danger/10'  };
}

/* ── KPI カード (自社 1期前比) ── */
function KpiCards({ player, gs }: { player: Company; gs: GameState }) {
  const r  = player.result;
  const h  = player.history;
  const pq = r?.revenue ?? 0;
  const g  = r?.opProfit ?? 0;

  const totalSold  = gs.companies.reduce((s, c) => s + (c.result?.soldQty ?? 0), 0);
  const playerSold = r?.soldQty ?? 0;
  const share      = totalSold > 0 ? Math.round(playerSold / totalSold * 100) : 0;

  const gTrend: number | null = (() => {
    if (h.length < 3) return null;
    const d1 = h[h.length - 1] - h[h.length - 2];
    const d2 = h[h.length - 2] - h[h.length - 3];
    return Math.abs(d2) > 0.1 ? Math.round((d1 - d2) / Math.abs(d2) * 100) : null;
  })();

  return (
    <div className="flex gap-1.5 shrink-0">
      <div className="flex flex-col border border-mg-border bg-mg-elevated/60 px-2.5 py-1.5 min-w-[72px]">
        <div className="flex items-center gap-1">
          <TrendingUp size={10} className="text-mg-text-secondary shrink-0" />
          <span className="font-dot text-[10px] text-mg-text-secondary">売上 PQ</span>
        </div>
        <span className="font-mono font-bold text-sm text-white">{pq > 0 ? `${pq}万` : '—'}</span>
      </div>

      <div className="flex flex-col border border-mg-border bg-mg-elevated/60 px-2.5 py-1.5 min-w-[72px]">
        <div className="flex items-center gap-1">
          <TrendingUp size={10} className="text-mg-text-secondary shrink-0" />
          <span className="font-dot text-[10px] text-mg-text-secondary">利益 G</span>
        </div>
        <span className={`font-mono font-bold text-sm ${g > 0 ? 'text-mg-success' : g < 0 ? 'text-mg-danger' : 'text-white'}`}>
          {r ? `${g >= 0 ? '+' : ''}${g}万` : '—'}
        </span>
        {gTrend !== null && (
          <span className={`font-mono text-[10px] leading-none ${gTrend >= 0 ? 'text-mg-success' : 'text-mg-danger'}`}>
            {gTrend >= 0 ? '↑' : '↓'}{Math.abs(gTrend)}%
          </span>
        )}
      </div>

      <div className="flex flex-col border border-mg-border bg-mg-elevated/60 px-2.5 py-1.5 min-w-[72px]">
        <div className="flex items-center gap-1">
          <MapPin size={10} className="text-mg-text-secondary shrink-0" />
          <span className="font-dot text-[10px] text-mg-text-secondary">市場シェア</span>
        </div>
        <span className="font-mono font-bold text-sm text-mg-cyan">{share > 0 ? `${share}%` : '—'}</span>
      </div>
    </div>
  );
}

/* ── 都市別シェアカード ── */
function CityShareCards({ gs }: { gs: GameState }) {
  return (
    <div className="flex gap-1.5 flex-1 min-w-0 overflow-hidden">
      {CITIES.map(city => {
        const rem        = gs.cityVols[city.id] ?? 0;
        const consumed   = Math.max(0, city.vol - rem);
        const sold       = gs.playerHistory?.citySales?.[city.id as keyof typeof gs.playerHistory.citySales] ?? 0;
        const share      = consumed > 0 ? Math.round((sold as number) / consumed * 100) : 0;
        const isLeading  = (sold as number) > 0 && share >= 50;

        return (
          <div
            key={city.id}
            className={`flex flex-col items-center border px-1.5 py-1 min-w-[50px] shrink-0 ${
              isLeading
                ? 'border-mg-cyan bg-mg-cyan/15'
                : (sold as number) > 0
                ? 'border-mg-border bg-mg-elevated/60'
                : 'border-mg-border/30 bg-mg-elevated/20 opacity-40'
            }`}
          >
            <span className="font-dot text-[9px] text-mg-text-secondary leading-none">{city.name}</span>
            <span className={`font-mono text-sm font-bold leading-tight ${isLeading ? 'text-mg-cyan' : 'text-white'}`}>
              {share}%
            </span>
            <span className="font-mono text-[9px] text-mg-text-secondary leading-none">{rem}残</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── 純資産推移グラフ ── */
function EquityChart({ gs, playerIdx }: { gs: GameState; playerIdx: number }) {
  const maxLen = Math.max(...gs.companies.map(c => c.history.length));
  if (maxLen === 0) {
    return (
      <div className="px-3 py-2 text-[10px] text-mg-text-secondary font-dot">
        期末後に表示
      </div>
    );
  }

  const data = Array.from({ length: maxLen }, (_, i) => {
    const point: Record<string, number | string> = { period: `${i + 1}期` };
    gs.companies.forEach(c => {
      if (i < c.history.length) point[c.id] = c.history[i];
    });
    return point;
  });

  return (
    <div className="px-2 pt-2 pb-1 border-b-2 border-mg-border">
      <div className="font-dot text-[10px] text-mg-text-secondary mb-1">純資産推移 (万円)</div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
          <XAxis dataKey="period" tick={{ fontSize: 8, fill: '#666' }} interval={0} />
          <YAxis tick={{ fontSize: 8, fill: '#666' }} />
          <Tooltip
            contentStyle={{ background: '#1a1830', border: '1px solid #333', fontSize: 10 }}
            labelStyle={{ color: '#aaa' }}
            formatter={(v: number) => [`${v}万`, '']}
          />
          <Legend
            iconType="line"
            wrapperStyle={{ fontSize: 9, paddingTop: 2 }}
          />
          {gs.companies.map((c, i) => (
            <Line
              key={c.id}
              type="monotone"
              dataKey={c.id}
              name={c.name}
              stroke={CHART_COLORS[c.id] ?? '#888'}
              strokeWidth={i === playerIdx ? 2.5 : 1.2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── リソースカード (自社) ── */
function ResourceCards({ player }: { player: Company }) {
  const cap = prodCap(player);
  const mfg = player.staffRoles.manufacturing;
  const machineCount = player.smallMachines + player.largeMachines;
  const invPct = cap > 0 ? Math.min(100, Math.round(player.productInventory / cap * 100)) : 0;

  return (
    <div className="shrink-0 flex gap-1.5 px-3 py-1.5 border-b-2 border-mg-border bg-mg-base/30">
      {/* 在庫 */}
      <div className="flex flex-col border border-mg-border bg-mg-elevated/60 px-2 py-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <Package size={9} className="text-mg-text-secondary shrink-0" />
          <span className="font-dot text-[9px] text-mg-text-secondary truncate">在庫</span>
        </div>
        <span className="font-mono font-bold text-xs text-white">{player.productInventory}個</span>
        <div className="mt-1 h-1 bg-mg-border w-full">
          <div className="h-full bg-mg-cyan" style={{ width: `${invPct}%` }} />
        </div>
        <span className="font-mono text-[8px] text-mg-text-secondary leading-tight">/{cap}個</span>
      </div>

      {/* 生産能力 */}
      <div className="flex flex-col border border-mg-border bg-mg-elevated/60 px-2 py-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <Factory size={9} className="text-mg-text-secondary shrink-0" />
          <span className="font-dot text-[9px] text-mg-text-secondary truncate">生産能力</span>
        </div>
        <span className="font-mono font-bold text-xs text-white">{cap}個/期</span>
        <span className="font-mono text-[8px] text-mg-text-secondary leading-tight">
          社員{mfg.employees}×2{machineCount > 0 ? ` + 機械${machineCount}台` : ''}
        </span>
      </div>

      {/* 広告 */}
      <div className="flex flex-col border border-mg-border bg-mg-elevated/60 px-2 py-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <Megaphone size={9} className="text-mg-text-secondary shrink-0" />
          <span className="font-dot text-[9px] text-mg-text-secondary truncate">チラシ</span>
        </div>
        <span className="font-mono font-bold text-xs text-white">{player.flyerChips}枚</span>
        <span className="font-mono text-[8px] text-mg-text-secondary leading-tight">
          今期 {player.periodAdSpend}万円
        </span>
      </div>

      {/* 社員 */}
      <div className="flex flex-col border border-mg-border bg-mg-elevated/60 px-2 py-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <Users size={9} className="text-mg-text-secondary shrink-0" />
          <span className="font-dot text-[9px] text-mg-text-secondary truncate">人員</span>
        </div>
        <span className="font-mono font-bold text-xs text-white">{player.employees + player.partTimers}名</span>
        <span className="font-mono text-[8px] text-mg-text-secondary leading-tight">
          正{player.employees}/パ{player.partTimers}
        </span>
      </div>
    </div>
  );
}

export function DashboardScreen() {
  const navigate  = useNavigate();
  const { gs, ui, dispatch, triggerMascotEvent } = useGame();
  const fallbackPlayer = usePlayer();
  const mpDispatch = useMpDispatch();
  const { isMultiplayer, isHost, myCompanyIdx, assignments } = useMultiplayer();

  const [cardDrawn,   setCardDrawn]   = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [logTab,      setLogTab]      = useState<'all' | 'trade' | 'action' | 'event'>('all');

  // ゲーム未初期化ならタイトルに戻す
  useEffect(() => {
    if (!gs) navigate('/');
  }, [gs, navigate]);

  // BGM: ゲーム画面に入ったら game1 を開始 (sound.ts 内で game1↔game2 自動交互)
  useEffect(() => { setBgm('game1'); }, []);

  // フェーズが draw-ready に変わったらカードをリセット
  useEffect(() => {
    if (ui.phase === 'draw-ready') setCardDrawn(false);
  }, [ui.phase]);

  // オークション開始時は BiddingScreen へ (シングルプレイ or ホスト)
  useEffect(() => {
    if (ui.phase === 'auction' && (!isMultiplayer || isHost)) navigate('/bidding');
  }, [ui.phase, navigate, isMultiplayer, isHost]);

  // アイドルタイマー: 60秒操作なしで idleTooLong イベント発火
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      triggerMascotEvent('idleTooLong');
    }, 60_000);
  }, [triggerMascotEvent]);
  useEffect(() => {
    if (ui.phase !== 'draw-ready' && ui.phase !== 'action-menu') return;
    resetIdleTimer();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, [ui.phase, resetIdleTimer]);

  // マルチ: 自分の会社番号のターンが「プレイヤーターン」
  const effectiveMyIdx = isMultiplayer ? myCompanyIdx : 0;
  const player = gs?.companies[effectiveMyIdx] ?? fallbackPlayer;
  if (!gs || !player) return null;

  // 自己資本で順位計算 (毎 render で最新値)
  const rankMap = new Map(
    [...gs.companies]
      .sort((a, b) => (b.capital + b.retainedEarnings) - (a.capital + a.retainedEarnings))
      .map((c, i) => [c.id, i + 1])
  );

  const currentCompany = gs.companies[gs.playerIdx];
  const isMyTurn       = gs.playerIdx === effectiveMyIdx;
  // マルチ: 現在のターンが人間プレイヤーのものかどうか
  const currentIsHuman = isMultiplayer
    ? assignments.some(a => a.companyIdx === gs.playerIdx)
    : gs.playerIdx === 0;
  const isLastPeriod   = gs.currentPeriod >= gs.totalPeriods;

  function handleDrawCard() {
    playSfx('cardDraw');
    setCardDrawn(true);
    mpDispatch({ type: 'DRAW_MAIN_CARD' });
  }

  function handleActionDone() {
    playSfx('confirm');
    setModalOpen(false);
    setCardDrawn(false);
  }

  function handleEndPeriod() {
    mpDispatch({ type: 'END_PERIOD' });
    navigate('/accounting');
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0914] relative">
      {/* Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent" />

      {/* ===== Header ===== */}
      <header className="h-16 border-b-2 border-mg-border bg-mg-surface flex items-center justify-between px-6 z-10">
        <div className="w-1/3 font-dot text-xl">
          第{gs.currentPeriod}期 / 全{gs.totalPeriods}期
        </div>
        <div className="w-1/3 flex flex-col items-center">
          <div className="font-dot text-mg-text-secondary text-sm">
            ラウンド {Math.min(gs.round, 10)} / 10
          </div>
          <div className={`font-dot text-sm ${isMyTurn ? 'text-mg-gold animate-pulse' : 'text-mg-text-secondary'}`}>
            {isMyTurn ? 'あなたのターン' : `${currentCompany?.name} のターン`}
          </div>
        </div>
        <div className="w-1/3 flex justify-end gap-1 flex-wrap">
          {CITIES.map(city => {
            const rem = gs.cityVols[city.id];
            return (
              <div key={city.id} className={`flex items-center gap-0.5 border px-1.5 py-0.5 text-xs font-mono ${
                rem === 0 ? 'border-mg-danger text-mg-danger opacity-50' :
                rem <= 2  ? 'border-yellow-500 text-yellow-400' :
                'border-mg-border text-mg-text-secondary'
              }`}>
                <span>{city.name}</span>
                <span className="font-bold ml-0.5">{rem}</span>
              </div>
            );
          })}
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="flex-1 flex overflow-hidden z-10">

        {/* Left: Company cards */}
        <div className="w-[260px] border-r-2 border-mg-border bg-mg-base p-3 flex flex-col gap-3 overflow-y-auto">
          {gs.companies.map((company, i) => (
            <CompanyCard key={company.id} company={company} isActive={i === gs.playerIdx} isMyCompany={i === effectiveMyIdx} rank={rankMap.get(company.id) ?? 4} />
          ))}
        </div>

        {/* Center: KPI strip + Card draw area */}
        <div className="flex-1 flex flex-col bg-[#131122] relative overflow-hidden">
          {/* KPI + 都市シェア */}
          <div className="shrink-0 flex items-stretch gap-2 px-3 py-1.5 border-b-2 border-mg-border bg-mg-base/50">
            <KpiCards player={player} gs={gs} />
            <div className="w-px bg-mg-border shrink-0" />
            <CityShareCards gs={gs} />
          </div>

          {/* リソースカード */}
          <ResourceCards player={player} />

          {/* ゲームコンテンツ (flex-1 に収める) */}
          <div className="flex-1 flex flex-col items-center justify-center relative">

          {/* Phase: period-start */}
          {ui.phase === 'period-start' && isMyTurn && (
            <PeriodStartView gs={gs} player={player} dispatch={mpDispatch} />
          )}

          {/* Phase: period-done */}
          {ui.phase === 'period-done' && (!isMultiplayer || isHost) && (
            <div className="text-center">
              <div className="font-dot text-2xl text-mg-gold mb-6">第{gs.currentPeriod}期 終了</div>
              <div className="font-noto text-mg-text-secondary mb-8">全10ラウンドが完了しました。期末決算に進みます。</div>
            <Button variant="primary" size="lg" onClick={handleEndPeriod} className="shadow-[6px_6px_0px_#000]">
                期末決算へ進む <ChevronRight className="ml-2" />
              </Button>
            </div>
          )}

          {/* マルチ: 他プレイヤーの番を待つオーバーレイ */}
          {isMultiplayer && !isMyTurn && currentIsHuman && ui.phase !== 'ai-thinking' && (
            <WaitingView playerName={currentCompany?.name ?? '...'} />
          )}

          {/* Phase: draw-ready / action-menu */}
          {(ui.phase === 'draw-ready' || ui.phase === 'action-menu') && isMyTurn && (
            <>
              {/* Card flip */}
              <div className="mb-10 relative w-[220px] h-[310px]">
                <AnimatePresence mode="wait">
                  {!cardDrawn ? (
                    <motion.div key="back"
                      className="absolute inset-0 bg-mg-elevated border-4 border-mg-border shadow-[8px_8px_0px_#000] flex items-center justify-center cursor-pointer hover:border-mg-cyan transition-colors"
                      initial={{ rotateY: -90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{ rotateY: 90, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={handleDrawCard}
                    >
                      <div className="font-press text-6xl text-mg-border">?</div>
                    </motion.div>
                  ) : (
                    <motion.div key="front"
                      className={`absolute inset-0 border-4 shadow-[8px_8px_0px_#000] flex flex-col items-center p-4 ${
                        ui.drawnCard?.type === 'risk-trigger'
                          ? 'bg-red-950 border-mg-danger'
                          : 'bg-white border-mg-gold'
                      }`}
                      initial={{ rotateY: -90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {ui.drawnCard?.type === 'risk-trigger' ? (
                        <>
                          <AlertTriangle className="w-16 h-16 text-mg-danger mb-3" />
                          <h3 className="font-dot text-xl text-mg-danger">リスクカード</h3>
                          <p className="font-noto text-sm text-red-300 text-center mt-2">リスクデッキから1枚引きます</p>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-14 h-14 text-mg-gold mb-3" />
                          <h3 className="font-dot text-2xl text-slate-800">意思決定カード</h3>
                          <p className="font-noto text-sm text-gray-600 text-center mt-2">行動を1つ選んでください</p>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {!cardDrawn ? (
                <Button size="lg" onClick={handleDrawCard} className="animate-bounce">
                  カードを引く
                </Button>
              ) : ui.drawnCard?.type === 'decision' ? (
                <Button size="lg" onClick={() => setModalOpen(true)}
                  className="bg-mg-gold text-[#000] shadow-[4px_4px_0px_#000,0_0_15px_rgba(255,186,8,0.5)]">
                  行動を選択
                </Button>
              ) : (
                <Button size="lg" variant="secondary" onClick={() => {
                  // リスクカードは risk-trigger フェーズへ遷移済み (DRAW_MAIN_CARD が処理)
                  // 実際には phase='risk-trigger' に切り替わっているのでここには来ない想定
                }}>
                  リスクカードを引く
                </Button>
              )}
            </>
          )}

          {/* Phase: risk-trigger */}
            {ui.phase === 'risk-trigger' && isMyTurn && (
              <RiskTriggerView onDraw={() => {
                playSfx('risk');
                const { card, deck } = drawFromRiskDeck(gs.riskDeck);
                const target = ui.riskTarget ?? player;
                mpDispatch({ type: 'APPLY_RISK_CARD', company: target, card, remainingRiskDeck: deck });
              }} />
            )}

          {/* Phase: risk-result */}
          {ui.phase === 'risk-result' && ui.drawnRiskCard && isMyTurn && (
            <RiskResultView
              card={ui.drawnRiskCard}
              onContinue={() => mpDispatch({ type: 'ADVANCE_TURN' })}
            />
          )}

          {/* Phase: ai-thinking */}
          {ui.phase === 'ai-thinking' && !currentIsHuman && (
            <AiThinkingView company={currentCompany} gs={gs} dispatch={dispatch}
              enabled={!isMultiplayer || isHost}
            />
          )}
          </div>{/* end: game content */}
        </div>{/* end: center column */}

        {/* Right: Equity chart + Game log */}
        <div className="w-[300px] border-l-2 border-mg-border bg-mg-base flex flex-col">
          {/* 純資産推移グラフ */}
          <EquityChart gs={gs} playerIdx={effectiveMyIdx} />

          {/* ゲームログ ヘッダー + タブ */}
          <div className="shrink-0 border-b-2 border-mg-border bg-mg-surface">
            <div className="h-10 flex items-center px-4 font-dot text-sm">
              ゲームログ
            </div>
            <div className="flex border-t border-mg-border">
              {([
                { id: 'all',    label: 'すべて' },
                { id: 'trade',  label: '取引' },
                { id: 'action', label: '行動' },
                { id: 'event',  label: '事件' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setLogTab(tab.id)}
                  className={`flex-1 py-1 font-dot text-[10px] transition-colors ${
                    logTab === tab.id
                      ? 'bg-mg-elevated text-mg-cyan border-b-2 border-mg-cyan'
                      : 'text-mg-text-secondary hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ログリスト */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {gs.gameLog
              .filter(entry => {
                if (logTab === 'all')    return true;
                if (logTab === 'trade')  return entry.cls === 'log-player';
                if (logTab === 'event')  return entry.cls === 'log-risk';
                if (logTab === 'action') return entry.cls === 'log-good' || entry.cls === '';
                return true;
              })
              .slice(0, 20)
              .map((entry, i) => (
                <div key={entry.id ?? i} className={`p-2 border text-xs font-noto ${
                  entry.cls === 'log-player' ? 'border-mg-cyan bg-mg-cyan/10 text-mg-cyan' :
                  entry.cls === 'log-risk'   ? 'border-mg-danger bg-mg-danger/10 text-mg-danger' :
                  entry.cls === 'log-good'   ? 'border-mg-success bg-mg-success/10 text-mg-success' :
                  'border-mg-border bg-mg-elevated text-mg-text-secondary'
                }`}>
                  {entry.text}
                </div>
              ))}
            {gs.gameLog.filter(entry => {
              if (logTab === 'all')    return true;
              if (logTab === 'trade')  return entry.cls === 'log-player';
              if (logTab === 'event')  return entry.cls === 'log-risk';
              if (logTab === 'action') return entry.cls === 'log-good' || entry.cls === '';
              return true;
            }).length === 0 && (
              <div className="text-xs text-mg-text-secondary font-noto p-2">ログはまだありません</div>
            )}
          </div>
        </div>
      </main>

      {/* ===== Footer ===== */}
      <footer className="h-14 border-t-2 border-mg-border bg-mg-surface flex items-center justify-between px-6 z-10">
        <Button variant="secondary" size="sm" onClick={() => navigate('/market')}>
          <MapPin size={16} className="mr-2" /> 市場ビュー
        </Button>
        <div className="flex gap-3">
          {ui.phase === 'period-done' && (!isMultiplayer || isHost) && (
            <Button variant="primary" size="sm" onClick={handleEndPeriod}>
              期末決算へ <ChevronRight size={16} className="ml-1" />
            </Button>
          )}
        </div>
      </footer>

      {/* Action Modal */}
      {modalOpen && (
        <ActionModal onClose={() => setModalOpen(false)} onActionDone={handleActionDone} company={player} />
      )}

      {player.characterId && (
        <PresidentMascot
          characterId={ui.mascot?.characterId ?? player.characterId}
          expression={ui.mascot?.expression ?? 'normal'}
          reaction={ui.mascot?.reaction ?? 'idle'}
          speech={ui.mascot?.speech}
          expiresAt={ui.mascot?.expiresAt}
          eventId={ui.mascot?.eventId}
          className="bottom-[72px] right-[316px]"
        />
      )}
    </div>
  );
}

/* ===== Period Start View ===== */
function PeriodStartView({ gs, player, dispatch }: { gs: GameState; player: Company; dispatch: any }) {
  const [borrow, setBorrow] = useState(0);
  const [repay,  setRepay]  = useState(0);
  const maxRepay = Math.min(player.debt, Math.max(0, player.cash));
  return (
    <div className="text-center max-w-md w-full px-4">
      <div className="font-dot text-2xl text-mg-gold mb-1">第{gs.currentPeriod}期 開始</div>
      <div className="font-noto text-sm text-mg-text-secondary mb-6">借入・返済を行い、期を開始してください</div>

      <div className="bg-mg-elevated border-2 border-mg-border p-4 mb-6 text-left text-sm">
        <div className="flex justify-between mb-1">
          <span className="text-mg-text-secondary">現金</span>
          <span className="font-mono font-bold">{player.cash}万円</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-mg-text-secondary">借入残高</span>
          <span className={`font-mono font-bold ${player.debt > 0 ? 'text-mg-danger' : ''}`}>{player.debt}万円</span>
        </div>
        <div className="flex justify-between text-xs text-mg-text-secondary">
          <span>金利</span>
          <span>{(gs.rate * 100).toFixed(0)}% / 期</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center gap-3">
          <label className="font-dot text-sm w-20 text-right">借入額</label>
          <input
            type="number" min={0} value={borrow}
            onChange={e => setBorrow(Math.max(0, Number(e.target.value)))}
            className="w-24 bg-transparent border-b-2 border-mg-border text-xl font-mono text-center outline-none focus:border-mg-gold"
          />
          <span className="font-dot text-sm text-mg-text-secondary">万円</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="font-dot text-sm w-20 text-right">返済額</label>
          <input
            type="number" min={0} max={maxRepay} value={repay}
            onChange={e => setRepay(Math.min(maxRepay, Math.max(0, Number(e.target.value))))}
            className="w-24 bg-transparent border-b-2 border-mg-border text-xl font-mono text-center outline-none focus:border-mg-cyan"
          />
          <span className="font-dot text-sm text-mg-text-secondary">万円 (最大 {maxRepay})</span>
        </div>
      </div>

      <Button
        variant="primary" size="lg"
        onClick={() => dispatch({ type: 'PERIOD_START_FINANCE', borrow, repay, company: player })}
        className="shadow-[6px_6px_0px_#000]"
      >
        第{gs.currentPeriod}期を開始する <ChevronRight className="ml-2" />
      </Button>
    </div>
  );
}

/* ===== Company Card ===== */
function CompanyCard({ company, isActive, isMyCompany, rank }: { company: Company; isActive: boolean; isMyCompany: boolean; rank: number }) {
  const cap    = prodCap(company);
  const status = getCompanyStatus(company);
  return (
    <Card glowColor={COLOR_MAP[company.id] as any} className={`relative text-xs ${isActive ? 'ring-2 ring-mg-gold' : ''}`}>
      {isActive && (
        <div className="absolute -left-2 top-1/2 w-3 h-3 bg-mg-gold rotate-45 -translate-y-1/2 border border-[#000]" />
      )}
      {/* 順位バッジ */}
      <div className={`absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center border-2 text-[10px] font-dot ${RANK_BADGE[rank] ?? RANK_BADGE[4]}`}>
        {rank}
      </div>

      <div className={`font-dot text-sm border-b-2 border-mg-border pb-1 mb-2 flex items-center gap-1 ${TEXT_COLOR[company.id] ?? ''}`}>
        {company.type === 'ai' && <Bot size={11} className="text-mg-text-secondary shrink-0" />}
        <span className="truncate">{company.name}</span>
        {company.type === 'player' && isMyCompany && <span className="ml-1 text-xs bg-mg-cyan text-[#000] px-1 shrink-0">YOU</span>}
        {company.type === 'ai' && <span className="ml-auto text-xs border border-mg-border text-mg-text-secondary px-1 shrink-0">AI</span>}
      </div>

      <div className="flex justify-between mb-0.5">
        <span className="text-mg-text-secondary">現金</span>
        <span className={`font-mono font-bold ${company.cash < 0 ? 'text-mg-danger' : ''}`}>{company.cash}万</span>
      </div>
      <div className="flex justify-between mb-1">
        <span className="text-mg-text-secondary">自己資本</span>
        <span className={`font-mono font-bold ${TEXT_COLOR[company.id] ?? ''}`}>
          {company.capital + company.retainedEarnings}万
        </span>
      </div>
      {company.debt > 0 && (
        <div className="flex justify-between mb-1">
          <span className="text-mg-text-secondary">借入</span>
          <span className="font-mono text-mg-danger">{company.debt}万</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 text-mg-text-secondary">
        <div className="flex items-center gap-1"><Package size={11}/> 製品{company.productInventory}個</div>
        <div className="flex items-center gap-1"><Factory size={11}/> 能力{cap}個</div>
        <div className="flex items-center gap-1"><Users size={11}/> {company.employees}名</div>
        <div className="flex items-center gap-1"><Cpu size={11}/> 小{company.smallMachines}/大{company.largeMachines}</div>
        {company.rdChips > 0 && (
          <div className="flex items-center gap-1 col-span-2"><Beaker size={11}/> R&D {company.rdChips}枚</div>
        )}
      </div>

      {/* エフェクト表示 */}
      <div className="flex gap-1 mt-1 flex-wrap">
        {company.flyerChips > 0 && <span className="text-orange-400">🟠{company.flyerChips}</span>}
        {company.insChips > 0   && <span className="text-yellow-400">🟡{company.insChips}</span>}
        {company.effects.adBonus     && <span className="text-mg-success text-xs">📢広告</span>}
        {company.effects.exclusive   && <span className="text-mg-gold text-xs">⭐独占</span>}
        {company.effects.matDiscount && <span className="text-mg-cyan text-xs">🎁割引</span>}
        {company.brokenMachines > 0  && <span className="text-mg-danger text-xs">⚙️故障</span>}
      </div>

      {/* ステータスラベル */}
      {status && (
        <div className={`mt-2 border text-[10px] font-dot px-1.5 py-0.5 flex justify-between items-center ${status.cls}`}>
          <span>{status.label}</span>
          <span className="text-[9px]">{status.stars}</span>
        </div>
      )}
    </Card>
  );
}

/* ===== Risk Trigger View ===== */
function RiskTriggerView({ onDraw }: { onDraw: () => void }) {
  return (
    <div className="text-center">
      <div className="text-6xl mb-6">⚠️</div>
      <div className="font-dot text-2xl text-mg-danger mb-4">リスクカードを引いた！</div>
      <div className="font-noto text-mg-text-secondary mb-8">リスクデッキから1枚引いてください</div>
      <Button size="lg" onClick={onDraw} className="bg-mg-danger text-white shadow-[6px_6px_0px_#000]">
        リスクカードを引く
      </Button>
    </div>
  );
}

/* ===== Risk Result View ===== */
function RiskResultView({ card, onContinue }: { card: any; onContinue: () => void }) {
  const bgClass = card.type === 'negative' ? 'bg-red-950 border-mg-danger' :
                  card.type === 'positive' ? 'bg-green-950 border-mg-success' :
                  'bg-mg-elevated border-mg-border';
  return (
    <div className="text-center max-w-sm">
      <motion.div className={`border-4 p-8 mb-6 ${bgClass}`}
        initial={{ rotateY: -90 }} animate={{ rotateY: 0 }} transition={{ duration: 0.3 }}>
        <div className="text-6xl mb-3">{card.icon}</div>
        <div className="font-dot text-2xl text-white mb-2">{card.name}</div>
        <div className="font-noto text-sm text-mg-text-secondary">{card.desc}</div>
      </motion.div>
      <Button size="lg" onClick={onContinue} className="shadow-[4px_4px_0px_#000]">
        次へ進む
      </Button>
    </div>
  );
}

/* ===== Waiting View (マルチ: 他プレイヤーの番) ===== */
function WaitingView({ playerName }: { playerName: string }) {
  return (
    <div className="text-center">
      <Clock className="w-12 h-12 text-mg-text-secondary mx-auto mb-4 animate-pulse" />
      <div className="font-dot text-xl text-mg-gold mb-2">{playerName} のターン</div>
      <div className="font-noto text-sm text-mg-text-secondary">相手の行動を待っています...</div>
    </div>
  );
}

/* ===== AI Thinking View ===== */
function AiThinkingView({
  company, gs, dispatch, enabled = true,
}: { company: Company; gs: any; dispatch: any; enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const delay = 700 + Math.random() * 600;
    const t = setTimeout(() => {
      dispatch({ type: 'AI_TAKE_TURN', company });
    }, delay);
    return () => clearTimeout(t);
  // company.id + round + playerIdx の組み合わせで一度だけ実行
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id, gs.round, gs.playerIdx, enabled]);

  const subMsg: Record<string, string> = {
    weak:   '考慮中...',
    medium: '在庫・財務を確認しています',
    strong: '市場分析中... プレイヤーの戦略を読んでいます',
  };

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 font-dot text-xl text-mg-text-secondary mb-6">
        <Bot size={20} className="text-mg-text-secondary" />
        {company.name}
        <span className="text-xs border border-mg-border px-1">AI</span>
      </div>
      <div className="flex gap-3 justify-center mb-4">
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="w-4 h-4 bg-mg-text-secondary"
            animate={{ y: [0, -16, 0] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
          />
        ))}
      </div>
      <div className="font-noto text-xs text-mg-text-secondary animate-pulse">
        {subMsg[gs.aiLevel] ?? '考慮中...'}
      </div>
    </div>
  );
}
