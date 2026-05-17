import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { TitleScreen } from "./pages/TitleScreen";
import { DashboardScreen } from "./pages/DashboardScreen";
import { BiddingScreen } from "./pages/BiddingScreen";
import { AccountingScreen } from "./pages/AccountingScreen";
import { MarketScreen } from "./pages/MarketScreen";
import { ResultsScreen } from "./pages/ResultsScreen";
import { LobbyScreen } from "./pages/LobbyScreen";
import { TutorialScreen } from "./pages/TutorialScreen";
import { HistoryScreen } from "./pages/HistoryScreen";
import { SettingsScreen } from "./pages/SettingsScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: TitleScreen },
      { path: "dashboard", Component: DashboardScreen },
      { path: "bidding", Component: BiddingScreen },
      { path: "accounting", Component: AccountingScreen },
      { path: "market", Component: MarketScreen },
      { path: "results", Component: ResultsScreen },
      { path: "lobby", Component: LobbyScreen },
      { path: "tutorial", Component: TutorialScreen },
      { path: "history", Component: HistoryScreen },
      { path: "settings", Component: SettingsScreen },
    ],
  },
]);
