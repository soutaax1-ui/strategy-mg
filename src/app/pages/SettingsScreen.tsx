import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Volume2, Monitor, Gamepad2, Database, Info, Save, X, AlertTriangle, Download, Upload, Trash2, Play } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { cn } from "../../lib/utils";
import { setBgm, setBgmVolume, setBgmEnabled, getBgmVolume, getBgmEnabled, setSeVolume, setSeEnabled, getSeVolume, getSeEnabled } from "../../lib/sound";

export function SettingsScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("sound");

  // sound.ts の現在値を初期値として読み込む
  const [bgmVol, setBgmVolState] = useState(() => Math.round(getBgmVolume() * 100));
  const [seVol,  setSeVolState]  = useState(() => Math.round(getSeVolume()  * 100));
  const [bgmOn,  setBgmOn]       = useState(getBgmEnabled);
  const [seOn,   setSeOn]        = useState(getSeEnabled);

  useEffect(() => { setBgm('title'); }, []);

  const [currencyFormat, setCurrencyFormat] = useState("man"); // man, yen
  const [animSpeed, setAnimSpeed] = useState("full"); // full, light, off

  const [aiSpeed, setAiSpeed] = useState("normal"); // fast, normal, slow
  const [turnTimer, setTurnTimer] = useState(true);
  const [autoProgress, setAutoProgress] = useState(false);

  const TABS = [
    { id: "sound", label: "サウンド", icon: Volume2 },
    { id: "display", label: "表示", icon: Monitor },
    { id: "gameplay", label: "ゲームプレイ", icon: Gamepad2 },
    { id: "data", label: "データ管理", icon: Database },
    { id: "about", label: "アバウト", icon: Info },
  ];

  const handleSave = () => {
    // Save logic
    navigate("/");
  };

  const Switch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <button
      onClick={onChange}
      className={cn(
        "w-16 h-8 border-2 border-[#000] flex items-center transition-colors p-1 shadow-[2px_2px_0px_#000000]",
        checked ? "bg-mg-lime justify-end" : "bg-mg-border justify-start"
      )}
    >
      <div className="w-5 h-5 bg-[#000]" />
    </button>
  );

  return (
    <div className="w-full h-screen flex flex-col p-6 max-w-[1000px] mx-auto">
      {/* Header */}
      <header className="h-[80px] flex items-center justify-between shrink-0 mb-6">
        <Button variant="secondary" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="w-5 h-5" /> 戻る
        </Button>
        <h1 className="text-3xl font-dot text-mg-text-primary">設定</h1>
        <div className="w-[110px]" /> {/* Spacer for balance */}
      </header>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Sidebar */}
        <div className="w-[240px] shrink-0 flex flex-col gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full text-left p-4 font-dot text-lg border-2 transition-all duration-200 flex items-center gap-3",
                activeTab === tab.id
                  ? "bg-mg-elevated border-mg-cyan text-mg-cyan shadow-[4px_4px_0px_#00d9ff]"
                  : "bg-mg-surface border-mg-border text-mg-text-secondary hover:border-mg-text-secondary hover:bg-mg-elevated"
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <Card className="flex-1 flex flex-col relative overflow-y-auto p-8">
          {activeTab === "sound" && (
            <div className="space-y-8 animate-in fade-in">
              <h2 className="text-2xl font-dot text-mg-gold border-b-2 border-mg-border pb-2">サウンド設定</h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-mg-elevated border-2 border-mg-border">
                  <span className="font-dot text-lg">BGM オン/オフ</span>
                  <Switch checked={bgmOn} onChange={() => { const next = !bgmOn; setBgmOn(next); setBgmEnabled(next); }} />
                </div>

                <div className={cn("space-y-4", !bgmOn && "opacity-50 pointer-events-none")}>
                  <div className="flex justify-between font-mono">
                    <span>BGM 音量</span>
                    <span className="text-mg-cyan">{bgmVol}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" value={bgmVol}
                    onChange={e => { const v = Number(e.target.value); setBgmVolState(v); setBgmVolume(v / 100); }}
                    className="w-full accent-mg-cyan h-2 bg-mg-border appearance-none cursor-pointer"
                  />
                </div>

                <div className="h-px bg-mg-border my-6" />

                <div className="flex items-center justify-between p-4 bg-mg-elevated border-2 border-mg-border">
                  <span className="font-dot text-lg">効果音 (SE) オン/オフ</span>
                  <Switch checked={seOn} onChange={() => { const next = !seOn; setSeOn(next); setSeEnabled(next); }} />
                </div>

                <div className={cn("space-y-4", !seOn && "opacity-50 pointer-events-none")}>
                  <div className="flex justify-between font-mono">
                    <span>SE 音量</span>
                    <span className="text-mg-cyan">{seVol}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" value={seVol}
                    onChange={e => { const v = Number(e.target.value); setSeVolState(v); setSeVolume(v / 100); }}
                    className="w-full accent-mg-cyan h-2 bg-mg-border appearance-none cursor-pointer"
                  />
                  <div className="flex justify-end pt-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Play className="w-4 h-4" /> テストプレイ
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "display" && (
            <div className="space-y-8 animate-in fade-in">
              <h2 className="text-2xl font-dot text-mg-gold border-b-2 border-mg-border pb-2">表示設定</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-mg-text-secondary font-noto mb-3">数値表示形式</label>
                  <div className="flex gap-4">
                    <Button variant={currencyFormat === "man" ? "primary" : "secondary"} onClick={() => setCurrencyFormat("man")} className="flex-1">万円表記 (例: 300万)</Button>
                    <Button variant={currencyFormat === "yen" ? "primary" : "secondary"} onClick={() => setCurrencyFormat("yen")} className="flex-1">円表記 (例: 3,000,000)</Button>
                  </div>
                </div>

                <div>
                  <label className="block text-mg-text-secondary font-noto mb-3">アニメーション</label>
                  <div className="flex gap-4">
                    <Button variant={animSpeed === "full" ? "primary" : "secondary"} onClick={() => setAnimSpeed("full")} className="flex-1">フル</Button>
                    <Button variant={animSpeed === "light" ? "primary" : "secondary"} onClick={() => setAnimSpeed("light")} className="flex-1">軽量</Button>
                    <Button variant={animSpeed === "off" ? "primary" : "secondary"} onClick={() => setAnimSpeed("off")} className="flex-1">オフ</Button>
                  </div>
                </div>

                <div>
                  <label className="block text-mg-text-secondary font-noto mb-3">テーマ</label>
                  <Button variant="primary" disabled className="w-full bg-mg-elevated text-mg-text-primary border-mg-border shadow-none opacity-80">
                    常にダークモード (固定)
                  </Button>
                </div>

                <div>
                  <label className="block text-mg-text-secondary font-noto mb-3">言語 (Language)</label>
                  <Button variant="primary" disabled className="w-full bg-mg-elevated text-mg-text-primary border-mg-border shadow-none opacity-80">
                    日本語 (Japanese)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "gameplay" && (
            <div className="space-y-8 animate-in fade-in">
              <h2 className="text-2xl font-dot text-mg-gold border-b-2 border-mg-border pb-2">ゲームプレイ設定</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-mg-text-secondary font-noto mb-3">AI 思考時間</label>
                  <div className="flex gap-4">
                    <Button variant={aiSpeed === "fast" ? "primary" : "secondary"} onClick={() => setAiSpeed("fast")} className="flex-1">速い</Button>
                    <Button variant={aiSpeed === "normal" ? "primary" : "secondary"} onClick={() => setAiSpeed("normal")} className="flex-1">標準</Button>
                    <Button variant={aiSpeed === "slow" ? "primary" : "secondary"} onClick={() => setAiSpeed("slow")} className="flex-1">じっくり</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-mg-elevated border-2 border-mg-border">
                  <div>
                    <span className="font-dot text-lg block">ターンタイマー</span>
                    <span className="text-sm text-mg-text-secondary">一定時間で自動パスします</span>
                  </div>
                  <Switch checked={turnTimer} onChange={() => setTurnTimer(!turnTimer)} />
                </div>

                <div className="flex items-center justify-between p-4 bg-mg-elevated border-2 border-mg-border">
                  <div>
                    <span className="font-dot text-lg block">自動進行</span>
                    <span className="text-sm text-mg-text-secondary">確認ダイアログをスキップします</span>
                  </div>
                  <Switch checked={autoProgress} onChange={() => setAutoProgress(!autoProgress)} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="space-y-8 animate-in fade-in">
              <h2 className="text-2xl font-dot text-mg-gold border-b-2 border-mg-border pb-2">データ管理</h2>

              <div className="space-y-4">
                <div className="p-4 border-2 border-mg-border bg-mg-elevated flex items-center justify-between">
                  <div>
                    <h3 className="font-dot text-lg">セーブデータのエクスポート</h3>
                    <p className="text-sm text-mg-text-secondary">現在の履歴や設定をファイルに保存します</p>
                  </div>
                  <Button variant="outline" className="gap-2 text-mg-text-primary border-mg-text-primary hover:bg-mg-text-primary/10">
                    <Download className="w-4 h-4" /> エクスポート
                  </Button>
                </div>

                <div className="p-4 border-2 border-mg-border bg-mg-elevated flex items-center justify-between">
                  <div>
                    <h3 className="font-dot text-lg">セーブデータのインポート</h3>
                    <p className="text-sm text-mg-text-secondary">ファイルからデータを復元します</p>
                  </div>
                  <Button variant="outline" className="gap-2 text-mg-text-primary border-mg-text-primary hover:bg-mg-text-primary/10">
                    <Upload className="w-4 h-4" /> インポート
                  </Button>
                </div>

                <div className="h-px bg-mg-border my-4" />

                <div className="p-4 border-2 border-mg-danger bg-mg-danger/10 flex items-center justify-between">
                  <div>
                    <h3 className="font-dot text-lg text-mg-danger">プレイ履歴をクリア</h3>
                    <p className="text-sm text-mg-text-secondary">これまでの戦績が全て消去されます</p>
                  </div>
                  <Button variant="danger" className="gap-2">
                    <Trash2 className="w-4 h-4" /> クリア
                  </Button>
                </div>

                <div className="p-4 border-2 border-mg-border flex items-center justify-between">
                  <div>
                    <h3 className="font-dot text-lg">設定をデフォルトに戻す</h3>
                  </div>
                  <Button variant="secondary" className="gap-2 text-mg-danger border-mg-danger hover:bg-mg-danger/10">
                    <AlertTriangle className="w-4 h-4" /> 初期化
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "about" && (
            <div className="space-y-8 animate-in fade-in">
              <h2 className="text-2xl font-dot text-mg-gold border-b-2 border-mg-border pb-2">アバウト</h2>

              <div className="space-y-6 text-center py-8">
                <div className="text-4xl font-press text-mg-cyan mb-2 drop-shadow-[0_0_10px_rgba(0,217,255,0.5)]">戦略 MG</div>
                <div className="font-mono text-mg-text-secondary">Version 0.1.0</div>

                <div className="mt-8 p-6 bg-mg-elevated border-2 border-mg-border text-left space-y-4">
                  <div>
                    <h4 className="text-mg-text-secondary text-sm">Developed by</h4>
                    <p className="font-dot text-lg">Figma Make</p>
                  </div>
                  <div>
                    <h4 className="text-mg-text-secondary text-sm">Powered by</h4>
                    <p className="font-dot text-lg">React, Tailwind CSS, Motion</p>
                  </div>
                  <div className="pt-4 mt-4 border-t-2 border-mg-border">
                    <a href="#" className="text-mg-cyan hover:underline font-noto flex items-center gap-1 w-fit">
                      フィードバックを送る <ArrowLeft className="w-3 h-3 rotate-135" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Footer Actions */}
      <footer className="mt-6 flex justify-end gap-4 shrink-0">
        <Button variant="secondary" onClick={() => navigate("/")} className="gap-2 w-32">
          <X className="w-5 h-5" /> キャンセル
        </Button>
        <Button variant="primary" onClick={handleSave} className="gap-2 w-48 shadow-[6px_6px_0px_#000000]">
          <Save className="w-5 h-5" /> 設定を保存
        </Button>
      </footer>
    </div>
  );
}
