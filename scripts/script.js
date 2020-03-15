"use strict";

var GBP = {MODEL: {}, VIEW: {}, DATA: {}};
GBP.DATA.memberArr = [];
GBP.DATA.itemArr = [];
GBP.DATA.musicTime = 101;

// アイテムの全探索は困難なためヒューリスティックなパターンから選択する
// バンド特化*タイプ特化, 盆栽セット等はタイプ特化のレベルが低いときのみ
GBP.MODEL.generateItemsPatterns = function(items) {
  // 各バンド, タイプ, パラメータの偏りを持つ典型的なメンバー一覧
  const patterns = [];
  for (let band = 0; band < 6; ++band) {
    for (let type = 0; type < 4; ++type) {
      for (let para = 0; para < 3; ++para) {
        const modelMember = {
          character: 5 * band,
          type: type,
          parameters: [1000, 1000, 1000],
          paraSum: 4000,
        };
        modelMember.parameters[para] = 2000

        // エリアをキーに持つアイテムのマップ
        const itemMap = new Map();
        const bonusMap = new Map();

        // 典型的なメンバーごとに最適なアイテムセットを計算する
        items.forEach(item => {
          const area = item.area;
          const bonus = GBP.MODEL.calcItemBonus(modelMember, item);
          if (! itemMap.has(area)) {
            itemMap.set(area, item);
            bonusMap.set(area, bonus);
          } else if (bonus > bonusMap.get(area)) {
            itemMap.set(area, item);
            bonusMap.set(area, bonus);
          }
        });
        patterns.push({items: [...itemMap.values()], band: band, type: type});
      }
    }
  }
  return patterns;
};

// メンバーとアイテムからボーナスの加算分を計算する
GBP.MODEL.calcItemBonus = function (member, item) {
  // 条件を満たさなければ終了
  // アイテムのnullの項目は無条件にボーナスが適用される
  if(item.characters !== null &&
    item.characters.indexOf(member.character) == -1){
    return 0;
  }
  if(item.type !== null && item.type != member.type)
    return 0;

  if (item.parameter === null) return member.paraSum * item.paraUpRate;
  else return member.parameters[item.parameter] * item.paraUpRate;
};

// アイテムとイベント情報からメンバーのパラメータボーナスを計算する
GBP.MODEL.calcBonus = function(member, items, eventBonus){
  // アイテムボーナス 
  member.itemBonus = items.reduce((bonus, item) => {
    return bonus + GBP.MODEL.calcItemBonus(member, item);
  }, 0);
  member.itemBonus = Math.round(member.itemBonus);
  
  // イベントボーナスの倍率は固定値
  member.eventBonus = 0;
  let applyCount = 0;
  if(eventBonus.members !== null && eventBonus.members[member.character]){
    member.eventBonus += member.paraSum*0.2;
    ++applyCount;
  }
  if(eventBonus.type !== null && eventBonus.type == member.type){
    member.eventBonus += member.paraSum*0.1;
    ++applyCount;
  }

  // キャラ, タイプ両方一致ボーナス
  if(eventBonus.parameter !== null && applyCount >= 2)
    member.eventBonus += (
      member.parameters[eventBonus.parameter]*0.5 + member.paraSum*0.2
    );

  member.eventBonus = Math.round(member.eventBonus);

  member.paraInclBonus = member.paraSum + member.itemBonus + member.eventBonus;
  return member;
};

// Arrayに対するcombination（Rubyのやつと同じ）
GBP.MODEL.combination = function(array, n, callback){
  let func = arg => callback(arg.map(x => array[x]));
  for(let i = 0; i < n; i++){
    const tmp = func;
    func = arg => {
      for(let j = (i == n - 1 ? 0 :
        arg[n - i - 2] + 1); j < array.length; ++j){
        tmp(arg.concat(j));
      }
    };
  }
  func([]);
}

// ボーナス計算済みのメンバー5人の総合力を計算する
// partyArrはスキルの強さでソート済み
GBP.MODEL.calcTotalPara = function(partyArr){
  // 同キャラがいる場合は無効
  for(let i = 0; i < 4; ++i){
    for(let j = i + 1; j < 5; ++j){
      if(partyArr[i].character == partyArr[j].character)
        return null;
    }
  }

  // バンドまたは属性統一か調べる
  let sameBand = Math.floor(partyArr[0].character / 5);
  let sameType = partyArr[0].type;
  for (let i = 1; i < 5; ++i) {
    let band = Math.floor(partyArr[i].character / 5);
    if (band !== sameBand) sameBand = null;
    if (partyArr[i].type !== sameType) sameType = null;
  }

  let maxMulScoreUp = 0;
  let maxIdx = 0;
  let result =  partyArr.reduce((result, member, idx) => {
    let mulScoreUp = member.mulScoreUp;
    if (sameBand !== null && member.highCondition === 1){
      mulScoreUp = member.mulScoreUpHigh;
    }
    if (sameType !== null && member.highCondition === 2){
      mulScoreUp = member.mulScoreUpHigh;
    }

    // リーダー補正計算のための更新
    if (mulScoreUp > maxMulScoreUp) {
      maxMulScoreUp = mulScoreUp;
      maxIdx = idx;
    }

    return {
      base: result.base + member.paraSum,
      itemBonus: result.itemBonus + member.itemBonus,
      eventBonus: result.eventBonus + member.eventBonus,
      paraInclBonus: result.paraInclBonus + member.paraInclBonus,
      skill: result.skill + mulScoreUp,
    };
  }, {
    base: 0,
    itemBonus: 0,
    eventBonus: 0,
    paraInclBonus: 0,
    skill: 0
  });

  result.skill += maxMulScoreUp;

  result.skill *= result.paraInclBonus/GBP.DATA.musicTime;
  result.skill = Math.round(result.skill);
  result.total = result.paraInclBonus + result.skill;
  result.leader = maxIdx;

  return result
};

// アイテムを固定してメンバーを最適化する
// membersはスキル時間*スキル倍率で降順ソート済み
// itemsは所持アイテムではなく固定された使用アイテム
GBP.MODEL.optimizeMembers = function(members, ip, eventBonus){
  // メンバーにボーナス値を追加する
  members = members.map(
    member => GBP.MODEL.calcBonus(member, ip.items, eventBonus)
  ).sort((a, b) => b.paraInclBonus - a.paraInclBonus);

  let sameBandMembers = members.filter(
    m => (Math.floor(m.character / 5) === ip.band)
  );
  let sameTypeMembers = members.filter( m => (m.type === ip.type));

  const generateMemberFilter = same => {
    const calcScoreUpRate = member => (
      same === member.highCondition ?
        member.mulScoreUpHigh :
        member.mulScoreUp
    );
    const memberFilter = (member, idx, members) => {
      const scoreUpRate = calcScoreUpRate(member);
      const charaSet = new Set();
      for (let i = 0; i < idx; ++i) {
        if (calcScoreUpRate(members[i]) >= scoreUpRate) {
          if (members[i].character === member.character) return false;
          else {
            charaSet.add(members[i].character);
            if (charaSet.size >= 5) return false;
          }
        }
      }
      return true;
    }
    return memberFilter;
  }
  members = members.filter(generateMemberFilter(0));
  sameBandMembers = sameBandMembers.filter(generateMemberFilter(1));
  sameTypeMembers = sameTypeMembers.filter(generateMemberFilter(2));

  let maxResult = {total: 0};
  let maxPartyArr = null;
  [members, sameBandMembers, sameTypeMembers].forEach(arr => {
    if (arr.length <= 5) return;
    GBP.MODEL.combination(arr, 5, partyArr => {
      const result = GBP.MODEL.calcTotalPara(partyArr);
      if(result !== null){
        if(result.total > maxResult.total){
          maxResult = result;
          [partyArr[0], partyArr[result.leader]] = (
            [partyArr[result.leader], partyArr[0]]
          );
          maxPartyArr = partyArr;
        }
      }
    });
  });
  return {parameters: maxResult, partyArr: maxPartyArr}
};

// メンバーとアイテムを最適化する
// ボタンを押して実行
GBP.MODEL.optimizeMembersAndItems =
  function(membersLevels, itemsLevels, eventBonus){

  // 所持メンバーリスト
  let members = GBP.DATA.memberArr.filter(
    (m, i) => membersLevels[i] !== null).map(member => ({

    id: member.id,
    character: member.character,
    type: member.type,
    parameters: member.parameters,
    paraSum: member.parameters.reduce((acc, p) => acc + p, 0),
    scoreUpRate: member.scoreUpRate,
    scoreUpRateHigh: member.scoreUpRateHigh,
    highCondition: member.highCondition,
    scoreUpTime: member.scoreUpTimeArr[membersLevels[member.id]],
    mulScoreUp: member.scoreUpRate *
      member.scoreUpTimeArr[membersLevels[member.id]],
    mulScoreUpHigh: member.scoreUpRateHigh *
      member.scoreUpTimeArr[membersLevels[member.id]],
  }));

  //5キャラ以上所持しているか確認
  let charaCountArr = (new Array(30)).fill(false);
  members.forEach(member => charaCountArr[member.character] = true);
  if(charaCountArr.reduce((s, c) => s + (c ? 1 : 0), 0) < 5){
    return null;
  }

  // 所持アイテムリスト
  let items = GBP.DATA.itemArr.filter(
    (it, i) => itemsLevels[i] !== null).map(item => {

    let obj = {};
    obj.id = item.id;
    obj.area = item.area;
    obj.characters = item.characters;
    obj.type = item.type;
    obj.parameter = item.parameter;
    obj.paraUpRate = item.paraUpRateArr[itemsLevels[item.id]];
    return obj;
  });

  const itemsPatterns = GBP.MODEL.generateItemsPatterns(items);

  let maxResult = null;
  const st = Date.now();
  itemsPatterns.forEach((ip => {
    const result = GBP.MODEL.optimizeMembers(members, ip, eventBonus);
    if(maxResult === null ||
      result.parameters.total > maxResult.parameters.total){
      result.items = ip.items;
      maxResult = result;
    }
  }));
  console.log(`calculation time = ${Date.now() - st}ms`);
  return {
    memberArr: maxResult.partyArr.map(m => m.id),
    itemArr: maxResult.items.map(i => i.id),
    paraArr: [maxResult.parameters.base, maxResult.parameters.itemBonus,
      maxResult.parameters.eventBonus, maxResult.parameters.skill]
  };
}

// URLかlocalStorageから入力を取得する
GBP.MODEL.getMemory = function(){
  let code = null;
  const urlMatch = document.URL.match(/q=[0-9a-z]+/);
  let storage = null;
  if(urlMatch !== null) code = urlMatch[0].slice(2);
  else code = window.localStorage.getItem("gbpAutoParty");

  return code;
};

// 入力状態を文字列に変換する
GBP.MODEL.encode = function(){
  const toBin = (num, digit) => {
    if((typeof num) == "boolean") return num ? "1" : "0";
    let bin = num.toString(2);
    for(let i = bin.length; i < digit; ++i) bin = "0" + bin;
    return bin;
  };
  const boolArrToBin = arr => arr.map(toBin).join("");
  const paddingBinDigit = bin => {
    const rem = bin.length%5;
    if(rem != 0){
      for(let i = rem; i < 5; ++i) bin = "1" + bin;
    }
    return bin;
  };
  const binToCode = binCode => {
    binCode = paddingBinDigit("10" + binCode);
    let code = "";
    for(let i = 0; i < binCode.length; i += 5){
      code += parseInt(binCode.slice(i, i + 5), 2).toString(32);
    }
    return code
  };
  const levelArrToBin = (arr, max) => {
    arr = arr.concat();
    let blockNum = 1;
    if(max == 5) blockNum = 3;
    else if(max == 6) blockNum = 5;
    const digit = Math.ceil(Math.log2(max**blockNum));
    if(arr.length%blockNum != 0){
      for(let i = arr.length%blockNum; i < blockNum; ++i) arr.push("1");
    }
    let binCode = "";
    for(let i = 0; i < arr.length; i += blockNum){
      let num = 0;
      for(let j = 0; j < blockNum; ++j) num += (arr[i + j] - 1)*(max**j);
      let bin = num.toString(2);
      for(let j = bin.length; j < digit; ++j) bin = "0" + bin;
      binCode += bin;
    }
    return binCode;
  };

  const app = GBP.VIEW.app;
  let code = "01";
  let binCode = "";
  binCode += toBin(app.tabOption, 2);
  binCode += boolArrToBin(app.typeRefineArr);
  binCode += boolArrToBin(app.bandRefineArr);
  binCode += boolArrToBin(app.skillRefineArr);
  binCode += boolArrToBin(app.rarityRefineArr);
  binCode += toBin(app.sortOption, 2);
  binCode += toBin(app.eventType, 3);
  binCode += boolArrToBin(app.eventCharacterArr);
  binCode += toBin(app.eventPara, 2);
  code += [
    binToCode(binCode),
    app.memberLevelArr.length.toString(32),
    binToCode(boolArrToBin(app.memberAvailableArr)),
    binToCode(levelArrToBin(app.memberLevelArr, 5)),
    app.itemLevelArr.length.toString(32),
    binToCode(boolArrToBin(app.itemAvailableArr)),
    binToCode(levelArrToBin(app.itemLevelArr, 6))
  ].join("w");
  return code;
};

// 文字列から入力状態を復元する
GBP.MODEL.decode = function(code){
  const toBinCode = str => {
    let binCode = "";
    for(let i = 0; i < str.length; ++i){
      let bin = parseInt(str[i], 32).toString(2);
      for(let j = bin.length; j < 5; ++j) bin = "0" + bin;
      binCode += bin;
    }
    return binCode;
  };
  const readBoolArr = (binCode, p, len) => {
    const arr = [];
    for(let i = 0; i < len; ++i){
      arr.push(binCode[p++] == "1" ? true : false);
    }
    return arr;
  };
  const readLevelArr = (binCode, max) => {
    binCode = binCode.slice(binCode.indexOf("0") + 1);
    let blockNum = 1;
    if(max == 5) blockNum = 3;
    else if(max == 6) blockNum = 5;
    const digit = Math.ceil(Math.log2(max**blockNum));
    const arr = [];
    for(let i = 0; i < binCode.length; i += digit){
      let num = parseInt(binCode.slice(i, i + digit), 2);
      for(let j = 0; j < blockNum; ++j){
        arr.push((num%max + 1).toString(10));
        num = Math.floor(num/max);
      }
    }
    return arr;
  };
  const map = new Map();
  const version = parseInt(code.slice(0, 2), 32);
  let binCodeArr = code.slice(2).split("w").map(toBinCode);
  let p = binCodeArr[0].indexOf("0") + 1;
  map.set("tabOption", parseInt(binCodeArr[0].slice(p, p + 2), 2));
  p += 2;
  map.set("typeRefineArr", readBoolArr(binCodeArr[0], p, 4));
  p += 4;
  if (version === 0) {
    map.set("bandRefineArr", readBoolArr(binCodeArr[0], p, 5));
    p += 5;
  } else {
    map.set("bandRefineArr", readBoolArr(binCodeArr[0], p, 6));
    p += 6;
  }
  map.set("skillRefineArr", readBoolArr(binCodeArr[0], p, 3));
  p += 3;
  map.set("rarityRefineArr", readBoolArr(binCodeArr[0], p, 4));
  p += 4;
  map.set("sortOption", parseInt(binCodeArr[0].slice(p, p + 2), 2));
  p += 2;
  map.set("eventType", parseInt(binCodeArr[0].slice(p, p + 3), 2));
  p += 3;
  if (version === 0) {
    map.set("eventCharacterArr", readBoolArr(binCodeArr[0], p, 25));
    p += 25;
  } else {
    map.set("eventCharacterArr", readBoolArr(binCodeArr[0], p, 30));
    p += 30;
  }
  map.set("eventPara", parseInt(binCodeArr[0].slice(p, p + 2), 2));

  const memberLength = parseInt(binCodeArr[1], 2);
  map.set("memberAvailableArr",
    readBoolArr(binCodeArr[2], binCodeArr[2].indexOf("0") + 1, memberLength));
  map.set("memberLevelArr",
    readLevelArr(binCodeArr[3], 5).slice(0, memberLength));
  const itemLength = parseInt(binCodeArr[4], 2);
  map.set("itemAvailableArr",
    readBoolArr(binCodeArr[5], binCodeArr[5].indexOf("0") + 1, itemLength));
  map.set("itemLevelArr",
    readLevelArr(binCodeArr[6], 6).slice(0, itemLength));
  return map;
};

GBP.MODEL.readOldStorage = function(){
  const prefix = "girlsBandParty_autoParty_";
  const map = new Map();
  map.set("memberAvailableArr",
    JSON.parse(window.localStorage.getItem(prefix + "cards")));
  map.set("memberLevelArr", JSON.parse(window.localStorage
    .getItem(prefix + "skills")).map(n => n.toString(10)));
  map.set("itemAvailableArr", JSON.parse(window.localStorage
    .getItem(prefix + "items")).map(item => item.value > 0));
  map.set("itemLevelArr", JSON.parse(window.localStorage
    .getItem(prefix + "items")).map((item, idx) => {
      if(item.value == 0) return "1";
      return (GBP.DATA.itemArr[idx]
        .paraUpRateArr.indexOf(item.value/100) + 1).toString(10);
    })
  );
  return map;
};

// エンコードしたコードを使って結果を更新する
GBP.MODEL.updateResultFromCode = function (code) {
  const data = GBP.MODEL.decode(code);
  for(let [key, value] of data){
    if (typeof value == "number") GBP.VIEW.app[key] = value;
    else value.forEach((v, idx) => GBP.VIEW.app[key][idx] = v);
  }
  if(data.get("tabOption") == 3){
    const memberLevelArr = data.get("memberAvailableArr").map(
      (avail, idx) => (avail ? data.get("memberLevelArr")[idx] - 1 : null));
    const itemLevelArr = data.get("itemAvailableArr").map(
      (avail, idx) => (avail ? data.get("itemLevelArr")[idx] - 1 : null));
    let eventBonus = {};
    eventBonus.type = data.get("eventType");
    if(eventBonus.type >= 4)
      eventBonus.type = null;
    eventBonus.members = data.get("eventCharacterArr");
    eventBonus.parameter = data.get("eventPara");
    if(eventBonus.parameter >= 3)
      eventBonus.parameter = null;
    const result = GBP.MODEL.optimizeMembersAndItems(
      memberLevelArr, itemLevelArr, eventBonus);
    if(result !== null){
      GBP.VIEW.app.resultMemberArr =
        result.memberArr.map(id => GBP.DATA.memberArr[id]);
      GBP.VIEW.app.resultItemArr =
        result.itemArr.map(id => GBP.DATA.itemArr[id]);
      GBP.VIEW.app.resultParaArr = result.paraArr;
    }else{
      GBP.VIEW.app.resultMemberArr = null;
    }
  }
};

GBP.VIEW.init = function(){
  let para = {data: {}, methods: {}, computed: {}};
  para.el = "#app-article";

  // 定数データ
  para.data.baseColor = "MediumSeaGreen";
  para.data.baseLightColor = "#ceecdc";
  para.data.tabNameArr = ["メンバー", "アイテム", "イベント", "結果"];
  para.data.typeNameArr = ["パワフル", "クール", "ピュア", "ハッピー"];
  para.data.typeColorArr = ["#ff345a", "#4057e3", "#44c527", "#ff8400"];
  para.data.typeLightColorArr = ["#ffccd6", "#cfd5f8", "#d0f1c9", "#ffe0bf"];
  para.data.bandNameArr =
    ["ポピパ", "Afterglow", "パスパレ", "Roselia", "ハロハピ", "Morfonica"];
  para.data.bandColorArr = 
    ["#f96947", "#0a0a10", "#ff2699", "#6870ec", "#ffde5d", "#32a9fe"];
  para.data.bandLightColorArr =
    ["#fedad1", "#c2c2c3", "#ffc9e6", "#d9dbfa", "#fff7d7", "#cceaff"];
  para.data.skillNameArr = 
    ["条件付きスコアアップ", "スコアアップ", "その他"];
  para.data.rarityNameArr = ["★", "★★", "★★★", "★★★★"];
  para.data.sortNameArr = ["キャラクター", "総合力", "最近の追加"];
  para.data.characterNameArr = [
    "戸山香澄", "花園たえ", "牛込りみ", "山吹沙綾", "市ヶ谷有咲",
    "美竹蘭", "青葉モカ", "上原ひまり", "宇田川巴", "羽沢つぐみ",
    "丸山彩", "氷川日菜", "白鷺千聖", "大和麻弥", "若宮イヴ",
    "湊友希那", "氷川紗夜", "今井リサ", "宇田川あこ", "白金燐子",
    "弦巻こころ", "瀬田薫", "北沢はぐみ", "松原花音", "奥沢美咲",
    "倉田ましろ", "桐ケ谷透子", "広町七深", "二葉つくし", "八潮瑠唯",
  ];
  para.data.paraNameArr = ["パフォーマンス", "テクニック", "ビジュアル"];
  para.data.paraShortNameArr = ["パフォ", "テク", "ビジュ"];
  para.data.paraColorArr = ["#ff0053", "#00a3ff", "#ffa300"];
  para.data.paraLightColorArr = ["#ffbcd4", "#bce8ff", "#ffe8bc"];
  para.data.powerDetailNameArr = ["バンドパラメータ",
    "エリアアイテムボーナス", "編成ボーナス", "スキル期待値", "合計"];
  para.data.powerDetailColorArr = ["#fe8903", "#1993fb", "#fb93d3"];

  // 変数データ
  para.data.onload = false; //メンバーとアイテム一覧を読み込み終わったか
  para.data.tabOption = 0;
  para.data.typeRefineArr = [true, true, true, true];
  para.data.bandRefineArr = [true, true, true, true, true, true];
  para.data.skillRefineArr = [true, true, true];
  para.data.rarityRefineArr = [true, true, true, true];
  para.data.sortOption = 0;
  para.data.memberAvailableArr = []; //値の範囲は1-5
  para.data.memberLevelArr = [];
  para.data.itemAvailableArr = []; //値の範囲は1-5
  para.data.itemLevelArr = [];
  para.data.eventType = 4; //4は「なし」
  para.data.eventCharacterArr = para.data.characterNameArr.map(c => false);
  para.data.eventPara = 3; //3は「なし」
  para.data.resultMemberArr = null;
  para.data.resultItemArr = null;
  para.data.resultParaArr = null;

  para.methods.saveInput = function(){
    const currentTab = this.tabOption;
    this.tabOption = 0;
    window.localStorage.setItem("gbpAutoParty", GBP.MODEL.encode());
    this.tabOption = currentTab;
  };
  para.methods.buttonLabelStyle = function(pressed, mode, i){
    let color = null;
    let lightColor = null;
    if(mode == "type"){
      color = this.typeColorArr[i];
      lightColor = this.typeLightColorArr[i];
    }else if(mode == "band"){
      color = this.bandColorArr[i];
      lightColor = this.bandLightColorArr[i];
    }else if(mode == "para"){
      color = this.paraColorArr[i];
      lightColor = this.paraLightColorArr[i];
    }else{
      color = this.baseColor;
      lightColor = this.baseLightColor;
    }
    return {
      backgroundColor: lightColor,
      borderColor: pressed ? color : lightColor
    }
  };
  para.methods.filterdMemberArr = function(){
    return GBP.DATA.memberArr.filter(member => {
      // スキルの区分の計算
      const baseRate = [0.1, 0.3, 0.6, 1][member.rarity];
      let skill = 1;
      if(member.scoreUpRate > baseRate)
        skill = 0;
      else if(member.scoreUpRate < baseRate)
        skill = 2;

      // 絞り込み
      if(!this.typeRefineArr[member.type] ||
        !this.bandRefineArr[Math.floor(member.character/5)] ||
        !this.skillRefineArr[skill] || !this.rarityRefineArr[member.rarity])
        return false;

      return true;
    });
  };
  para.methods.memberAllCtrl = function(arg){
    const memberIdArr = this.filterdMemberArr().map(m => m.id);
    memberIdArr.forEach(id => {
      if(arg === true) Vue.set(this.memberAvailableArr, id, true);
      else if(arg === false) Vue.set(this.memberAvailableArr, id, false);
      else if(arg === 1){
        const level = this.memberLevelArr[id];
        if(level == "5") return;
        else Vue.set(
          this.memberLevelArr, id, (parseInt(level, 10) + 1).toString(10));
      }else if(arg === -1){
        const level = this.memberLevelArr[id];
        if(level == "1") return;
        else Vue.set(this.memberLevelArr, id, (level - 1).toString(10));
      }
    });
  };
  para.methods.skillExplain = function(member){
    const level = this.memberLevelArr[member.id] - 1;
    const time = member.scoreUpTimeArr[level];
    const rate = Math.round(member.scoreUpRate*100);
    return `${time}${Number.isInteger(time) ? '.0' : ''}秒間${rate}%UP`;
  };
  para.methods.skillCondition = function(member){
    const condition = member.highCondition;
    if (condition === 0) return "　";
    const rate = Math.round(member.scoreUpRateHigh*100);
    if (condition === 1) {
      return `同バンドで${rate}%UP`;
    } else if (condition === 2) {
      return `同タイプで${rate}%UP`;
    }
    return "　";
  };
  para.methods.itemAllCtrl = function(arg){
    for(let id = 0; id < GBP.DATA.itemArr.length; ++id){
      if(arg === true) Vue.set(this.itemAvailableArr, id, true);
      else if(arg === false) Vue.set(this.itemAvailableArr, id, false);
      else if(arg === 1){
        const level = this.itemLevelArr[id];
        const maxLevel =
          GBP.DATA.itemArr[id].paraUpRateArr.length.toString(10);
        if(level == maxLevel) continue;
        else Vue.set(
          this.itemLevelArr, id, (parseInt(level, 10) + 1).toString(10));
      }else if(arg === -1){
        const level = this.itemLevelArr[id];
        if(level == "1") continue;
        else Vue.set(this.itemLevelArr, id, (level - 1).toString(10));
      }
    }
  };
  para.methods.itemStyle = function(item){
    const available = this.itemAvailableArr[item.id];
    if(item.type !== null)
      return this.buttonLabelStyle(available, "type", item.type);
    else if(item.characters !== null)
      return this.buttonLabelStyle(available, "band", item.characters[0]/5);
    else if(item.parameter !== null)
      return this.buttonLabelStyle(available, "para", item.parameter);

    return this.buttonLabelStyle(available);
  };
  para.methods.forceUpdate = function(){
    this.$forceUpdate();
  };
  para.methods.itemExplain = function(item){
    const level = this.itemLevelArr[item.id] - 1;
    let target = "全て";
    if(item.type !== null)
      target = this.typeNameArr[item.type];
    else if(item.characters !== null)
      target = this.bandNameArr[item.characters[0]/5];
    else if(item.parameter !== null)
      target = this.paraShortNameArr[item.parameter];
    let rate = "" + Math.round(item.paraUpRateArr[level]*1000);
    rate = rate.slice(0, -1) + "." + rate.slice(-1);
    if(rate[0] == ".")
      rate = "0" + rate;
    return `${target} ${rate}%UP`;
  };
  para.methods.pressResult = function(){
    this.onload = false;
    const code = GBP.MODEL.encode();
    GBP.MODEL.updateResultFromCode(code);
    this.onload = true;
    window.history.replaceState(null, "", `./?q=${code}`);
  };
  para.methods.powerListStyle = function(idx){
    let color = this.baseColor;
    if(idx < 3) color = this.powerDetailColorArr[idx];
    return {color: color};
  };

  para.computed.displayedMemberArr = function(){
    if(!this.onload)
      return [];

    let memberArr = this.filterdMemberArr();

    // パラメータの合計を返す関数（ソートで使う）
    const paraSum = m => m.parameters.reduce((s, p) => s + p, 0);
    
    // ソート
    if(this.sortOption == 0){
      memberArr.sort((a, b) => {
        const characterDiff = a.character - b.character;
        let paraSumDiff = null;
        let typeDiff = null
        if(characterDiff != 0)
          return characterDiff;
        else if((paraSumDiff = paraSum(b) - paraSum(a)) != 0)
          return paraSumDiff;
        else if((typeDiff = a.type - b.type) != 0)
          return typeDiff;

        return a.id - b.id;
      });
    }else if(this.sortOption == 1) {
      memberArr.sort((a, b) => {
        const paraSumDiff = paraSum(b) - paraSum(a);
        let characterDiff = null;
        let typeDiff = null;
        if(paraSumDiff != 0)
          return paraSumDiff;
        else if((characterDiff = a.character - b.character) != 0)
          return characterDiff;
        else if((typeDiff = a.type - b.type) != 0)
          return typeDiff;

        return a.id - b.id;
      });
    }else{
      memberArr.sort((a, b) => b.id - a.id);
    }

    return memberArr;
  };
  para.computed.splitedItemArr = function(){
    if(!this.onload)
      return [];

    let itemArr = GBP.DATA.itemArr.concat();
    itemArr.sort((a, b) => {
      const areaDiff = a.area - b.area;
      if(areaDiff != 0)
        return areaDiff;
      else
        return a.id - b.id;
    });

    let itemArrArr = [];
    let prevArea = itemArr[0].area;
    let areaItemArr = [itemArr[0]];
    for(let i = 1; i < itemArr.length; ++i){
      if(itemArr[i].area != prevArea){
        itemArrArr.push(areaItemArr);
        areaItemArr = [];
      }
      areaItemArr.push(itemArr[i]);
      prevArea = itemArr[i].area;
    }
    if(areaItemArr.length > 0)
      itemArrArr.push(areaItemArr);

    return itemArrArr;
  }

  this.app = new Vue(para);
}

window.onload = function(){
  GBP.VIEW.init();

  const onloadEvent = () => {
    const code = GBP.MODEL.getMemory();
    if (code !== null) GBP.MODEL.updateResultFromCode(code);
    else if (
      window.localStorage.getItem("girlsBandParty_autoParty_cards") !== null){
      const data = GBP.MODEL.readOldStorage();
      for(let [key, value] of data){ //旧ストレージからの情報は配列のみ反映
        value.forEach((v, idx) => GBP.VIEW.app[key][idx] = v);
      }
    }
    GBP.VIEW.app.onload = true;
  };

  let loadStuckNum = 2;
  // メンバー一覧読み込み
  const xhrMember = new XMLHttpRequest();
  xhrMember.addEventListener("load", () => {
    GBP.DATA.memberArr = JSON.parse(xhrMember.responseText);
    let memberAvailableArr = [];
    let memberLevelArr = [];
    for(let i = 0; i < GBP.DATA.memberArr.length; ++i){
      memberAvailableArr.push(false);
      memberLevelArr.push("1");
    }
    GBP.VIEW.app.memberAvailableArr = memberAvailableArr;
    GBP.VIEW.app.memberLevelArr = memberLevelArr;
    if(--loadStuckNum == 0)
      onloadEvent();
  });
  xhrMember.open("GET", "./data/members.json");
  xhrMember.send();

  // アイテム一覧読み込み
  const xhrItem = new XMLHttpRequest();
  xhrItem.addEventListener("load", () => {
    GBP.DATA.itemArr = JSON.parse(xhrItem.responseText);
    let itemAvailableArr = [];
    let itemLevelArr = [];
    for(let i = 0; i < GBP.DATA.itemArr.length; ++i){
      itemAvailableArr.push(false);
      itemLevelArr.push("1");
    }
    GBP.VIEW.app.itemAvailableArr = itemAvailableArr;
    GBP.VIEW.app.itemLevelArr = itemLevelArr;
    if(--loadStuckNum == 0)
      onloadEvent();
  });
  xhrItem.open("GET", "./data/items.json");
  xhrItem.send();
};
