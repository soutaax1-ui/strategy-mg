import { MATERIAL_COST, FLYER_ADV, RD_ADV, CITIES, DR, CR } from './constants';
import { effectiveMatCost, rdPriceAdv } from './gameState';
import type { GameState, AuctionState, AuctionCounter, AuctionBid, Company, LogClass } from './types';

function addLog(gs: GameState, text: string, cls: LogClass = ''): GameState {
  const entry = { text, cls, id: Date.now() + Math.random() };
  return { ...gs, gameLog: [entry, ...gs.gameLog].slice(0, 20) };
}

function txn(gs: GameState, dr: number, cr: number, amount: number, desc: string): GameState {
  if (amount <= 0) return gs;
  return { ...gs, txnLog: [...gs.txnLog, { dr, cr, amount: Math.round(amount), desc }] };
}

/* === AI 対抗入札ロジック === */

export function aiDecideCounter(
  gs: GameState,
  company: Company,
  auction: AuctionState,
): AuctionCounter | null {
  if (gs.aiLevel === 'medium') return aiDecideCounterMedium(company, auction);
  if (gs.aiLevel === 'strong') return aiDecideCounterStrong(company, auction);
  return aiDecideCounterWeak(company, auction);
}

function aiDecideCounterWeak(company: Company, auction: AuctionState): AuctionCounter | null {
  if (company.productInventory <= 0 || auction.cityVol <= 0) return null;

  const baseRate = 0.45;
  let rate = baseRate;
  switch (company.character) {
    case 'alpha': rate += 0.15; break;
    case 'beta':  rate -= 0.10; break;
    case 'gamma': rate += 0.10; break;
  }
  if (Math.random() > rate) return null;

  const city = CITIES.find(c => c.id === auction.cityId) ?? CITIES[0];
  let counterPrice: number;
  switch (company.character) {
    case 'alpha': counterPrice = Math.max(MATERIAL_COST + 1, auction.parentPrice - (Math.floor(Math.random() * 3) + 1)); break;
    case 'beta':  counterPrice = Math.min(city.priceMax, auction.parentPrice + (Math.floor(Math.random() * 3) + 1)); break;
    case 'gamma': counterPrice = Math.max(MATERIAL_COST + 1, auction.parentPrice - Math.floor(Math.random() * 2)); break;
    default:      counterPrice = auction.parentPrice;
  }
  const counterQty = Math.min(company.productInventory, Math.max(1, Math.ceil(auction.cityVol * 0.6)));
  const salesCount = company.staffRoles.sales.employees + company.staffRoles.sales.parts;
  const flyerUsed  = Math.min(company.flyerChips, salesCount * 2);
  const aiRdAdv    = rdPriceAdv(company);

  return {
    company,
    qty:            counterQty,
    price:          counterPrice,
    effectivePrice: Math.max(1, counterPrice - flyerUsed * FLYER_ADV - aiRdAdv),
    flyerUsed,
    rdAdv:          aiRdAdv,
    exclusive:      false,
  };
}

function aiDecideCounterMedium(company: Company, auction: AuctionState): AuctionCounter | null {
  if (company.productInventory <= 0 || auction.cityVol <= 0) return null;

  const matCost  = effectiveMatCost(company);
  const charAdj  = company.character === 'alpha' ? -2 : company.character === 'beta' ? 3 : 0;
  const city     = CITIES.find(c => c.id === auction.cityId) ?? CITIES[0];
  const ownPrice = Math.max(matCost + 1, city.priceStd + charAdj);

  const counterRate = ownPrice < auction.parentPrice ? 0.80 :
                      ownPrice <= auction.parentPrice + 2 ? 0.50 : 0.20;
  if (Math.random() > counterRate) return null;

  const counterPrice = Math.max(matCost + 1, Math.min(ownPrice, auction.parentPrice - 1));
  const counterQty   = Math.min(company.productInventory, Math.max(1, Math.ceil(auction.cityVol * 0.7)));
  const salesCount   = company.staffRoles.sales.employees + company.staffRoles.sales.parts;
  const flyerUsed    = Math.min(company.flyerChips, salesCount * 2);
  const aiRdAdv      = rdPriceAdv(company);

  return {
    company,
    qty:            counterQty,
    price:          counterPrice,
    effectivePrice: Math.max(1, counterPrice - flyerUsed * FLYER_ADV - aiRdAdv),
    flyerUsed,
    rdAdv:          aiRdAdv,
    exclusive:      false,
  };
}

function aiDecideCounterStrong(company: Company, auction: AuctionState): AuctionCounter | null {
  if (company.productInventory <= 0 || auction.cityVol <= 0) return null;

  const matCost    = effectiveMatCost(company);
  const salesCount = company.staffRoles.sales.employees + company.staffRoles.sales.parts;
  const flyerAvail = Math.min(company.flyerChips, salesCount * 2);
  const aiRdAdv    = rdPriceAdv(company);

  const charAdj    = company.character === 'alpha' ? -3 : company.character === 'beta' ? 2 : -1;
  const ownPrice   = Math.max(matCost + 1, auction.parentPrice + charAdj);
  const effectiveOwn = Math.max(1, ownPrice - flyerAvail * FLYER_ADV - aiRdAdv);

  const winProb = effectiveOwn < auction.parentEffectivePrice ? 0.85 :
                  effectiveOwn === auction.parentEffectivePrice ? 0.55 : 0.20;
  const qty            = Math.min(company.productInventory, Math.max(1, Math.ceil(auction.cityVol * 0.8)));
  const expectedProfit = winProb * qty * Math.max(0, ownPrice - matCost);
  if (expectedProfit <= 0) return null;

  return {
    company,
    qty,
    price:          ownPrice,
    effectivePrice: Math.max(1, effectiveOwn),
    flyerUsed:      flyerAvail,
    rdAdv:          aiRdAdv,
    exclusive:      false,
  };
}

/* === 入札解決 === */

export function resolveAuction(gs: GameState): GameState {
  const auction = gs.currentAuction!;

  // 全入札を収集 (親 + 対抗者)
  const allBids: AuctionBid[] = [
    {
      company:        auction.parent,
      bidQty:         Math.min(auction.parentQty, auction.parent.productInventory),
      price:          auction.parentPrice,
      effectivePrice: auction.parentEffectivePrice,
      rdChips:        auction.parentRdAdv / RD_ADV,
      isParent:       true,
      flyerUsed:      auction.parentFlyerUsed,
      exclusive:      auction.parentExclusive,
      sold:           0,
      revenue:        0,
    },
    ...auction.counters.map(ctr => ({
      company:        ctr.company,
      bidQty:         Math.min(ctr.qty, ctr.company.productInventory),
      price:          ctr.price,
      effectivePrice: ctr.effectivePrice,
      rdChips:        ctr.rdAdv / RD_ADV,
      isParent:       false,
      flyerUsed:      ctr.flyerUsed,
      exclusive:      false,
      sold:           0,
      revenue:        0,
    })),
  ];

  // 独占 → 実効価格昇順 → R&Dチップ降順 → 親優先 → ランダム
  allBids.sort((a, b) => {
    if (a.exclusive && !b.exclusive) return -1;
    if (!a.exclusive && b.exclusive) return 1;
    if (a.effectivePrice !== b.effectivePrice) return a.effectivePrice - b.effectivePrice;
    if (a.rdChips !== b.rdChips) return b.rdChips - a.rdChips;
    if (a.isParent && !b.isParent) return -1;
    if (!a.isParent && b.isParent) return 1;
    return Math.random() - 0.5;
  });

  let newGs = { ...gs };
  let remaining = gs.cityVols[auction.cityId];

    for (const bid of allBids) {
      if (remaining <= 0) break;
      // 常に gs.companies の最新在庫を参照
      const currentC = newGs.companies.find(co => co.id === bid.company.id)!;
      const actualQty = Math.min(bid.bidQty, currentC.productInventory);
      bid.sold    = Math.min(actualQty, remaining);
      bid.revenue = bid.sold * bid.price;
      const unitBook = currentC.productInventory > 0 ? currentC.productBookValue / currentC.productInventory : 0;
      const soldBookValue = bid.sold === currentC.productInventory
        ? currentC.productBookValue
        : Math.min(currentC.productBookValue, Math.round(unitBook * bid.sold));
      remaining  -= bid.sold;

      const updatedC: Company = {
        ...currentC,
        productInventory: currentC.productInventory - bid.sold,
        productBookValue:  Math.max(0, currentC.productBookValue - soldBookValue),
        cash:             currentC.cash + bid.revenue,
        lastSaleRevenue:  bid.revenue,
        periodRevenue:    currentC.periodRevenue + bid.revenue,
        periodCOGS:       currentC.periodCOGS + soldBookValue,
        periodSoldQty:    currentC.periodSoldQty + bid.sold,
      };
    newGs = { ...newGs, companies: newGs.companies.map(x => x.id === updatedC.id ? updatedC : x) };

    // プレイヤーのみ MX 記録 + 強AI用履歴更新
    if (bid.company.id === 'player' && bid.sold > 0) {
      newGs = txn(newGs, DR.CASH, CR.PQ, bid.revenue, `売上 ${bid.sold}個@${bid.price}万 (${auction.cityName})`);
      newGs = txn(newGs, DR.V, CR.PROD, soldBookValue, `売上原価 ${bid.sold}個 (${auction.cityName})`);
      newGs = {
        ...newGs,
        playerHistory: {
          ...newGs.playerHistory,
          citySales: {
            ...newGs.playerHistory.citySales,
            [auction.cityId]: (newGs.playerHistory.citySales[auction.cityId] ?? 0) + bid.sold,
          },
          priceHistory: [
            ...newGs.playerHistory.priceHistory.slice(-14),
            bid.price,
          ],
        },
      };
    }
  }

  newGs = { ...newGs, cityVols: { ...newGs.cityVols, [auction.cityId]: remaining } };

  // auctionLog に追記
  newGs = {
    ...newGs,
    auctionLog: [
      ...newGs.auctionLog,
      {
        cityId:    auction.cityId,
        cityName:  auction.cityName,
        volBefore: auction.cityVol,
        bids:      allBids,
        totalSold: allBids.reduce((s, b) => s + b.sold, 0),
      },
    ],
  };

  // 解決済みフラグ (currentAuction は BiddingScreen が結果を表示するため保持)
  const resolvedAuction = { ...auction, resolved: true, resolvedBids: allBids };
  newGs = addLog(newGs, `📊 ${auction.cityName} 入札確定 — 合計${allBids.reduce((s, b) => s + b.sold, 0)}個販売`, '');

  return { ...newGs, currentAuction: resolvedAuction };
}
