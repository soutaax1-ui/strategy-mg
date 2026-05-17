import {
  MATERIAL_COST, FLYER_ADV, RD_ADV, SM_COST, LG_COST, SM_CAP,
  MAX_EMPLOYEES, MAX_PARTS, EMPLOYEE_COST, PART_COST, EDU_COST, INS_COST,
  EDU_MAX_PER, FLYER_COST, STANDARD_PRICE, CITIES,
} from './constants';
import { prodCap, effectiveMatCost, rdNextCost } from './gameState';
import type { GameState, Company, ActionId, ActionParams, CityId, RdEffect } from './types';

export interface AiChoice {
  actionId: ActionId;
  params: ActionParams;
  rdEffect?: RdEffect; // キャラクターが変更したい場合に返す
}

/* ============================================================
   メインディスパッチ
   ============================================================ */
export function aiChooseAction(gs: GameState, company: Company): AiChoice {
  const level = gs.aiLevel;
  if (level === 'strong') return aiChooseActionStrong(gs, company);
  if (level === 'medium') return aiChooseActionMedium(gs, company);
  return aiChooseActionWeak(gs, company);
}

/* ============================================================
   Weak AI — キャラクター別固定パターン、ランダム行動
   ============================================================ */
function aiChooseActionWeak(gs: GameState, c: Company): AiChoice {
  const cap         = prodCap(c);
  const matCost     = effectiveMatCost(c);
  const availCities = CITIES.filter(city => gs.cityVols[city.id] > 0);
  const totPart     = c.partTimers;

  function pickCity(): CityId | null {
    if (availCities.length === 0) return null;
    switch (c.character) {
      case 'alpha': {
        const big = availCities.find(ct => ct.id === 'tokyo' || ct.id === 'osaka');
        return (big ?? availCities.reduce((a, b) => gs.cityVols[a.id] >= gs.cityVols[b.id] ? a : b)).id;
      }
      case 'beta': {
        const pref = availCities.find(ct => ct.id === 'tokyo')
                  ?? availCities.find(ct => ct.id === 'osaka')
                  ?? availCities[0];
        return pref.id;
      }
      case 'gamma':
        return availCities.reduce((a, b) => gs.cityVols[a.id] >= gs.cityVols[b.id] ? a : b).id;
    }
    return availCities[Math.floor(Math.random() * availCities.length)].id;
  }

  const salesCount = (role: Company['staffRoles']) =>
    role.sales.employees + role.sales.parts;

  switch (c.character) {

    /* ---------- alpha: 低価格・多量販売 ---------- */
    case 'alpha': {
      if (c.productInventory > 0 && availCities.length > 0) {
        const cityId = pickCity()!;
        const city   = CITIES.find(ct => ct.id === cityId)!;
        const price  = Math.max(matCost + 1, city.priceMin + Math.floor(Math.random() * 3));
        return {
          actionId: 'sell',
          params: { cityId, qty: c.productInventory, price, flyerUsed: Math.min(c.flyerChips, salesCount(c.staffRoles) * 2) },
          rdEffect: 'cost',
        };
      }
      if (c.rdChips < 3 && c.cash >= rdNextCost(c) + 20 && Math.random() > 0.6)
        return { actionId: 'rd', params: { qty: 1 }, rdEffect: 'cost' };
      if (c.flyerChips < 2 && c.cash >= FLYER_COST * 2 && Math.random() > 0.5)
        return { actionId: 'ad', params: { qty: 1 }, rdEffect: 'cost' };
      if (c.materialInventory > 0 && cap > 0)
        return { actionId: 'produce', params: {} };
      if (c.rdChips < 5 && c.cash >= rdNextCost(c) * 2 && Math.random() > 0.5)
        return { actionId: 'rd', params: { qty: 1 }, rdEffect: 'cost' };
      if (c.cash >= matCost * 3 && cap > 0)
        return { actionId: 'buyMat', params: { qty: Math.min(Math.floor(c.cash * 0.6 / matCost), cap) } };
      if (totPart < 3 && totPart < MAX_PARTS && c.cash >= PART_COST * 3 && Math.random() > 0.5)
        return { actionId: 'hire', params: { hireType: 'part', role: 'manufacturing', count: Math.min(2, MAX_PARTS - totPart) } };
      if (c.cash >= SM_COST + 50 && Math.random() > 0.7)
        return { actionId: 'equip', params: { machType: 'sm', qty: 1 } };
      return { actionId: 'nothing', params: {} };
    }

    /* ---------- beta: 高品質・高価格販売 ---------- */
    case 'beta': {
      if (c.rdChips < 4 && c.cash >= rdNextCost(c) + 50 && Math.random() > 0.35)
        return { actionId: 'rd', params: { qty: 1 }, rdEffect: 'price' };
      if (c.productInventory > 0 && availCities.length > 0) {
        const cityId = pickCity()!;
        const city   = CITIES.find(ct => ct.id === cityId)!;
        const price  = Math.floor((city.priceStd + city.priceMax) / 2) + Math.floor(Math.random() * 3);
        return {
          actionId: 'sell',
          params: { cityId, qty: Math.ceil(c.productInventory * 0.7), price, flyerUsed: Math.min(c.flyerChips, salesCount(c.staffRoles) * 2) },
          rdEffect: 'price',
        };
      }
      const curEdu = c.eduBonus.manufacturing;
      if (curEdu < c.staffRoles.manufacturing.employees * EDU_MAX_PER && c.cash >= EDU_COST * 2 && Math.random() > 0.5)
        return { actionId: 'edu', params: { qty: 1 } };
      if (c.employees < 5 && c.cash >= EMPLOYEE_COST * 3 && Math.random() > 0.5)
        return { actionId: 'hire', params: { hireType: 'employee', role: 'sales', count: 1 } };
      if (c.materialInventory > 0 && cap > 0)
        return { actionId: 'produce', params: {} };
      if (c.flyerChips < 2 && c.cash >= FLYER_COST * 2 && Math.random() > 0.6)
        return { actionId: 'ad', params: { qty: 2 } };
      if (c.cash >= matCost * 2 && cap > 0)
        return { actionId: 'buyMat', params: { qty: Math.min(Math.floor(c.cash * 0.5 / matCost), cap) } };
      return { actionId: 'nothing', params: {} };
    }

    /* ---------- gamma: 拡張・バランス型 ---------- */
    case 'gamma': {
      if (c.insChips === 0 && c.cash >= INS_COST * 3 && Math.random() > 0.4)
        return { actionId: 'ins', params: { qty: 1 } };
      if (c.cash >= LG_COST + 100 && Math.random() > 0.55)
        return { actionId: 'equip', params: { machType: 'lg', qty: 1 } };
      if (c.cash >= SM_COST + 50 && Math.random() > 0.45)
        return { actionId: 'equip', params: { machType: 'sm', qty: 1 } };
      if (c.employees < MAX_EMPLOYEES - 1 && c.cash >= EMPLOYEE_COST * 3 && Math.random() > 0.6)
        return { actionId: 'hire', params: { hireType: 'employee', role: 'manufacturing', count: 1 } };
      if (totPart < MAX_PARTS - 1 && c.cash >= PART_COST * 2 && Math.random() > 0.55)
        return { actionId: 'hire', params: { hireType: 'part', role: 'manufacturing', count: Math.min(2, MAX_PARTS - totPart) } };
      if (c.materialInventory > 0 && cap > 0)
        return { actionId: 'produce', params: {} };
      if (c.cash >= matCost * 5 && cap > 0)
        return { actionId: 'buyMat', params: { qty: Math.min(Math.floor(c.cash * 0.7 / matCost), cap) } };
      if (c.productInventory > 0 && availCities.length > 0) {
        const cityId = pickCity()!;
        const city   = CITIES.find(ct => ct.id === cityId)!;
        const price  = city.priceStd + Math.floor(Math.random() * 3 - 1);
        return {
          actionId: 'sell',
          params: { cityId, qty: c.productInventory, price, flyerUsed: Math.min(c.flyerChips, salesCount(c.staffRoles) * 2) },
        };
      }
      return { actionId: 'nothing', params: {} };
    }
  }

  return { actionId: 'nothing', params: {} };
}

/* ============================================================
   Medium AI — 在庫・財務リアクション
   ============================================================ */
function aiChooseActionMedium(gs: GameState, c: Company): AiChoice {
  const cap         = prodCap(c);
  const matCost     = effectiveMatCost(c);
  const availCities = CITIES.filter(city => gs.cityVols[city.id] > 0);
  const isProfit    = c.retainedEarnings >= 0;
  const totPart     = c.partTimers;

  function pickCityMed(): CityId | null {
    if (availCities.length === 0) return null;
    if (c.character === 'alpha')
      return availCities.reduce((a, b) => gs.cityVols[a.id] >= gs.cityVols[b.id] ? a : b).id;
    if (c.character === 'beta')
      return (availCities.find(ct => ct.id === 'tokyo') ?? availCities.find(ct => ct.id === 'osaka') ?? availCities[0]).id;
    return availCities.reduce((a, b) => gs.cityVols[a.id] >= gs.cityVols[b.id] ? a : b).id;
  }

  // 在庫が多ければ価格を下げ販売優先 (在庫リアクション)
  if (c.productInventory > 0 && availCities.length > 0) {
    const cityId = pickCityMed();
    if (cityId) {
      const city     = CITIES.find(ct => ct.id === cityId)!;
      const invRatio = c.productInventory / Math.max(1, cap);
      const priceAdj = invRatio > 1.5 ? -2 : invRatio < 0.5 ? 2 : 0;
      const price    = Math.max(matCost + 2, city.priceStd + priceAdj + Math.floor(Math.random() * 3) - 1);
      const salesCount = c.staffRoles.sales.employees + c.staffRoles.sales.parts;
      const flyerUsed  = Math.min(c.flyerChips, salesCount * 2);
      const rdEffect: RdEffect = c.character === 'alpha' ? 'cost' : 'price';
      return { actionId: 'sell', params: { cityId, qty: c.productInventory, price, flyerUsed }, rdEffect };
    }
  }

  if (c.materialInventory > 0 && cap > 0)
    return { actionId: 'produce', params: {} };

  // チラシで競争力向上
  if (c.flyerChips < 3 && c.cash >= FLYER_COST * 3 && Math.random() > 0.4)
    return { actionId: 'ad', params: { qty: Math.min(2, Math.floor(c.cash * 0.2 / FLYER_COST)) } };

  // 利益が出ていれば設備投資 (財務リアクション)
  if (isProfit && c.cash >= SM_COST + 100 && Math.random() > 0.5)
    return { actionId: 'equip', params: { machType: 'sm', qty: 1 } };
  if (isProfit && c.employees < 6 && c.cash >= EMPLOYEE_COST * 3 && Math.random() > 0.5)
    return { actionId: 'hire', params: { hireType: 'employee', role: 'manufacturing', count: 1 } };

  // キャラ別 R&D
  const rdEffect: RdEffect = c.character === 'alpha' ? 'cost' : 'price';
  if (c.rdChips < 3 && c.cash >= rdNextCost(c) * 2 && Math.random() > 0.5)
    return { actionId: 'rd', params: { qty: 1 }, rdEffect };

  if (c.cash >= matCost * 3 && cap > 0)
    return { actionId: 'buyMat', params: { qty: Math.min(Math.floor(c.cash * 0.55 / matCost), cap) } };
  if (totPart < 2 && c.cash >= PART_COST * 3 && Math.random() > 0.6)
    return { actionId: 'hire', params: { hireType: 'part', role: 'manufacturing', count: 1 } };

  return { actionId: 'nothing', params: {} };
}

/* ============================================================
   Strong AI — 3シナリオ期待利益評価 + プレイヤー逆張り
   ============================================================ */
function aiChooseActionStrong(gs: GameState, c: Company): AiChoice {
  const cap         = prodCap(c);
  const matCost     = effectiveMatCost(c);
  const availCities = CITIES.filter(city => gs.cityVols[city.id] > 0);
  const isProfit    = c.retainedEarnings >= 0;
  const totPart     = c.partTimers;

  // プレイヤー観測: 最も多く売った都市を回避
  const pH = gs.playerHistory;
  const playerTopCity = Object.entries(pH.citySales ?? {}).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
  const avoidCity     = playerTopCity ? (playerTopCity[0] as CityId) : null;

  function pickCityStrong(): CityId | null {
    if (availCities.length === 0) return null;
    const alternatives = availCities.filter(ct => ct.id !== avoidCity || gs.cityVols[ct.id] <= 2);
    const pool = alternatives.length > 0 ? alternatives : availCities;
    if (c.character === 'alpha') return pool.reduce((a, b) => gs.cityVols[a.id] >= gs.cityVols[b.id] ? a : b).id;
    if (c.character === 'beta')  return (pool.find(ct => ct.id === 'tokyo') ?? pool.find(ct => ct.id === 'osaka') ?? pool[0]).id;
    if (c.character === 'gamma') return pool.reduce((a, b) => gs.cityVols[a.id] >= gs.cityVols[b.id] ? a : b).id;
    return pool[0].id;
  }

  // 3シナリオ期待利益評価
  function evalSell(priceAdj: number, volFrac: number): number {
    if (c.productInventory === 0 || availCities.length === 0) return -Infinity;
    const cityId = pickCityStrong();
    if (!cityId) return -Infinity;
    const city    = CITIES.find(ct => ct.id === cityId)!;
    const price   = Math.max(matCost + 1, Math.min(city.priceMax, city.priceStd + priceAdj));
    const vol     = gs.cityVols[cityId];
    const qty     = Math.min(c.productInventory, Math.ceil(vol * volFrac));
    const winProb = priceAdj <= 0 ? 0.85 : priceAdj <= 3 ? 0.65 : 0.40;
    return qty * (price - matCost) * winProb;
  }
  const s1 = evalSell(-3, 1.0);
  const s2 = evalSell(+5, 0.5);
  const s3 = isProfit && c.cash >= SM_COST ? SM_CAP * (STANDARD_PRICE - matCost) * 0.4 - SM_COST * 0.05 : -Infinity;

  let bestScenario: 'low' | 'high' | 'expand' =
    s1 >= s2 && s1 >= s3 ? 'low' : s2 >= s3 ? 'high' : 'expand';

  // キャラクター強制補正
  if (c.character === 'alpha') bestScenario = 'low';
  if (c.character === 'beta' && c.rdChips >= 2) bestScenario = 'high';
  if (c.character === 'gamma' && c.cash >= LG_COST + 100 && c.productInventory === 0) bestScenario = 'expand';

  const salesCount = c.staffRoles.sales.employees + c.staffRoles.sales.parts;

  /* --- alpha: R&Dコストダウン + チラシ価格戦争 --- */
  if (c.character === 'alpha') {
    if (c.rdChips < 5 && c.cash >= rdNextCost(c) + 50 && Math.random() > 0.30)
      return { actionId: 'rd', params: { qty: 1 }, rdEffect: 'cost' };
    if (c.flyerChips < 4 && c.cash >= FLYER_COST * 3 && Math.random() > 0.35)
      return { actionId: 'ad', params: { qty: Math.min(3, Math.floor(c.cash * 0.25 / FLYER_COST)) }, rdEffect: 'cost' };
  }

  /* --- beta: R&D価格優位 + 教育で高単価独占 --- */
  if (c.character === 'beta') {
    if (c.rdChips < 5 && c.cash >= rdNextCost(c) + 80 && Math.random() > 0.25)
      return { actionId: 'rd', params: { qty: 1 }, rdEffect: 'price' };
    const curEdu = c.eduBonus.manufacturing;
    if (curEdu < c.staffRoles.manufacturing.employees * EDU_MAX_PER && c.cash >= EDU_COST * 2 && Math.random() > 0.40)
      return { actionId: 'edu', params: { qty: 1 }, rdEffect: 'price' };
  }

  /* --- gamma: 設備投資で規模拡大 --- */
  if (c.character === 'gamma') {
    if (c.insChips === 0 && c.cash >= INS_COST * 3 && Math.random() > 0.30)
      return { actionId: 'ins', params: { qty: 1 } };
    if (bestScenario === 'expand') {
      if (c.cash >= LG_COST + 100) return { actionId: 'equip', params: { machType: 'lg', qty: 1 } };
      if (c.cash >= SM_COST + 50)  return { actionId: 'equip', params: { machType: 'sm', qty: 1 } };
    }
    if (c.employees < MAX_EMPLOYEES - 1 && c.cash >= EMPLOYEE_COST * 3 && Math.random() > 0.50)
      return { actionId: 'hire', params: { hireType: 'employee', role: 'manufacturing', count: 1 } };
    if (totPart < MAX_PARTS - 1 && c.cash >= PART_COST * 2 && Math.random() > 0.45)
      return { actionId: 'hire', params: { hireType: 'part', role: 'manufacturing', count: Math.min(2, MAX_PARTS - totPart) } };
  }

  /* --- 販売 (シナリオ別価格) --- */
  if (c.productInventory > 0 && availCities.length > 0) {
    const cityId = pickCityStrong();
    if (cityId) {
      const city     = CITIES.find(ct => ct.id === cityId)!;
      const priceAdj = bestScenario === 'low' ? -3 + Math.floor(Math.random() * 2) :
                       bestScenario === 'high' ?  5 + Math.floor(Math.random() * 3) : 0;
      const price    = Math.max(matCost + 1, Math.min(city.priceMax, city.priceStd + priceAdj));
      const qty      = bestScenario === 'high' ? Math.ceil(c.productInventory * 0.6) : c.productInventory;
      const flyerUsed = Math.min(c.flyerChips, salesCount * 2);
      const rdEffect: RdEffect = c.character === 'alpha' ? 'cost' : 'price';
      return { actionId: 'sell', params: { cityId, qty, price, flyerUsed }, rdEffect };
    }
  }

  /* --- フォールバック --- */
  if (c.materialInventory > 0 && cap > 0) return { actionId: 'produce', params: {} };
  if (c.cash >= matCost * 3 && cap > 0)
    return { actionId: 'buyMat', params: { qty: Math.min(Math.floor(c.cash * 0.60 / matCost), cap) } };
  if (isProfit && c.cash >= SM_COST + 100 && Math.random() > 0.40)
    return { actionId: 'equip', params: { machType: 'sm', qty: 1 } };

  return { actionId: 'nothing', params: {} };
}
