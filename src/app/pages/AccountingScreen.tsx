import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Crown } from 'lucide-react';
import { useGame } from '../../lib/gameContext';
import { calcBS, equity, fmt } from '../../lib/gameState';
import { DR_LABELS, CR_LABELS } from '../../lib/constants';
import type { Company, PeriodResult } from '../../lib/types';
import { PresidentMascot } from '../components/PresidentMascot';

const TEXT_COLOR: Record<string, string> = {
  player: 'text-mg-cyan', alpha: 'text-mg-pink', beta: 'text-mg-gold', gamma: 'text-mg-lime',
};

export function AccountingScreen() {
  const navigate          = useNavigate();
  const { gs, ui, dispatch }  = useGame();
  const [tab, setTab]     = useState<'PL' | 'BS' | 'MX' | 'COMP'>('PL');

  /* BGM はダッシュボードから継続 */

  if (!gs) { navigate('/'); return null; }

  const player  = gs.companies[0];
  const isLast  = gs.currentPeriod >= gs.totalPeriods;

  function handleNext() {
    dispatch({ type: 'ADVANCE_PERIOD' });
    navigate(isLast ? '/results' : '/dashboard');
  }

  return (
    <div className="flex flex-col h-screen w-full bg-mg-base">
      {/* Header */}
      <header className="h-[72px] border-b-2 border-mg-border bg-mg-surface flex items-center justify-between px-8">
        <div className="flex items-center gap-6">
          <h1 className="font-dot text-2xl">期末決算</h1>
          <span className="font-dot text-mg-text-secondary text-lg">第{gs.currentPeriod}期 / 全{gs.totalPeriods}期</span>
        </div>
        <Button variant="primary" size="lg" onClick={handleNext} className="shadow-[4px_4px_0px_#000]">
          {isLast ? 'ゲーム終了・結果へ' : '次期へ進む'} <ChevronRight className="ml-2" />
        </Button>
      </header>

      {/* Tabs */}
      <div className="h-[52px] bg-mg-elevated flex px-8 border-b-2 border-mg-border">
        {[
          { id: 'PL',   label: '損益計算書 (PL)' },
          { id: 'BS',   label: '貸借対照表 (BS)' },
          { id: 'MX',   label: 'MX会計' },
          { id: 'COMP', label: '全社比較' },
        ].map(t => (
          <div
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-5 py-3 cursor-pointer font-dot text-base border-b-4 transition-colors ${
              tab === t.id
                ? 'border-mg-gold text-mg-gold'
                : 'border-transparent text-mg-text-secondary hover:text-white'
            }`}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="h-full w-full max-w-6xl mx-auto"
          >
            {tab === 'PL'   && <PLView   player={player} period={gs.currentPeriod} />}
            {tab === 'BS'   && <BSView   player={player} />}
            {tab === 'MX'   && <MXView   gs={gs} />}
            {tab === 'COMP' && <CompView companies={gs.companies} period={gs.currentPeriod} />}
          </motion.div>
        </AnimatePresence>
      </div>
      {player.characterId && (
        <PresidentMascot
          characterId={ui.mascot?.characterId ?? player.characterId}
          expression={ui.mascot?.expression ?? 'normal'}
          reaction={ui.mascot?.reaction ?? 'idle'}
          speech={ui.mascot?.speech}
        />
      )}
    </div>
  );
}

/* ===== PL View ===== */
function PLView({ player, period }: { player: Company; period: number }) {
  const r: PeriodResult | undefined = player.result;

  if (!r) {
    return (
      <div className="flex items-center justify-center h-full text-mg-text-secondary font-noto">
        計算データがありません
      </div>
    );
  }

  const mqRate  = r.revenue > 0 ? Math.round(r.grossProfit / r.revenue * 100) : 0;
  const vqPct   = r.revenue > 0 ? Math.max(5, Math.min(90, Math.round(r.cogs / r.revenue * 100))) : 55;
  const mqPct   = 100 - vqPct;
  const fInMq   = r.grossProfit > 0
    ? Math.min(95, Math.round(r.fixedCosts / r.grossProfit * 100))
    : (r.fixedCosts > 0 ? 100 : 0);
  const gInMq   = Math.max(0, 100 - fInMq);
  const isProfit = r.opProfit >= 0;

  const rows = [
    { label: '売上高 (PQ)',   val: r.revenue,      color: 'border-mg-success', bold: true },
    { label: '売上原価 (VQ)', val: -r.cogs,         color: 'border-mg-danger', bold: false },
    { label: '粗利 (MQ)',     val: r.grossProfit,  color: 'border-mg-gold',   bold: true, big: true },
	    { label: '人件費',        val: -r.empCost,     color: 'border-mg-border', bold: false, sub: true },
	    { label: '減価償却費',    val: -r.depr,        color: 'border-mg-border', bold: false, sub: true },
	    { label: '広告宣伝費',   val: -r.adSpend,     color: 'border-mg-border', bold: false, sub: true },
	    { label: 'その他費用',    val: -r.otherSpend,  color: 'border-mg-border', bold: false, sub: true },
	    { label: '支払利息',      val: -r.interest,    color: 'border-mg-border', bold: false, sub: true },
    { label: '固定費合計 (F)',val: -r.fixedCosts,  color: 'border-mg-text-secondary', bold: true },
    { label: '営業利益 (G)',  val: r.opProfit,     color: isProfit ? 'border-mg-success' : 'border-mg-danger', bold: true, big: true },
  ];

  return (
    <div className="flex h-full gap-6">
      {/* PL Table */}
      <Card className="w-1/2 flex flex-col h-full overflow-y-auto">
        <h2 className="font-dot text-lg mb-4 border-b-2 border-mg-border pb-2">第{period}期 損益計算書</h2>
        <div className="flex flex-col gap-1.5 font-mono">
          {rows.map((row, i) => (
            <div
              key={i}
              className={`flex justify-between items-center px-3 py-2 bg-mg-base border-l-4 ${row.color} ${
                row.big ? 'py-3 bg-mg-elevated' : row.sub ? 'ml-4 py-1 text-sm' : ''
              }`}
            >
              <span className={`font-dot ${row.big ? 'text-base' : 'text-sm'} ${row.sub ? 'text-mg-text-secondary' : ''}`}>
                {row.label}
              </span>
              <span className={`font-bold ${
                row.big ? 'text-xl' : 'text-base'
              } ${
                row.val > 0 ? 'text-mg-success' : row.val < 0 ? 'text-mg-danger' : 'text-mg-text-secondary'
              }`}>
                {row.val >= 0 ? '' : '- '}{fmt(Math.abs(row.val))}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-2 border-t-2 border-mg-border text-xs font-noto text-mg-text-secondary">
          MQ率: {mqRate}% — 販売数: {r.soldQty}個
        </div>
      </Card>

      {/* MQ Chart */}
      <Card className="w-1/2 flex flex-col h-full bg-mg-base p-6">
        <h2 className="font-dot text-lg mb-4 border-b-2 border-mg-border pb-2">MQ会計図</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[360px]">
            {/* PQ row */}
            <div className="flex gap-1.5 mb-1.5 h-[140px]">
              <div
                className="bg-mg-danger/20 border-2 border-mg-danger flex flex-col items-center justify-center shadow-[4px_4px_0px_#000]"
                style={{ width: `${vqPct}%` }}
              >
                <span className="font-dot text-mg-danger text-sm">VQ</span>
                <span className="font-mono text-mg-danger text-xs">{fmt(r.cogs)}</span>
              </div>
              <div
                className="bg-mg-gold/20 border-2 border-mg-gold flex flex-col items-center justify-center shadow-[4px_4px_0px_#000]"
                style={{ width: `${mqPct}%` }}
              >
                <span className="font-dot text-mg-gold font-bold">MQ</span>
                <span className="font-mono text-mg-gold text-xs">{fmt(r.grossProfit)}</span>
              </div>
            </div>
            {/* F / G row aligned to MQ column */}
            <div className="flex gap-1.5 h-[100px]" style={{ justifyContent: 'flex-end' }}>
              {r.grossProfit > 0 && (
                <>
                  <div
                    className="bg-mg-text-secondary/10 border-2 border-mg-border flex flex-col items-center justify-center shadow-[4px_4px_0px_#000]"
                    style={{ width: `${mqPct * fInMq / 100}%` }}
                  >
                    <span className="font-dot text-mg-text-secondary text-xs">F</span>
                    <span className="font-mono text-xs text-mg-text-secondary">{fmt(r.fixedCosts)}</span>
                  </div>
                  {gInMq > 0 && (
                    <div
                      className={`border-2 flex flex-col items-center justify-center shadow-[4px_4px_0px_#000] ${
                        isProfit ? 'bg-mg-success/20 border-mg-success' : 'bg-mg-danger/20 border-mg-danger'
                      }`}
                      style={{ width: `${mqPct * gInMq / 100}%`, minWidth: '2%' }}
                    >
                      <span className={`font-dot text-xs ${isProfit ? 'text-mg-success' : 'text-mg-danger'}`}>G</span>
                      <span className={`font-mono text-xs ${isProfit ? 'text-mg-success' : 'text-mg-danger'}`}>
                        {fmt(r.opProfit)}
                      </span>
                    </div>
                  )}
                </>
              )}
              {r.grossProfit <= 0 && (
                <div
                  className="bg-mg-danger/20 border-2 border-mg-danger flex items-center justify-center"
                  style={{ width: `${mqPct}%` }}
                >
                  <span className="font-dot text-mg-danger text-xs">赤字</span>
                </div>
              )}
            </div>
            {/* Axis labels */}
            <div className="flex justify-between mt-2 text-xs text-mg-text-secondary font-dot">
              <span>← Q (販売量) →</span>
              <span>MQ率 {mqRate}%</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ===== BS View ===== */
function BSView({ player }: { player: Company }) {
  const bs   = calcBS(player);
  const total = bs.assets.total;

  const assetRows = [
    { name: '現金',     val: bs.assets.cash,     color: 'border-mg-success bg-mg-success/10' },
	    { name: '材料在庫', val: bs.assets.matInv,   color: 'border-mg-cyan bg-mg-cyan/10' },
	    { name: '製品在庫', val: bs.assets.prodInv,  color: 'border-mg-cyan bg-mg-cyan/5' },
	    { name: '機械設備', val: bs.assets.machBook, color: 'border-mg-gold bg-mg-gold/10' },
	    { name: 'R&D資産', val: bs.assets.rdBook,   color: 'border-blue-400 bg-blue-400/10' },
	    { name: '教育資産', val: bs.assets.eduBook, color: 'border-green-400 bg-green-400/10' },
	  ].filter(r => r.val > 0);

  const liabRows = [
    { name: '借入金', val: bs.liab.debt, color: 'border-mg-danger bg-mg-danger/10' },
  ].filter(r => r.val > 0);

  const eqRows = [
    { name: '資本金',       val: bs.eq.capital, color: 'border-mg-pink bg-mg-pink/10' },
    { name: '利益剰余金',   val: bs.eq.re,      color: bs.eq.re >= 0 ? 'border-mg-pink bg-mg-pink/5' : 'border-mg-danger bg-mg-danger/10' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex w-full gap-6 flex-1 min-h-0">
        {/* Assets */}
        <div className="w-1/2 flex flex-col bg-mg-base border-2 border-mg-border p-5 shadow-[6px_6px_0px_#000]">
          <h3 className="font-dot text-base text-center border-b-2 border-mg-border pb-2 mb-3">借方 (資産)</h3>
          <div className="flex-1 flex flex-col gap-2 justify-end">
            {assetRows.map(a => (
              <div
                key={a.name}
                className={`border-2 ${a.color} px-3 py-2 flex justify-between items-center`}
                style={{ minHeight: '36px' }}
              >
                <span className="font-dot text-sm">{a.name}</span>
                <span className="font-mono font-bold">{fmt(a.val)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t-2 border-mg-border flex justify-between font-mono">
            <span className="font-dot">合計</span>
            <span className="font-bold">{fmt(total)}</span>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div className="w-1/2 flex flex-col bg-mg-base border-2 border-mg-border p-5 shadow-[6px_6px_0px_#000]">
          <h3 className="font-dot text-base text-center border-b-2 border-mg-border pb-2 mb-3">貸方 (負債・純資産)</h3>
          <div className="flex-1 flex flex-col gap-2 justify-end">
            {eqRows.map(e => (
              <div
                key={e.name}
                className={`border-2 ${e.color} px-3 py-2 flex justify-between items-center`}
                style={{ minHeight: '36px' }}
              >
                <span className="font-dot text-sm">{e.name}</span>
                <span className={`font-mono font-bold ${e.val < 0 ? 'text-mg-danger' : ''}`}>{fmt(e.val)}</span>
              </div>
            ))}
            {liabRows.length > 0 && (
              <div className="border-t border-mg-border/50 pt-2 mt-1 flex flex-col gap-2">
                {liabRows.map(l => (
                  <div
                    key={l.name}
                    className={`border-2 ${l.color} px-3 py-2 flex justify-between items-center`}
                    style={{ minHeight: '36px' }}
                  >
                    <span className="font-dot text-sm">{l.name}</span>
                    <span className="font-mono font-bold text-mg-danger">{fmt(l.val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3 pt-2 border-t-2 border-mg-border flex justify-between font-mono">
            <span className="font-dot">合計</span>
            <span className="font-bold">{fmt(bs.liab.total + bs.eq.total)}</span>
          </div>
        </div>
      </div>

      <div className={`mt-4 border-2 px-6 py-2 font-dot text-center text-base shadow-[4px_4px_0px_#000] ${
        Math.abs(bs.assets.total - bs.liab.total - bs.eq.total) < 1
          ? 'border-mg-success text-mg-success bg-mg-success/10'
          : 'border-mg-danger text-mg-danger'
      }`}>
        自己資本: {fmt(bs.eq.total)} (資本金 {fmt(bs.eq.capital)} + 利益剰余金 {fmt(bs.eq.re)})
      </div>
    </div>
  );
}

/* ===== MX View ===== */
function MXView({ gs }: { gs: any }) {
  const matrix: number[][] = Array.from({ length: 10 }, () => new Array(10).fill(0));
  (gs.txnLog ?? []).forEach((t: any) => {
    if (t.dr >= 0 && t.dr < 10 && t.cr >= 0 && t.cr < 10) {
      matrix[t.dr][t.cr] += t.amount;
    }
  });

  const colTotals = Array(10).fill(0);
  const rowTotals = Array(10).fill(0);
  matrix.forEach((row, i) => row.forEach((val, j) => {
    rowTotals[i] += val;
    colTotals[j] += val;
  }));

  return (
    <Card className="h-full w-full flex flex-col p-5">
      <h2 className="font-dot text-lg mb-3">マトリックス会計表 (当期)</h2>
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-xs font-mono">
          <thead>
            <tr>
              <th className="bg-mg-surface border-2 border-mg-border p-1.5 font-dot text-xs sticky left-0 z-10 min-w-[80px]">借\貸</th>
              {CR_LABELS.map(h => (
                <th key={h} className="bg-mg-elevated border-2 border-mg-border p-1.5 font-dot text-[10px] min-w-[70px] text-center">{h}</th>
              ))}
              <th className="bg-mg-surface border-2 border-mg-border p-1.5 font-dot text-xs text-center">計</th>
            </tr>
          </thead>
          <tbody>
            {DR_LABELS.map((drLabel, i) => (
              <tr key={drLabel}>
                <th className="bg-mg-elevated border-2 border-mg-border p-1.5 font-dot text-[10px] text-left sticky left-0">
                  {drLabel}
                </th>
                {matrix[i].map((val, j) => (
                  <td
                    key={j}
                    className={`border border-mg-border p-1.5 text-center ${
                      val > 0
                        ? 'text-mg-gold bg-mg-gold/10 font-bold'
                        : 'text-mg-border/30'
                    }`}
                  >
                    {val > 0 ? val : ''}
                  </td>
                ))}
                <td className={`border-2 border-mg-border p-1.5 text-center font-bold ${rowTotals[i] > 0 ? 'text-mg-cyan' : 'text-mg-border/30'}`}>
                  {rowTotals[i] > 0 ? rowTotals[i] : ''}
                </td>
              </tr>
            ))}
            <tr>
              <th className="bg-mg-surface border-2 border-mg-border p-1.5 font-dot text-xs sticky left-0">計</th>
              {colTotals.map((v, j) => (
                <td key={j} className={`border-2 border-mg-border p-1.5 text-center font-bold ${v > 0 ? 'text-mg-pink' : 'text-mg-border/30'}`}>
                  {v > 0 ? v : ''}
                </td>
              ))}
              <td className="border-2 border-mg-border p-1.5 text-center font-bold text-white">
                {rowTotals.reduce((s, v) => s + v, 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {gs.txnLog.length === 0 && (
        <div className="mt-3 text-xs text-mg-text-secondary font-noto">
          今期はプレイヤーの取引記録がありません
        </div>
      )}
    </Card>
  );
}

/* ===== Comp View ===== */
function CompView({ companies, period }: { companies: Company[]; period: number }) {
  const sorted = [...companies].sort((a, b) => equity(b) - equity(a));

  return (
    <Card className="h-full w-full p-6 flex flex-col">
      <h2 className="font-dot text-lg mb-5">第{period}期 全社比較</h2>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-4 border-mg-border font-dot text-sm text-mg-text-secondary">
              <th className="p-3 w-12">順位</th>
              <th className="p-3">会社名</th>
              <th className="p-3 text-right">売上 (PQ)</th>
              <th className="p-3 text-right">粗利 (MQ)</th>
              <th className="p-3 text-right">営業利益</th>
              <th className="p-3 text-right">現金</th>
              <th className="p-3 text-right">自己資本</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const r   = c.result;
              const eq  = c.capital + c.retainedEarnings;
              const isMe = c.id === 'player';
              return (
                <tr
                  key={c.id}
                  className={`border-b-2 border-mg-border/50 font-mono text-lg ${
                    isMe ? 'bg-mg-cyan/10 border-mg-cyan' : ''
                  }`}
                >
                  <td className="p-3 font-press text-xl text-center text-mg-border">{i + 1}</td>
                  <td className="p-3 font-dot flex items-center gap-2">
                    {i === 0 && <Crown className="text-mg-gold" size={20} />}
                    <span className={TEXT_COLOR[c.id] ?? ''}>{c.name}</span>
                    {isMe && <span className="text-xs bg-mg-cyan text-[#000] px-1">YOU</span>}
                  </td>
                  <td className="p-3 text-right">{r ? fmt(r.revenue) : '—'}</td>
                  <td className="p-3 text-right">{r ? fmt(r.grossProfit) : '—'}</td>
                  <td className={`p-3 text-right font-bold ${!r ? '' : r.opProfit >= 0 ? 'text-mg-success' : 'text-mg-danger'}`}>
                    {r ? (r.opProfit >= 0 ? '+' : '') + fmt(r.opProfit) : '—'}
                  </td>
                  <td className="p-3 text-right">{fmt(c.cash)}</td>
                  <td className={`p-3 text-right font-bold ${TEXT_COLOR[c.id] ?? ''}`}>{fmt(eq)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
