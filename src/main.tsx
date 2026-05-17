import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { GameProvider } from "./lib/gameContext.tsx";
import { MultiplayerProvider } from "./lib/multiplayerContext.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <MultiplayerProvider>
    <GameProvider>
      <App />
    </GameProvider>
  </MultiplayerProvider>
);
