"use strict";

const AutoParty = {};

{
  const checkIntegerRange = (v, min, max) => {
    return (Number.isInteger(v) && v >= min && v < max);
  };
  const checkFloatRange = (v, min, max) => {
    return (typeof v === "number" && v >= min && v < max);
  };

  AutoParty.CHARACTER_NUM = 35;
  AutoParty.BAND_NUM = AutoParty.CHARACTER_NUM / 5;

  AutoParty.Member = class {
    constructor({
      id, name, character, rarity, type, parameters,
      scoreUpRate, scoreUpRateHigh, highCondition, scoreUpTimeArr,
    }) {
      if (
        checkIntegerRange(id, 0, Infinity)
        && typeof name === "string"
        && checkIntegerRange(character, 0, AutoParty.CHARACTER_NUM)
        && checkIntegerRange(rarity, 0, 4)
        && checkIntegerRange(type, 0, 4)
        && Array.isArray(parameters) && parameters.length === 3
        && parameters.every(v => checkIntegerRange(v, 0, Infinity))
        && checkFloatRange(scoreUpRate, 0, Infinity)
        && checkFloatRange(scoreUpRateHigh, 0, Infinity)
        && checkIntegerRange(highCondition, 0, 3)
        && Array.isArray(scoreUpTimeArr) && scoreUpTimeArr.length === 5
        && scoreUpTimeArr.every(v => checkFloatRange(v, 0, Infinity))
      ) {
        this.id = id;
        this.name = name; 
        this.character = character;
        this.rarity = rarity;
        this.type = type;
        this.parameters = parameters;
        this.scoreUpRate = scoreUpRate;
        this.scoreUpRateHigh = scoreUpRateHigh;
        this.highCondition = highCondition;
        this.scoreUpTimeArr = scoreUpTimeArr;
      } else {
        throw new Error(`Member.constructor: 不正なプロパティ（${name}）`);
      }
      this.model = {
        //available: false,
        //skillLevel: "1",
        available: Math.random() < 0.5,
        skillLevel: Math.floor(5 * Math.random() + 1).toString(),
      };
      this.band = Math.floor(character / 5);
      this.totalParameter = parameters.reduce((t, v) => t + v);

      // スキル区分; 0: 条件付き, 1: スコアアップ, 2: その他
      const skillExelence = scoreUpRate - [0.1, 0.3, 0.6, 1][rarity];
      this.skill = (skillExelence > 0 ? 0 : (skillExelence === 0 ? 1 : 2));
    }

    checkModel() {
      if (!(
        typeof this.model.available === "boolean"
        && typeof this.model.skillLevel === "string"
        && checkIntegerRange(parseInt(this.model.skillLevel), 1, 6)
      )){
        throw new Error(`Member.constructor: 不正な入力値（${this.name}）`);
      }
    }

    get scoreUpTime() {
      const skillLevel = parseInt(this.model.skillLevel);
      if (Number.isNaN(skillLevel)) {
        throw new Error(`不正なスキルレベル（${this.name}）`);
      }
      return this.scoreUpTimeArr[skillLevel - 1];
    }

    static create(obj) {
      const member = Object.create(this.prototype);
      for (const key in obj) member[key] = obj[key];
      member.checkModel();
      return member;
    }
  };

  AutoParty.Item = class {
    constructor({id, name, area, band, type, parameter, paraUpRateArr}) {
      if (
        checkIntegerRange(id, 0, Infinity)
        && typeof name === "string"
        && checkIntegerRange(area, 0, 14)
        && (band === null || checkIntegerRange(band, 0, AutoParty.BAND_NUM))
        && (type === null || checkIntegerRange(type, 0, 4))
        && (parameter === null || checkIntegerRange(parameter, 0, 3))
        && Array.isArray(paraUpRateArr)
        && paraUpRateArr.every(v => checkFloatRange(v, 0, Infinity))
      ) {
        this.id = id;
        this.name = name;
        this.area = area;
        this.band = band;
        this.type = type;
        this.parameter = parameter;
        this.paraUpRateArr = paraUpRateArr;
      } else {
        throw new Error(`Item.constructor: 不正なプロパティ（${name}）`);
      }
      this.model = {
        //available: true,
        //level: "1",
        available: Math.random() < 0.5,
        level: Math.floor(paraUpRateArr.length * Math.random() + 1).toString(),
      }
      this.target = (() => {
        if (this.band !== null) return ["band", this.band];
        if (this.type !== null) return ["type", this.type];
        if (this.parameter !== null) return ["parameter", this.parameter];
        // ソートしたときに最後になるように値をInfinityにしている
        return ["other", Infinity];
      })();
      this.colorClass = (() => {
        const prefix = "color-"
        const [kind, value] = this.target;
        if (kind === "other") return `${prefix}other`;
        return `${prefix}${kind}${value}`;
      })();
    }

    checkModel() {
      if (!(
        typeof this.model.available === "boolean"
        && typeof this.model.level === "string"
        && checkIntegerRange(parseInt(this.model.level), 1, this.paraUpRateArr.length + 1)
      )) {
        throw new Error(`Item.constructor: 不正なプロパティ（${this.name}）`);
      }
    }

    get paraUpRate() {
      const level = parseInt(this.model.level);
      if (Number.isNaN(level) || level <= 0 || level > this.paraUpRateArr.length) {
        throw new Error(`不正なレベル（${this.name}）`);
      }
      return this.paraUpRateArr[level - 1];
    }
    isApplicable(band, type, parameter) {
      return (
        (this.band === null || band === this.band)
        && (this.type === null || type === this.type)
        && (this.parameter === null || parameter === this.parameter)
      );
    }

    static create(obj) {
      const item = Object.create(this.prototype);
      for (const key in obj) item[key] = obj[key];
      item.checkModel();
      return item;
    }
  };
}
