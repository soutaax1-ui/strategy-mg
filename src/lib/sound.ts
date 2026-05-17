import * as Tone from 'tone';

export type BgmTrack = 'title' | 'dashboard' | 'bidding' | 'accounting' | 'victory' | 'defeat';
export type SfxName  = 'cardDraw' | 'confirm' | 'risk' | 'sale' | 'aiCounter' | 'pass';

/* === 状態 === */
let _initialized   = false;
let _muted         = false;
let _currentTrack: BgmTrack | null = null;
let _pendingTrack:  BgmTrack | null = null;
let _master:        Tone.Volume | null = null;
let _cleanup:       (() => void) | null = null;

/* === AudioContext 初期化 (ユーザー操作後に一度だけ呼ぶ) === */
export async function initAudio(): Promise<void> {
  if (_initialized) return;
  await Tone.start();
  _master = new Tone.Volume(-10).toDestination();
  Tone.getTransport().start();
  _initialized = true;
  if (_pendingTrack) {
    const t = _pendingTrack;
    _pendingTrack = null;
    setBgm(t);
  }
}

/* === 出力先 === */
function out(): Tone.ToneAudioNode {
  return (_master as Tone.ToneAudioNode) ?? Tone.getDestination();
}

/* === シンセファクトリ === */
function sqSynth(vol = -14): Tone.Synth {
  return new Tone.Synth({
    oscillator: { type: 'square' } as any,
    envelope:   { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.06 },
    volume:     vol,
  }).connect(out());
}

function triSynth(vol = -18): Tone.Synth {
  return new Tone.Synth({
    oscillator: { type: 'triangle' } as any,
    envelope:   { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.1 },
    volume:     vol,
  }).connect(out());
}

/* === シーケンス作成ヘルパー === */
function mkSeq(
  synth: Tone.Synth,
  notes: (string | null)[],
  sub:   string = '8n',
  dur:   string = '8n',
): Tone.Sequence<string | null> {
  const seq = new Tone.Sequence<string | null>(
    (time, note) => { if (note) synth.triggerAttackRelease(note, dur, time); },
    notes,
    sub as any,
  );
  seq.start('+0');
  return seq;
}

function disposeAll(...items: (Tone.Sequence<any> | Tone.Synth | null)[]): void {
  items.forEach(item => {
    if (!item) return;
    try { (item as any).stop?.(); } catch (_) {}
    try { item.dispose(); }        catch (_) {}
  });
}

/* === BGM 定義 (8ビット 矩形波 + 三角波ベース) ===
 *   各トラックはクリーンアップ関数を返す
 */
const BGM_TRACKS: Record<BgmTrack, () => () => void> = {

  /* ── タイトル: C major 明るくワクワク 120BPM ── */
  title: () => {
    Tone.getTransport().bpm.value = 120;
    const mel  = sqSynth(-12);
    const bass = triSynth(-18);
    const s1 = mkSeq(mel,  ['C5','E5','G5','E5','C5','G5','A5','G5','F5','A5','C5','A5','G5','E5','D5','C5']);
    const s2 = mkSeq(bass, ['C3',null,'G2',null,'C3',null,'G2',null,'A2',null,'F2',null,'G2',null,'G2',null]);
    return () => disposeAll(s1, s2, mel, bass);
  },

  /* ── ダッシュボード: A minor 緊張感ある戦略 100BPM ── */
  dashboard: () => {
    Tone.getTransport().bpm.value = 100;
    const mel  = sqSynth(-13);
    const bass = triSynth(-18);
    const s1 = mkSeq(mel,  ['A4','C5','E5','D5','C5','B4','A4',null,'G4','A4','C5','B4','A4','G4','F4','E4']);
    const s2 = mkSeq(bass, ['A2',null,'A2',null,'E2',null,'E2',null,'F2',null,'F2',null,'G2',null,'E2',null]);
    return () => disposeAll(s1, s2, mel, bass);
  },

  /* ── 入札: E minor 高速バトル 148BPM ── */
  bidding: () => {
    Tone.getTransport().bpm.value = 148;
    const mel  = sqSynth(-12);
    const bass = triSynth(-17);
    // メロディは16分音符で鳴らすため dur='16n'
    const s1 = mkSeq(mel,  ['E5','G5','B5','G5','E5','D5','B4','D5','E5','G5','A5','G5','E5','D5','B4','A4'], '8n', '16n');
    const s2 = mkSeq(bass, ['E2',null,'B2',null,'G2',null,'D2',null,'E2',null,'A2',null,'B2',null,'B2',null]);
    return () => disposeAll(s1, s2, mel, bass);
  },

  /* ── 決算: F major 落ち着いた集計 80BPM ── */
  accounting: () => {
    Tone.getTransport().bpm.value = 80;
    const mel  = sqSynth(-14);
    const bass = triSynth(-19);
    const s1 = mkSeq(mel,  ['F4','A4','C5','A4','F4','G4','A4','G4','Bb4','A4','G4','A4','Bb4','C5','A4','F4']);
    const s2 = mkSeq(bass, ['F2',null,'C3',null,'F2',null,'G2',null,'Bb2',null,'F2',null,'G2',null,'C3',null]);
    return () => disposeAll(s1, s2, mel, bass);
  },

  /* ── 勝利: G major ファンファーレ 130BPM ── */
  victory: () => {
    Tone.getTransport().bpm.value = 130;
    const mel  = sqSynth(-11);
    const bass = triSynth(-16);
    const s1 = mkSeq(mel,  ['G4','G4','G4','E4','G4','A4','B4','G4','C5','C5','C5','B4','C5','D5','E5','G5']);
    const s2 = mkSeq(bass, ['G2',null,'G2',null,'D2',null,'G2',null,'C3',null,'C3',null,'G2',null,'D3',null]);
    return () => disposeAll(s1, s2, mel, bass);
  },

  /* ── 敗北: 下降音型 ゲームオーバー 65BPM ── */
  defeat: () => {
    Tone.getTransport().bpm.value = 65;
    const mel  = sqSynth(-14);
    const bass = triSynth(-19);
    const s1 = mkSeq(mel,  ['C5',null,'B4',null,'Bb4',null,'A4',null,'Ab4',null,'G4',null,'F4',null,'E4',null]);
    const s2 = mkSeq(bass, ['C2',null,'G2',null, 'F2',null,'C2',null, 'Ab1',null,'Eb2',null,'F2',null,'C2',null]);
    return () => disposeAll(s1, s2, mel, bass);
  },
};

/* === BGM 公開 API === */
export function setBgm(track: BgmTrack): void {
  if (!_initialized) { _pendingTrack = track; return; }
  if (track === _currentTrack) return;
  if (_cleanup) { try { _cleanup(); } catch(_) {} _cleanup = null; }
  _currentTrack = track;
  try { _cleanup = BGM_TRACKS[track](); } catch(e) { console.warn('BGM start error', e); }
}

export function stopBgm(): void {
  if (_cleanup) { try { _cleanup(); } catch(_) {} _cleanup = null; }
  _currentTrack = null;
}

export function setMuted(val: boolean): void {
  _muted = val;
  if (_master) _master.mute = val;
}

export function getMuted(): boolean { return _muted; }

/* === SFX ===
 *   ワンショット: 一時 Synth を生成 → 演奏 → setTimeout で破棄
 */
function fireSfx(
  notes: Array<[string, number, string]>,
  opts: Record<string, any> = {},
): void {
  if (!_initialized || _muted) return;
  const synth = new Tone.Synth({
    oscillator: { type: 'square' } as any,
    envelope:   { attack: 0.003, decay: 0.08, sustain: 0.2, release: 0.05 },
    volume:     -10,
    ...opts,
  }).connect(out());
  const now = Tone.now();
  notes.forEach(([note, delay, dur]) => synth.triggerAttackRelease(note, dur as any, now + delay));
  const maxDelay = Math.max(...notes.map(([, d]) => d));
  setTimeout(() => { try { synth.dispose(); } catch(_) {} }, (maxDelay + 1.5) * 1000);
}

export function playSfx(name: SfxName): void {
  switch (name) {

    /* カードをめくる: 短い上昇スイープ */
    case 'cardDraw':
      fireSfx([['C5', 0, '32n'], ['E5', 0.07, '32n'], ['G5', 0.14, '16n']]);
      break;

    /* 行動確定: 明るい 2 音 */
    case 'confirm':
      fireSfx([['G5', 0, '16n'], ['C6', 0.12, '8n']]);
      break;

    /* リスクカード: 警告的な下降 3 音 */
    case 'risk':
      fireSfx(
        [['A5', 0, '8n'], ['F#5', 0.16, '8n'], ['D5', 0.32, '4n']],
        { volume: -8, envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.2 } },
      );
      break;

    /* 売上確定: コイン音 (上昇アルペジオ) */
    case 'sale':
      fireSfx([['C5', 0, '32n'], ['E5', 0.06, '32n'], ['G5', 0.12, '32n'], ['C6', 0.18, '8n']]);
      break;

    /* AI 対抗宣言: 短いドラマティックなスタブ */
    case 'aiCounter':
      fireSfx([['E4', 0, '16n'], ['A4', 0.1, '8n']], { volume: -12 });
      break;

    /* パス: 軽い下降 */
    case 'pass':
      fireSfx([['G4', 0, '32n'], ['E4', 0.08, '32n']]);
      break;
  }
}
