/* ===================================================
 * マスコット型定義 — mascot-spec.md § 1 準拠
 * =================================================== */

export type MascotId = 'mecha' | 'kame' | 'fuku' | 'roki' | 'st';

export type MascotExpression = 'normal' | 'joy' | 'anger' | 'sadness' | 'surprise';

export type MascotReaction =
  | 'idle'
  | 'hop'
  | 'bigHop'
  | 'shake'
  | 'nod'
  | 'sink'
  | 'leanBack'
  | 'ready';

export type MascotEvent =
  | 'gameStart'
  | 'turnStart'
  | 'turnEnd'
  | 'gameClear'
  | 'gameOver'
  | 'purchaseSuccess'
  | 'overstockWarning'
  | 'priceSurge'
  | 'productionStart'
  | 'productionComplete'
  | 'bidSuccess'
  | 'bidFail'
  | 'overpay'
  | 'discountSell'
  | 'researchStart'
  | 'researchComplete'
  | 'accounting'
  | 'profit'
  | 'loss'
  | 'cashCrisis'
  | 'bankruptcy'
  | 'aiThreat'
  | 'playerJoin'
  | 'playerLeave'
  | 'otherPlayerBid'
  | 'riskCardDraw'
  | 'riskCardGood'
  | 'riskCardBad'
  | 'borrow'
  | 'repay'
  | 'interestPaid'
  | 'recruit'
  | 'periodStart'
  | 'periodEnd'
  | 'researchChipGain'
  | 'idleTooLong';

export interface MascotState {
  characterId: MascotId;
  expression: MascotExpression;
  reaction: MascotReaction;
  speech?: string;
  speechVisibleUntil?: number; // Unix timestamp (ms)
}

export interface ReactionConfig {
  expression: MascotExpression;
  reaction: Exclude<MascotReaction, 'idle'>;
  duration: number;   // ms
  showSpeech: boolean;
  priority: 'High' | 'Medium' | 'Low';
}
