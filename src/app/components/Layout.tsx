import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { Volume2, VolumeX } from "lucide-react";
import { initAudio, setMuted, getMuted } from "../../lib/sound";
import { MultiplayerBridge } from "../../lib/multiplayerContext";

export function Layout() {
  const [muted, setMutedState] = useState(getMuted());

  useEffect(() => {
    function handleFirstInteraction() {
      initAudio();
    }
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    return () => window.removeEventListener('pointerdown', handleFirstInteraction);
  }, []);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  return (
    <div className="min-h-screen bg-mg-base text-mg-text-primary overflow-hidden font-noto">
      {/* Background with subtle pixel grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />
      {/* マルチプレイヤー: ソケットイベント ↔ GameContext の橋渡し */}
      <MultiplayerBridge />
      <div className="relative z-10 w-full h-full min-h-screen">
        <Outlet />
      </div>
      {/* Mute Button */}
      <button
        onClick={toggleMute}
        className="fixed bottom-4 right-4 z-50 w-10 h-10 bg-mg-surface border-2 border-mg-border flex items-center justify-center text-mg-text-secondary hover:text-mg-text-primary hover:border-mg-text-secondary transition-colors shadow-[2px_2px_0px_#000]"
        title={muted ? "ミュート解除" : "ミュート"}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  );
}
