"use strict";

addEventListener("load", () => {
  const types = ["パワフル", "クール", "ピュア", "ハッピー"];

  const data = {
    tabs: ["メンバー", "アイテム", "イベント", "結果"],
    types: types,
    bands: ["ポピパ", "Afterglow", "パスパレ", "Roselia", "ハロハピ", "モニカ", "RAS"],
    skills: ["条件付きスコアアップ", "スコアアップ", "その他"],
    rarities: ["★", "★★", "★★★", "★★★★"],
    sorts: ["キャラクター", "総合力", "最近の追加"],
    characters: [
      "戸山香澄", "花園たえ", "牛込りみ", "山吹沙綾", "市ヶ谷有咲",
      "美竹蘭", "青葉モカ", "上原ひまり", "宇田川巴", "羽沢つぐみ",
      "丸山彩", "氷川日菜", "白鷺千聖", "大和麻弥", "若宮イヴ",
      "湊友希那", "氷川紗夜", "今井リサ", "宇田川あこ", "白金燐子",
      "弦巻こころ", "瀬田薫", "北沢はぐみ", "松原花音", "奥沢美咲",
      "倉田ましろ", "桐ケ谷透子", "広町七深", "二葉つくし", "八潮瑠唯",
      "レイヤ", "ロック", "マスキング", "パレオ", "チュチュ",
    ],
    eventTypes: [...types, "なし"],
    parameters: ["パフォーマンス", "テクニック", "ビジュアル"],
    areas: [
      "スタジオ(マイク)", "スタジオ(ギター)", "スタジオ(ベース)", 
      "スタジオ(ドラム)", "スタジオ(その他)",
      "ポスター", "カウンター", "ミニテーブル", "マガジンラック",
      "入り口前", "看板", "センタースペース", "中庭", "おすすめメニュー",
    ],
    model: {
      tab: 0,
      filterTypes: (new Array(4)).fill(true),
      filterBands: (new Array(7)).fill(true),
      filterSkills: (new Array(3)).fill(true),
      filterRarities: (new Array(4)).fill(true),
      sort: 0,
    },
    members: [],
    items: [],
    event: {
      //type: 4,
      //characters: (new Array(AutoParty.CHARACTER_NUM)).fill(false),
      //parameter: 3,
      type: Math.floor(5 * Math.random()),
      characters: [...new Array(AutoParty.CHARACTER_NUM)].map(_ => Math.random() < 1 / 7),
      parameter: Math.floor(3 * Math.random()),
    },
    result: [],
  };

  const worker = new Worker("./src/worker.js");
  worker.addEventListener("message", message => {
    if (typeof message.data === "number") {
      data.result += message.data;
    } else {
      console.log(message.data);
      data.result = message.data;
      data.result.members = data.result.members.map(
        member => AutoParty.Member.create(member)
      );
      data.result.items = data.result.items.map(
        item => AutoParty.Item.create(item)
      );
    }
  });
  worker.addEventListener("error", err => {
    alert(err.message);
    data.result = [];
  });

  const methods = {
    onchangeTab: function(e) {
      if (e.target.value !== "3") return;
      this.result = 0;
      worker.postMessage({
        members: this.members.filter(member => member.model.available),
        items: this.items.filter(item => item.model.available),
        event: this.event,
      });
    },
    allMemberAvailable: function(available) {
      this.filterdMembers.forEach(member => member.model.available = available);
    },
    allSkillIncrease: function(value) {
      this.filterdMembers.forEach(member => {
        const max = member.scoreUpTimeArr.length;
        const level = (() => {
          const level = parseInt(member.model.skillLevel, 10) + value;
          if (level < 1) return 1;
          if (level > max) return max;
          return level;
        })();
        member.model.skillLevel = level.toString();
      });
    },
    // 小数点以下の桁数を指定して数字を整形する
    formatNum: function(num, digit) {
      if (digit === 0) return Math.round(num).toString();

      const int = Math.round(num * 10 ** digit).toString();
      const left = int.length > digit ? int.slice(0, -digit) : "0";
      const right = int.slice(-digit);
      return `${left}.${right}`;
    },
    allItemAvailable: function(available) {
      this.items.forEach(item => item.model.available = available);
    },
    allLevelIncrease: function(value) {
      this.items.forEach(item => {
        const max = item.paraUpRateArr.length;
        const level = (() => {
          const level = parseInt(item.model.level, 10) + value;
          if (level < 1) return 1;
          if (level > max) return max;
          return level;
        })();
        item.model.level = level.toString();
      });
    },
    getTarget: function(item) {
      const [kind, value] = item.target;
      if (kind === "band") return this.bands[value];
      if (kind === "type") return this.types[value];
      if (kind === "parameter") return this.parameters[value];
      return "全て";
    },
    encode: function() {
      return AutoParty.encode(
        this.model,
        this.members.map(member => member.model),
        this.items.map(item => item.model),
        this.event
      );
    },
    encodeTest: function() {
      const code = AutoParty.encode(
        this.model,
        this.members.map(member => member.model),
        this.items.map(item => item.model),
        this.event
      );
      console.dir(code);
      const [model, event] = AutoParty.decode(code);
      console.dir(model);
      console.dir(event);
    }
  };

  const computed = {
    filterdMembers: function() {
      const members = this.members.filter(member => (
        this.model.filterTypes[member.type]
        && this.model.filterBands[member.band]
        && this.model.filterSkills[member.skill]
        && this.model.filterRarities[member.rarity]
      ));

      const getCharacter = member => member.character;
      const getMinusParameter = member => -member.totalParameter;
      const getMinusId = member => -member.id;
      const getType = member => member.type;
      const generateCallback = (...funcs) => {
        return (a, b) => {
          for (const func of funcs) {
            const diff = func(a) - func(b);
            if (diff !== 0) return diff;
          }
          return 0;
        };
      };

      if (this.model.sort === 0) {
        members.sort(generateCallback(
          getCharacter, getMinusParameter, getType, getMinusId
        ));
      } else if (this.model.sort === 1) {
        members.sort(generateCallback(
          getMinusParameter, getCharacter, getType, getMinusId
        ));
      } else {
        members.sort(generateCallback(getMinusId));
      }
      return members;
    },
    itemAreas: function() {
      const areaMap = new Map();
      this.items.forEach(item => {
        if (!areaMap.has(item.area)) areaMap.set(item.area, []);
        areaMap.get(item.area).push(item);
      });
      const areas = [...areaMap.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(pair => {
          pair[1].sort((a, b) => a.target[1] - b.target[1]);

          const oneline = 4;
          const areaRows = [];
          for (let i = 0; i < pair[1].length; i += oneline) {
            areaRows.push(pair[1].slice(i, i + oneline));
          }
          return {area: pair[0], rows: areaRows};
        });
      return areas;
    },
  };

  new Vue({
    el: "#app",
    data: data,
    methods: methods,
    computed: computed,
  });

  const fetchMembers = async () => {
    return fetch("./data/members.json")
      .then(res => res.json())
      .then(memberObjs => memberObjs.map(obj => new AutoParty.Member(obj)))
      .catch(err => alert(err.message));
  };

  const fetchItems = async () => {
    return fetch("./data/items.json")
      .then(res => res.json())
      .then(itemObjs => itemObjs.map(obj => new AutoParty.Item(obj)))
      .catch(err => alert(err.message));
  }

  Promise.all([fetchMembers(), fetchItems()])
    .then(([members, items]) => {
      data.members = members;
      data.items = items;
    });
});