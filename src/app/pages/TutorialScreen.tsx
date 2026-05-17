import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ChevronRight, ChevronLeft, Lightbulb, AlertCircle, Play, Building2, User, Coins, TrendingUp } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { cn } from "../../lib/utils";
import { setBgm } from "../../lib/sound";

const CHAPTERS = [
  {
    id: "overview",
    title: "MG (マネジメントゲーム) とは",
    icon: Building2,
    content: (
      <div className="space-y-6">
        <p className="text-lg leading-relaxed">
          あなたは1つの会社の経営者になり、ライバル3社（AIまたは人間）と市場で戦います。
          10期（＝10年）経営して、<strong>最も自己資本を増やした人が勝ち</strong>です。
        </p>
        <div className="p-6 border-2 border-mg-cyan bg-mg-cyan/10 relative">
          <div className="absolute -top-4 left-4 bg-mg-cyan text-[#000] font-bold px-3 py-1 text-sm font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> 重要ポイント
          </div>
          <p className="text-xl font-dot text-center mt-2 tracking-wider">
            自己資本 ＝ 現金 ＋ 在庫 ＋ 設備 － 借金
          </p>
        </div>
        <div className="p-6 border-2 border-mg-lime bg-mg-lime/10 relative">
          <div className="absolute -top-4 left-4 bg-mg-lime text-[#000] font-bold px-3 py-1 text-sm font-mono flex items-center gap-2">
            <Lightbulb className="w-4 h-4" /> Example
          </div>
          <p className="text-mg-text-primary mt-2 leading-relaxed">
            初期の自己資本が300万円でスタートし、10期後に450万円になれば「＋150万円の成長」となります。
            手元の現金だけでなく、工場（設備）や商品の在庫も資産としてカウントされます。
          </p>
        </div>
      </div>
    )
  },
  {
    id: "decision",
    title: "意思決定の流れ",
    icon: User,
    content: (
      <div className="space-y-6">
        <p className="text-lg leading-relaxed">
          毎期、各プレイヤーは順番に行動を選択します。
          行動には「材料購入」「生産」「設備投資」「広告」「研究開発」などがあります。
        </p>
        <ul className="list-none space-y-4">
          <li className="flex items-start gap-4 p-4 bg-mg-elevated border-2 border-mg-border">
            <div className="w-8 h-8 bg-mg-gold text-[#000] flex items-center justify-center font-bold font-mono">1</div>
            <div>
              <h4 className="font-dot text-xl text-mg-gold mb-1">材料購入・生産</h4>
              <p className="text-sm text-mg-text-secondary">商品を売るには、まず材料を買い、工場で生産する必要があります。</p>
            </div>
          </li>
          <li className="flex items-start gap-4 p-4 bg-mg-elevated border-2 border-mg-border">
            <div className="w-8 h-8 bg-mg-cyan text-[#000] flex items-center justify-center font-bold font-mono">2</div>
            <div>
              <h4 className="font-dot text-xl text-mg-cyan mb-1">投資（広告・研究）</h4>
              <p className="text-sm text-mg-text-secondary">広告を出すと販売力が上がり、研究開発をすると商品の価値が上がります。</p>
            </div>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: "market",
    title: "市場と入札 (親子方式)",
    icon: Coins,
    content: (
      <div className="space-y-6">
        <p className="text-lg leading-relaxed">
          商品を販売する際は「入札」を行います。<br/>
          順番に「親」となり、売りたい価格と数量を提示します。他のプレイヤーは「子」として、その条件で買うか、より安い価格を提示して競争するかを選びます。
        </p>
        <div className="p-6 border-2 border-mg-pink bg-mg-pink/10 relative">
          <div className="absolute -top-4 left-4 bg-mg-pink text-[#000] font-bold px-3 py-1 text-sm font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> ルール
          </div>
          <p className="mt-2 text-mg-text-primary">
            市場には需要（買ってもらえる数）に上限があります。
            価格が高すぎると売れ残り、安すぎると利益が出ません。ライバルの在庫数を見極めるのが重要です。
          </p>
        </div>
      </div>
    )
  },
  {
    id: "accounting",
    title: "決算と会計 (MQ会計)",
    icon: TrendingUp,
    content: (
      <div className="space-y-6">
        <p className="text-lg leading-relaxed">
          1期が終わると決算です。MGでは「MQ会計」という直感的な会計手法を使います。
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="border-2 border-mg-border p-4 bg-mg-elevated">
            <h4 className="text-mg-gold font-dot text-lg mb-2">P (価格) × Q (数量)</h4>
            <p className="text-sm text-mg-text-secondary">＝ PQ (売上高)</p>
          </div>
          <div className="border-2 border-mg-border p-4 bg-mg-elevated">
            <h4 className="text-mg-pink font-dot text-lg mb-2">V (原価) × Q (数量)</h4>
            <p className="text-sm text-mg-text-secondary">＝ VQ (変動費)</p>
          </div>
          <div className="col-span-2 border-2 border-mg-cyan p-4 bg-mg-cyan/10">
            <h4 className="text-mg-cyan font-dot text-lg mb-2">M (粗利単価) × Q (数量) ＝ MQ (粗利総額)</h4>
            <p className="text-sm text-mg-text-primary mt-2">
              粗利(MQ) から 固定費(F) を引いたものが、最終的な利益(G) になります。<br/>
              <strong>G ＝ MQ － F</strong>
            </p>
          </div>
        </div>
      </div>
    )
  }
];

export function TutorialScreen() {
  const navigate = useNavigate();
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  useEffect(() => { setBgm('title'); }, []);

  const chapter = CHAPTERS[currentChapterIndex];
  const isFirst = currentChapterIndex === 0;
  const isLast = currentChapterIndex === CHAPTERS.length - 1;

  const nextChapter = () => {
    if (!isLast) setCurrentChapterIndex(prev => prev + 1);
  };

  const prevChapter = () => {
    if (!isFirst) setCurrentChapterIndex(prev => prev - 1);
  };

  const Icon = chapter.icon;

  return (
    <div className="w-full h-screen flex flex-col p-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <header className="h-[80px] flex items-center justify-between shrink-0 mb-6">
        <Button variant="secondary" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="w-5 h-5" /> 戻る
        </Button>
        <h1 className="text-3xl font-dot text-mg-text-primary">ゲームのルール</h1>
        <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
          スキップしてプレイ <Play className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex flex-1 gap-8 overflow-hidden min-h-0">
        {/* Navigation Tabs */}
        <div className="w-[300px] shrink-0 flex flex-col gap-2">
          {CHAPTERS.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => setCurrentChapterIndex(idx)}
              className={cn(
                "w-full text-left p-4 font-dot text-lg border-2 transition-all duration-200 flex items-center gap-3",
                currentChapterIndex === idx
                  ? "bg-mg-elevated border-mg-cyan text-mg-cyan shadow-[4px_4px_0px_#00d9ff]"
                  : "bg-mg-surface border-mg-border text-mg-text-secondary hover:border-mg-text-secondary hover:bg-mg-elevated"
              )}
            >
              <c.icon className="w-5 h-5" />
              {idx + 1}. {c.title.split(" ")[0]}
            </button>
          ))}

          <div className="mt-auto p-4 border-2 border-mg-border bg-mg-surface text-sm text-mg-text-secondary font-noto">
            ※詳しい用語はゲーム内の「ヘルプ」からも確認できます。
          </div>
        </div>

        {/* Content Area */}
        <Card className="flex-1 flex flex-col relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 overflow-y-auto p-8"
            >
              <div className="flex items-center gap-6 mb-10">
                <motion.div
                  className="w-20 h-20 bg-mg-elevated border-4 border-mg-gold flex items-center justify-center shadow-[6px_6px_0px_#ffba08]"
                  whileHover={{ rotate: [0, -10, 10, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Icon className="w-10 h-10 text-mg-gold" />
                </motion.div>
                <h2 className="text-4xl font-dot text-mg-gold">{chapter.title}</h2>
              </div>

              <div className="font-noto text-mg-text-primary">
                {chapter.content}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom Nav */}
          <div className="p-6 border-t-2 border-mg-border bg-mg-surface flex items-center justify-between mt-auto">
            <Button
              variant="secondary"
              onClick={prevChapter}
              disabled={isFirst}
              className="w-40"
            >
              <ChevronLeft className="w-5 h-5 mr-2" /> 前の章へ
            </Button>

            <div className="font-mono text-mg-text-secondary">
              {currentChapterIndex + 1} / {CHAPTERS.length}
            </div>

            {isLast ? (
              <Button variant="primary" onClick={() => navigate("/dashboard")} className="w-48 shadow-[6px_6px_0px_#000000]">
                ゲームを始める <Play className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button variant="secondary" onClick={nextChapter} className="w-40">
                次の章へ <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
