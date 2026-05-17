import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Play } from 'lucide-react';
import { Button } from '../components/Button';
import { PresidentMascot } from '../components/PresidentMascot';
import type { MascotId, MascotExpression, MascotReaction } from '../../lib/mascotTypes';

const CHAR_IDS:   MascotId[]         = ['mecha', 'kame', 'fuku', 'roki', 'st'];
const CHAR_NAMES: Record<MascotId, string> = {
  mecha: 'メカ',
  kame:  'カメ',
  fuku:  'フク',
  roki:  'ロキ',
  st:    'ST',
};
const EXPRESSIONS: MascotExpression[] = ['normal', 'joy', 'anger', 'sadness', 'surprise'];
const REACTIONS:   MascotReaction[]   = ['idle', 'hop', 'bigHop', 'shake', 'nod', 'sink', 'leanBack', 'ready'];

export function MascotDebugScreen() {
  const navigate = useNavigate();
  const [charId,   setCharId]   = useState<MascotId>('mecha');
  const [expr,     setExpr]     = useState<MascotExpression>('normal');
  const [reaction, setReaction] = useState<MascotReaction>('idle');
  const [speech,   setSpeech]   = useState<string>('');
  const [firedSpeech, setFiredSpeech] = useState<string | undefined>(undefined);

  function fireSpeech() {
    // speech を一度 undefined にしてから再セットすることで
    // PresidentMascot の useEffect が必ず発火する
    setFiredSpeech(undefined);
    setTimeout(() => setFiredSpeech(speech || 'テストセリフ！'), 0);
  }

  function fireReaction(r: MascotReaction) {
    setReaction(r);
    // リアクション後 1.5s で idle に戻す (デバッグ用)
    if (r !== 'idle') {
      setTimeout(() => {
        setReaction('idle');
        setExpr('normal');
      }, 1500);
    }
  }

  return (
    <div className="min-h-screen w-full bg-mg-base text-mg-text-primary p-6 pb-64">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="secondary" onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> 戻る
        </Button>
        <h1 className="font-press text-2xl text-mg-gold">Mascot Debug</h1>
      </div>

      <div className="grid grid-cols-2 gap-8 max-w-4xl">
        {/* ── コントロール ── */}
        <div className="space-y-6">

          {/* キャラ選択 */}
          <section>
            <h2 className="font-dot text-mg-cyan text-lg mb-2">キャラ</h2>
            <div className="flex gap-2 flex-wrap">
              {CHAR_IDS.map(id => (
                <button
                  key={id}
                  onClick={() => { setCharId(id); setReaction('idle'); setExpr('normal'); }}
                  className={`px-3 py-1 border-2 font-dot text-sm transition-colors ${
                    charId === id
                      ? 'border-mg-cyan bg-mg-cyan/20 text-mg-cyan'
                      : 'border-mg-border text-mg-text-secondary hover:border-mg-text-secondary'
                  }`}
                >
                  {id} ({CHAR_NAMES[id]})
                </button>
              ))}
            </div>
          </section>

          {/* 表情 */}
          <section>
            <h2 className="font-dot text-mg-cyan text-lg mb-2">表情</h2>
            <div className="flex gap-2 flex-wrap">
              {EXPRESSIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setExpr(e)}
                  className={`px-3 py-1 border-2 font-dot text-sm transition-colors ${
                    expr === e
                      ? 'border-mg-gold bg-mg-gold/20 text-mg-gold'
                      : 'border-mg-border text-mg-text-secondary hover:border-mg-text-secondary'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </section>

          {/* リアクション */}
          <section>
            <h2 className="font-dot text-mg-cyan text-lg mb-2">リアクション</h2>
            <div className="flex gap-2 flex-wrap">
              {REACTIONS.map(r => (
                <button
                  key={r}
                  onClick={() => fireReaction(r)}
                  className={`px-3 py-1 border-2 font-dot text-sm transition-colors ${
                    reaction === r
                      ? 'border-mg-lime bg-mg-lime/20 text-mg-lime'
                      : 'border-mg-border text-mg-text-secondary hover:border-mg-text-secondary'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>

          {/* 吹き出し */}
          <section>
            <h2 className="font-dot text-mg-cyan text-lg mb-2">吹き出しテスト</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={speech}
                onChange={e => setSpeech(e.target.value)}
                placeholder="セリフを入力..."
                className="flex-1 bg-mg-elevated border-2 border-mg-border text-mg-text-primary px-3 py-1 font-noto text-sm outline-none focus:border-mg-cyan"
              />
              <Button variant="primary" size="sm" onClick={fireSpeech} className="gap-1">
                <Play className="w-3 h-3" /> 発火
              </Button>
            </div>
          </section>

          {/* ステータス */}
          <section className="p-4 bg-mg-elevated border-2 border-mg-border font-mono text-sm space-y-1">
            <div><span className="text-mg-text-secondary">char:</span> <span className="text-mg-cyan">{charId}</span></div>
            <div><span className="text-mg-text-secondary">expr:</span> <span className="text-mg-gold">{expr}</span></div>
            <div><span className="text-mg-text-secondary">react:</span> <span className="text-mg-lime">{reaction}</span></div>
          </section>
        </div>

        {/* ── 全表情グリッド ── */}
        <div>
          <h2 className="font-dot text-mg-cyan text-lg mb-3">全表情プレビュー ({charId})</h2>
          <div className="grid grid-cols-5 gap-2">
            {EXPRESSIONS.map(e => (
              <div
                key={e}
                className={`flex flex-col items-center gap-1 p-2 border-2 cursor-pointer transition-colors ${
                  expr === e ? 'border-mg-gold bg-mg-gold/10' : 'border-mg-border hover:border-mg-text-secondary'
                }`}
                onClick={() => setExpr(e)}
              >
                <img
                  src={`/characters/${charId}_${e}.png`}
                  alt={`${charId}_${e}`}
                  className="w-16 h-16 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="font-dot text-xs text-mg-text-secondary">{e}</span>
              </div>
            ))}
          </div>

          {/* 全キャラ normal グリッド */}
          <h2 className="font-dot text-mg-cyan text-lg mt-6 mb-3">全キャラ (normal)</h2>
          <div className="grid grid-cols-5 gap-2">
            {CHAR_IDS.map(id => (
              <div
                key={id}
                className={`flex flex-col items-center gap-1 p-2 border-2 cursor-pointer transition-colors ${
                  charId === id ? 'border-mg-cyan bg-mg-cyan/10' : 'border-mg-border hover:border-mg-text-secondary'
                }`}
                onClick={() => { setCharId(id); setReaction('idle'); setExpr('normal'); }}
              >
                <img
                  src={`/characters/${id}_normal.png`}
                  alt={id}
                  className="w-16 h-16 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="font-dot text-xs text-mg-text-secondary">{id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* マスコット本体 (fixed bottom-left) */}
      <PresidentMascot
        characterId={charId}
        expression={expr}
        reaction={reaction}
        speech={firedSpeech}
      />
    </div>
  );
}
