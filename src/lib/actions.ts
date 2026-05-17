import {
  MATERIAL_COST, FLYER_COST, FLYER_ADV, RD_ADV,
  MAX_EMPLOYEES, MAX_PARTS, SM_COST, LG_COST, SM_CAP, LG_CAP,
  REASSIGN_COST, PART_COST, EMPLOYEE_COST, EDU_COST, EDU_MAX_PER, INS_COST,
  CITIES,
} from './constants';
import {
  prodCap, effectiveMatCost, rdNextCost, syncStaff, rdPriceAdv,
} from './gameState';
import type {
  GameState, Company, ActionId, ActionParams, AuctionState, CityId,
} from './types';

/* === ログ追加ヘルパー (actions.ts 内専用) === */
function log(gs: GameState, text: string, isPlayer: boolean): GameState {
  const cls = isPlayer ? 'log-player' : '' as const;
  const entry = { text, cls, id: Date.now() + Math.random() };
  return { ...gs, gameLog: [entry, ...gs.gameLog].slice(0, 20) };
}

function txn(gs: GameState, dr: number, cr: number, amount: number, desc: string): GameState {
  if (amount <= 0) return gs;
  return { ...gs, txnLog: [...gs.txnLog, { dr, cr, amount: Math.round(amount), desc }] };
}

/* === 会社を gs に反映 === */
function setCompany(gs: GameState, c: Company): GameState {
  return { ...gs, companies: gs.companies.map(x => x.id === c.id ? c : x) };
}

/* === DR / CR インデックス (MX会計) === */
const DR = { CASH:0, MAT:1, PROD:2, EQUIP:3, RD:4, AR:5, V:6, F1:7, F2:8, F3:9 };
const CR = { CAP:0, DEBT:1, PQ:2, CASH:3, MAT:4, PROD:5, EQUIP:6, AP:7, OTHER:8, RE:9 };

/* ============================================================
   executeAction
   pure: GameState を受け取り、新しい GameState を返す。
   'sell' の場合のみ gs.currentAuction をセットする。
   ============================================================ */
export function executeAction(
  gsIn: GameState,
  actionId: ActionId,
  params: ActionParams,
  targetCompany?: Company,
): GameState {
  let gs  = { ...gsIn };
  const orig = targetCompany
    ? gs.companies.find(company => company.id === targetCompany.id) ?? targetCompany
    : gs.companies[0];
  const c  = { ...orig };
  const isPlayer = c.id === 'player';

  switch (actionId) {

    /* ---- 材料購入 ---- */
    case 'buyMat': {
      const p = params as { qty: number };
      const matCost = effectiveMatCost(c);
      const qty  = Math.max(0, Math.min(p.qty, Math.floor(c.cash / matCost)));
      const cost = qty * matCost;
      c.cash              -= cost;
      c.materialInventory += qty;
      c.materialBookValue += cost;
      c.effects            = { ...c.effects, matDiscount: false };
      gs = log(gs, `${c.name} が材料 ${qty}個 を購入 (${cost}万円${matCost < MATERIAL_COST ? ' / R&D単価' + matCost + '万' : ''})`, isPlayer);
      if (isPlayer) gs = txn(gs, DR.MAT, CR.CASH, cost, `材料購入 ${qty}個`);
      break;
    }

    /* ---- 製造 ---- */
    case 'produce': {
      const cap = prodCap(c);
      const qty = Math.min(c.materialInventory, cap);
      const unitBook = c.materialInventory > 0 ? c.materialBookValue / c.materialInventory : 0;
      const movedBook = qty === c.materialInventory
        ? c.materialBookValue
        : Math.min(c.materialBookValue, Math.round(unitBook * qty));
      c.materialInventory -= qty;
      c.materialBookValue = Math.max(0, c.materialBookValue - movedBook);
      c.productInventory  += qty;
      c.productBookValue  += movedBook;
      gs = log(gs, `${c.name} が ${qty}個 を製造した`, isPlayer);
      if (isPlayer) gs = txn(gs, DR.PROD, CR.MAT, movedBook, `製造完成 ${qty}個`);
      break;
    }

    /* ---- 販売 (オークション起動) ---- */
    case 'sell': {
      const p = params as { cityId: CityId; qty: number; price: number; flyerUsed: number };
      const city = CITIES.find(ct => ct.id === p.cityId)!;
      const saleQty = Math.min(p.qty, c.productInventory);

      const salesCount  = c.staffRoles.sales.employees + c.staffRoles.sales.parts;
      const maxFlyerUse = salesCount * 2;
      const flyerUsed   = Math.min(p.flyerUsed ?? 0, c.flyerChips, maxFlyerUse);
      c.flyerChips      = Math.max(0, c.flyerChips - flyerUsed);
      const flyerAdv    = flyerUsed * FLYER_ADV;

      const rdAdv        = rdPriceAdv(c);
      const isExclusive  = c.effects.exclusive;
      c.effects          = { ...c.effects, exclusive: false };
      const effectivePrice = Math.max(1, p.price - flyerAdv - rdAdv);

      gs = log(gs, `${c.name} が ${saleQty}個 @${p.price}万 (実効${effectivePrice}万) を${city.name}で入札宣言`, isPlayer);

      const children = isExclusive ? [] : gs.companies.filter(co => co.id !== c.id);
      const auction: AuctionState = {
        parent:               c,
        cityId:               p.cityId,
        cityName:             city.name,
        cityVol:              gs.cityVols[p.cityId],
        parentQty:            saleQty,
        parentPrice:          p.price,
        parentEffectivePrice: effectivePrice,
        parentFlyerUsed:      flyerUsed,
        parentRdAdv:          rdAdv,
        parentExclusive:      isExclusive,
        children,
        childIdx:             0,
        counters:             [],
        resolved:             false,
        resolvedBids:         null,
      };
      gs = setCompany(gs, c);
      return { ...gs, currentAuction: auction };
    }

    /* ---- 採用 ---- */
    case 'hire': {
      const p = params as { hireType: 'employee' | 'part'; role: 'manufacturing' | 'sales' | 'stocking'; count: number };
      const isEmp  = p.hireType === 'employee';
      const maxAdd = isEmp ? MAX_EMPLOYEES - c.employees : MAX_PARTS - c.partTimers;
      const count  = Math.max(0, Math.min(p.count, maxAdd, 3));
      if (count <= 0) {
        gs = log(gs, `${c.name}: 採用上限のためスキップ`, isPlayer);
        break;
      }
      const key = isEmp ? 'employees' : 'parts';
      c.staffRoles = {
        ...c.staffRoles,
        [p.role]: { ...c.staffRoles[p.role], [key]: c.staffRoles[p.role][key] + count },
      };
      syncStaff(c);
      gs = log(gs, `${c.name} が${isEmp ? '社員' : 'パート'} ${count}名 を採用 (計${c.employees}名+パ${c.partTimers}名)`, isPlayer);
      break;
    }

    /* ---- 配置換 ---- */
    case 'reassign': {
      const p = params as { personType: 'employee' | 'part'; fromRole: 'manufacturing' | 'sales' | 'stocking'; toRole: 'manufacturing' | 'sales' | 'stocking' };
      if (!p.fromRole || !p.toRole || p.fromRole === p.toRole) break;
      const key = p.personType === 'employee' ? 'employees' : 'parts';
      if (c.staffRoles[p.fromRole][key] <= 0) {
        gs = log(gs, `${c.name}: 移動元に人員がいないためスキップ`, isPlayer);
        break;
      }
      if (c.cash < REASSIGN_COST) {
        gs = log(gs, `${c.name}: 資金不足で配置換をスキップ`, isPlayer);
        break;
        }
        c.cash -= REASSIGN_COST;
        c.periodOtherSpend += REASSIGN_COST;
        c.staffRoles = {
        ...c.staffRoles,
        [p.fromRole]: { ...c.staffRoles[p.fromRole], [key]: c.staffRoles[p.fromRole][key] - 1 },
        [p.toRole]:   { ...c.staffRoles[p.toRole],   [key]: c.staffRoles[p.toRole][key]   + 1 },
      };
      syncStaff(c);
      gs = log(gs, `${c.name} が${p.personType === 'employee' ? '社員' : 'パート'}を${p.fromRole}→${p.toRole}に配置換 (${REASSIGN_COST}万円)`, isPlayer);
      if (isPlayer) gs = txn(gs, DR.F3, CR.CASH, REASSIGN_COST, `配置換`);
      break;
    }

    /* ---- 設備投資 ---- */
    case 'equip': {
      const p = params as { machType: 'sm' | 'lg'; qty: number };
      const isSm = p.machType === 'sm';
      const qty  = Math.max(1, p.qty);
      const cost = (isSm ? SM_COST : LG_COST) * qty;
      if (c.cash < cost) {
        gs = log(gs, `${c.name}: 資金不足で設備投資をスキップ`, isPlayer);
        break;
      }
      c.cash            -= cost;
      c.machineBookValue += cost;
      if (isSm) c.smallMachines += qty; else c.largeMachines += qty;
      gs = log(gs, `${c.name} が${isSm ? '小型' : '大型'}機械 ${qty}台 を購入 (${cost}万円)`, isPlayer);
      if (isPlayer) {
        gs = txn(gs, DR.EQUIP, CR.CASH, cost, `設備購入 ${isSm ? '小型' : '大型'}機械 ${qty}台`);
        gs = { ...gs, playerHistory: { ...gs.playerHistory, invested: true } };
      }
      break;
    }

    /* ---- チラシ購入 ---- */
    case 'ad': {
      const p = params as { qty: number };
      const wantQty = Math.max(1, Math.min(p.qty, 5));
      const adCost  = wantQty * FLYER_COST;
      if (c.cash < adCost) {
        gs = log(gs, `${c.name}: 資金不足でチラシ購入をスキップ`, isPlayer);
        break;
      }
      c.cash         -= adCost;
      c.periodAdSpend += adCost;
      const received  = c.effects.adBonus ? wantQty * 2 : wantQty;
      c.effects        = { ...c.effects, adBonus: false };
      c.flyerChips     = (c.flyerChips || 0) + received;
      gs = log(gs, `${c.name} がチラシチップ ${received}枚 購入 (${adCost}万円, 計${c.flyerChips}枚)`, isPlayer);
      if (isPlayer) gs = txn(gs, DR.F3, CR.CASH, adCost, `チラシ購入 ${wantQty}枚`);
      break;
    }

    /* ---- R&D ---- */
    case 'rd': {
      const p = params as { qty: number; rdEffect?: 'price' | 'cost' };
      const wantRd = Math.max(1, p.qty);
      if (p.rdEffect === 'price' || p.rdEffect === 'cost') c.rdEffect = p.rdEffect;
      let totalCost = 0, bought = 0;
      for (let i = 0; i < wantRd; i++) {
        const cost = (c.rdChips + bought) < 3 ? 10 : 40; // RD_COST_BASIC / RD_COST_ADV
        if (c.cash < totalCost + cost) break;
        totalCost += cost;
        bought++;
      }
      if (bought === 0) {
        gs = log(gs, `${c.name}: 資金不足でR&Dをスキップ`, isPlayer);
        break;
      }
        c.cash    -= totalCost;
        c.rdChips += bought;
        c.rdBookValue += totalCost;
        gs = log(gs, `${c.name} がR&Dチップ ${bought}枚 獲得 (${totalCost}万円, 計${c.rdChips}枚 / ${c.rdEffect}モード)`, isPlayer);
      if (isPlayer) {
        gs = txn(gs, DR.RD, CR.CASH, totalCost, `R&D投資 ${bought}枚`);
        gs = { ...gs, playerHistory: { ...gs.playerHistory, invested: true } };
      }
      break;
    }

    /* ---- 教育 ---- */
    case 'edu': {
      const p = params as { qty: number };
      const mfgStaff = c.staffRoles.manufacturing.employees;
      const maxEdu   = mfgStaff * EDU_MAX_PER;
      const curEdu   = c.eduBonus.manufacturing;
      const canBuy   = Math.min(p.qty, maxEdu - curEdu, Math.floor(c.cash / EDU_COST));
      if (canBuy <= 0) {
        gs = log(gs, `${c.name}: 教育上限または資金不足でスキップ`, isPlayer);
        break;
      }
        const cost = canBuy * EDU_COST;
        c.cash    -= cost;
        c.eduBookValue += cost;
        c.eduBonus = { ...c.eduBonus, manufacturing: curEdu + canBuy };
      gs = log(gs, `${c.name} が教育チップ ${canBuy}枚 購入 (${cost}万円, 製造ボーナス+${c.eduBonus.manufacturing})`, isPlayer);
      break;
    }

    /* ---- 保険 ---- */
    case 'ins': {
      const p = params as { qty: number };
      const maxIns = Math.floor(c.cash / INS_COST);
      const qty    = Math.max(0, Math.min(p.qty, maxIns));
      if (qty === 0) {
        gs = log(gs, `${c.name}: 資金不足で保険購入をスキップ`, isPlayer);
        break;
      }
        const cost   = qty * INS_COST;
        c.cash      -= cost;
        c.periodOtherSpend += cost;
        c.insChips   = (c.insChips || 0) + qty;
      gs = log(gs, `${c.name} が保険チップ ${qty}枚 購入 (${cost}万円, 計${c.insChips}枚)`, isPlayer);
      break;
    }

    /* ---- パス ---- */
    case 'nothing': {
      gs = log(gs, `${c.name} はパスした`, isPlayer);
      break;
    }
  }

  return setCompany(gs, c);
}

/* ============================================================
   アクションの可否チェック (UI 用)
   各アクションが実行可能かどうかと hint 文字列を返す
   ============================================================ */
export function getActionAvailability(
  gs: GameState,
  c: Company,
): Record<ActionId, { disabled: boolean; hint: string }> {
  const cap     = prodCap(c);
  const matCost = effectiveMatCost(c);
  const totalVol = CITIES.reduce((s, city) => s + gs.cityVols[city.id], 0);

  return {
    buyMat: {
      disabled: c.cash < matCost,
      hint: `最大 ${Math.floor(c.cash / matCost)}個 / ${matCost}万円/個`,
    },
    produce: {
      disabled: c.materialInventory === 0 || cap === 0,
      hint: `材料${c.materialInventory}個 → 製品 (最大${Math.min(c.materialInventory, cap)}個)`,
    },
    sell: {
      disabled: c.productInventory === 0,
      hint: `在庫 ${c.productInventory}個 / 全市場残${totalVol}個`,
    },
    hire: {
      disabled: c.employees >= MAX_EMPLOYEES && c.partTimers >= MAX_PARTS,
      hint: `社員 ${c.employees}/${MAX_EMPLOYEES}名 / パート ${c.partTimers}/${MAX_PARTS}名`,
    },
    reassign: {
      disabled: (c.employees + c.partTimers) < 2 || c.cash < REASSIGN_COST,
      hint: `${REASSIGN_COST}万円/人 — 現在 ${c.employees + c.partTimers}名`,
    },
    equip: {
      disabled: c.cash < SM_COST,
      hint: `小型 ${SM_COST}万 (能力+${SM_CAP}) / 大型 ${LG_COST}万 (能力+${LG_CAP})`,
    },
    ad: {
      disabled: c.cash < FLYER_COST,
      hint: `現在 ${c.flyerChips}枚 / ${FLYER_COST}万円/枚 (期末消滅)`,
    },
    rd: {
      disabled: c.cash < rdNextCost(c),
      hint: `現在 ${c.rdChips}枚 / 次の1枚 ${rdNextCost(c)}万円`,
    },
    edu: {
      disabled: c.cash < EDU_COST || c.eduBonus.manufacturing >= c.staffRoles.manufacturing.employees * EDU_MAX_PER,
      hint: `製造ボーナス +${c.eduBonus.manufacturing} / 最大+${c.staffRoles.manufacturing.employees * EDU_MAX_PER}`,
    },
    ins: {
      disabled: c.cash < INS_COST,
      hint: `現在 ${c.insChips}枚 / ${INS_COST}万円 (期末消滅)`,
    },
    nothing: {
      disabled: false,
      hint: 'ターンをスキップ',
    },
  };
}
