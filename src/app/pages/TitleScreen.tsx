import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { motion } from "motion/react";
import { Play, RotateCcw } from "lucide-react";
import { useGame } from "../../lib/gameContext";
import { DIFF } from "../../lib/constants";
import { setBgm, playSfx } from "../../lib/sound";

export function TitleScreen() {
  const navigate = useNavigate();
  const { dispatch, gs } = useGame();
  const [period, setPeriod]         = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');

  useEffect(() => { setBgm('title'); }, []);

  const difficulties = [
    { id: 'easy'   as const, label: 'Easy',   desc: "AI弱 / 初期500万 / 市場+20% / 利率5%",  color: "text-green-400" },
    { id: 'normal' as const, label: 'Normal', desc: "AI標準 / 初期300万 / 市場標準 / 利率10%", color: "text-mg-cyan"   },
    { id: 'hard'   as const, label: 'Hard',   desc: "AI強 / 初期200万 / 市場-10% / 利率15%+リスク+20%", color: "text-mg-danger" },
  ];

  function handleStart() {
    playSfx('confirm');
    const config = DIFF[difficulty];
    dispatch({ type: 'INIT_GAME', totalPeriods: period, config });
    navigate('/dashboard');
  }

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center relative p-8">
      {/* Background Particles Placeholder */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-mg-cyan/20"
            animate={{
              y: ["100vh", "-10vh"],
              x: [Math.random() * 100 + "vw", Math.random() * 100 + "vw"],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>

      {/* Titles */}
      <div className="text-center mb-12 z-10">
        <motion.h1 
          className="text-6xl text-mg-gold font-press mb-4 drop-shadow-[0_0_15px_rgba(0,217,255,0.5)]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          戦略 MG
        </motion.h1>
        <p className="text-mg-text-secondary font-dot text-lg">マネジメントゲーム シングルプレイ版</p>
      </div>

      {/* Settings Panel */}
      <Card className="w-full max-w-4xl p-12 flex flex-col items-center gap-10 z-10 relative">
        <div className="w-full">
          <h2 className="text-xl font-dot text-mg-text-primary mb-4 text-center">期数設定</h2>
          <div className="flex justify-center gap-4">
            {[5, 10, 20].map((p) => (
              <Button 
                key={p}
                variant={period === p ? "primary" : "secondary"}
                onClick={() => setPeriod(p)}
                className="w-32"
              >
                {p}期
              </Button>
            ))}
          </div>
        </div>

        <div className="w-full">
          <h2 className="text-xl font-dot text-mg-text-primary mb-4 text-center">難易度設定</h2>
          <div className="grid grid-cols-3 gap-4">
            {difficulties.map((diff) => (
              <div
                key={diff.id}
                onClick={() => setDifficulty(diff.id)}
                className={`cursor-pointer border-2 p-4 flex flex-col gap-2 transition-all duration-200 ${
                  difficulty === diff.id
                    ? 'border-mg-cyan bg-mg-cyan/10 shadow-[4px_4px_0px_#000000]'
                    : 'border-mg-border bg-mg-elevated hover:border-mg-text-secondary'
                }`}
              >
                <div className={`font-press text-sm text-center mb-1 ${diff.color}`}>{diff.label}</div>
                <div className="font-noto text-xs text-mg-text-secondary text-center leading-relaxed">
                  {diff.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Button
              variant="primary"
              className="font-press text-2xl py-6 px-12 shadow-[6px_6px_0px_#000000]"
              onClick={handleStart}
            >
              <Play className="mr-4 w-8 h-8" />
              ゲーム開始
            </Button>
          </motion.div>
        </div>
      </Card>

      {/* Bottom anchors */}
      <div className="absolute bottom-8 right-8 flex gap-3">
        <Button variant="secondary" onClick={() => navigate('/lobby')}>
          オンライン対戦
        </Button>
        <Button variant="secondary" onClick={() => gs && navigate('/dashboard')}>
          <RotateCcw className="mr-2 w-4 h-4" />
          続きから
        </Button>
      </div>
      <div className="absolute bottom-8 left-8 text-mg-text-secondary font-mono text-sm">
        v0.1
      </div>
    </div>
  );
}
