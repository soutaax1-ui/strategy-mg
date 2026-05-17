import type { MascotId, MascotEvent, MascotExpression, MascotReaction, MascotState, ReactionConfig } from './mascotTypes';

export const reactionMap: Record<MascotEvent, ReactionConfig> = {
  gameStart:         { expression: 'joy',      reaction: 'bigHop',   duration: 1200, showSpeech: true,  priority: 'High'   },
  turnStart:         { expression: 'normal',   reaction: 'nod',      duration: 600,  showSpeech: false, priority: 'Low'    },
  turnEnd:           { expression: 'normal',   reaction: 'nod',      duration: 600,  showSpeech: false, priority: 'Low'    },
  gameClear:         { expression: 'joy',      reaction: 'bigHop',   duration: 1500, showSpeech: true,  priority: 'High'   },
  gameOver:          { expression: 'sadness',  reaction: 'sink',     duration: 1500, showSpeech: true,  priority: 'High'   },
  purchaseSuccess:   { expression: 'joy',      reaction: 'nod',      duration: 600,  showSpeech: true,  priority: 'Low'    },
  overstockWarning:  { expression: 'surprise', reaction: 'shake',    duration: 800,  showSpeech: true,  priority: 'Medium' },
  priceSurge:        { expression: 'joy',      reaction: 'hop',      duration: 800,  showSpeech: true,  priority: 'Medium' },
  productionStart:   { expression: 'normal',   reaction: 'ready',    duration: 600,  showSpeech: false, priority: 'Low'    },
  productionComplete:{ expression: 'joy',      reaction: 'nod',      duration: 600,  showSpeech: true,  priority: 'Low'    },
  bidSuccess:        { expression: 'joy',      reaction: 'bigHop',   duration: 1200, showSpeech: true,  priority: 'High'   },
  bidFail:           { expression: 'sadness',  reaction: 'shake',    duration: 800,  showSpeech: true,  priority: 'Medium' },
  overpay:           { expression: 'anger',    reaction: 'shake',    duration: 800,  showSpeech: true,  priority: 'Medium' },
  discountSell:      { expression: 'anger',    reaction: 'nod',      duration: 600,  showSpeech: true,  priority: 'Low'    },
  researchStart:     { expression: 'normal',   reaction: 'ready',    duration: 600,  showSpeech: false, priority: 'Low'    },
  researchComplete:  { expression: 'joy',      reaction: 'hop',      duration: 800,  showSpeech: true,  priority: 'Medium' },
  accounting:        { expression: 'normal',   reaction: 'nod',      duration: 600,  showSpeech: false, priority: 'Low'    },
  profit:            { expression: 'joy',      reaction: 'bigHop',   duration: 1200, showSpeech: true,  priority: 'High'   },
  loss:              { expression: 'sadness',  reaction: 'sink',     duration: 1200, showSpeech: true,  priority: 'High'   },
  cashCrisis:        { expression: 'anger',    reaction: 'shake',    duration: 1000, showSpeech: true,  priority: 'High'   },
  bankruptcy:        { expression: 'sadness',  reaction: 'sink',     duration: 1500, showSpeech: true,  priority: 'High'   },
  aiThreat:          { expression: 'surprise', reaction: 'leanBack', duration: 800,  showSpeech: true,  priority: 'Medium' },
  playerJoin:        { expression: 'joy',      reaction: 'hop',      duration: 800,  showSpeech: true,  priority: 'Medium' },
  playerLeave:       { expression: 'sadness',  reaction: 'nod',      duration: 600,  showSpeech: true,  priority: 'Low'    },
  otherPlayerBid:    { expression: 'surprise', reaction: 'leanBack', duration: 800,  showSpeech: true,  priority: 'Medium' },
};

type SpeechLines = Record<MascotEvent, [string, string, string]>;

const mechaLines: SpeechLines = {
  gameStart:          ['起動完了。全システム正常稼働中。', '効率最優先で参ります。', '計算完了。作戦を開始します。'],
  turnStart:          ['ターン処理を開始します。', '行動選択モード。', '次の最適解を計算中。'],
  turnEnd:            ['処理完了。', '次のターンへ。', '効率的でした。'],
  gameClear:          ['目標達成！全システム勝利モード！', '計算通りの結果です。', '任務完了。完璧な数値でした。'],
  gameOver:           ['…計算外の事態が発生しました。', 'エラー。再起動が必要です。', '失敗データを記録しました。'],
  purchaseSuccess:    ['材料入荷完了。', '調達成功。在庫を更新。', '購入処理が正常に終了しました。'],
  overstockWarning:   ['警告。在庫過多状態を検出。', 'コスト上昇リスク。在庫を見直してください。', '最適在庫水準を超過しています。'],
  priceSurge:         ['価格優位性を確認。売却を推奨します。', '市場価格上昇を検出。チャンスです。', '高値での販売タイミングです。'],
  productionStart:    ['生産ラインを起動します。', '製造プロセスを開始。', '生産効率を最大化します。'],
  productionComplete: ['製造完了。品質チェック：合格。', '生産処理が完了しました。', '在庫に追加しました。'],
  bidSuccess:         ['販売処理成功！収益を計上します。', '落札。売上データを更新しました。', '最適価格での販売に成功。'],
  bidFail:            ['販売失敗。価格または数量を見直してください。', '競合他社に敗北しました。', '入札データを分析中。'],
  overpay:            ['コスト最適化失敗。割高での購入でした。', '非効率な支出を検出しました。', 'コスト管理を改善してください。'],
  discountSell:       ['利益率低下を検出。値引き販売は推奨しません。', '割引販売を実行。収益減少を記録。', '価格戦略を見直してください。'],
  researchStart:      ['研究開発プログラムを起動します。', 'R&D処理を開始。', 'イノベーションモードに移行。'],
  researchComplete:   ['R&D処理完了。性能が向上しました。', '研究成果を取得しました。', '技術レベルが上昇しました。'],
  accounting:         ['会計処理を実行中。', '帳簿データを更新しています。', '財務分析を開始します。'],
  profit:             ['利益達成！財務目標をクリアしました。', '黒字化に成功しました。', '収益性指標が改善しました。'],
  loss:               ['損失を検出。コスト削減が必要です。', '赤字状態。戦略の見直しを推奨。', '財務リスクが高まっています。'],
  cashCrisis:         ['警告！現金残高が危険水準です。', '資金ショートリスクが高い。借入を検討してください。', '流動性危機を検出しました。'],
  bankruptcy:         ['倒産リスクを検出。', '財務状態が極めて危険です。', '緊急の資金調達が必要です。'],
  aiThreat:           ['競合他社の脅威を検出。対抗戦略を策定中。', 'AI企業の攻勢を確認。警戒が必要です。', '競合分析：強力な相手が存在します。'],
  playerJoin:         ['新規プレイヤーを検出しました。', 'プレイヤーが参加しました。', 'マルチプレイモード：参加者増加。'],
  playerLeave:        ['プレイヤーが退出しました。', '参加者が減少しました。', 'マルチプレイ：プレイヤー退出を記録。'],
  otherPlayerBid:     ['他プレイヤーの入札を検知。競合分析を更新。', 'ライバルが動いています。対応策を検討中。', '市場競争が激化しています。'],
};

const kameLines: SpeechLines = {
  gameStart:          ['ゆっくり確実に参りましょう。', '焦らず、じっくりと。', 'この一局、大切に。'],
  turnStart:          ['さて、何をしようかのう。', '一手ずつ、丁寧に。', '今期の戦略を考えましょう。'],
  turnEnd:            ['よし、これでよかろう。', 'お疲れ様でした。', '次は何をしようかのう。'],
  gameClear:          ['長い道のりじゃったが…やり遂げた！', '勝てたのう！素晴らしい！', '経験が実を結んだのう。'],
  gameOver:           ['うぬぬ…敗北じゃ。', 'まだまだ修行が足りなかったのう。', '次は必ずや雪辱を…'],
  purchaseSuccess:    ['よい買い物をしたのう。', '材料が手に入ったのう。', 'これで生産できるな。'],
  overstockWarning:   ['在庫が多すぎはしないか…？', '倉庫が満杯になってきたのう。', '売り切る力が必要じゃな。'],
  priceSurge:         ['おお、値段が上がっておるのう！', '売り時じゃな！', '商機到来じゃ！'],
  productionStart:    ['さあ、作り始めようかのう。', '丁寧に作るぞ。', '職人魂を込めて。'],
  productionComplete: ['できたできた！', '立派な製品ができたのう。', 'これは売れそうじゃな。'],
  bidSuccess:         ['売れた！売れたのう！', '商売繁盛じゃ！', 'うまく売れたのう！'],
  bidFail:            ['うーむ、売れなかったのう…', '価格設定を見直さねばのう。', '難しいのう、商売は。'],
  overpay:            ['高く買いすぎたかのう…', 'もう少し安く買えたはずじゃ。', '次はしっかり値段を確認しよう。'],
  discountSell:       ['値引きするのは忍びないのう…', '売り切るために仕方ないか。', '次は適正価格で売りたいのう。'],
  researchStart:      ['研究かのう。地道な積み重ねじゃ。', '知恵を磨く時間じゃ。', 'じっくり研究しようかのう。'],
  researchComplete:   ['おお！研究が実を結んだのう！', '素晴らしい成果じゃ！', '努力が報われたのう！'],
  accounting:         ['さて、帳簿をつけようかのう。', '数字を確認する大切な時間じゃ。', '丁寧に確認しよう。'],
  profit:             ['もうかったのう！素晴らしい！', '利益が出たのう！よかった！', 'この調子で続けようかのう！'],
  loss:               ['うーむ、赤字じゃ…', '辛いのう。頑張らねば。', '次期は挽回せねばのう。'],
  cashCrisis:         ['お金が足りなくなってきたのう…', '資金繰りが心配じゃ。', '早めに手を打たねば。'],
  bankruptcy:         ['これは…まずい状況じゃ。', '立て直せるか…頑張ろう。', '窮地に立たされたのう。'],
  aiThreat:           ['強い相手がいるのう…', '油断できないのう。', 'しっかり対策せねばのう。'],
  playerJoin:         ['おお、新しい仲間が来たのう！', 'よく来たのう！一緒に頑張ろうぞ！', '賑やかになるのう！'],
  playerLeave:        ['寂しくなるのう…', 'また遊びに来てくれると良いのじゃが。', '無事に帰れるとよいのう。'],
  otherPlayerBid:     ['おっ、ライバルが動いたのう。', 'なかなかやるのう。', '気を引き締めねばのう。'],
};

const fukuLines: SpeechLines = {
  gameStart:          ['やったー！始まるよ！', 'もうけるもうける！絶対もうける！', '全力でがんばるよ！'],
  turnStart:          ['よーし、今回も張り切るよ！', '何買おうかな！', 'いくよー！'],
  turnEnd:            ['えへへ、うまくいったかな？', '次も頑張るぞ！', 'よし！'],
  gameClear:          ['やったー！大もうけ！！', '最高！最高！最高！', 'わーい！勝ったよ！！'],
  gameOver:           ['えーん…もうけられなかった…', '悔しい！次こそ絶対もうける！', 'がっくし…また頑張ろう。'],
  purchaseSuccess:    ['買えた買えた！', '材料ゲット！', 'いい仕入れができたよ！'],
  overstockWarning:   ['ちょ、在庫多すぎ！', '売らないといかないよ！', '倉庫がパンクしちゃう！'],
  priceSurge:         ['やばい！高く売れるよ！', '今がチャンスだよ！', '売れ売れー！'],
  productionStart:    ['作るぞ！作るぞ！', '工場フル稼働！', 'どんどん作っちゃえ！'],
  productionComplete: ['やったー！完成！', 'いい感じにできたよ！', 'これで在庫が増えた！'],
  bidSuccess:         ['売れた売れた！やったー！', 'もうけたもうけた！', '最高！大成功！'],
  bidFail:            ['え！売れなかった！？', 'くやしい！なんで！？', 'また次頑張るよ！'],
  overpay:            ['高すぎ！損した気分！', 'もっと安く買えたじゃん！', 'うー、くやしい！'],
  discountSell:       ['安売りしちゃった…もったいない！', '値引きは悔しいけど仕方ない！', '次はもっと高く売るよ！'],
  researchStart:      ['研究するぞー！', '新技術ゲットだよ！', '頑張って研究しちゃう！'],
  researchComplete:   ['やったー！研究成功！', 'スゴイスゴイ！', 'チップゲット！'],
  accounting:         ['決算だ決算！緊張するな〜。', '数字と向き合う時間だよ！', 'いくら儲けたかな？'],
  profit:             ['もうけた！もうけた！わーい！', '黒字！黒字！最高！', 'やったー！お金が増えた！'],
  loss:               ['えーん！赤字！赤字！', 'くやしい！次は絶対もうける！', 'がっくし…頑張ろう。'],
  cashCrisis:         ['やばい！お金がない！', 'どうしよう！資金不足！', '助けてー！お金が足りない！'],
  bankruptcy:         ['倒産しちゃう！？やだやだ！', 'どうすればいいの！？', '助けて！'],
  aiThreat:           ['やばい！強いライバルがいる！', '負けないぞ！', 'ライバルに負けたくない！'],
  playerJoin:         ['新しいプレイヤーきたー！', 'いらっしゃい！一緒に遊ぼう！', 'わーい！仲間が増えた！'],
  playerLeave:        ['えー！帰っちゃうの！？', '寂しいな…またね！', '行っちゃった…また来てね！'],
  otherPlayerBid:     ['ライバルが入札してきた！', '負けないぞー！', 'うわー！競争が激しい！'],
};

const rokiLines: SpeechLines = {
  gameStart:          ['真剣に取り組みます。', '精一杯努力します。', 'よろしくお願いします。'],
  turnStart:          ['今期の行動を検討します。', '慎重に選びます。', '最善を尽くします。'],
  turnEnd:            ['今期も真剣にやりました。', '次のターンも頑張ります。', 'よし。'],
  gameClear:          ['やり遂げました！ありがとうございます！', '全力を尽くせました！', '信頼に応えられました！'],
  gameOver:           ['…申し訳ありませんでした。', '力が足りませんでした。', '次回は必ず改善します。'],
  purchaseSuccess:    ['きちんと購入できました。', '材料を確保しました。', '着実に準備を進めます。'],
  overstockWarning:   ['在庫が多くなっています。注意が必要です。', '販売力を高める必要があります。', '在庫管理を見直します。'],
  priceSurge:         ['価格が上がっています。チャンスです。', '今が売り時かもしれません。', 'このタイミングを活かします。'],
  productionStart:    ['生産を開始します。', '真剣に取り組みます。', '一つ一つ丁寧に。'],
  productionComplete: ['製造完了です。', 'しっかり作れました。', '品質を確認しました。'],
  bidSuccess:         ['販売できました！', '努力が報われました！', 'お客様に届けられました！'],
  bidFail:            ['今回は売れませんでした…', '価格設定を改善します。', '反省して次に活かします。'],
  overpay:            ['少し高すぎたかもしれません…', '次回はもっとよく確認します。', 'コスト管理を改善します。'],
  discountSell:       ['値引きはしたくなかったですが…', '在庫を減らすためには必要でした。', '次回は価格設定を見直します。'],
  researchStart:      ['研究開発を始めます。', '真剣に取り組みます。', '着実に進めます。'],
  researchComplete:   ['研究が完了しました！', '成果が出てよかったです！', '努力が実りました！'],
  accounting:         ['決算処理を行います。', '正確に記録します。', '帳簿を確認します。'],
  profit:             ['利益が出ました！よかったです！', '頑張った甲斐がありました！', 'これからも続けます！'],
  loss:               ['赤字になってしまいました…', '申し訳ありません。改善します。', '次期は必ず黒字にします。'],
  cashCrisis:         ['資金が少なくなっています。危機的です。', '早急に対策が必要です。', '借入を検討します。'],
  bankruptcy:         ['大変な状況です…', '必ず立て直します。', '諦めません。'],
  aiThreat:           ['競合他社が強いです。注意が必要です。', '負けないよう頑張ります。', 'しっかり戦略を立てます。'],
  playerJoin:         ['新しいプレイヤーが参加しました！', 'よろしくお願いします！', '一緒に頑張りましょう！'],
  playerLeave:        ['プレイヤーが退出しました。', 'また一緒に遊びましょう。', 'お疲れ様でした。'],
  otherPlayerBid:     ['他のプレイヤーが動いています。', '対応策を考えます。', '油断できません。'],
};

const stLines: SpeechLines = {
  gameStart:          ['この星の経済システム…解析中。', '未知の体験が始まる。', '星間交易の知識を活かす時。'],
  turnStart:          ['行動パターンを選択…', 'この局面の最適解は…', '地球人の経済…興味深い。'],
  turnEnd:            ['行動完了。データを記録。', 'この結果を分析…', '次のサイクルへ。'],
  gameClear:          ['この星の頂点に立った…', '地球経済を制覇した。', '素晴らしいデータが集まった。'],
  gameOver:           ['予測と異なる結果…分析が必要。', 'この星の経済は複雑だ。', 'データを持ち帰る。'],
  purchaseSuccess:    ['物資を確保した。', 'この星の流通システム…理解した。', '在庫が更新された。'],
  overstockWarning:   ['在庫過多…非効率だ。', '保管コストが増加している。', '最適化が必要。'],
  priceSurge:         ['価格上昇を観測…', '売却の好機だ。', '市場の変動を捉えた。'],
  productionStart:    ['製造プロセス開始…', '生産ラインを観察中。', '効率的な製造方法…'],
  productionComplete: ['製造完了。品質を分析…', '生産効率を記録。', '次の工程へ。'],
  bidSuccess:         ['売却成功。収益データを取得。', 'この星の販売システム…理解した。', '取引が成立した。'],
  bidFail:            ['販売失敗…データを分析。', '競合に敗北した。理由を解析。', '次の戦略を考える。'],
  overpay:            ['過剰支出を検出…', '価格比較が不十分だった。', '最適化アルゴリズムを更新。'],
  discountSell:       ['低価格販売…利益が減少した。', 'この市場の価格競争…', '値引きの影響を分析中。'],
  researchStart:      ['研究開発を開始…この星の技術を研究。', '知識の探求が始まる。', '未知の可能性を探る。'],
  researchComplete:   ['研究完了。技術データを取得。', '知識が拡張された。', '素晴らしい成果だ。'],
  accounting:         ['会計データを分析…', '財務パターンを観察中。', '数値が語りかけてくる。'],
  profit:             ['利益を確認した。目標達成。', '収益プラス。効率的だ。', 'この星の商売…面白い。'],
  loss:               ['損失を記録…分析が必要。', '赤字の原因を探る。', '次のサイクルで改善する。'],
  cashCrisis:         ['資金不足を検出…危機的状況。', '流動性リスクが高まっている。', '緊急対策が必要だ。'],
  bankruptcy:         ['深刻な財務危機…', 'この星では倒産という概念がある。', 'サバイバル本能が刺激される。'],
  aiThreat:           ['強力な競合存在を検出…', 'この星のライバルたち…手強い。', '新たな競合データを収集。'],
  playerJoin:         ['新たな知性体を検出した。', 'この星の生命体がまた一人…', '新しい対戦相手が来た。'],
  playerLeave:        ['一つの知性体が去った…', 'この星の生命体は来ては去る。', 'また会えるかもしれない。'],
  otherPlayerBid:     ['他の競合者が動いた…', 'この星の競争…観察中。', '対抗戦略を更新。'],
};

export const speechMap: Record<MascotId, SpeechLines> = {
  mecha: mechaLines,
  kame:  kameLines,
  fuku:  fukuLines,
  roki:  rokiLines,
  st:    stLines,
};

const PRIORITY_LEVEL: Record<'High' | 'Medium' | 'Low', number> = { High: 3, Medium: 2, Low: 1 };

function pickSpeech(charId: MascotId, event: MascotEvent): string {
  const lines = speechMap[charId][event];
  return lines[Math.floor(Math.random() * lines.length)];
}

export function buildMascotReaction(
  event: MascotEvent,
  characterId: MascotId,
  current?: MascotState,
): MascotState {
  const cfg = reactionMap[event];
  const currentPriority = current ? (PRIORITY_LEVEL[
    reactionMap[Object.keys(reactionMap).find(k =>
      reactionMap[k as MascotEvent].reaction === current.reaction &&
      reactionMap[k as MascotEvent].expression === current.expression
    ) as MascotEvent]?.priority ?? 'Low'] ?? 1) : 0;

  const incomingPriority = PRIORITY_LEVEL[cfg.priority];
  const expression: MascotExpression = incomingPriority >= currentPriority ? cfg.expression : (current?.expression ?? 'normal');
  const reaction:   MascotReaction   = incomingPriority >= currentPriority ? cfg.reaction   : (current?.reaction   ?? 'idle');

  const speech = cfg.showSpeech ? pickSpeech(characterId, event) : undefined;

  return { characterId, expression, reaction, speech };
}
