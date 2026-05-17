/* === ゲーム定数 === */
export const MATERIAL_COST     = 10;   // 材料費 (万円/個)
export const EMPLOYEE_COST     = 30;   // 社員固定費 (万円/人/期)
export const PART_COST         = 10;   // パート固定費 (万円/人/期)
export const PART_BASE_CAP     = 1;    // パート1人あたり生産性
export const MAX_EMPLOYEES     = 9;    // 社員雇用上限
export const MAX_PARTS         = 6;    // パート雇用上限
export const REASSIGN_COST     = 5;    // 配置換コスト (万円/人)
export const SM_COST           = 50;   // 小型機械購入費
export const LG_COST           = 200;  // 大型機械購入費
export const SM_DEPR           = 5;    // 小型機械減価償却/期
export const LG_DEPR           = 15;   // 大型機械減価償却/期
export const SM_CAP            = 1;    // 小型機械生産能力
export const LG_CAP            = 4;    // 大型機械生産能力
export const EMP_BASE_CAP      = 2;    // 社員1人あたり基礎生産能力
export const FLYER_COST        = 10;   // チラシチップ単価 (万円/枚)
export const FLYER_ADV         = 2;    // チラシ1枚の実効価格優位 (万円)
export const RD_COST_BASIC     = 10;   // R&D 1〜3枚目の単価
export const RD_COST_ADV       = 40;   // R&D 4枚目以降の単価
export const RD_ADV            = 2;    // R&D価格優位モード: 1枚あたり△2万円
export const RD_MAT_DOWN       = 0.5;  // R&Dコストダウンモード: 1枚あたり材料費△0.5万円
export const EDU_COST          = 20;   // 教育チップ単価
export const EDU_MAX_PER       = 3;    // 社員1人あたり教育ボーナス上限
export const INS_COST          = 20;   // 保険チップ単価
export const ROUNDS_PER_PERIOD = 10;   // 1期あたりのラウンド数
export const STANDARD_PRICE    = 18;   // AI 基準販売価格

export const ROLE_JP: Record<string, string> = {
  manufacturing: '製造',
  sales: '販売',
  stocking: '品出し',
};

/* === マトリックス会計 定数 === */
export const DR = { CASH:0, MAT:1, PROD:2, EQUIP:3, RD:4, AR:5, V:6, F1:7, F2:8, F3:9 } as const;
export const CR = { CAP:0, DEBT:1, PQ:2, CASH:3, MAT:4, PROD:5, EQUIP:6, AP:7, OTHER:8, RE:9 } as const;
export const DR_LABELS = ['現金','材料在庫','製品在庫','設備','R&Dチップ','売掛金','材料費(V)','人件費(F1)','減価償却(F2)','その他費用(F3)'];
export const CR_LABELS = ['資本金','借入金','売上高(PQ)','現金','材料在庫','製品在庫','設備','買掛金','その他収益','利益剰余金'];

/* === 難易度プリセット === */
export const DIFF = {
  easy:   { difficulty: 'easy',   initialCash: 500, rate: 0.05, aiLevel: 'weak',   marketMult: 1.2, riskMult: 1.0 },
  normal: { difficulty: 'normal', initialCash: 300, rate: 0.10, aiLevel: 'medium', marketMult: 1.0, riskMult: 1.0 },
  hard:   { difficulty: 'hard',   initialCash: 200, rate: 0.15, aiLevel: 'strong', marketMult: 0.9, riskMult: 1.2 },
} as const;

/* === 都市定義 === */
export const CITIES = [
  { id: 'tokyo',   name: '東京',   vol: 10, priceMin: 15, priceMax: 25, priceStd: 20 },
  { id: 'osaka',   name: '大阪',   vol:  8, priceMin: 13, priceMax: 22, priceStd: 17 },
  { id: 'nagoya',  name: '名古屋', vol:  6, priceMin: 12, priceMax: 18, priceStd: 15 },
  { id: 'fukuoka', name: '福岡',   vol:  5, priceMin: 10, priceMax: 15, priceStd: 13 },
  { id: 'sapporo', name: '札幌',   vol:  3, priceMin:  8, priceMax: 13, priceStd: 11 },
  { id: 'sendai',  name: '仙台',   vol:  3, priceMin:  7, priceMax: 12, priceStd: 10 },
] as const;

/* === リスクカード定義 === */
export const RISK_DEFS = [
  { id: 'fire',         name: '倉庫火災',       type: 'negative', icon: '🔥', count: 6, desc: '材料在庫がすべて消滅する' },
  { id: 'theft',        name: '盗難',           type: 'negative', icon: '🦹', count: 6, desc: '現金 30万円を失う' },
  { id: 'bankruptcy',   name: '得意先倒産',     type: 'negative', icon: '💥', count: 6, desc: '製品在庫が 3個 消滅する (3期まで免除)' },
  { id: 'returns',      name: '返品',           type: 'negative', icon: '📦', count: 6, desc: '前回販売売上の 20% を返金する (3期まで免除)' },
  { id: 'quit',         name: 'ワーカー退職',   type: 'negative', icon: '🚪', count: 6, desc: '社員が 1名 退職する' },
  { id: 'breakdown',    name: '機械故障',       type: 'negative', icon: '⚙️', count: 6, desc: '小型機械 1台が今期機能停止する' },
  { id: 'special-loss', name: '特別損失',       type: 'negative', icon: '💸', count: 6, desc: '現金 50万円を失う' },
  { id: 'rd-success',   name: '研究開発成功',   type: 'positive', icon: '🔬', count: 5, desc: 'R&Dチップを無料で 2枚 獲得する' },
  { id: 'ad-success',   name: '広告成功',       type: 'positive', icon: '📢', count: 5, desc: '次回販売で広告効果 2倍' },
  { id: 'exclusive',    name: '独占販売権',     type: 'positive', icon: '⭐', count: 5, desc: '次回販売で競合が参加できない' },
  { id: 'cheap-mat',    name: '材料低価格仕入', type: 'positive', icon: '🎁', count: 5, desc: '次回材料購入の単価が 30% 割引' },
  { id: 'nothing',      name: 'セーフ',         type: 'neutral',  icon: '✅', count: 2, desc: '何も起きない。ラッキー！' },
] as const;

/* === アクション定義 === */
export const ACTION_DEFS = [
  { id: 'buyMat',   label: '材料購入',   icon: '📦', desc: '材料を仕入れる' },
  { id: 'produce',  label: '完成・投入', icon: '🔧', desc: '材料を製品に変える' },
  { id: 'sell',     label: '商品販売',   icon: '💰', desc: '製品を市場に出品する' },
  { id: 'hire',     label: '採用',       icon: '👥', desc: '社員 or パートを採用' },
  { id: 'reassign', label: '配置換',     icon: '🔄', desc: '人員の役割を変更 (5万/人)' },
  { id: 'equip',    label: '設備投資',   icon: '⚙️', desc: '機械を購入する' },
  { id: 'ad',       label: 'チラシ',     icon: '🟠', desc: 'チラシチップ購入 (10万/枚)' },
  { id: 'rd',       label: '研究開発',   icon: '🔵', desc: 'R&Dチップ獲得 (段階コスト)' },
  { id: 'edu',      label: '教育',       icon: '🟢', desc: '教育チップ購入 (20万/枚)' },
  { id: 'ins',      label: '保険',       icon: '🟡', desc: '保険チップ購入 (20万/枚)' },
  { id: 'nothing',  label: 'DO NOTHING', icon: '⏩', desc: 'このターンをパスする' },
] as const;
