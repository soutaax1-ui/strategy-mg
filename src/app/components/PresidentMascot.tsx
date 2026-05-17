import { useEffect, useState } from 'react';
import type { MascotId, MascotExpression, MascotReaction } from '../../lib/mascotTypes';
import '../styles/mascot.css';

interface Props {
  characterId: MascotId;
  expression:  MascotExpression;
  reaction:    MascotReaction;
  speech?:     string;
}

export function PresidentMascot({ characterId, expression, reaction, speech }: Props) {
  const [visibleSpeech, setVisibleSpeech] = useState<string | undefined>(undefined);

  // speech prop が変化したら表示 → 2秒後に自動消去
  useEffect(() => {
    if (!speech) { setVisibleSpeech(undefined); return; }
    setVisibleSpeech(speech);
    const t = setTimeout(() => setVisibleSpeech(undefined), 2000);
    return () => clearTimeout(t);
  }, [speech]);

  const imgSrc  = `/characters/${characterId}_${expression}.png`;
  const animCls = reaction === 'idle'
    ? `mascot-idle-${characterId}`
    : `mascot-react-${reaction}`;

  return (
    <div className="fixed bottom-0 left-4 z-40 flex flex-col items-start select-none pointer-events-none">
      {/* 吹き出し — キャラの右上に表示 */}
      {visibleSpeech && (
        <div
          className="mascot-speech font-dot ml-8 mb-3"
          role="status"
          aria-live="polite"
        >
          {visibleSpeech}
        </div>
      )}

      {/* キャラ画像
          key に reaction + expression を含めることで、
          アニメーション class が変わるたび DOM が再生成され
          CSS animation が先頭から再生される */}
      <img
        key={`${characterId}-${reaction}-${expression}`}
        src={imgSrc}
        alt={`${characterId} (${expression})`}
        className={`mascot-img ${animCls}`}
        draggable={false}
      />
    </div>
  );
}
