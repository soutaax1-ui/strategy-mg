import { useEffect, useRef, useState } from 'react';
import type { MascotId, MascotExpression, MascotReaction } from '../../lib/mascotTypes';
import { useGame } from '../../lib/gameContext';
import '../styles/mascot.css';

interface Props {
  characterId: MascotId;
  expression:  MascotExpression;
  reaction:    MascotReaction;
  speech?:     string;
  expiresAt?:  number;
  eventId?:    number;
  className?:  string;
}

export function PresidentMascot({ characterId, expression, reaction, speech, expiresAt, eventId, className }: Props) {
  const { dispatch } = useGame();
  const [visibleSpeech, setVisibleSpeech] = useState<string | undefined>(undefined);
  const firedEventIdRef = useRef<number | undefined>(undefined);

  // speech / expiresAt が変化したら表示し、期限切れで idle リセット
  useEffect(() => {
    if (!speech) { setVisibleSpeech(undefined); return; }
    setVisibleSpeech(speech);
    const delay = expiresAt ? Math.max(300, expiresAt - Date.now()) : 2000;
    const t = setTimeout(() => {
      setVisibleSpeech(undefined);
      // 同じ eventId の重複 dispatch を防ぐ
      if (eventId !== undefined && firedEventIdRef.current !== eventId) {
        firedEventIdRef.current = eventId;
        dispatch({ type: 'RESET_MASCOT' });
      }
    }, delay);
    return () => clearTimeout(t);
  }, [speech, expiresAt, eventId, dispatch]);

  const imgSrc  = `/characters/${characterId}_${expression}.png`;
  const animCls = reaction === 'idle'
    ? `mascot-idle-${characterId}`
    : `mascot-react-${reaction}`;

  return (
    <div className={`fixed bottom-6 right-6 z-30 flex flex-col items-end select-none pointer-events-none ${className ?? ''}`}>
      {/* 吹き出し — キャラの右上に表示 */}
      {visibleSpeech && (
        <div
          className="mascot-speech font-dot mr-4 mb-3"
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
