import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Crown, Medal, RotateCcw, Swords, Trophy, Target, TrendingUp, SearchX } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { cn } from "../../lib/utils";

// Mock Data
const mockHistory = [
  { id: 1, date: "2026/05/17", period: 10, difficulty: "Normal", rank: 1, finalEquity: 450, diff: 150, history: [300, 310, 305, 340, 360, 390, 400, 420, 440, 450] },
  { id: 2, date: "2026/05/16", period: 10, difficulty: "Hard", rank: 2, finalEquity: 340, diff: 40, history: [300, 290, 280, 295, 305, 320, 315, 330, 340, 340] },
  { id: 3, date: "2026/05/15", period: 5, difficulty: "Easy", rank: 1, finalEquity: 480, diff: 180, history: [300, 350, 400, 450, 480] },
  { id: 4, date: "2026/05/10", period: 20, difficulty: "Normal", rank: 4, finalEquity: 120, diff: -180, history: [300, 280, 250, 200, 180, 150, 120] },
];

export function HistoryScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");

  const filteredHistory = mockHistory.filter(h => {
    if (filter === "win") return h.rank === 1;
    if (filter === "loss") return h.rank > 1;
    return true;
  });

  const totalPlays = mockHistory.length;
  const totalWins = mockHistory.filter(h => h.rank === 1).length;
  const winRate = totalPlays > 0 ? Math.round((totalWins / totalPlays) * 100) : 0;
  const bestEquity = Math.max(...mockHistory.map(h => h.finalEquity), 0);

  // Chart data formatting
  const chartData = [...mockHistory].reverse().map((h, i) => ({
    name: `Game ${i + 1}`,
    equity: h.finalEquity
  }));

  return (
    <div className="w-full h-screen flex flex-col p-6 max-w-[1440px] mx-auto overflow-hidden">
      {/* Header */}
      <header className="h-[80px] flex items-center justify-between shrink-0 mb-4">
        <Button variant="secondary" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="w-5 h-5" /> 戻る
        </Button>
        <h1 className="text-3xl font-dot text-mg-text-primary">プレイ履歴</h1>
        <div className="flex bg-mg-surface border-2 border-mg-border p-1 gap-1">
          {(["all", "win", "loss"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 font-dot text-sm transition-colors",
                filter === f ? "bg-mg-cyan text-[#000]" : "text-mg-text-secondary hover:text-mg-text-primary"
              )}
            >
              {f === "all" ? "全て" : f === "win" ? "勝利のみ" : "敗北のみ"}
            </button>
          ))}
        </div>
      </header>

      {totalPlays === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <SearchX className="w-24 h-24 text-mg-text-secondary mb-6 opacity-50" />
          <h2 className="text-2xl font-dot text-mg-text-secondary mb-8">まだ履歴がありません</h2>
          <Button variant="primary" size="lg" onClick={() => navigate("/lobby")}>
            <Swords className="w-6 h-6 mr-2" /> ゲームを始める
          </Button>
        </div>
      ) : (
        <div className="flex flex-col flex-1 gap-6 min-h-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-6 shrink-0">
            <Card className="flex flex-col items-center justify-center py-6">
              <div className="text-sm font-noto text-mg-text-secondary mb-2 flex items-center gap-2">
                <Swords className="w-4 h-4" /> 通算プレイ数
              </div>
              <div className="text-5xl font-mono text-mg-text-primary">{totalPlays}</div>
            </Card>
            <Card className="flex flex-col items-center justify-center py-6" glowColor="lime">
              <div className="text-sm font-noto text-mg-text-secondary mb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-mg-lime" /> 通算勝利数
              </div>
              <div className="text-5xl font-mono text-mg-lime">{totalWins}</div>
            </Card>
            <Card className="flex flex-col items-center justify-center py-6" glowColor="cyan">
              <div className="text-sm font-noto text-mg-text-secondary mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-mg-cyan" /> 勝率
              </div>
              <div className="text-5xl font-mono text-mg-cyan">{winRate}<span className="text-2xl">%</span></div>
            </Card>
            <Card className="flex flex-col items-center justify-center py-6" glowColor="gold">
              <div className="text-sm font-noto text-mg-text-secondary mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-mg-gold" /> 自己ベスト
              </div>
              <div className="text-5xl font-mono text-mg-gold">{bestEquity}<span className="text-xl ml-1 font-noto">万</span></div>
            </Card>
          </div>

          <div className="flex flex-1 gap-6 min-h-0">
            {/* History List */}
            <div className="w-1/2 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
              {filteredHistory.length === 0 ? (
                <div className="text-center text-mg-text-secondary py-10 font-dot">条件に合う履歴がありません</div>
              ) : (
                filteredHistory.map(h => (
                  <Card
                    key={h.id}
                    className={cn(
                      "flex items-center p-4 hover:bg-mg-elevated transition-colors",
                      h.rank === 1 ? "border-mg-gold shadow-[4px_4px_0px_#ffba08]" : "opacity-80"
                    )}
                  >
                    <div className="flex-1">
                      <div className="text-xs font-mono text-mg-text-secondary mb-1">{h.date} - {h.period}期戦 ({h.difficulty})</div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-mg-surface border-2 border-mg-border shrink-0">
                          {h.rank === 1 ? <Crown className="w-6 h-6 text-mg-gold" /> : <Medal className="w-6 h-6 text-mg-text-secondary" />}
                        </div>
                        <div>
                          <div className="font-dot text-lg">
                            <span className="text-mg-text-secondary text-sm mr-2">順位:</span>
                            <span className={cn("text-2xl", h.rank === 1 ? "text-mg-gold" : "text-mg-text-primary")}>{h.rank}位</span>
                          </div>
                          <div className="font-mono text-lg flex items-baseline gap-2">
                            <span>{h.finalEquity}万</span>
                            <span className={cn("text-sm", h.diff >= 0 ? "text-mg-lime" : "text-mg-danger")}>
                              ({h.diff >= 0 ? "+" : ""}{h.diff}万)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" className="shrink-0 gap-2">
                      <RotateCcw className="w-4 h-4" /> 再戦
                    </Button>
                  </Card>
                ))
              )}
            </div>

            {/* Chart Area */}
            <Card className="w-1/2 flex flex-col p-6">
              <h3 className="font-dot text-xl text-mg-text-primary mb-6">自己資本の推移 (直近)</h3>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3d3a5e" />
                    <XAxis dataKey="name" stroke="#a8a3c7" tick={{ fill: '#a8a3c7', fontSize: 12, fontFamily: 'monospace' }} />
                    <YAxis stroke="#a8a3c7" tick={{ fill: '#a8a3c7', fontSize: 12, fontFamily: 'monospace' }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#1a1830', borderColor: '#00d9ff', color: '#f1f0ff', fontFamily: 'monospace' }}
                      itemStyle={{ color: '#00d9ff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke="#00d9ff"
                      strokeWidth={4}
                      dot={{ r: 6, fill: '#1a1830', stroke: '#00d9ff', strokeWidth: 2 }}
                      activeDot={{ r: 8, fill: '#00d9ff', stroke: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
