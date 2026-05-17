import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Play, Users, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/Button';
import { useGame } from '../../lib/gameContext';
import { DIFF } from '../../lib/constants';
import { playSfx } from '../../lib/sound';
import type { MascotId } from '../../lib/mascotTypes';
import '../styles/mascot.css';

/* ── キャラクターデータ ── */
interface CharaInfo {
  id:          MascotId;
  name:        string;
  motif:       string;
  personality: string;
  color:       string;        // Tailwind テキストカラー
  borderColor: string;        // Tailwind ボーダーカラー
}

const CHARACTERS: CharaInfo[] = [
  { id: 'mecha', name: 'メカ',  motif: 'ロボット',        personality: '機械的・効率重視',   color: 'text-mg-cyan',    borderColor: 'border-mg-cyan'  },
  { id: 'kame',  name: 'カメ',  motif: '亀',              personality: '落ち着いた・古風',   color: 'text-mg-gold',    borderColor: 'border-mg-gold'  },
  { id: 'fuku',  name: 'フク',  motif: 'チャイナ服女の子', personality: '元気・商売熱心',     color: 'text-mg-lime',    borderColor: 'border-mg-lime'  },
  { id: 'roki',  name: 'ロキ',  motif: 'ダックスフンド',   personality: '真面目で誠実',       color: 'text-mg-pink',    borderColor: 'border-mg-pink'  },
  { id: 'st',    name: 'ST',    motif: '宇宙人',           personality: '不思議・謎めいた',   color: 'text-purple-400', borderColor: 'border-purple-400' },
];

const IDLE_DURATIONS: Record<MascotId, string> = {
  mecha: '1.6s', kame: '2.8s', fuku: '1.8s', roki: '2.0s', st: '2.4s',
};

export function CharacterSelectScreen() {
  const navigate       = useNavigate();
  const [params]       = useSearchParams();
  const { dispatch }   = useGame();

  const mode       = (params.get('mode') ?? 'single') as 'single' | 'multi';
  const period     = Number(params.get('period')     || '10');
  const difficulty = (params.get('difficulty') || 'normal') as 'easy' | 'normal' | 'hard';

  const [companyName,   setCompanyName]   = useState('');
  const [presidentName, setPresidentName] = useState('');
  const [selectedId,    setSelectedId]    = useState<MascotId | null>(null);

  const canStart = companyName.trim() !== '' && presidentName.trim() !== '' && selectedId !== null;
  const selected = CHARACTERS.find(c => c.id === selectedId) ?? null;

  function handleStart() {
    if (!canStart || !selectedId) return;
    playSfx('confirm');

    if (mode === 'single') {
      dispatch({
        type: 'INIT_GAME',
        totalPeriods: period,
        config: DIFF[difficulty],
        mpOverrides: [{
          idx:          0,
          name:         companyName.trim(),
          type:         'player',
          companyName:  companyName.trim(),
          presidentName: presidentName.trim(),
          characterId:  selectedId,
        }],
      });
      navigate('/dashboard');
    } else {
      // マルチ: キャラ情報を sessionStorage に保存してロビーへ
      sessionStorage.setItem('mp_chara', JSON.stringify({
        companyName:  companyName.trim(),
        presidentName: presidentName.trim(),
        characterId:  selectedId,
      }));
      navigate('/lobby');
    }
  }

  return (
    <div className="w-full min-h-screen bg-mg-base flex flex-col p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 shrink-0">
        <Button variant="secondary" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-5 h-5" /> 戻る
        </Button>
        <h1 className="font-press text-2xl text-mg-gold drop-shadow-[0_0_10px_rgba(255,186,8,0.5)]">
          社長キャラ選択
        </h1>
        <div className="w-24" />
      </header>

      <div className="flex flex-1 gap-8 min-h-0">
        {/* ── 左パネル: 入力 + キャラグリッド ── */}
        <div className="flex-1 flex flex-col gap-6">

          {/* 会社名 / 社長名 */}
          <div className="p-6 bg-mg-elevated border-2 border-mg-border space-y-4">
            <h2 className="font-dot text-mg-cyan text-lg">会社情報</h2>

            <div className="space-y-1">
              <label className="font-dot text-sm text-mg-text-secondary">会社名 *</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                maxLength={20}
                placeholder="例: 太陽工業"
                className="w-full bg-mg-surface border-2 border-mg-border text-mg-text-primary px-3 py-2 font-noto text-base outline-none focus:border-mg-cyan transition-colors placeholder:text-mg-text-secondary/40"
              />
            </div>

            <div className="space-y-1">
              <label className="font-dot text-sm text-mg-text-secondary">社長名 *</label>
              <input
                type="text"
                value={presidentName}
                onChange={e => setPresidentName(e.target.value)}
                maxLength={12}
                placeholder="例: 田中 太郎"
                className="w-full bg-mg-surface border-2 border-mg-border text-mg-text-primary px-3 py-2 font-noto text-base outline-none focus:border-mg-cyan transition-colors placeholder:text-mg-text-secondary/40"
              />
            </div>
          </div>

          {/* キャラ選択グリッド */}
          <div className="p-6 bg-mg-elevated border-2 border-mg-border flex-1">
            <h2 className="font-dot text-mg-cyan text-lg mb-4">マスコット社長を選ぶ</h2>
            <div className="grid grid-cols-5 gap-3">
              {CHARACTERS.map(chara => {
                const isSelected = selectedId === chara.id;
                return (
                  <motion.button
                    key={chara.id}
                    onClick={() => setSelectedId(chara.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                    className={`flex flex-col items-center p-3 border-2 transition-all duration-150 ${
                      isSelected
                        ? `${chara.borderColor} bg-mg-surface shadow-[4px_4px_0px_#000]`
                        : 'border-mg-border bg-mg-surface hover:border-mg-text-secondary'
                    }`}
                  >
                    <img
                      src={`/characters/${chara.id}_normal.png`}
                      alt={chara.name}
                      className="w-full aspect-square object-contain mb-2"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <span className={`font-dot text-sm ${isSelected ? chara.color : 'text-mg-text-secondary'}`}>
                      {chara.name}
                    </span>
                    <span className="font-noto text-xs text-mg-text-secondary mt-0.5">
                      {chara.motif}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 右パネル: プレビュー + ボタン ── */}
        <div className="w-72 shrink-0 flex flex-col gap-4">

          {/* キャラプレビュー */}
          <div className="flex-1 bg-mg-elevated border-2 border-mg-border flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center gap-4"
                >
                  {/* アイドルアニメ付き拡大プレビュー */}
                  <img
                    src={`/characters/${selected.id}_normal.png`}
                    alt={selected.name}
                    className={`mascot-img mascot-idle-${selected.id}`}
                    style={{
                      height: '200px',
                      maxHeight: '200px',
                      minHeight: '200px',
                      animationDuration: IDLE_DURATIONS[selected.id],
                    }}
                    draggable={false}
                  />
                  <div className="text-center">
                    <div className={`font-press text-xl ${selected.color}`}>{selected.name}</div>
                    <div className="font-noto text-sm text-mg-text-secondary mt-1">{selected.motif}</div>
                    <div className={`font-dot text-sm mt-2 ${selected.color}`}>{selected.personality}</div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-mg-text-secondary font-dot text-base"
                >
                  ↙ キャラを選んでください
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ゲーム情報 (single のみ) */}
          {mode === 'single' && (
            <div className="p-4 bg-mg-elevated border-2 border-mg-border space-y-1 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-mg-text-secondary">期数</span>
                <span className="text-mg-text-primary">{period}期</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mg-text-secondary">難易度</span>
                <span className={difficulty === 'hard' ? 'text-mg-danger' : difficulty === 'easy' ? 'text-mg-success' : 'text-mg-cyan'}>
                  {difficulty === 'easy' ? 'Easy' : difficulty === 'hard' ? 'Hard' : 'Normal'}
                </span>
              </div>
            </div>
          )}

          {/* 開始ボタン */}
          <motion.div
            animate={canStart ? { scale: [1, 1.03, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Button
              variant="primary"
              className="w-full py-5 text-lg font-press shadow-[6px_6px_0px_#000] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
              onClick={handleStart}
              disabled={!canStart}
            >
              {mode === 'single' ? (
                <><Play className="mr-2 w-5 h-5" /> ゲーム開始</>
              ) : (
                <><Users className="mr-2 w-5 h-5" /> ロビーへ<ChevronRight className="ml-1 w-4 h-4" /></>
              )}
            </Button>
          </motion.div>

          {!canStart && (
            <p className="font-dot text-xs text-mg-text-secondary text-center">
              {!companyName.trim() || !presidentName.trim()
                ? '会社名と社長名を入力してください'
                : 'キャラクターを選んでください'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
