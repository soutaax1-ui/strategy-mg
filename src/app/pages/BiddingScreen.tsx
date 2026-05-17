import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Package, Coins, ChevronRight, Bot } from 'lucide-react';
import { Button } from '../components/Button';
import { useGame } from '../../lib/gameContext';
import { aiDecideCounter } from '../../lib/auction';
import { CITIES, MATERIAL_COST } from '../../lib/constants';
import type { Company, AuctionBid } from '../../lib/types';
import { setBgm, playSfx } from '../../lib/sound';
import { useMultiplayer, useMpDispatch } from '../../lib/multiplayerContext';
import { PresidentMascot } from '../components/PresidentMascot';

const TEXT_COLOR: Record<string, string> = {
  player: 'text-mg-cyan', alpha: 'text-mg-pink', beta: 'text-mg-gold', gamma: 'text-mg-lime',
};
const BORDER_COLOR: Record<string, string> = {
  player: 'border-mg-cyan', alpha: 'border-mg-pink', beta: 'border-mg-gold', gamma: 'border-mg-lime',
};

export function BiddingScreen() {
  const navigate            = useNavigate();
  const { gs, ui, dispatch }    = useGame();
  const mpDispatch          = useMpDispatch();
  const { isMultiplayer, isHost, myCompanyIdx } = useMultiplayer();
  const auction             = gs?.currentAuction ?? null;

  const [counterQty,   setCounterQty]   = useState(1);
  const [counterPrice, setCounterPrice] = useState(MATERIAL_COST + 1);
  const [showForm,     setShowForm]     = useState(false);

  /* ダッシュボードへフォールバック */
  useEffect(() => {
    if (!gs || !auction) navigate('/dashboard');
  }, [gs, auction, navigate]);

  /* BGM */
  useEffect(() => { setBgm('bidding'); }, []);

  /* マルチプレイ: 解決後に非ホストも自動でダッシュボードへ */
  useEffect(() => {
    if (!isMultiplayer || isHost) return;
    if (!auction?.resolved) return;
    const t = setTimeout(() => navigate('/dashboard'), 2500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.resolved, isMultiplayer, isHost]);

  /* プレイヤーターンになったら入力欄の初期値をセット */
  useEffect(() => {
    if (!auction || auction.resolved) return;
    const child = auction.children[auction.childIdx];
    if (child?.type !== 'player') return;
    const player = gs!.companies.find(c => c.id === child.id) ?? gs!.companies[0];
    const city   = CITIES.find(c => c.id === auction.cityId) ?? CITIES[0];
    setCounterQty(Math.min(player.productInventory, Math.max(1, auction.parentQty)));
    setCounterPrice(Math.max(MATERIAL_COST + 1, Math.min(city.priceMax, auction.parentPrice - 1)));
    setShowForm(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.childIdx]);

  /* AI 子会社の自動対抗処理 (ホストのみ実行) */
  useEffect(() => {
    if (isMultiplayer && !isHost) return; // 非ホストはスキップ
    if (!gs || !auction || auction.resolved) return;
    const child = auction.children[auction.childIdx];
    if (!child || child.type !== 'ai') return;
    const currentChild = gs.companies.find(c => c.id === child.id) ?? child;
    const delay = 600 + Math.random() * 700;
    const t = setTimeout(() => {
      const counter = aiDecideCounter(gs, currentChild, auction);
      playSfx(counter ? 'aiCounter' : 'pass');
      dispatch({ type: 'AI_COUNTER_DECIDED', counter });
    }, delay);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.childIdx, auction?.resolved, isMultiplayer, isHost]);

  /* 全子会社処理完了 → 解決 (ホストのみ) */
  useEffect(() => {
    if (isMultiplayer && !isHost) return;
    if (!auction || auction.resolved) return;
    if (auction.childIdx < auction.children.length) return;
    const t = setTimeout(() => {
      playSfx('sale');
      dispatch({ type: 'RESOLVE_AUCTION' });
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.childIdx, auction?.resolved, isMultiplayer, isHost]);

  /* 解決後 → ダッシュボードへ戻る (ホスト or シングルプレイ) */
  useEffect(() => {
    if (!auction?.resolved) return;
    if (isMultiplayer && !isHost) return; // 非ホストは別エフェクトで処理
    const t = setTimeout(() => {
      dispatch({ type: 'ADVANCE_TURN' });
      navigate('/dashboard');
    }, 2800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.resolved, isMultiplayer, isHost]);

  if (!gs || !auction) return null;

  const parentCompany = gs.companies.find(c => c.id === auction.parent.id) ?? auction.parent;
  const currentChildRaw = !auction.resolved && auction.childIdx < auction.children.length
    ? auction.children[auction.childIdx] : null;
  const currentChild = currentChildRaw
    ? gs.companies.find(c => c.id === currentChildRaw.id) ?? currentChildRaw : null;
  // マルチ: 自分の会社番号が現在の子会社かどうか
  const effectiveMyIdx  = isMultiplayer ? myCompanyIdx : 0;
  const myCompany       = gs.companies[effectiveMyIdx] ?? gs.companies[0];
  const isPlayerChild   = isMultiplayer
    ? currentChild && gs.companies.indexOf(currentChild) === effectiveMyIdx
    : currentChild?.type === 'player';
  const player          = myCompany;
  const canCounter      = player.productInventory > 0 && auction.cityVol > 0;

  function handleSubmitCounter() {
    if (counterQty <= 0 || counterQty > player.productInventory) return;
    playSfx('confirm');
    mpDispatch({ type: 'PLAYER_SUBMIT_COUNTER', qty: counterQty, price: counterPrice, company: player });
    setShowForm(false);
  }

  function handlePass() {
    playSfx('pass');
    mpDispatch({ type: 'PLAYER_PASS_AUCTION', company: player });
    setShowForm(false);
  }

  return (
    <div className="flex flex-col h-screen w-full bg-mg-base">
      {/* Header */}
      <header className="h-16 border-b-2 border-mg-border bg-mg-surface flex items-center justify-between px-6">
        <div className="w-1/3 font-dot text-lg">
          第{gs.currentPeriod}期 / R{gs.round}
        </div>
        <div className="w-1/3 flex justify-center">
          <span className="bg-mg-pink text-white px-4 py-1 font-dot text-base rounded-sm animate-pulse">
            {auction.resolved ? '入札確定' : '親子入札進行中'}
          </span>
        </div>
        <div className="w-1/3 flex justify-end font-mono text-sm text-mg-text-secondary">
          市場残量: <span className="font-bold ml-1 text-mg-gold">{auction.cityVol}個</span>
        </div>
      </header>

      {/* Parent Area */}
      <div className="h-[160px] border-b-2 border-mg-border bg-mg-surface/50 flex flex-col items-center justify-center relative overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-mg-pink/5"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className={`font-dot text-mg-pink mb-3 text-base flex items-center gap-2 z-10 ${TEXT_COLOR[parentCompany.id] ?? ''}`}>
          親: {parentCompany.name} が販売宣言
        </div>
        <div className="bg-mg-base border-4 border-mg-pink px-10 py-3 shadow-[8px_8px_0px_rgba(255,77,141,0.4)] flex items-center gap-6 z-10">
          <div className="font-dot text-2xl text-mg-gold">{auction.cityName}</div>
          <div className="w-px h-10 bg-mg-border" />
          <div className="flex items-center gap-1">
            <span className="font-mono text-3xl font-bold">{auction.parentQty}</span>
            <span className="font-dot text-mg-text-secondary text-sm">個</span>
          </div>
          <div className="w-px h-10 bg-mg-border" />
          <div className="flex items-center gap-1">
            <span className="font-mono text-3xl font-bold">{auction.parentPrice}</span>
            <span className="font-dot text-mg-text-secondary text-sm">万円</span>
            {auction.parentEffectivePrice !== auction.parentPrice && (
              <span className="text-xs text-orange-300 ml-1">実効{auction.parentEffectivePrice}万</span>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-2 z-10">
          {auction.parentFlyerUsed > 0 && (
            <span className="text-xs text-orange-300">🟠 チラシ{auction.parentFlyerUsed}枚</span>
          )}
          {auction.parentRdAdv > 0 && (
            <span className="text-xs text-blue-300">🔵 R&D優位△{auction.parentRdAdv}万</span>
          )}
          {auction.parentExclusive && (
            <span className="text-xs text-yellow-300">⭐ 独占販売権</span>
          )}
        </div>
      </div>

      {/* Children Area */}
      <div className="flex-1 p-6 flex justify-center items-start gap-6 overflow-x-auto">
        {auction.children.map((child, idx) => (
          <ChildCard
            key={child.id}
            child={child}
            idx={idx}
            auction={auction}
            isCurrentPlayer={isPlayerChild && idx === auction.childIdx}
          />
        ))}
      </div>

      {/* Player Input Area */}
      {isPlayerChild && !auction.resolved && (
        <div className="h-[200px] border-t-2 border-mg-border bg-mg-surface p-5">
          {!showForm ? (
            <div className="flex justify-between items-center max-w-3xl mx-auto h-full">
              <div className="w-1/3">
                <h3 className="font-dot text-xl mb-2 text-white">対抗しますか？</h3>
                <div className="text-sm font-noto text-mg-text-secondary flex flex-col gap-1">
                  <span>在庫: {player.productInventory}個 / 現金: {player.cash}万円</span>
                  {!canCounter && <span className="text-mg-danger text-xs">在庫または市場が枯渇</span>}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  variant="primary"
                  onClick={() => setShowForm(true)}
                  disabled={!canCounter}
                  className="px-8 shadow-[4px_4px_0px_#000]"
                >
                  対抗する
                </Button>
                <Button variant="secondary" onClick={handlePass}>
                  パス (対抗しない)
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center max-w-3xl mx-auto h-full gap-6">
              <div className="flex gap-4">
                <div className="bg-mg-base border-2 border-mg-border p-3 flex flex-col gap-2">
                  <label className="text-xs text-mg-text-secondary flex items-center gap-1">
                    <Package size={13} /> 数量
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={player.productInventory}
                      value={counterQty}
                      onChange={e => setCounterQty(Number(e.target.value))}
                      className="w-16 bg-transparent border-b-2 border-mg-border text-xl font-mono text-center outline-none focus:border-mg-cyan"
                    />
                    <span className="font-dot text-sm">個</span>
                  </div>
                </div>
                <div className="bg-mg-base border-2 border-mg-border p-3 flex flex-col gap-2">
                  <label className="text-xs text-mg-text-secondary flex items-center gap-1">
                    <Coins size={13} /> 価格
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={MATERIAL_COST + 1}
                      value={counterPrice}
                      onChange={e => setCounterPrice(Number(e.target.value))}
                      className="w-16 bg-transparent border-b-2 border-mg-border text-xl font-mono text-center outline-none focus:border-mg-gold"
                    />
                    <span className="font-dot text-sm">万円</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  variant="primary"
                  onClick={handleSubmitCounter}
                  className="px-8 shadow-[4px_4px_0px_#000]"
                >
                  確定
                </Button>
                <Button variant="secondary" onClick={() => setShowForm(false)}>
                  戻る
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resolved Result */}
      {auction.resolved && auction.resolvedBids && (
        <motion.div
          className="border-t-2 border-mg-success bg-green-950/80 p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="font-dot text-mg-success mb-3 text-center">
            📊 {auction.cityName}市場 — 精算結果
          </div>
          <div className="flex justify-center gap-4 flex-wrap">
            {auction.resolvedBids.map((bid, i) => (
              <BidResultCard key={i} bid={bid} />
            ))}
          </div>
          <div className="text-center mt-2 text-xs text-mg-text-secondary font-noto">
            市場残量: {gs.cityVols[auction.cityId]}個 — 自動でダッシュボードへ戻ります
          </div>
          <div className="flex justify-center mt-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!isMultiplayer || isHost) {
                  dispatch({ type: 'ADVANCE_TURN' });
                }
                navigate('/dashboard');
              }}
              className="shadow-[4px_4px_0px_#000]"
            >
              ダッシュボードへ <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </motion.div>
      )}

      {gs.companies[0]?.characterId && (
        <PresidentMascot
          characterId={ui.mascot?.characterId ?? gs.companies[0].characterId!}
          expression={ui.mascot?.expression ?? 'normal'}
          reaction={ui.mascot?.reaction ?? 'idle'}
          speech={ui.mascot?.speech}
        />
      )}
    </div>
  );
}

/* ===== Child Company Card ===== */
function ChildCard({
  child,
  idx,
  auction,
  isCurrentPlayer,
}: {
  child: Company;
  idx: number;
  auction: NonNullable<ReturnType<typeof useGame>['gs']>['currentAuction'];
  isCurrentPlayer: boolean;
}) {
  if (!auction) return null;

  const isProcessed = idx < auction.childIdx || auction.resolved;
  const isCurrent   = idx === auction.childIdx && !auction.resolved;
  const isWaiting   = idx > auction.childIdx && !auction.resolved;

  const counter = auction.counters.find(c => c.company.id === child.id);
  const bid     = auction.resolved ? (auction.resolvedBids ?? []).find(b => b.company.id === child.id) : null;

  const tc = TEXT_COLOR[child.id] ?? 'text-mg-text-secondary';
  const bc = BORDER_COLOR[child.id] ?? 'border-mg-border';

  return (
    <div className={`w-[260px] shrink-0 border-2 ${bc} bg-mg-elevated p-4 flex flex-col gap-3 ${
      isCurrent ? 'ring-2 ring-mg-gold' : ''
    }`}>
      {/* Header */}
      <div className={`font-dot text-sm border-b border-mg-border pb-2 flex justify-between items-center ${tc}`}>
        <span className="flex items-center gap-1">
          {child.type === 'ai' && <Bot size={11} />}
          {child.name}
          {child.type === 'player' ? '' : <span className="text-xs border border-current opacity-60 px-1 ml-1">AI</span>}
        </span>
        {isWaiting && (
          <span className="text-mg-text-secondary text-xs">待機中</span>
        )}
        {isCurrent && child.type === 'ai' && (
          <span className="text-mg-text-secondary text-xs animate-pulse">考慮中...</span>
        )}
        {isCurrent && isCurrentPlayer && (
          <span className={`text-xs animate-pulse ${tc}`}>入力中...</span>
        )}
        {isProcessed && (
          <span className="text-xs text-mg-success">決定済</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center items-center gap-2">
        {/* AI thinking animation */}
        {isCurrent && child.type === 'ai' && (
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-mg-text-secondary"
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
              />
            ))}
          </div>
        )}

        {/* Player waiting for input */}
        {isCurrent && isCurrentPlayer && (
          <div className="text-center text-mg-text-secondary font-noto text-xs">
            画面下部で対抗内容を入力してください
          </div>
        )}

        {/* Waiting */}
        {isWaiting && (
          <div className="text-center text-mg-text-secondary font-noto text-xs opacity-50">
            前の入札を待っています
          </div>
        )}

        {/* Counter result */}
        {isProcessed && !auction.resolved && (
          counter ? (
            <div className="text-center">
              <div className={`font-dot text-lg mb-1 ${tc}`}>対抗する</div>
              <div className="font-mono text-xl">{counter.qty}個 / {counter.price}万円</div>
              {counter.effectivePrice !== counter.price && (
                <div className="text-xs text-orange-300 mt-1">実効 {counter.effectivePrice}万円</div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="font-dot text-lg text-mg-text-secondary mb-1">パス</div>
              <div className="font-noto text-xs text-mg-text-secondary">対抗しません</div>
            </div>
          )
        )}

        {/* Resolved bid result */}
        {auction.resolved && bid && (
          <div className="text-center">
            {bid.sold > 0 ? (
              <>
                <div className={`font-dot text-base mb-1 ${tc}`}>{bid.sold}個 販売</div>
                <div className="font-mono text-lg font-bold text-mg-success">+{bid.revenue}万円</div>
                <div className="text-xs text-mg-text-secondary mt-1">@{bid.price}万円</div>
              </>
            ) : (
              <div className="font-dot text-base text-mg-text-secondary">
                {bid.bidQty > 0 ? '売れず' : 'パス'}
              </div>
            )}
          </div>
        )}
        {auction.resolved && !bid && (
          <div className="text-center font-dot text-base text-mg-text-secondary">パス</div>
        )}
      </div>
    </div>
  );
}

/* ===== Bid Result Card (in resolved area) ===== */
function BidResultCard({ bid }: { bid: AuctionBid }) {
  const tc = TEXT_COLOR[bid.company.id] ?? 'text-mg-text-secondary';
  return (
    <div className="bg-mg-base border border-mg-border px-4 py-2 text-center min-w-[120px]">
      <div className={`font-dot text-xs mb-1 ${tc}`}>{bid.company.name}</div>
      {bid.sold > 0 ? (
        <>
          <div className="font-mono text-lg font-bold text-mg-success">{bid.sold}個</div>
          <div className="text-xs text-mg-text-secondary">+{bid.revenue}万</div>
        </>
      ) : (
        <div className="font-mono text-sm text-mg-text-secondary">0個</div>
      )}
    </div>
  );
}
