import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/Button";
import { ChevronLeft, Info, Activity } from "lucide-react";
import { motion } from "motion/react";

const CITIES = [
  { id: "sapporo", name: "札幌", top: "15%", left: "75%", vol: 2, price: 16, sellers: ["cyan"] },
  { id: "sendai", name: "仙台", top: "40%", left: "70%", vol: 3, price: 15, sellers: ["pink"] },
  { id: "tokyo", name: "東京", top: "60%", left: "65%", vol: 7, price: 15, sellers: ["cyan", "gold", "lime"] },
  { id: "nagoya", name: "名古屋", top: "65%", left: "55%", vol: 4, price: 15, sellers: ["gold"] },
  { id: "osaka", name: "大阪", top: "65%", left: "45%", vol: 6, price: 16, sellers: ["pink", "lime"] },
  { id: "fukuoka", name: "福岡", top: "75%", left: "25%", vol: 5, price: 14, sellers: ["cyan"] },
];

const SELLER_COLORS: Record<string, string> = {
  cyan: "bg-mg-cyan",
  pink: "bg-mg-pink",
  gold: "bg-mg-gold",
  lime: "bg-mg-lime",
};

export function MarketScreen() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen w-full bg-[#050510] relative overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#000] to-transparent z-20 flex items-center px-8 justify-between">
        <div className="flex items-center gap-6">
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            <ChevronLeft className="mr-2" /> 戻る
          </Button>
          <h1 className="font-dot text-3xl drop-shadow-[2px_2px_0px_#000]">6都市市場ビュー</h1>
        </div>
        <div className="bg-mg-surface border-2 border-mg-border px-4 py-2 flex items-center gap-4 font-dot shadow-[4px_4px_0px_#000]">
          <span className="text-mg-text-secondary">第3期</span>
          <div className="w-px h-6 bg-mg-border" />
          <span className="text-mg-cyan">残り総需要: 27個</span>
        </div>
      </header>

      {/* Map Content */}
      <div className="flex-1 relative mt-20 p-8 flex items-center justify-center">
        {/* Retro Japan Map Base (Simplified Shape) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
          <svg viewBox="0 0 800 600" className="w-[80%] h-[80%]">
            <path d="M 600,100 L 650,50 L 700,100 L 650,200 Z M 650,250 L 680,300 L 600,450 L 500,450 L 400,480 L 300,500 L 200,550 L 150,500 L 250,450 L 300,400 L 400,350 L 500,350 L 600,250 Z" fill="white" stroke="white" strokeWidth="4" />
          </svg>
        </div>

        <div className="relative w-full max-w-5xl h-[700px] border-4 border-mg-border bg-mg-base/80 backdrop-blur-sm shadow-[16px_16px_0px_#000] p-8">
          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            <line x1="75%" y1="15%" x2="70%" y2="40%" stroke="#fff" strokeWidth="4" strokeDasharray="10 10" />
            <line x1="70%" y1="40%" x2="65%" y2="60%" stroke="#fff" strokeWidth="4" strokeDasharray="10 10" />
            <line x1="65%" y1="60%" x2="55%" y2="65%" stroke="#fff" strokeWidth="4" strokeDasharray="10 10" />
            <line x1="55%" y1="65%" x2="45%" y2="65%" stroke="#fff" strokeWidth="4" strokeDasharray="10 10" />
            <line x1="45%" y1="65%" x2="25%" y2="75%" stroke="#fff" strokeWidth="4" strokeDasharray="10 10" />
          </svg>

          {/* Cities */}
          {CITIES.map((city) => (
            <motion.div
              key={city.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 cursor-pointer z-10`}
              style={{ top: city.top, left: city.left }}
              onMouseEnter={() => setHovered(city.id)}
              onMouseLeave={() => setHovered(null)}
              animate={{ y: hovered === city.id ? -10 : 0 }}
            >
              <div className={`w-[200px] h-[160px] bg-mg-surface border-4 transition-colors shadow-[8px_8px_0px_#000] flex flex-col relative ${hovered === city.id ? 'border-mg-cyan z-20' : 'border-mg-border'}`}>
                <div className="bg-mg-elevated border-b-4 border-mg-border p-2 flex justify-between items-center">
                  <span className="font-dot text-xl">{city.name}</span>
                  <Info size={16} className="text-mg-text-secondary" />
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-end">
                    <span className="font-dot text-sm text-mg-text-secondary">残需要</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-3xl font-bold">{city.vol}</span>
                      <span className="font-dot text-sm">個</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <span className="font-dot text-sm text-mg-text-secondary">底値</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xl font-bold text-mg-gold">{city.price}</span>
                      <span className="font-dot text-sm text-mg-gold">万</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t-2 border-mg-border border-dashed flex gap-2 h-6">
                    {city.sellers.map((s, i) => (
                      <div key={i} className={`w-4 h-4 ${SELLER_COLORS[s]} border-2 border-[#000]`} />
                    ))}
                  </div>
                </div>

                {/* Detail Panel Popup */}
                {hovered === city.id && (
                  <div className="absolute top-0 left-[210px] w-[240px] bg-mg-base border-4 border-mg-cyan p-4 shadow-[8px_8px_0px_#000] z-30 pointer-events-none">
                    <div className="font-dot text-mg-cyan mb-2 flex items-center gap-2">
                      <Activity size={16} /> 当期販売履歴
                    </div>
                    <div className="font-noto text-xs flex flex-col gap-2">
                      <div className="flex justify-between border-b border-mg-border pb-1">
                        <span className="text-mg-cyan">あなた</span>
                        <span>2個 @ 17万</span>
                      </div>
                      <div className="flex justify-between border-b border-mg-border pb-1">
                        <span className="text-mg-pink">アルファ商事</span>
                        <span>3個 @ 16万</span>
                      </div>
                      <div className="text-mg-text-secondary mt-2">
                        ※過去3期の平均価格: 16.5万
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
