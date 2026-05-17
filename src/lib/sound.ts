import * as Tone from 'tone';

/* === 型 === */
export type BgmTrack = 'title' | 'game1' | 'game2' | 'result';
export type SfxName  = 'cardDraw' | 'confirm' | 'risk' | 'sale' | 'aiCounter' | 'pass';

/* === localStorage キー === */
const LS_BGM_VOL     = 'mg_bgm_vol';
const LS_BGM_ENABLED = 'mg_bgm_enabled';
const LS_SE_VOL      = 'mg_se_vol';
const LS_SE_ENABLED  = 'mg_se_enabled';

function lsGet(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function lsSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch {}
}

/* === 状態 === */
let _seInitialized  = false;
let _bgmInitialized = false;
let _pendingTrack:  BgmTrack | null = null;

let _bgmVol     = Number(lsGet(LS_BGM_VOL,     '0.8'));
let _bgmEnabled = lsGet(LS_BGM_ENABLED, 'true') === 'true';
let _seVol      = Number(lsGet(LS_SE_VOL,      '1.0'));
let _seEnabled  = lsGet(LS_SE_ENABLED,  'true') === 'true';
let _allMuted   = false;

let _currentTrackId: BgmTrack | null = null;
let _currentAudio:   HTMLAudioElement | null = null;
let _fadeOutTimer:   ReturnType<typeof setInterval> | null = null;
let _fadeInTimer:    ReturnType<typeof setInterval> | null = null;
let _fadeInDelay:    ReturnType<typeof setTimeout>  | null = null;
let _onGameEnded:    (() => void) | null = null;

const GAME_TRACKS = new Set<BgmTrack>(['game1', 'game2']);

/* === MP3 ファイルマップ === */
const BGM_FILES: Record<BgmTrack, string> = {
  title:  '/audio/bgm_title.mp3',
  game1:  '/audio/bgm_game1.mp3',
  game2:  '/audio/bgm_game2.mp3',
  result: '/audio/bgm_result.mp3',
};

/* === AudioElement キャッシュ (lazy) === */
const _cache: Partial<Record<BgmTrack, HTMLAudioElement>> = {};

function getAudio(track: BgmTrack): HTMLAudioElement {
  if (!_cache[track]) {
    const a = new Audio(BGM_FILES[track]);
    a.loop   = !GAME_TRACKS.has(track); // game tracks alternate via 'ended'
    a.volume = 0;
    _cache[track] = a;
  }
  return _cache[track]!;
}

/* === ゲームトラック交互再生 === */
function removeGameEndedListener(): void {
  for (const track of GAME_TRACKS) {
    const a = _cache[track];
    if (a && _onGameEnded) a.removeEventListener('ended', _onGameEnded);
  }
  _onGameEnded = null;
}

function switchGameTrack(): void {
  const next: BgmTrack = _currentTrackId === 'game1' ? 'game2' : 'game1';
  _currentTrackId = next;
  const newAudio = getAudio(next);
  _currentAudio  = newAudio;
  newAudio.currentTime = 0;
  fadeIn(newAudio, targetBgmVol());
  addGameEndedListener();
}

function addGameEndedListener(): void {
  removeGameEndedListener();
  if (!_currentAudio) return;
  _onGameEnded = () => switchGameTrack();
  _currentAudio.addEventListener('ended', _onGameEnded, { once: true });
}

/* === クロスフェード === */
const FADE_MS    = 320;
const FADE_STEPS = 16;

function clearFadeOut() {
  if (_fadeOutTimer !== null) { clearInterval(_fadeOutTimer); _fadeOutTimer = null; }
}

function clearFadeIn() {
  if (_fadeInDelay  !== null) { clearTimeout(_fadeInDelay);   _fadeInDelay  = null; }
  if (_fadeInTimer  !== null) { clearInterval(_fadeInTimer);  _fadeInTimer  = null; }
}

function fadeOut(audio: HTMLAudioElement): void {
  clearFadeOut();
  const start = audio.volume;
  let step = 0;
  _fadeOutTimer = setInterval(() => {
    step++;
    audio.volume = Math.max(0, start * (1 - step / FADE_STEPS));
    if (step >= FADE_STEPS) {
      clearFadeOut();
      audio.pause();
      audio.currentTime = 0;
    }
  }, FADE_MS / FADE_STEPS);
}

function fadeIn(audio: HTMLAudioElement, targetVol: number): void {
  clearFadeIn();
  audio.volume = 0;
  audio.play().catch(() => {/* autoplay blocked — user hasn't interacted yet */});
  let step = 0;
  _fadeInTimer = setInterval(() => {
    step++;
    audio.volume = Math.min(targetVol, targetVol * (step / FADE_STEPS));
    if (step >= FADE_STEPS) { clearInterval(_fadeInTimer!); _fadeInTimer = null; }
  }, FADE_MS / FADE_STEPS);
}

function targetBgmVol(): number {
  return _bgmEnabled && !_allMuted ? _bgmVol : 0;
}

/* === SE 用 Tone.js === */
let _master: Tone.Volume | null = null;

function sfxOut(): Tone.ToneAudioNode {
  return (_master as Tone.ToneAudioNode) ?? Tone.getDestination();
}

function syncSeMaster(): void {
  if (!_master) return;
  if (!_seEnabled || _allMuted || _seVol <= 0) {
    _master.mute = true;
  } else {
    _master.mute  = false;
    _master.volume.value = Tone.gainToDb(_seVol);
  }
}

/* === AudioContext 初期化 (最初のユーザー操作後に一度だけ呼ぶ) === */
export async function initAudio(): Promise<void> {
  if (!_seInitialized) {
    await Tone.start();
    _master = new Tone.Volume(0).toDestination();
    Tone.getTransport().start();
    _seInitialized = true;
    syncSeMaster();
  }
  if (!_bgmInitialized) {
    _bgmInitialized = true;
    if (_pendingTrack) {
      const t = _pendingTrack;
      _pendingTrack = null;
      setBgm(t);
    }
  }
}

/* ================================================================
   BGM API
   ================================================================ */

export function setBgm(track: BgmTrack): void {
  if (!_bgmInitialized) { _pendingTrack = track; return; }

  const isPlaying = _currentAudio !== null && !_currentAudio.paused;

  // ゲーム画面間の遷移でゲームBGMを中断しない
  if (GAME_TRACKS.has(track) && _currentTrackId !== null && GAME_TRACKS.has(_currentTrackId) && isPlaying) return;

  const isSame = track === _currentTrackId;
  _currentTrackId = track;
  const newAudio  = getAudio(track);

  if (isSame && isPlaying) return;

  if (!_bgmEnabled || _allMuted) {
    removeGameEndedListener();
    _currentAudio = newAudio;
    return;
  }

  clearFadeIn();
  removeGameEndedListener();

  if (_currentAudio && _currentAudio !== newAudio && isPlaying) {
    const old = _currentAudio;
    _currentAudio = newAudio;
    fadeOut(old);
    _fadeInDelay = setTimeout(() => {
      _fadeInDelay = null;
      newAudio.currentTime = 0;
      fadeIn(newAudio, targetBgmVol());
      if (GAME_TRACKS.has(track)) addGameEndedListener();
    }, FADE_MS / 2);
  } else {
    _currentAudio = newAudio;
    newAudio.currentTime = 0;
    fadeIn(newAudio, targetBgmVol());
    if (GAME_TRACKS.has(track)) addGameEndedListener();
  }
}

export function stopBgm(): void {
  clearFadeIn();
  removeGameEndedListener();
  if (_currentAudio && !_currentAudio.paused) fadeOut(_currentAudio);
  _currentTrackId = null;
  _currentAudio   = null;
}

export function setBgmVolume(vol: number): void {
  _bgmVol = Math.max(0, Math.min(1, vol));
  lsSet(LS_BGM_VOL, String(_bgmVol));
  if (_currentAudio) _currentAudio.volume = targetBgmVol();
}

export function setBgmEnabled(val: boolean): void {
  _bgmEnabled = val;
  lsSet(LS_BGM_ENABLED, String(val));
  if (!val || _allMuted) clearFadeIn();
  if (!_currentAudio) return;
  if (val && !_allMuted) {
    _currentAudio.volume = _bgmVol;
    _currentAudio.play().catch(() => {});
  } else {
    _currentAudio.volume = 0;
    _currentAudio.pause();
  }
}

export function getBgmVolume(): number  { return _bgmVol; }
export function getBgmEnabled(): boolean { return _bgmEnabled; }

/* ================================================================
   SE API
   ================================================================ */

export function setSeVolume(vol: number): void {
  _seVol = Math.max(0, Math.min(1, vol));
  lsSet(LS_SE_VOL, String(_seVol));
  syncSeMaster();
}

export function setSeEnabled(val: boolean): void {
  _seEnabled = val;
  lsSet(LS_SE_ENABLED, String(val));
  syncSeMaster();
}

export function getSeVolume(): number  { return _seVol; }
export function getSeEnabled(): boolean { return _seEnabled; }

/* ================================================================
   グローバルミュート (Layout.tsx のトグルボタン用)
   ================================================================ */

export function setMuted(val: boolean): void {
  _allMuted = val;
  if (_currentAudio) _currentAudio.volume = targetBgmVol();
  syncSeMaster();
}

export function getMuted(): boolean { return _allMuted; }

/* ================================================================
   SFX (Tone.js ワンショット — 変更なし)
   ================================================================ */

function fireSfx(
  notes: Array<[string, number, string]>,
  opts: Record<string, any> = {},
): void {
  if (!_seInitialized || !_seEnabled || _allMuted) return;
  const synth = new Tone.Synth({
    oscillator: { type: 'square' } as any,
    envelope:   { attack: 0.003, decay: 0.08, sustain: 0.2, release: 0.05 },
    volume:     -10,
    ...opts,
  }).connect(sfxOut());
  const now = Tone.now();
  notes.forEach(([note, delay, dur]) => synth.triggerAttackRelease(note, dur as any, now + delay));
  const maxDelay = Math.max(...notes.map(([, d]) => d));
  setTimeout(() => { try { synth.dispose(); } catch (_) {} }, (maxDelay + 1.5) * 1000);
}

export function playSfx(name: SfxName): void {
  switch (name) {
    case 'cardDraw':
      fireSfx([['C5', 0, '32n'], ['E5', 0.07, '32n'], ['G5', 0.14, '16n']]);
      break;
    case 'confirm':
      fireSfx([['G5', 0, '16n'], ['C6', 0.12, '8n']]);
      break;
    case 'risk':
      fireSfx(
        [['A5', 0, '8n'], ['F#5', 0.16, '8n'], ['D5', 0.32, '4n']],
        { volume: -8, envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.2 } },
      );
      break;
    case 'sale':
      fireSfx([['C5', 0, '32n'], ['E5', 0.06, '32n'], ['G5', 0.12, '32n'], ['C6', 0.18, '8n']]);
      break;
    case 'aiCounter':
      fireSfx([['E4', 0, '16n'], ['A4', 0.1, '8n']], { volume: -12 });
      break;
    case 'pass':
      fireSfx([['G4', 0, '32n'], ['E4', 0.08, '32n']]);
      break;
  }
}
