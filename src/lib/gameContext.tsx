import { createContext, useCallback, useContext, useReducer, type ReactNode } from 'react';
import type { GameState, GameAction, GamePhase, LogClass, RiskCard, Company, AuctionCounter, UiState } from './types';
import {
  initGame, resetPeriod, applyPostMarket, aiPeriodStartFinance,
  drawFromMainDeck, drawFromRiskDeck, syncStaff,
} from './gameState';
import { executeAction } from './actions';
import { aiChooseAction } from './ai';
import { resolveAuction } from './auction';
import { CITIES, FLYER_ADV, RD_ADV, DR, CR } from './constants';
import { buildMascotReaction } from './mascotReactions';
import type { MascotEvent } from './mascotTypes';
import type { CityId } from './types';

/* === UI デフォルト === */
const defaultUi: UiState = {
  phase: 'title',
  drawnCard: null,
  drawnRiskCard: null,
  riskTarget: null,
};

/* === 統合 State === */
interface CombinedState {
  gs: GameState | null;
  ui: UiState;
}

const initialState: CombinedState = {
  gs: null,
  ui: defaultUi,
};

/* === ターン進行ヘルパー (reducer 内で再利用) === */
function advanceTurn(
  state: { gs: GameState | null; ui: UiState },
  gs: GameState,
  ui: UiState,
): { gs: GameState | null; ui: UiState } {
  // オークション後も含めて currentAuction を必ず解放
  const cleanGs = { ...gs, currentAuction: null };
  let playerIdx = cleanGs.playerIdx + 1;
  let round     = cleanGs.round;
  if (playerIdx >= cleanGs.companies.length) { playerIdx = 0; round++; }
  if (round > 10) {
    return { gs: { ...cleanGs, playerIdx, round }, ui: { ...ui, phase: 'period-done' } };
  }
  const nextCompany = cleanGs.companies[playerIdx];
  const nextPhase: GamePhase = nextCompany?.type === 'player' ? 'draw-ready' : 'ai-thinking';
  let newUi: UiState = { ...ui, phase: nextPhase, drawnCard: null };
  if (nextPhase === 'draw-ready') {
    const charId = cleanGs.companies[0]?.characterId ?? 'mecha';
    newUi = { ...newUi, mascot: buildMascotReaction('turnStart', charId, ui.mascot) };
  }
  return { gs: { ...cleanGs, playerIdx, round }, ui: newUi };
}

/* === リスクカード適用 (AI 向け — UI 遷移なし) === */
function applyRiskLogic(gs: GameState, company: Company, card: RiskCard): GameState {
  let newGs = { ...gs };
  let c = { ...company };
  const isImmune3 = gs.currentPeriod <= 3;

  switch (card.id) {
      case 'fire':
        newGs = addLog(newGs, `🔥 ${c.name} — 倉庫火災！材料在庫消滅`, 'log-risk');
        c.periodOtherSpend += c.materialBookValue;
        c.materialInventory = 0;
        c.materialBookValue = 0;
        break;
    case 'theft': {
        const loss = Math.min(30, c.cash);
        c.cash -= loss;
        c.periodOtherSpend += loss;
        newGs = addLog(newGs, `🦹 ${c.name} — 盗難！${loss}万円損失`, 'log-risk');
      break;
    }
    case 'bankruptcy':
      if (!isImmune3) {
          const lost = Math.min(3, c.productInventory);
          const unitBook = c.productInventory > 0 ? c.productBookValue / c.productInventory : 0;
          const lostBook = lost === c.productInventory
            ? c.productBookValue
            : Math.min(c.productBookValue, Math.round(unitBook * lost));
          c.productInventory -= lost;
          c.productBookValue = Math.max(0, c.productBookValue - lostBook);
          c.periodOtherSpend += lostBook;
          newGs = addLog(newGs, `💥 ${c.name} — 得意先倒産！製品${lost}個消滅`, 'log-risk');
      } else {
        newGs = addLog(newGs, `💥 ${c.name} — 得意先倒産 (免除)`, 'log-risk');
      }
      break;
      case 'returns':
      if (!isImmune3) {
          const refund = Math.min(c.cash, Math.floor(c.lastSaleRevenue * 0.2));
          c.cash -= refund;
          c.periodOtherSpend += refund;
          newGs = addLog(newGs, `📦 ${c.name} — 返品！${refund}万円返金`, 'log-risk');
      } else {
        newGs = addLog(newGs, `📦 ${c.name} — 返品 (免除)`, 'log-risk');
      }
      break;
    case 'quit': {
      const total = c.staffRoles.manufacturing.employees + c.staffRoles.sales.employees + c.staffRoles.stocking.employees;
      if (total > 1) {
        for (const role of ['manufacturing', 'sales', 'stocking'] as const) {
          if (c.staffRoles[role].employees > 0) {
            c.staffRoles = { ...c.staffRoles, [role]: { ...c.staffRoles[role], employees: c.staffRoles[role].employees - 1 } };
            syncStaff(c);
            newGs = addLog(newGs, `🚪 ${c.name} — 社員退職 (残${c.employees}名)`, 'log-risk');
            break;
          }
        }
      }
      break;
    }
      case 'breakdown':
      if (c.smallMachines > c.brokenMachines) {
        c.brokenMachines += 1;
        newGs = addLog(newGs, `⚙️ ${c.name} — 機械故障！生産能力-1 (今期)`, 'log-risk');
      }
      break;
    case 'special-loss': {
        const loss = Math.min(50, c.cash);
        c.cash -= loss;
        c.periodOtherSpend += loss;
        newGs = addLog(newGs, `💸 ${c.name} — 特別損失！${loss}万円損失`, 'log-risk');
      break;
    }
    case 'rd-success':
      c.rdChips += 2;
      newGs = addLog(newGs, `🔬 ${c.name} — 研究開発成功！R&Dチップ+2`, 'log-good');
      break;
    case 'ad-success':
      c.effects = { ...c.effects, adBonus: true };
      newGs = addLog(newGs, `📢 ${c.name} — 広告成功！次回販売広告効果2倍`, 'log-good');
      break;
    case 'exclusive':
      c.effects = { ...c.effects, exclusive: true };
      newGs = addLog(newGs, `⭐ ${c.name} — 独占販売権獲得！`, 'log-good');
      break;
    case 'cheap-mat':
      c.effects = { ...c.effects, matDiscount: true };
      newGs = addLog(newGs, `🎁 ${c.name} — 材料低価格仕入！次回30%割引`, 'log-good');
      break;
    case 'nothing':
      newGs = addLog(newGs, `✅ ${c.name} — セーフ！何も起きない`, '');
      break;
  }

  return { ...newGs, companies: newGs.companies.map(x => x.id === c.id ? c : x) };
}

/* === ログ追加ヘルパー === */
function addLog(gs: GameState, text: string, cls: LogClass = ''): GameState {
  const entry = { text, cls, id: Date.now() + Math.random() };
  const gameLog = [entry, ...gs.gameLog].slice(0, 20);
  return { ...gs, gameLog };
}

function recordTxn(gs: GameState, dr: number, cr: number, amount: number, desc: string): GameState {
  if (amount <= 0) return gs;
  const txn = { dr, cr, amount: Math.round(amount), desc };
  return { ...gs, txnLog: [...gs.txnLog, txn] };
}

/* === 会社を gs に反映するヘルパー === */
function updateCompany(gs: GameState, updated: Company): GameState {
  return {
    ...gs,
    companies: gs.companies.map(c => c.id === updated.id ? updated : c),
  };
}

/* === Reducer === */
function reducer(state: CombinedState, action: GameAction): CombinedState {
  const { gs, ui } = state;

  switch (action.type) {
    /* ---- ゲーム初期化 ---- */
    case 'INIT_GAME': {
      const newGs = initGame(action.totalPeriods, action.config);
      if (action.mpOverrides) {
        action.mpOverrides.forEach(({ idx, name, type, companyName, presidentName, characterId }) => {
          if (newGs.companies[idx]) {
            newGs.companies[idx] = {
              ...newGs.companies[idx],
              name,
              type,
              ...(companyName    !== undefined && { companyName }),
              ...(presidentName  !== undefined && { presidentName }),
              ...(characterId    !== undefined && { characterId }),
            };
          }
        });
      }
      const charId = newGs.companies[0]?.characterId ?? 'mecha';
      const mascot = buildMascotReaction('gameStart', charId, undefined);
      return {
        gs: newGs,
        ui: { ...defaultUi, phase: 'period-start', mascot },
      };
    }

    /* ---- マルチプレイヤー状態同期 ---- */
    case 'SET_STATE':
      return { gs: action.gs, ui: action.ui };

    /* ---- 期首借入/返済 ---- */
    case 'PERIOD_START_FINANCE': {
      if (!gs) return state;
      const target = action.company
        ? gs.companies.find(c => c.id === action.company?.id) ?? action.company
        : gs.companies[0];
      const player = { ...target };

      const borrow = Number.isFinite(action.borrow) ? Math.max(0, action.borrow) : 0;
      player.cash += borrow;
      player.debt += borrow;

      const requestedRepay = Number.isFinite(action.repay) ? Math.max(0, action.repay) : 0;
      const actualRepay = Math.min(requestedRepay, player.debt, Math.max(0, player.cash));
      player.cash -= actualRepay;
      player.debt -= actualRepay;

      // AI各社の期首財務
      const companies = gs.companies.map(c => {
        if (c.id === player.id) return player;
        return c.type === 'ai' ? aiPeriodStartFinance(c) : c;
      });

      return {
        ...state,
        gs: { ...gs, companies },
        ui: { ...ui, phase: 'draw-ready' },
      };
    }

    /* ---- カードを引く ---- */
    case 'DRAW_MAIN_CARD': {
      if (!gs) return state;
      const { card, deck } = drawFromMainDeck(gs.mainDeck);
      const newGs = { ...gs, mainDeck: deck };

      if (card.type === 'risk-trigger') {
        return {
          ...state,
          gs: newGs,
          ui: { ...ui, phase: 'risk-trigger', drawnCard: card, riskTarget: gs.companies[gs.playerIdx] },
        };
      }
      return {
        ...state,
        gs: newGs,
        ui: { ...ui, phase: 'action-menu', drawnCard: card },
      };
    }

    /* ---- リスクカード適用 ---- */
      case 'APPLY_RISK_CARD': {
      if (!gs) return state;
      const { company, card } = action;
      const remainingRiskDeck = action.remainingRiskDeck
        ?? (gs.riskDeck[gs.riskDeck.length - 1]?.id === card.id ? gs.riskDeck.slice(0, -1) : gs.riskDeck);
      let newGs = { ...gs, riskDeck: remainingRiskDeck };
      let updated = { ...company };

      const isImmune3 = gs.currentPeriod <= 3;

      // 保険チップでネガティブリスクを無効化
      if (card.type === 'negative' && updated.insChips > 0) {
        updated.insChips = Math.max(0, updated.insChips - 1);
        newGs = addLog(newGs, `🛡️ ${company.name} — 保険発動！「${card.name}」を無効化`, 'log-good');
        return {
          ...state,
          gs: updateCompany(newGs, updated),
          ui: { ...ui, phase: 'risk-result', drawnRiskCard: card, riskTarget: updated },
        };
      }

      switch (card.id) {
          case 'fire':
            newGs = addLog(newGs, `🔥 ${company.name} — 倉庫火災！材料在庫 ${updated.materialInventory}個 消滅`, 'log-risk');
            updated.periodOtherSpend += updated.materialBookValue;
            updated.materialInventory = 0;
            updated.materialBookValue = 0;
            break;
          case 'theft': {
            const loss = Math.min(30, updated.cash);
            updated.cash -= loss;
            updated.periodOtherSpend += loss;
            newGs = addLog(newGs, `🦹 ${company.name} — 盗難！${loss}万円 損失`, 'log-risk');
            break;
        }
        case 'bankruptcy':
          if (isImmune3) {
            newGs = addLog(newGs, `💥 ${company.name} — 得意先倒産 (${gs.currentPeriod}期: 免除)`, 'log-risk');
            } else {
              const lost = Math.min(3, updated.productInventory);
              const unitBook = updated.productInventory > 0 ? updated.productBookValue / updated.productInventory : 0;
              const lostBook = lost === updated.productInventory
                ? updated.productBookValue
                : Math.min(updated.productBookValue, Math.round(unitBook * lost));
              updated.productInventory -= lost;
              updated.productBookValue = Math.max(0, updated.productBookValue - lostBook);
              updated.periodOtherSpend += lostBook;
              newGs = addLog(newGs, `💥 ${company.name} — 得意先倒産！製品在庫 ${lost}個 消滅`, 'log-risk');
            }
          break;
        case 'returns':
          if (isImmune3) {
            newGs = addLog(newGs, `📦 ${company.name} — 返品 (${gs.currentPeriod}期: 免除)`, 'log-risk');
            } else {
              const refund = Math.min(updated.cash, Math.floor(updated.lastSaleRevenue * 0.2));
              updated.cash -= refund;
              updated.periodOtherSpend += refund;
              newGs = addLog(newGs, `📦 ${company.name} — 返品！${refund}万円 返金`, 'log-risk');
            }
          break;
        case 'quit': {
          const total = updated.staffRoles.manufacturing.employees + updated.staffRoles.sales.employees + updated.staffRoles.stocking.employees;
          if (total > 1) {
            for (const role of ['manufacturing', 'sales', 'stocking'] as const) {
              if (updated.staffRoles[role].employees > 0) {
                updated.staffRoles = {
                  ...updated.staffRoles,
                  [role]: { ...updated.staffRoles[role], employees: updated.staffRoles[role].employees - 1 },
                };
                syncStaff(updated);
                newGs = addLog(newGs, `🚪 ${company.name} — 社員退職！(残${updated.employees}名)`, 'log-risk');
                break;
              }
            }
          } else {
            newGs = addLog(newGs, `🚪 ${company.name} — 社員退職 (最低1名のため免除)`, 'log-risk');
          }
          break;
        }
        case 'breakdown':
          if (updated.smallMachines > updated.brokenMachines) {
            updated.brokenMachines += 1;
            newGs = addLog(newGs, `⚙️ ${company.name} — 機械故障！生産能力 -1 (今期)`, 'log-risk');
          } else {
            newGs = addLog(newGs, `⚙️ ${company.name} — 機械故障 (稼働中の小型機械なし: 無効)`, 'log-risk');
          }
          break;
          case 'special-loss': {
            const loss = Math.min(50, updated.cash);
            updated.cash -= loss;
            updated.periodOtherSpend += loss;
            newGs = addLog(newGs, `💸 ${company.name} — 特別損失！${loss}万円 損失`, 'log-risk');
          break;
        }
        case 'rd-success':
          updated.rdChips += 2;
          newGs = addLog(newGs, `🔬 ${company.name} — 研究開発成功！R&Dチップ +2 (計${updated.rdChips}枚)`, 'log-good');
          break;
        case 'ad-success':
          updated.effects = { ...updated.effects, adBonus: true };
          newGs = addLog(newGs, `📢 ${company.name} — 広告成功！次回販売で広告効果2倍`, 'log-good');
          break;
        case 'exclusive':
          updated.effects = { ...updated.effects, exclusive: true };
          newGs = addLog(newGs, `⭐ ${company.name} — 独占販売権獲得！次回販売で競合なし`, 'log-good');
          break;
        case 'cheap-mat':
          updated.effects = { ...updated.effects, matDiscount: true };
          newGs = addLog(newGs, `🎁 ${company.name} — 材料低価格仕入！次回材料購入30%割引`, 'log-good');
          break;
        case 'nothing':
          newGs = addLog(newGs, `✅ ${company.name} — セーフ！何も起きない`, '');
          break;
      }

      return {
        ...state,
        gs: updateCompany(newGs, updated),
        ui: { ...ui, phase: 'risk-result', drawnRiskCard: card, riskTarget: updated },
      };
    }

    /* ---- プレイヤー: オークションパス ---- */
    case 'PLAYER_PASS_AUCTION': {
      if (!gs || !gs.currentAuction) return state;
      const company = action.company
        ? gs.companies.find(c => c.id === action.company?.id) ?? action.company
        : gs.companies[0];
      // 現在の子ターン会社と一致しない場合は不正アクション
      const expectedPass = gs.currentAuction.children[gs.currentAuction.childIdx];
      if (!expectedPass || company.id !== expectedPass.id) return state;
      let newGs = addLog(gs, `${company.name} はパス`, company.id === 'player' ? 'log-player' : '');
      newGs = { ...newGs, currentAuction: { ...newGs.currentAuction!, childIdx: newGs.currentAuction!.childIdx + 1 } };
      return { ...state, gs: newGs };
    }

    /* ---- プレイヤー: 対抗入札 ---- */
    case 'PLAYER_SUBMIT_COUNTER': {
      if (!gs || !gs.currentAuction) return state;
      const player     = action.company
        ? gs.companies.find(c => c.id === action.company?.id) ?? action.company
        : gs.companies[0];
      // 現在の子ターン会社と一致しない場合は不正アクション
      const expectedCounter = gs.currentAuction.children[gs.currentAuction.childIdx];
      if (!expectedCounter || player.id !== expectedCounter.id) return state;
      const city       = CITIES.find(c => c.id === gs.currentAuction!.cityId) ?? CITIES[0];
      const qty        = Math.max(0, Math.min(action.qty, player.productInventory, gs.currentAuction.cityVol));
      const price      = Math.max(city.priceMin, Math.min(city.priceMax, action.price));
      const salesCount = player.staffRoles.sales.employees + player.staffRoles.sales.parts;
      const flyerUsed  = Math.min(player.flyerChips, salesCount * 2);
      const rdAdv      = player.rdEffect === 'price' ? player.rdChips * RD_ADV : 0;
      const effPrice   = Math.max(1, price - flyerUsed * FLYER_ADV - rdAdv);
      const counter: AuctionCounter = {
        company:        player,
        qty,
        price,
        effectivePrice: effPrice,
        flyerUsed,
        rdAdv,
        exclusive:      false,
      };
      const updatedPlayer = { ...player, flyerChips: Math.max(0, player.flyerChips - flyerUsed) };
      const newAuction = {
        ...gs.currentAuction,
        counters: [...gs.currentAuction.counters, counter],
        childIdx: gs.currentAuction.childIdx + 1,
      };
      let newGs = updateCompany(gs, updatedPlayer);
      newGs = { ...newGs, currentAuction: newAuction };
      newGs = addLog(newGs, `${player.name} が対抗入札！${qty}個 @${price}万 (実効${effPrice}万)`, player.id === 'player' ? 'log-player' : '');
      return { ...state, gs: newGs };
    }

    /* ---- AI: 対抗入札決定 ---- */
    case 'AI_COUNTER_DECIDED': {
      if (!gs || !gs.currentAuction) return state;
      const counter = action.counter;
      let newGs    = gs;
      let newAuction = { ...gs.currentAuction, childIdx: gs.currentAuction.childIdx + 1 };
      if (counter) {
        newAuction = { ...newAuction, counters: [...newAuction.counters, counter] };
        // flyerUsed をリアル会社データから差し引く
        if (counter.flyerUsed > 0) {
          const aiC     = newGs.companies.find(c => c.id === counter.company.id)!;
          const updated = { ...aiC, flyerChips: Math.max(0, aiC.flyerChips - counter.flyerUsed) };
          newGs = updateCompany(newGs, updated);
        }
        newGs = addLog(newGs, `${counter.company.name} が対抗入札！${counter.qty}個 @${counter.price}万`, '');
      }
      newGs = { ...newGs, currentAuction: newAuction };
      return { ...state, gs: newGs };
    }

    /* ---- オークション解決 ---- */
    case 'RESOLVE_AUCTION': {
      if (!gs || !gs.currentAuction) return state;
      const newGs = resolveAuction(gs);
      const player0 = gs.companies[0];
      const charId = player0?.characterId ?? 'mecha';
      const inAuction =
        gs.currentAuction.parent.id === player0.id ||
        gs.currentAuction.children.some(c => c.id === player0.id);
      let mascot = ui.mascot;
      if (inAuction) {
        const summary = newGs.lastBids.companySummary[player0.id];
        if (summary !== undefined) {
          mascot = buildMascotReaction(summary.soldQty > 0 ? 'bidSuccess' : 'bidFail', charId, ui.mascot);
        }
      }
      return { ...state, gs: newGs, ui: { ...ui, mascot } };
    }

    /* ---- 期末処理 ---- */
    case 'END_PERIOD': {
      if (!gs || ui.phase !== 'period-done') return state;
      const companies = gs.companies.map(c => applyPostMarket(c, gs.rate));
      let newGs = { ...gs, companies };
      // プレイヤーの期末仕訳を MX に記録
      const pr = companies[0].result!;
      if (pr.empCost  > 0) newGs = recordTxn(newGs, DR.F1, CR.CASH,  pr.empCost,  '人件費');
      if (pr.depr     > 0) newGs = recordTxn(newGs, DR.F2, CR.EQUIP, pr.depr,     '減価償却');
      if (pr.interest > 0) newGs = recordTxn(newGs, DR.F3, CR.CASH,  pr.interest, '支払利息');
      // マスコット: 決算 → 利益/損失 → 資金危機
      const charId = companies[0]?.characterId ?? 'mecha';
      let mascot = buildMascotReaction('accounting', charId, ui.mascot);
      if (pr.opProfit > 0) {
        mascot = buildMascotReaction('profit', charId, mascot);
      } else if (pr.opProfit < 0) {
        mascot = buildMascotReaction('loss', charId, mascot);
      }
      if (companies[0].cash < 30) {
        mascot = buildMascotReaction('cashCrisis', charId, mascot);
      }
      return { ...state, gs: newGs, ui: { ...ui, phase: 'period-end', mascot } };
    }

    /* ---- 次の期へ ---- */
    case 'ADVANCE_PERIOD': {
      if (!gs) return state;
      if (gs.currentPeriod >= gs.totalPeriods) {
        const charId = gs.companies[0]?.characterId ?? 'mecha';
        const sorted = [...gs.companies].sort(
          (a, b) => (b.retainedEarnings + b.cash) - (a.retainedEarnings + a.cash),
        );
        const event = sorted[0]?.id === gs.companies[0].id ? 'gameClear' : 'gameOver';
        const mascot = buildMascotReaction(event, charId, ui.mascot);
        return { ...state, ui: { ...ui, phase: 'results', mascot } };
      }
      const newGs = resetPeriod({ ...gs, currentPeriod: gs.currentPeriod + 1 });
      return {
        ...state,
        gs: newGs,
        ui: { ...defaultUi, phase: 'period-start' },
      };
    }

    /* ---- アクション実行 ---- */
    case 'EXECUTE_ACTION': {
      if (!gs) return state;
      const target = action.company ?? gs.companies[0];
      const newGs  = executeAction(gs, action.actionId, action.params, target);
      // プレイヤーのアクションのみマスコット反応
      let newUi = ui;
      if (!action.company || action.company.id === gs.companies[0].id) {
        const charId = gs.companies[0]?.characterId ?? 'mecha';
        if (action.actionId === 'buyMat') {
          newUi = { ...newUi, mascot: buildMascotReaction('purchaseSuccess', charId, ui.mascot) };
        } else if (action.actionId === 'produce') {
          newUi = { ...newUi, mascot: buildMascotReaction('productionStart', charId, ui.mascot) };
        } else if (action.actionId === 'rd') {
          newUi = { ...newUi, mascot: buildMascotReaction('researchStart', charId, ui.mascot) };
        }
      }
      if (newGs.currentAuction) {
        return { ...state, gs: newGs, ui: { ...newUi, phase: 'auction' } };
      }
      return { ...state, ...advanceTurn(state, newGs, newUi) };
    }

    /* ---- AI ターン全処理 ---- */
    case 'AI_TAKE_TURN': {
      if (!gs) return state;
      let newGs = { ...gs };

      // rdEffect をキャラ戦略に合わせて先行反映するため、choiceを一度計算
      const companySnapshot = newGs.companies.find(c => c.id === action.company.id)!;
      const choice = aiChooseAction(newGs, companySnapshot);

      // rdEffect が変わる場合は会社を更新してから executeAction に渡す
      let target = { ...companySnapshot };
      if (choice.rdEffect && choice.rdEffect !== target.rdEffect) {
        target = { ...target, rdEffect: choice.rdEffect };
        newGs = { ...newGs, companies: newGs.companies.map(c => c.id === target.id ? target : c) };
      }

      // カードを引く
      const { card, deck: newMainDeck } = drawFromMainDeck(newGs.mainDeck);
      newGs = { ...newGs, mainDeck: newMainDeck };

      // リスクカード処理
      if (card.type === 'risk-trigger') {
        // 第1期ラウンド1〜5は免除
        if (newGs.currentPeriod === 1 && newGs.round <= 5) {
          newGs = addLog(newGs, `🛡️ ${target.name} — リスクカード免除期間 (第1期R${newGs.round})`, '');
        } else {
          const { card: riskCard, deck: newRiskDeck } = drawFromRiskDeck(newGs.riskDeck);
          newGs = { ...newGs, riskDeck: newRiskDeck };
          // 保険チップ確認
          if (riskCard.type === 'negative' && target.insChips > 0) {
            const insured = { ...target, insChips: Math.max(0, target.insChips - 1) };
            newGs = updateCompany(newGs, insured);
            target = insured;
            newGs = addLog(newGs, `🛡️ ${target.name} — 保険発動！「${riskCard.name}」を無効化`, 'log-good');
          } else {
            // risk カードを APPLY_RISK_CARD と同じロジックで適用
            // (AI は UI 遷移なしで即適用)
            const riskResult = applyRiskLogic(newGs, target, riskCard);
            newGs = riskResult;
          }
        }
        return advanceTurn(state, newGs, ui);
      }

      // アクション実行
      newGs = executeAction(newGs, choice.actionId, choice.params, target);

      // sell → auction 遷移
      if (newGs.currentAuction) {
        return { ...state, gs: newGs, ui: { ...ui, phase: 'auction' } };
      }

      return advanceTurn(state, newGs, ui);
    }

    /* ---- ターン進行 ---- */
    case 'ADVANCE_TURN': {
      if (!gs) return state;
      return { ...state, ...advanceTurn(state, gs, { ...ui, drawnRiskCard: null }) };
    }

    /* ---- フェーズ切り替え ---- */
    case 'SET_PHASE':
      return { ...state, ui: { ...ui, phase: action.phase } };

    /* ---- ログ追加 ---- */
    case 'ADD_LOG': {
      if (!gs) return state;
      return { ...state, gs: addLog(gs, action.text, action.cls) };
    }

    /* ---- MX取引記録 ---- */
    case 'RECORD_TXN': {
      if (!gs) return state;
      return { ...state, gs: recordTxn(gs, action.dr, action.cr, action.amount, action.desc) };
    }

    /* ---- マスコットイベント発火 ---- */
    case 'TRIGGER_MASCOT_EVENT': {
      const charId = gs?.companies[0]?.characterId ?? 'mecha';
      const mascot = buildMascotReaction(action.event, charId, ui.mascot);
      return { ...state, ui: { ...ui, mascot } };
    }

    /* ---- ゲームリセット (ホスト切断時など) ---- */
    case 'RESET_GAME':
      return initialState;

    default:
      return state;
  }
}

/* === Context === */
interface GameContextValue {
  gs: GameState | null;
  ui: UiState;
  dispatch: (action: GameAction) => void;
  triggerMascotEvent: (event: MascotEvent) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const triggerMascotEvent = useCallback(
    (event: MascotEvent) => dispatch({ type: 'TRIGGER_MASCOT_EVENT', event }),
    [],
  );

  return (
    <GameContext.Provider value={{ gs: state.gs, ui: state.ui, dispatch, triggerMascotEvent }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

export { type MascotEvent };

/* === 便利セレクタ === */
export function usePlayer() {
  const { gs } = useGame();
  return gs?.companies[0] ?? null;
}

export function useCurrentCompany() {
  const { gs } = useGame();
  if (!gs) return null;
  return gs.companies[gs.playerIdx] ?? null;
}

export function useCityVols() {
  const { gs } = useGame();
  if (!gs) return {} as Record<CityId, number>;
  return gs.cityVols;
}
