import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Button';
import { ACTION_DEFS, CITIES, FLYER_ADV, RD_ADV } from '../../lib/constants';
import { useGame, usePlayer } from '../../lib/gameContext';
import { getActionAvailability } from '../../lib/actions';
import { prodCap, effectiveMatCost, rdNextCost } from '../../lib/gameState';
import type { ActionId, CityId } from '../../lib/types';

type View = 'menu' | 'params';

interface Props {
  onClose: () => void;
  onActionDone: () => void;
}

export function ActionModal({ onClose, onActionDone }: Props) {
  const { gs, dispatch } = useGame();
  const player = usePlayer();
  const [view, setView]       = useState<View>('menu');
  const [selected, setSelected] = useState<ActionId | null>(null);

  if (!gs || !player) return null;

  const avail = getActionAvailability(gs, player);

  function handleSelectAction(id: ActionId) {
    if (id === 'produce' || id === 'nothing') {
      // these need no params — execute immediately
      dispatch({ type: 'EXECUTE_ACTION', actionId: id, params: {} });
      onActionDone();
      return;
    }
    setSelected(id);
    setView('params');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="bg-mg-surface w-full max-w-[760px] flex flex-col border-4 border-mg-border shadow-[12px_12px_0px_#000] relative z-10 overflow-hidden"
        style={{ maxHeight: '90vh' }}
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
      >
        {/* Header */}
        <div className="h-14 bg-mg-elevated border-b-2 border-mg-border flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {view === 'params' && (
              <button
                onClick={() => setView('menu')}
                className="text-mg-text-secondary hover:text-white font-dot text-sm border border-mg-border px-2 py-0.5"
              >
                ← 戻る
              </button>
            )}
            <span className="font-dot text-lg">
              {view === 'menu' ? 'アクション選択' : ACTION_DEFS.find(a => a.id === selected)?.label}
            </span>
          </div>
          <div className="flex gap-4 font-mono text-sm text-mg-text-secondary">
            <span>在庫 <b className="text-white">{player.productInventory}</b>個</span>
            <span>材料 <b className="text-white">{player.materialInventory}</b>個</span>
            <span>現金 <b className="text-mg-gold">{player.cash}</b>万</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {view === 'menu' ? (
              <motion.div
                key="menu"
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.15 }}
              >
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {ACTION_DEFS.map(a => {
                    const av = avail[a.id];
                    return (
                      <button
                        key={a.id}
                        disabled={av.disabled}
                        onClick={() => handleSelectAction(a.id)}
                        className={`p-3 border-2 text-left transition-all ${
                          av.disabled
                            ? 'border-mg-border bg-mg-base opacity-40 cursor-not-allowed'
                            : 'border-mg-border bg-mg-elevated hover:border-mg-cyan hover:bg-mg-cyan/10 cursor-pointer'
                        }`}
                      >
                        <div className="text-2xl mb-1">{a.icon}</div>
                        <div className="font-dot text-xs text-white">{a.label}</div>
                        <div className="text-xs text-mg-text-secondary mt-0.5 leading-tight">{av.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="params"
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.15 }}
              >
                <ParamView
                  actionId={selected!}
                  gs={gs}
                  player={player}
                  onConfirm={(params) => {
                    dispatch({ type: 'EXECUTE_ACTION', actionId: selected!, params });
                    onActionDone();
                  }}
                  onCancel={() => setView('menu')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

/* ======================================================
   ParamView — action-specific parameter input UI
   ====================================================== */
import type { GameState, Company, ActionParams } from '../../lib/types';

function ParamView({
  actionId, gs, player, onConfirm, onCancel,
}: {
  actionId: ActionId;
  gs: GameState;
  player: Company;
  onConfirm: (params: ActionParams) => void;
  onCancel: () => void;
}) {
  switch (actionId) {
    case 'buyMat':   return <BuyMatView    player={player} onConfirm={onConfirm} onCancel={onCancel} />;
    case 'sell':     return <SellView      gs={gs} player={player} onConfirm={onConfirm} onCancel={onCancel} />;
    case 'hire':     return <HireView      player={player} onConfirm={onConfirm} onCancel={onCancel} />;
    case 'reassign': return <ReassignView  player={player} onConfirm={onConfirm} onCancel={onCancel} />;
    case 'equip':    return <EquipView     player={player} onConfirm={onConfirm} onCancel={onCancel} />;
    case 'ad':       return <ChipView      player={player} chipType="ad"  onConfirm={onConfirm} onCancel={onCancel} />;
    case 'rd':       return <RdView        player={player} onConfirm={onConfirm} onCancel={onCancel} />;
    case 'edu':      return <ChipView      player={player} chipType="edu" onConfirm={onConfirm} onCancel={onCancel} />;
    case 'ins':      return <ChipView      player={player} chipType="ins" onConfirm={onConfirm} onCancel={onCancel} />;
    default:         return null;
  }
}

/* ---- 材料購入 ---- */
function BuyMatView({ player, onConfirm, onCancel }: { player: Company; onConfirm: (p: ActionParams) => void; onCancel: () => void }) {
  const matCost = effectiveMatCost(player);
  const maxQty  = Math.floor(player.cash / matCost);
  const [qty, setQty] = useState(Math.min(3, maxQty));
  return (
    <FormShell label="材料購入" onConfirm={() => onConfirm({ qty })} onCancel={onCancel}
      disabled={qty <= 0} cost={qty * matCost}>
      {player.effects.matDiscount && <InfoBadge>🎁 材料低価格仕入が有効 (単価 {matCost}万円)</InfoBadge>}
      <NumRow label={`数量 (最大 ${maxQty}個)`} value={qty} min={1} max={maxQty} onChange={setQty} />
    </FormShell>
  );
}

/* ---- 販売 ---- */
function SellView({ gs, player, onConfirm, onCancel }: { gs: GameState; player: Company; onConfirm: (p: ActionParams) => void; onCancel: () => void }) {
  const defaultCity = CITIES.find(c => gs.cityVols[c.id] > 0) ?? CITIES[0];
  const [cityId, setCityId]   = useState<CityId>(defaultCity.id);
  const city = CITIES.find(c => c.id === cityId)!;
  const maxQty = Math.min(player.productInventory, gs.cityVols[cityId]);
  const [qty, setQty]     = useState(Math.min(player.productInventory, gs.cityVols[cityId]));
  const [price, setPrice] = useState(city.priceStd);
  const [flyerUsed, setFlyerUsed] = useState(0);

  const salesCount = player.staffRoles.sales.employees + player.staffRoles.sales.parts;
  const maxFlyer   = Math.min(player.flyerChips, salesCount * 2);
  const rdAdv      = player.rdEffect === 'price' ? player.rdChips * RD_ADV : 0;
  const effPrice   = Math.max(1, price - flyerUsed * FLYER_ADV - rdAdv);

  function handleCityChange(id: CityId) {
    setCityId(id);
    const c = CITIES.find(x => x.id === id)!;
    setPrice(c.priceStd);
    setQty(Math.min(player.productInventory, gs.cityVols[id]));
  }

  return (
    <FormShell label="商品販売"
      onConfirm={() => onConfirm({ cityId, qty, price, flyerUsed })}
      onCancel={onCancel}
      disabled={qty <= 0 || gs.cityVols[cityId] <= 0}
      cost={0}
      revenue={qty * price}
    >
      {player.effects.exclusive && <InfoBadge>⭐ 独占販売権が有効！競合なし</InfoBadge>}

      {/* 都市選択 */}
      <label className="text-xs text-mg-text-secondary font-noto block mb-2">都市を選択</label>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {CITIES.map(c => {
          const rem = gs.cityVols[c.id];
          return (
            <button
              key={c.id}
              disabled={rem === 0}
              onClick={() => handleCityChange(c.id)}
              className={`border-2 p-2 text-left transition-all ${
                rem === 0 ? 'opacity-40 cursor-not-allowed border-mg-border' :
                cityId === c.id ? 'border-mg-gold bg-mg-gold/10' :
                'border-mg-border bg-mg-base hover:border-mg-text-secondary cursor-pointer'
              }`}
            >
              <div className="font-dot text-xs">{c.name}</div>
              <div className="text-xs text-mg-text-secondary">{c.priceMin}〜{c.priceMax}万</div>
              <div className={`text-xs font-bold mt-0.5 ${rem === 0 ? 'text-mg-danger' : rem <= 2 ? 'text-yellow-400' : 'text-mg-cyan'}`}>残{rem}個</div>
            </button>
          );
        })}
      </div>

      <NumRow label={`数量 (最大 ${maxQty}個)`} value={qty} min={1} max={maxQty} onChange={setQty} />
      <NumRow label={`価格 (${city.priceMin}〜${city.priceMax}万円)`} value={price} min={city.priceMin} max={city.priceMax} onChange={setPrice} />

      {maxFlyer > 0 && (
        <div className="mt-3">
          <label className="text-xs text-mg-text-secondary font-noto block mb-1">チラシチップ使用 (計{player.flyerChips}枚 / 最大{maxFlyer}枚)</label>
          <div className="flex gap-2">
            {[0, ...Array.from({ length: maxFlyer }, (_, i) => i + 1)].map(n => (
              <button key={n}
                onClick={() => setFlyerUsed(n)}
                className={`px-3 py-1.5 border-2 font-dot text-sm transition-all ${flyerUsed === n ? 'border-mg-gold bg-mg-gold/20 text-mg-gold' : 'border-mg-border hover:border-mg-text-secondary'}`}
              >{n}枚</button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 bg-mg-base border border-mg-border p-2 text-xs font-mono">
        実効価格: <span className="text-mg-gold font-bold">{effPrice}万円</span>
        {rdAdv > 0 && <span className="text-mg-cyan ml-2">R&D優位 △{rdAdv}万</span>}
        {flyerUsed > 0 && <span className="text-orange-400 ml-2">チラシ △{flyerUsed * FLYER_ADV}万</span>}
      </div>
    </FormShell>
  );
}

/* ---- 採用 ---- */
function HireView({ player, onConfirm, onCancel }: { player: Company; onConfirm: (p: ActionParams) => void; onCancel: () => void }) {
  const [hireType, setHireType] = useState<'employee' | 'part'>('employee');
  const [role, setRole]         = useState<'manufacturing' | 'sales' | 'stocking'>('manufacturing');
  const [count, setCount]       = useState(1);
  const isEmp  = hireType === 'employee';
  const maxAdd = isEmp ? 9 - player.employees : 6 - player.partTimers; // MAX_EMPLOYEES / MAX_PARTS

  return (
    <FormShell label="採用" onConfirm={() => onConfirm({ hireType, role, count })} onCancel={onCancel}
      disabled={maxAdd <= 0} cost={0}
      hint={`${isEmp ? '社員' : 'パート'} ${count}名採用 / 固定費 +${count * (isEmp ? 30 : 10)}万円/期`}
    >
      <ToggleRow label="種別" options={[
        { value: 'employee', label: `社員 (${player.employees}/9名)` },
        { value: 'part',     label: `パート (${player.partTimers}/6名)` },
      ]} value={hireType} onChange={v => { setHireType(v as any); setCount(1); }} />
      <ToggleRow label="配置" options={[
        { value: 'manufacturing', label: '製造' },
        { value: 'sales',         label: '販売' },
        { value: 'stocking',      label: '品出し' },
      ]} value={role} onChange={v => setRole(v as any)} />
      <NumRow label={`人数 (最大 ${Math.min(maxAdd, 3)}名)`} value={count} min={1} max={Math.min(maxAdd, 3)} onChange={setCount} />
    </FormShell>
  );
}

/* ---- 配置換 ---- */
function ReassignView({ player, onConfirm, onCancel }: { player: Company; onConfirm: (p: ActionParams) => void; onCancel: () => void }) {
  const [personType, setPersonType] = useState<'employee' | 'part'>('employee');
  const [fromRole, setFromRole]     = useState<'manufacturing' | 'sales' | 'stocking'>('manufacturing');
  const [toRole, setToRole]         = useState<'manufacturing' | 'sales' | 'stocking'>('sales');
  const valid = fromRole !== toRole;
  return (
    <FormShell label="配置換" onConfirm={() => onConfirm({ personType, fromRole, toRole })} onCancel={onCancel}
      disabled={!valid || player.cash < 5} cost={5}>
      <ToggleRow label="種別" options={[
        { value: 'employee', label: '社員' },
        { value: 'part',     label: 'パート' },
      ]} value={personType} onChange={v => setPersonType(v as any)} />
      <ToggleRow label="移動元" options={[
        { value: 'manufacturing', label: `製造 (${player.staffRoles.manufacturing[personType === 'employee' ? 'employees' : 'parts']}名)` },
        { value: 'sales',         label: `販売 (${player.staffRoles.sales[personType === 'employee' ? 'employees' : 'parts']}名)` },
        { value: 'stocking',      label: `品出し (${player.staffRoles.stocking[personType === 'employee' ? 'employees' : 'parts']}名)` },
      ]} value={fromRole} onChange={v => setFromRole(v as any)} />
      <ToggleRow label="移動先" options={[
        { value: 'manufacturing', label: '製造' },
        { value: 'sales',         label: '販売' },
        { value: 'stocking',      label: '品出し' },
      ]} value={toRole} onChange={v => setToRole(v as any)} />
      {!valid && <p className="text-mg-danger text-xs mt-2">移動元と移動先を別々に選択してください</p>}
    </FormShell>
  );
}

/* ---- 設備投資 ---- */
function EquipView({ player, onConfirm, onCancel }: { player: Company; onConfirm: (p: ActionParams) => void; onCancel: () => void }) {
  const [machType, setMachType] = useState<'sm' | 'lg'>('sm');
  const [qty, setQty]           = useState(1);
  const unitCost  = machType === 'sm' ? 50 : 200;
  const unitCap   = machType === 'sm' ? 1  : 4;
  const totalCost = unitCost * qty;
  const maxQty    = Math.floor(player.cash / unitCost);
  return (
    <FormShell label="設備投資" onConfirm={() => onConfirm({ machType, qty })} onCancel={onCancel}
      disabled={player.cash < unitCost} cost={totalCost}
      hint={`生産能力 +${unitCap * qty}`}>
      <ToggleRow label="機械タイプ" options={[
        { value: 'sm', label: `小型 (${50}万円 / 能力+${1})` },
        { value: 'lg', label: `大型 (${200}万円 / 能力+${4})` },
      ]} value={machType} onChange={v => { setMachType(v as any); setQty(1); }} />
      <NumRow label={`台数 (最大 ${Math.max(0, maxQty)}台)`} value={qty} min={1} max={Math.max(1, maxQty)} onChange={setQty} />
    </FormShell>
  );
}

/* ---- R&D ---- */
function RdView({ player, onConfirm, onCancel }: { player: Company; onConfirm: (p: ActionParams) => void; onCancel: () => void }) {
  const [mode, setMode] = useState<'price' | 'cost'>(player.rdEffect);
  const [qty, setQty]   = useState(1);
  // tiered cost preview
  let totalCost = 0;
  for (let i = 0; i < qty; i++) totalCost += (player.rdChips + i) < 3 ? 10 : 40;
  const canAfford = player.cash >= totalCost;
    return (
      <FormShell label="研究開発" onConfirm={() => onConfirm({ qty, rdEffect: mode })} onCancel={onCancel}
        disabled={!canAfford || player.cash < rdNextCost(player)} cost={totalCost}>
      <InfoBadge>
        現在 {player.rdChips}枚 / 次の1枚 {rdNextCost(player)}万円 (3枚目以降40万円)
      </InfoBadge>
      <ToggleRow label="効果モード" options={[
        { value: 'price', label: '価格優位 (販売価格△2万/枚)' },
        { value: 'cost',  label: 'コストダウン (材料費△0.5万/枚)' },
      ]} value={mode} onChange={v => {
        setMode(v as any);
        // rdEffect はここでは即反映しない — EXECUTE_ACTION時にgameStateで処理
        // ただしUIプレビュー用に mode state を持つ
      }} />
      <NumRow label="購入枚数" value={qty} min={1} max={3} onChange={setQty} />
      <div className="text-xs text-mg-text-secondary mt-1">合計費用 <span className="text-mg-gold font-bold">{totalCost}万円</span></div>
    </FormShell>
  );
}

/* ---- チップ汎用 (ad / edu / ins) ---- */
function ChipView({ player, chipType, onConfirm, onCancel }: {
  player: Company; chipType: 'ad' | 'edu' | 'ins'; onConfirm: (p: ActionParams) => void; onCancel: () => void;
}) {
  const [qty, setQty] = useState(1);
  const unitCost = chipType === 'ad' ? 10 : 20;
  const maxQty   = Math.floor(player.cash / unitCost);

  const labels: Record<string, string> = { ad: 'チラシチップ', edu: '教育チップ', ins: '保険チップ' };
  const descs: Record<string, string>  = {
    ad:  '販売時に実効価格を下げる (△2万/枚 / 期末消滅)',
    edu: '製造能力を永続強化 (+1/枚 / 1名あたり最大+3)',
    ins: 'ネガティブリスクカードを1回無効化 (期末消滅)',
  };

  return (
    <FormShell label={labels[chipType]} onConfirm={() => onConfirm({ qty })} onCancel={onCancel}
      disabled={maxQty <= 0} cost={qty * unitCost}>
      <InfoBadge>{descs[chipType]}</InfoBadge>
      <NumRow label={`購入枚数 (最大 ${maxQty}枚)`} value={qty} min={1} max={Math.max(1, maxQty)} onChange={setQty} />
    </FormShell>
  );
}

/* ======================================================
   共通 UI パーツ
   ====================================================== */
function FormShell({ label, children, onConfirm, onCancel, disabled, cost, revenue, hint }: {
  label: string; children: React.ReactNode; onConfirm: () => void; onCancel: () => void;
  disabled?: boolean; cost?: number; revenue?: number; hint?: string;
}) {
  return (
    <div className="space-y-4">
      {children}
      <div className="flex items-center justify-between border-t-2 border-mg-border pt-4 mt-4">
        <div className="flex gap-6 font-mono text-sm text-mg-text-secondary">
          {cost !== undefined && cost > 0 && (
            <span>コスト <span className="text-mg-danger font-bold">-{cost}万円</span></span>
          )}
          {revenue !== undefined && revenue > 0 && (
            <span>売上予想 <span className="text-mg-success font-bold">+{revenue}万円</span></span>
          )}
          {hint && <span className="text-mg-text-secondary">{hint}</span>}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel}>キャンセル</Button>
          <Button variant="primary" onClick={onConfirm} disabled={disabled} className="px-8 shadow-[4px_4px_0px_#000]">
            実行する
          </Button>
        </div>
      </div>
    </div>
  );
}

function NumRow({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3">
      <label className="text-xs text-mg-text-secondary font-noto block mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          className="flex-1 accent-mg-cyan"
        />
        <input type="number" min={min} max={max} value={value}
          onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
          className="w-16 bg-mg-base border-2 border-mg-border text-white font-mono text-center py-1 outline-none focus:border-mg-cyan"
        />
      </div>
    </div>
  );
}

function ToggleRow({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="text-xs text-mg-text-secondary font-noto block mb-1">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {options.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 border-2 font-dot text-sm transition-all ${
              value === o.value
                ? 'border-mg-cyan bg-mg-cyan/20 text-mg-cyan'
                : 'border-mg-border hover:border-mg-text-secondary text-mg-text-secondary'
            }`}
          >{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function InfoBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-mg-base border border-mg-border text-xs text-mg-text-secondary p-2 mb-3">
      {children}
    </div>
  );
}
