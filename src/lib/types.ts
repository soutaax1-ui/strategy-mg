import { CITIES, RISK_DEFS } from './constants';

/* === 基本型 === */
export type AiLevel = 'weak' | 'medium' | 'strong';
export type AiCharacter = 'alpha' | 'beta' | 'gamma';
export type CompanyType = 'player' | 'ai';
export type RdEffect = 'price' | 'cost';
export type Role = 'manufacturing' | 'sales' | 'stocking';
export type HireType = 'employee' | 'part';
export type MachType = 'sm' | 'lg';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'custom';
export type CityId = typeof CITIES[number]['id'];
export type RiskCardId = typeof RISK_DEFS[number]['id'];
export type ActionId = 'buyMat' | 'produce' | 'sell' | 'hire' | 'reassign' | 'equip' | 'ad' | 'rd' | 'edu' | 'ins' | 'nothing';

/* === 会社 === */
export interface StaffRoles {
  manufacturing: { employees: number; parts: number };
  sales:         { employees: number; parts: number };
  stocking:      { employees: number; parts: number };
}

export interface CompanyEffects {
  adBonus:     boolean;
  exclusive:   boolean;
  matDiscount: boolean;
}

export interface EduBonus {
  manufacturing: number;
  sales: number;
}

export interface PeriodResult {
  soldQty:     number;
  revenue:     number;
  cogs:        number;
  grossProfit: number;
	  empCost:     number;
	  depr:        number;
	  adSpend:     number;
	  otherSpend:  number;
	  interest:    number;
  fixedCosts:  number;
  opProfit:    number;
}

export interface Company {
  id:                string;
  name:              string;
  type:              CompanyType;
  character:         AiCharacter | null;
  cash:              number;
  capital:           number;
  retainedEarnings:  number;
  debt:              number;
  materialInventory: number;
  materialBookValue: number;
  productInventory:  number;
  productBookValue:  number;
	  smallMachines:     number;
	  largeMachines:     number;
	  machineBookValue:  number;
	  rdBookValue:       number;
	  eduBookValue:      number;
  employees:         number;
  partTimers:        number;
  staffRoles:        StaffRoles;
  brokenMachines:    number;
  rdChips:           number;
  rdEffect:          RdEffect;
  flyerChips:        number;
  eduBonus:          EduBonus;
  insChips:          number;
  pendingSales:      PendingSale[];
  pendingAdSpend:    number;
  periodRevenue:     number;
  periodCOGS:        number;
	  periodSoldQty:     number;
	  periodAdSpend:     number;
	  periodOtherSpend:  number;
	  effects:           CompanyEffects;
  lastSaleRevenue:   number;
  history:           number[];
  totalRevenue:      number;
  totalProfit:       number;
  result?:           PeriodResult;
}

export interface PendingSale {
  cityId: CityId;
  qty:    number;
  price:  number;
}

/* === カード === */
export interface MainCard {
  type: 'decision' | 'risk-trigger';
}

export interface RiskCard {
  id:    RiskCardId;
  name:  string;
  type:  'negative' | 'positive' | 'neutral';
  icon:  string;
  count: number;
  desc:  string;
}

/* === オークション === */
export interface AuctionBid {
  company:        Company;
  bidQty:         number;
  price:          number;
  effectivePrice: number;
  rdChips:        number;
  isParent:       boolean;
  flyerUsed:      number;
  exclusive:      boolean;
  sold:           number;
  revenue:        number;
}

export interface AuctionCounter {
  company:        Company;
  qty:            number;
  price:          number;
  effectivePrice: number;
  flyerUsed:      number;
  rdAdv:          number;
  exclusive:      boolean;
}

export interface AuctionState {
  parent:               Company;
  cityId:               CityId;
  cityName:             string;
  cityVol:              number;
  parentQty:            number;
  parentPrice:          number;
  parentEffectivePrice: number;
  parentFlyerUsed:      number;
  parentRdAdv:          number;
  parentExclusive:      boolean;
  children:             Company[];
  childIdx:             number;
  counters:             AuctionCounter[];
  resolved:             boolean;
  resolvedBids:         AuctionBid[] | null;
}

export interface AuctionLogEntry {
  cityId:    CityId;
  cityName:  string;
  volBefore: number;
  bids:      AuctionBid[];
  totalSold: number;
}

/* === トランザクション (MX会計) === */
export interface Transaction {
  dr:     number;
  cr:     number;
  amount: number;
  desc:   string;
}

/* === UI フェーズ状態 === */
export interface UiState {
  phase: GamePhase;
  drawnCard: null | { type: 'decision' | 'risk-trigger' };
  drawnRiskCard: null | RiskCard;
  riskTarget: null | Company;
}

/* === ゲームログ === */
export type LogClass = '' | 'log-player' | 'log-risk' | 'log-good';

export interface LogEntry {
  text: string;
  cls:  LogClass;
  id:   number;
}

/* === プレイヤー履歴 === */
export interface PlayerHistory {
  citySales:    Partial<Record<CityId, number>>;
  priceHistory: number[];
  invested:     boolean;
}

/* === ゲーム設定 === */
export interface GameConfig {
  difficulty:  Difficulty;
  initialCash: number;
  rate:        number;
  aiLevel:     AiLevel;
  marketMult:  number;
  riskMult:    number;
}

/* === ゲーム状態 (gs) === */
export interface GameState {
  currentPeriod:  number;
  totalPeriods:   number;
  difficulty:     Difficulty;
  aiLevel:        AiLevel;
  rate:           number;
  marketMult:     number;
  riskMult:       number;
  cityVols:       Record<CityId, number>;
  mainDeck:       MainCard[];
  riskDeck:       RiskCard[];
  round:          number;
  playerIdx:      number;
  lastBids:       { cityResults: AuctionLogEntry[]; companySummary: Record<string, { soldQty: number; revenue: number }> };
  auctionLog:     AuctionLogEntry[];
  txnLog:         Transaction[];
  currentAuction: AuctionState | null;
  gameLog:        LogEntry[];
  playerHistory:  PlayerHistory;
  companies:      Company[];
}

/* === Context のアクション型 === */
export type GameAction =
  | { type: 'INIT_GAME'; totalPeriods: number; config: GameConfig; mpOverrides?: { idx: number; name: string; type: CompanyType }[] }
  | { type: 'PERIOD_START_FINANCE'; borrow: number; repay: number }
  | { type: 'DRAW_MAIN_CARD' }
  | { type: 'START_PLAYER_ACTION_MENU' }
  | { type: 'EXECUTE_ACTION'; actionId: ActionId; params: ActionParams; company?: Company }
  | { type: 'START_AUCTION'; auction: AuctionState }
  | { type: 'PLAYER_PASS_AUCTION' }
  | { type: 'PLAYER_SUBMIT_COUNTER'; qty: number; price: number }
  | { type: 'AI_COUNTER_DECIDED'; counter: AuctionCounter | null }
  | { type: 'RESOLVE_AUCTION' }
  | { type: 'END_PERIOD' }
  | { type: 'ADVANCE_PERIOD' }
  | { type: 'ADD_LOG'; text: string; cls?: LogClass }
  | { type: 'RECORD_TXN'; dr: number; cr: number; amount: number; desc: string }
  | { type: 'SET_PHASE'; phase: GamePhase }
  | { type: 'APPLY_RISK_CARD'; company: Company; card: RiskCard; remainingRiskDeck?: RiskCard[] }
  | { type: 'AI_PERIOD_START_FINANCE'; companyId: string }
  | { type: 'ADVANCE_TURN' }
  | { type: 'AI_TAKE_TURN'; company: Company }
  | { type: 'SET_STATE'; gs: GameState; ui: UiState };

/* === 画面フェーズ === */
export type GamePhase =
  | 'title'
  | 'period-start'
  | 'draw-ready'
  | 'action-menu'
  | 'action-params'
  | 'risk-trigger'
  | 'risk-result'
  | 'ai-thinking'
  | 'auction'
  | 'period-done'
  | 'period-end'
  | 'results';

/* === アクションパラメータ === */
export type ActionParams =
  | { qty: number; rdEffect?: RdEffect }                                         // buyMat, produce, ad, rd, edu, ins, equip (sm)
  | { cityId: CityId; qty: number; price: number; flyerUsed: number }           // sell
  | { hireType: HireType; role: Role; count: number }                           // hire
  | { personType: HireType; fromRole: Role; toRole: Role }                      // reassign
  | { machType: MachType; qty: number }                                         // equip
  | Record<string, never>;                                                      // nothing
