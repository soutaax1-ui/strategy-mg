import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { motion } from 'motion/react';
// @ts-ignore
import confetti from 'canvas-confetti';
import { Crown, Medal, RotateCcw, Home, History } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useGame } from '../../lib/gameContext';
import { equity, fmt } from '../../lib/gameState';
import type { Company } from '../../lib/types';
import { setBgm } from '../../lib/sound';

const COMPANY_COLORS: Record<string, string> = {
  player: '#00d9ff',
  alpha:  '#ff4d8d',
  beta:   '#ffba08',
  gamma:  '#80ed99',
};
const TEXT_COLOR: Record<string, string> = {
  player: 'text-mg-cyan', alpha: 'text-mg-pink', beta: 'text-mg-gold', gamma: 'text-mg-lime',
};

export function ResultsScreen() {
  const navigate   = useNavigate();
  const { gs }     = useGame();

  useEffect(() => {
    if (!gs) { navigate('/'); return; }
    const sorted = [...gs.companies].sort((a, b) => equity(b) - equity(a));
    setBgm(sorted[0].id === 'player' ? 'victory' : 'defeat');
    const duration    = 3000;
    const animationEnd = Date.now() + duration;
    const defaults    = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const rand        = (min: number, max: number) => Math.random() * (max - min) + min;
    const interval    = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) { clearInterval(interval); return; }
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: rand(0.1, 0.3), y: Math.random() - 0.2 }, colors: ['#00d9ff', '#ffba08'] });
      confetti({ ...defaults, particleCount, origin: { x: rand(0.7, 0.9), y: Math.random() - 0.2 }, colors: ['#ff4d8d', '#80ed99'] });
    }, 250);
    return () => clearInterval(interval);
  }, []);

  if (!gs) return null;

  const sorted  = [...gs.companies].sort((a, b) => equity(b) - equity(a));
  const winner  = sorted[0];
  const totalPeriods = gs.currentPeriod; // last completed period

  // 自己資本推移データ (各期末の history 配列)
  const chartData = Array.from({ length: totalPeriods }, (_, i) => {
    const entry: Record<string, string | number> = { period: `${i + 1}期` };
    gs.companies.forEach(c => {
      entry[c.id] = c.history[i] ?? 0;
    });
    return entry;
  });

  return (
    <div className="flex flex-col min-h-screen w-full bg-mg-base p-8 pb-28 relative overflow-y-auto">

      {/* Header */}
      <motion.div
        className="flex flex-col items-center justify-center mb-8"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h1 className="font-press text-5xl text-mg-gold mb-3 drop-shadow-[0_0_20px_rgba(255,186,8,0.6)]">
          ゲーム終了
        </h1>
        <p className="font-dot text-lg text-mg-text-secondary">
          全{gs.totalPeriods}期 終了 — お疲れさまでした
        </p>
      </motion.div>

      {/* Winner */}
      <motion.div
        className="flex flex-col items-center justify-center mb-10"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5, type: 'spring' }}
      >
        <Crown
          size={72}
          className={`mb-3 drop-shadow-[0_0_15px_rgba(255,186,8,0.8)] ${TEXT_COLOR[winner.id] ?? 'text-mg-gold'}`}
        />
        <h2 className={`font-dot text-3xl mb-3 ${TEXT_COLOR[winner.id] ?? 'text-mg-gold'}`}>
          {winner.name} の勝利！
        </h2>
        <div className="flex items-end gap-2">
          <span className="font-mono text-5xl font-bold text-white drop-shadow-[2px_2px_0px_#000]">
            {equity(winner)}
          </span>
          <span className="font-dot text-xl text-mg-text-secondary mb-1">万円</span>
        </div>
      </motion.div>

      {/* Ranking + Chart */}
      <div className="flex gap-8 max-w-5xl mx-auto w-full">

        {/* Ranking */}
        <div className="w-1/2 flex flex-col gap-3">
          {sorted.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 1 + i * 0.15 }}
            >
              <Card
                glowColor={c.id === 'player' ? 'cyan' : 'none'}
                className={`flex items-center p-4 gap-4 ${c.id === 'player' ? 'bg-mg-cyan/10' : ''}`}
              >
                <div className="font-press text-2xl text-mg-border w-10 text-center">{i + 1}</div>
                <div className="w-7">
                  {i === 0 && <Medal className="text-mg-gold" size={28} />}
                  {i === 1 && <Medal className="text-[#C0C0C0]" size={28} />}
                  {i === 2 && <Medal className="text-[#CD7F32]" size={28} />}
                </div>
                <div className="flex-1">
                  <div className={`font-dot text-lg ${TEXT_COLOR[c.id] ?? ''}`}>
                    {c.name}
                    {c.id === 'player' && <span className="ml-2 text-xs bg-mg-cyan text-[#000] px-1">YOU</span>}
                  </div>
                  <div className="font-noto text-xs text-mg-text-secondary">
                    累計売上 {fmt(c.totalRevenue)} / 累計利益 {fmt(c.totalProfit)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-xl font-bold ${TEXT_COLOR[c.id] ?? ''}`}>
                    {fmt(equity(c))}
                  </div>
                  <div className={`font-mono text-sm ${c.retainedEarnings >= 0 ? 'text-mg-success' : 'text-mg-danger'}`}>
                    利益剰余金 {fmt(c.retainedEarnings)}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Chart */}
        <motion.div
          className="w-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
        >
          <Card className="h-full w-full p-5 flex flex-col">
            <h3 className="font-dot text-base mb-4">自己資本推移</h3>
            <div className="flex-1 min-h-[240px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3d3a5e" />
                    <XAxis dataKey="period" stroke="#a8a3c7" tick={{ fontFamily: 'DotGothic16', fontSize: 11 }} />
                    <YAxis stroke="#a8a3c7" tick={{ fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1830', borderColor: '#3d3a5e', fontFamily: 'DotGothic16', fontSize: 12 }}
                      itemStyle={{ fontFamily: 'JetBrains Mono' }}
                      formatter={(v: any) => [`${v}万`, '']}
                    />
                    {gs.companies.map(c => (
                      <Line
                        key={c.id}
                        type="monotone"
                        dataKey={c.id}
                        name={c.name}
                        stroke={COMPANY_COLORS[c.id] ?? '#888'}
                        strokeWidth={c.id === 'player' ? 4 : 2}
                        dot={c.id === 'player' ? { r: 5 } : { r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-mg-text-secondary font-noto text-sm">
                  履歴データなし
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Footer Buttons */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-mg-base via-mg-base to-transparent flex items-center justify-center gap-6 z-20 pb-4"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 2 }}
      >
        <Button variant="secondary" size="lg" onClick={() => navigate('/')}>
          <Home className="mr-2" /> タイトルへ戻る
        </Button>
        <Button
          variant="primary" size="lg"
          className="px-10 py-5 text-xl shadow-[8px_8px_0px_#000]"
          onClick={() => window.location.reload()}
        >
          <RotateCcw className="mr-2 w-5 h-5" /> もう一度プレイ
        </Button>
        <Button variant="secondary" size="lg" onClick={() => navigate('/history')}>
          <History className="mr-2" /> 履歴を見る
        </Button>
      </motion.div>
    </div>
  );
}
