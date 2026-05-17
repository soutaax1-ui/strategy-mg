import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, Factory, Users, Cpu, Beaker, MapPin,
  AlertTriangle, TrendingUp, ChevronRight, Clock, Bot,
} from 'lucide-react';
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
const TEXT_COLOR: Record<string, string> = {
  player: 'text-mg-cyan', alpha: 'text-mg-pink', beta: 'text-mg-gold', gamma: 'text-mg-lime',
};

export function DashboardScreen() {
  const navigate  = useNavigate();
  const { gs, ui, dispatch, triggerMascotEvent } = useGame();
  const fallbackPlayer = usePlayer();
  const mpDispatch = useMpDispatch();
  const { isMultiplayer, isHost, myCompanyIdx, assignments } = useMultiplayer();

  const [cardDrawn,   setCardDrawn]   = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);

  // ゲーム未初期化ならタイトルに戻す
  useEffect(() => {
    if (!gs) navigate('/');
  }, [gs, navigate]);

  // BGM
  // 期数前半 → game1、後半 → game2 で自動切替
  const gameBgmTrack = gs && gs.currentPeriod <= Math.floor(gs.totalPeriods / 2) ? 'game1' : 'game2';
  useEffect(() => { setBgm(gameBgmTrack); }, [gameBgmTrack]);

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
            <CompanyCard key={company.id} company={company} isActive={i === gs.playerIdx} isMyCompany={i === effectiveMyIdx} />
          ))}
        </div>

        {/* Center: Card draw area */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#131122] relative">

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
        </div>

        {/* Right: Game log */}
        <div className="w-[300px] border-l-2 border-mg-border bg-mg-base flex flex-col">
          <div className="h-12 border-b-2 border-mg-border flex items-center px-4 font-dot text-lg bg-mg-surface">
            ゲームログ
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {gs.gameLog.slice(0, 10).map((entry, i) => (
              <div key={entry.id ?? i} className={`p-2 border text-xs font-noto ${
                entry.cls === 'log-player' ? 'border-mg-cyan bg-mg-cyan/10 text-mg-cyan' :
                entry.cls === 'log-risk'   ? 'border-mg-danger bg-mg-danger/10 text-mg-danger' :
                entry.cls === 'log-good'   ? 'border-mg-success bg-mg-success/10 text-mg-success' :
                'border-mg-border bg-mg-elevated text-mg-text-secondary'
              }`}>
                {entry.text}
              </div>
            ))}
            {gs.gameLog.length === 0 && (
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
function CompanyCard({ company, isActive, isMyCompany }: { company: Company; isActive: boolean; isMyCompany: boolean }) {
  const cap = prodCap(company);
  return (
    <Card glowColor={COLOR_MAP[company.id] as any} className={`relative text-xs ${isActive ? 'ring-2 ring-mg-gold' : ''}`}>
      {isActive && (
        <div className="absolute -left-2 top-1/2 w-3 h-3 bg-mg-gold rotate-45 -translate-y-1/2 border border-[#000]" />
      )}
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
