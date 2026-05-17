import {
  MATERIAL_COST, SM_COST, SM_CAP, LG_CAP, EMP_BASE_CAP, PART_BASE_CAP,
  RD_MAT_DOWN, RD_ADV, CITIES, RISK_DEFS,
} from './constants';
import type {
  Company, GameState, GameConfig, MainCard, RiskCard,
  AiLevel, CityId,
} from './types';

/* === ユーティリティ === */
export function fmt(v: number | null | undefined): string {
  if (v == null) return '—';
  const r = Math.round(v);
  return (r < 0 ? '-' : '') + Math.abs(r).toLocaleString('ja-JP') + '万円';
}

export function equity(c: Company): number {
  return c.capital + c.retainedEarnings;
}

export function staffTotal(c: Company): { employees: number; parts: number } {
  const r = c.staffRoles;
  return {
    employees: r.manufacturing.employees + r.sales.employees + r.stocking.employees,
    parts:     r.manufacturing.parts     + r.sales.parts     + r.stocking.parts,
  };
}

export function syncStaff(c: Company): void {
  const t = staffTotal(c);
  c.employees  = t.employees;
  c.partTimers = t.parts;
}

export function prodCap(c: Company, addSm = 0, addLg = 0): number {
  const mfg = c.staffRoles.manufacturing;
  const brokenReduction = c.brokenMachines;
  const eduMfg = c.eduBonus.manufacturing;
  return Math.max(0,
    mfg.employees * EMP_BASE_CAP + mfg.parts * PART_BASE_CAP + eduMfg
    + (c.smallMachines + addSm) * SM_CAP
    + (c.largeMachines + addLg) * LG_CAP
    - brokenReduction,
  );
}

export function rdNextCost(c: Company): number {
  return c.rdChips < 3 ? 10 : 40;
}

export function effectiveMatCost(c: Company): number {
  const rdDown = c.rdEffect === 'cost' ? c.rdChips * RD_MAT_DOWN : 0;
  const base   = c.effects.matDiscount ? Math.floor(MATERIAL_COST * 0.7) : MATERIAL_COST;
  return Math.max(1, base - rdDown);
}

export function calcBS(c: Company) {
  const assets = {
    cash:     c.cash,
      matInv:   c.materialBookValue,
      prodInv:  c.productBookValue,
      machBook: c.machineBookValue,
      rdBook:   c.rdBookValue,
      eduBook:  c.eduBookValue,
      total:    c.cash + c.materialBookValue + c.productBookValue + c.machineBookValue + c.rdBookValue + c.eduBookValue,
  };
  const liab = { debt: c.debt, total: c.debt };
  const eq   = { capital: c.capital, re: c.retainedEarnings, total: c.capital + c.retainedEarnings };
  return { assets, liab, eq };
}

/* === デッキ管理 === */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildMainDeck(riskMult: number): MainCard[] {
  const deck: MainCard[] = [];
  for (let i = 0; i < 60; i++) deck.push({ type: 'decision' });
  const riskCount = riskMult > 0 ? Math.round(15 * riskMult) : 0;
  for (let i = 0; i < riskCount; i++) deck.push({ type: 'risk-trigger' });
  return shuffle(deck);
}

export function buildRiskDeck(): RiskCard[] {
  const deck: RiskCard[] = [];
  RISK_DEFS.forEach(def => {
    for (let i = 0; i < def.count; i++) deck.push({ ...def } as RiskCard);
  });
  return shuffle(deck);
}

/* 末尾から取り出す (pop) 方式で元コードと同じ挙動 */
export function drawFromMainDeck(deck: MainCard[]): { card: MainCard; deck: MainCard[] } {
  if (deck.length === 0) {
    const newDeck = buildMainDeck(1.0);
    return { card: newDeck.pop()!, deck: newDeck };
  }
  const newDeck = [...deck];
  const card = newDeck.pop()!;
  return { card, deck: newDeck };
}

export function drawFromRiskDeck(deck: RiskCard[]): { card: RiskCard; deck: RiskCard[] } {
  if (deck.length === 0) {
    const newDeck = buildRiskDeck();
    return { card: newDeck.pop()!, deck: newDeck };
  }
  const newDeck = [...deck];
  const card = newDeck.pop()!;
  return { card, deck: newDeck };
}

/* === 会社ファクトリ === */
export function mkCompany(
  id: string,
  name: string,
  type: 'player' | 'ai',
  character: 'alpha' | 'beta' | 'gamma' | null,
  cash: number,
): Company {
  const initMachBook = SM_COST;
  return {
    id,
    name,
    type,
    character,
    cash,
    capital:           cash + initMachBook,
    retainedEarnings:  0,
    debt:              0,
    materialInventory: 0,
    materialBookValue: 0,
    productInventory:  0,
    productBookValue:  0,
      smallMachines:     1,
      largeMachines:     0,
      machineBookValue:  initMachBook,
      rdBookValue:       0,
      eduBookValue:      0,
    employees:         2,
    partTimers:        0,
    staffRoles: {
      manufacturing: { employees: 1, parts: 0 },
      sales:         { employees: 1, parts: 0 },
      stocking:      { employees: 0, parts: 0 },
    },
    brokenMachines:    0,
    rdChips:           0,
    rdEffect:          'price',
    flyerChips:        0,
    eduBonus:          { manufacturing: 0, sales: 0 },
    insChips:          0,
    pendingSales:      [],
    pendingAdSpend:    0,
    periodRevenue:     0,
    periodCOGS:        0,
      periodSoldQty:     0,
      periodAdSpend:     0,
      periodOtherSpend:  0,
    effects: {
      adBonus:     false,
      exclusive:   false,
      matDiscount: false,
    },
    lastSaleRevenue:   0,
    history:           [],
    totalRevenue:      0,
    totalProfit:       0,
  };
}

/* === ゲーム初期化 === */
export function initGame(totalPeriods: number, config: GameConfig): GameState {
  const mm = config.marketMult ?? 1.0;
  const cityVols = Object.fromEntries(
    CITIES.map(c => [c.id, Math.max(1, Math.round(c.vol * mm))])
  ) as Record<CityId, number>;

  return {
    currentPeriod:  1,
    totalPeriods,
    difficulty:     config.difficulty,
    aiLevel:        config.aiLevel as AiLevel,
    rate:           config.rate,
    marketMult:     mm,
    riskMult:       config.riskMult ?? 1.0,
    cityVols,
    mainDeck:       buildMainDeck(config.riskMult ?? 1.0),
    riskDeck:       buildRiskDeck(),
    round:          1,
    playerIdx:      0,
    lastBids:       { cityResults: [], companySummary: {} },
    auctionLog:     [],
    txnLog:         [],
    currentAuction: null,
    gameLog:        [],
    playerHistory:  { citySales: {}, priceHistory: [], invested: false },
    companies: [
      mkCompany('player', 'あなたの会社', 'player', null,    config.initialCash),
      mkCompany('alpha',  'アルファ商事', 'ai',    'alpha',  config.initialCash),
      mkCompany('beta',   'ベータ工業',   'ai',    'beta',   config.initialCash),
      mkCompany('gamma',  'ガンマ商会',   'ai',    'gamma',  config.initialCash),
    ],
  };
}

/* === 期首リセット === */
export function resetPeriod(gs: GameState): GameState {
  const cityVols = Object.fromEntries(
    CITIES.map(c => [c.id, Math.max(1, Math.round(c.vol * gs.marketMult))])
  ) as Record<CityId, number>;

  const companies = gs.companies.map(c => {
    const updated = { ...c };
    updated.pendingSales   = [];
    updated.pendingAdSpend = 0;
    updated.periodRevenue  = 0;
      updated.periodCOGS     = 0;
      updated.periodSoldQty  = 0;
      updated.periodAdSpend  = 0;
      updated.periodOtherSpend = 0;
    updated.brokenMachines = 0;
    updated.effects = { adBonus: false, exclusive: false, matDiscount: false };
    // パートは期末で自動解雇
    updated.staffRoles = {
      manufacturing: { employees: c.staffRoles.manufacturing.employees, parts: 0 },
      sales:         { employees: c.staffRoles.sales.employees,         parts: 0 },
      stocking:      { employees: c.staffRoles.stocking.employees,      parts: 0 },
    };
    syncStaff(updated);
    updated.flyerChips = 0;
    updated.insChips   = 0;
    return updated;
  });

  return {
    ...gs,
    round:          1,
    playerIdx:      0,
    cityVols,
    mainDeck:       buildMainDeck(gs.riskMult),
    auctionLog:     [],
    txnLog:         [],
    currentAuction: null,
    playerHistory:  { ...gs.playerHistory, invested: false },
    companies,
  };
}

/* === 期末計算 (postMarket) === */
export function applyPostMarket(c: Company, rate: number): Company {
  const updated = { ...c };
  const soldQty     = c.periodSoldQty;
  const revenue     = c.periodRevenue;
  const cogs        = c.periodCOGS;
  const grossProfit = revenue - cogs;

  const empCost  = c.employees * 30 + (c.partTimers || 0) * 10; // EMPLOYEE_COST, PART_COST
  updated.cash -= empCost;

    const depr = c.smallMachines * 5 + c.largeMachines * 15; // SM_DEPR, LG_DEPR
    updated.machineBookValue = Math.max(0, c.machineBookValue - depr);

    const interest = Math.floor(c.debt * rate);
    updated.cash -= interest;

    const fixedCosts = empCost + depr + c.periodAdSpend + c.periodOtherSpend + interest;
    const opProfit   = grossProfit - fixedCosts;

    updated.result = { soldQty, revenue, cogs, grossProfit, empCost, depr, adSpend: c.periodAdSpend, otherSpend: c.periodOtherSpend, interest, fixedCosts, opProfit };
  updated.retainedEarnings = c.retainedEarnings + opProfit;
  updated.totalRevenue     = c.totalRevenue + revenue;
  updated.totalProfit      = c.totalProfit + opProfit;
  updated.history          = [...c.history, equity(updated)];

  return updated;
}

/* === AI 期首財務 === */
export function aiPeriodStartFinance(c: Company): Company {
  const updated = { ...c };
  // ガンマは積極借入
  if (c.character === 'gamma' && Math.random() > 0.45) {
    const borrow = (Math.floor(Math.random() * 8) + 3) * 10;
    updated.cash += borrow;
    updated.debt += borrow;
  }
  // 借入があれば少し返済
  if (updated.debt > 0 && Math.random() > 0.6) {
    const repay = Math.min(updated.debt, Math.floor(updated.cash * 0.1));
    if (repay > 0) {
      updated.cash -= repay;
      updated.debt -= repay;
    }
  }
  return updated;
}

/* === RD優位計算ヘルパー === */
export function rdPriceAdv(c: Company): number {
  return c.rdEffect === 'price' ? c.rdChips * RD_ADV : 0;
}
