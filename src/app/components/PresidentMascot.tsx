import { useEffect, useRef, useState } from 'react';
import type { MascotId, MascotExpression, MascotReaction } from '../../lib/mascotTypes';
import { useGame } from '../../lib/gameContext';
import '../styles/mascot.css';

const EXPRESSIONS: readonly MascotExpression[] = ['normal', 'joy', 'anger', 'sadness', 'surprise'];

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
      if (eventId !== undefined && firedEventIdRef.current !== eventId) {
        firedEventIdRef.current = eventId;
        dispatch({ type: 'RESET_MASCOT' });
      }
    }, delay);
    return () => clearTimeout(t);
  }, [speech, expiresAt, eventId, dispatch]);

  const animCls = reaction === 'idle'
    ? `mascot-idle-${characterId}`
    : `mascot-react-${reaction}`;

  return (
    <div className={`fixed bottom-6 right-6 z-30 flex flex-col items-end select-none pointer-events-none ${className ?? ''}`}>
      {/* 吹き出し */}
      {visibleSpeech && (
        <div className="mascot-speech font-dot mr-4 mb-3" role="status" aria-live="polite">
          {visibleSpeech}
        </div>
      )}

      {/* 全表情を常時 DOM に保持し opacity だけで切り替える。
          src の差し替えが起きないため読み込み遅延ゼロ。
          key に reaction を含め、リアクション変化時に CSS animation を先頭から再生する。 */}
      <div
        key={`${characterId}-${reaction}`}
        className={`mascot-wrap ${animCls}`}
      >
        {EXPRESSIONS.map((exp) => (
          <img
            key={exp}
            src={`/characters/${characterId}_${exp}.png`}
            alt={`${characterId} (${exp})`}
            loading="eager"
            decoding="sync"
            draggable={false}
            onError={(e) => {
              const t = e.currentTarget;
              if (!t.src.endsWith('mecha_normal.png')) t.src = '/characters/mecha_normal.png';
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              imageRendering: 'pixelated',
              opacity: exp === expression ? 1 : 0,
              transition: 'opacity 80ms ease-out',
            }}
          />
        ))}
      </div>
    </div>
  );
}
