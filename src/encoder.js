"use strict";

{
  const decode01 = function(code){
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

  const chars62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const charsMap = new Map(
    chars62.split("").map((char, idx) => [char, idx])
  );
  const to62 = bigNum => {
    if (bigNum.isNaN()) throw new Error("encoder: 不正なパラメータ");
    let result = [];
    while (!bigNum.isZero()) {
      result.push(chars62[bigNum.mod(62).toNumber()]);
      bigNum = bigNum.idiv(62);
    }
    return result.reverse().join("");
  };

  const arrTo62 = (arr, radix, gtZero = false) => {
    return to62(new BigNumber(arr.map(v => {
      if (v === true) return "1";
      if (v === false) return "0";
      return (parseInt(v, 10) - (gtZero ? 1 : 0)).toString(32);
    }).join(""), radix));
  };

  const numToFixedLen62 = (num, len) => 
    ("0".repeat(len) + to62(new BigNumber(num))).slice(-len);

  AutoParty.encode = function(model, members, items, event) {
    let code = "03";

    const radios = arrTo62([model.tab, model.sort, event.type, event.parameter], 5);
    const radiosLen = numToFixedLen62(radios.length, 1);
    code += radiosLen + radios;

    const checks = arrTo62([
      ...model.filterTypes,
      ...model.filterBands,
      ...model.filterSkills,
      ...model.filterRarities,
      ...event.characters,
    ], 2);
    const checksLen = numToFixedLen62(checks.length, 1);
    code += checksLen + checks;

    const memberAvailables = arrTo62(
      [true, ...members.map(member => member.available)],
      2
    );
    const memberAvailablesLen = numToFixedLen62(memberAvailables.length, 2);
    code += memberAvailablesLen + memberAvailables;

    const skillLevels = arrTo62(
      ["2", ...members.map(member => member.skillLevel)],
      5,
      true
    );
    const skillLevelsLen = numToFixedLen62(skillLevels.length, 2);
    code += skillLevelsLen + skillLevels;

    const itemAvailables = arrTo62(
      [true, ...items.map(item => item.available)],
      2
    );
    const itemAvailablesLen = numToFixedLen62(itemAvailables.length, 1);
    code += itemAvailablesLen + itemAvailables;

    const itemLevels = arrTo62(
      ["2", ...items.map(items => items.level)],
      7,
      true
    );
    const itemLevelsLen = numToFixedLen62(itemLevels.length, 1);
    code += itemLevelsLen + itemLevels;

    return code;
  };

  const bigNumFrom62 = str62 => {
    let result = new BigNumber(0);
    for (const char of str62) {
      result = result.times(62)
      result = result.plus(charsMap.get(char));
    }
    return result;
  };

  const generateArrFrom62 = (radix, gtZero = false, len = undefined) => {
    return str62 => {
      const bigNum = bigNumFrom62(str62);
      if (radix === true) {
        const arr = bigNum.toString(2).split("").map(v => v === "1");
        if (len === undefined) len = arr.length;
        return [...(new Array(len - arr.length)).fill(false), ...arr];
      }
      const arr = bigNum.toString(radix).split("");
      if (len === undefined) len = arr.length;
      const result = [...(new Array(len - arr.length)).fill("0"), ...arr];
      if (gtZero) {
        return result.map(v => (parseInt(v, radix) + 1).toString(radix + 1));
      }
      return result;
    }
  }

  const decode02 = code => {
    let p = 2;
    const slice = (n, callback) => {
      const result = callback(code.slice(p, p + n));
      p += n;
      return result;
    };

    const model = {};
    const event = {};

    const radiosLen = slice(1, bigNumFrom62).toNumber();
    const radios = slice(radiosLen, generateArrFrom62(5, false, 4));
    [model.tab, model.sort, event.type, event.parameter] = radios.map(s => parseInt(s, 5));

    const checksLen = slice(1, bigNumFrom62).toNumber();
    const checks = slice(
      checksLen,
      generateArrFrom62(true, false, 4 + 7 + 3 + 4 + 35)
    );
    [
      model.filterTypes,
      model.filterBands,
      model.filterSkills,
      model.filterRarities,
      event.characters
    ] = [
      checks.slice(0, 4),
      checks.slice(4, 11),
      checks.slice(11, 14),
      checks.slice(14, 18),
      checks.slice(18, 53),
    ];

    const memberAvailablesLen = slice(2, bigNumFrom62).toNumber();
    const memberAvailables =
      slice(memberAvailablesLen, generateArrFrom62(true)).slice(1);

    const skillLevelsLen = slice(2, bigNumFrom62).toNumber();
    const skillLevels =
      slice(skillLevelsLen, generateArrFrom62(5, true)).slice(1);
    
    if (memberAvailables.length !== skillLevels.length) {
      throw new Error("decode (members legnth): デコード失敗");
    }

    const members = [...new Array(memberAvailables.length)].map((_, i) => ({
      available: memberAvailables[i],
      skillLevel: skillLevels[i],
    }));

    const itemAvailablesLen = slice(1, bigNumFrom62).toNumber();
    const itemAvailables =
      slice(itemAvailablesLen, generateArrFrom62(true)).slice(1);

    const itemLevelsLen = slice(1, bigNumFrom62).toNumber();
    const itemLevels =
      slice(itemLevelsLen, generateArrFrom62(6, true)).slice(1);
    
    if (itemAvailables.length !== itemLevels.length) {
      throw new Error("decode (members legnth): デコード失敗");
    }

    const items = [...new Array(itemAvailables.length)].map((_, i) => ({
      available: itemAvailables[i],
      level: itemLevels[i],
    }));

    return [model, members, items, event];
  };

  const decode03 = code => {
    let p = 2;
    const slice = (n, callback) => {
      const result = callback(code.slice(p, p + n));
      p += n;
      return result;
    };

    const model = {};
    const event = {};

    const radiosLen = slice(1, bigNumFrom62).toNumber();
    const radios = slice(radiosLen, generateArrFrom62(5, false, 4));
    [model.tab, model.sort, event.type, event.parameter] = radios.map(s => parseInt(s, 5));

    const checksLen = slice(1, bigNumFrom62).toNumber();
    const checks = slice(
      checksLen,
      generateArrFrom62(true, false, 4 + 7 + 3 + 4 + 35)
    );
    [
      model.filterTypes,
      model.filterBands,
      model.filterSkills,
      model.filterRarities,
      event.characters
    ] = [
      checks.slice(0, 4),
      checks.slice(4, 11),
      checks.slice(11, 14),
      checks.slice(14, 18),
      checks.slice(18, 53),
    ];

    const memberAvailablesLen = slice(2, bigNumFrom62).toNumber();
    const memberAvailables =
      slice(memberAvailablesLen, generateArrFrom62(true)).slice(1);

    const skillLevelsLen = slice(2, bigNumFrom62).toNumber();
    const skillLevels =
      slice(skillLevelsLen, generateArrFrom62(5, true)).slice(1);
    
    if (memberAvailables.length !== skillLevels.length) {
      throw new Error("decode (members legnth): デコード失敗");
    }

    const members = [...new Array(memberAvailables.length)].map((_, i) => ({
      available: memberAvailables[i],
      skillLevel: skillLevels[i],
    }));

    const itemAvailablesLen = slice(1, bigNumFrom62).toNumber();
    const itemAvailables =
      slice(itemAvailablesLen, generateArrFrom62(true)).slice(1);

    const itemLevelsLen = slice(1, bigNumFrom62).toNumber();
    const itemLevels =
      slice(itemLevelsLen, generateArrFrom62(7, true)).slice(1);
    
    if (itemAvailables.length !== itemLevels.length) {
      throw new Error("decode (members legnth): デコード失敗");
    }

    const items = [...new Array(itemAvailables.length)].map((_, i) => ({
      available: itemAvailables[i],
      level: itemLevels[i],
    }));

    return [model, members, items, event];
  };

  AutoParty.decode = code => {
    const version = parseInt(code.slice(0, 2), 32);
    if (version <= 1) {
      const map = decode01(code);
      return [
        {
          tab: map.get("tabOption"),
          filterTypes: map.get("typeRefineArr"),
          filterBands: map.get("bandRefineArr"),
          filterSkills: map.get("skillRefineArr"),
          filterRarities: map.get("rarityRefineArr"),
          sort: map.get("sortOption"),
        },
        [...new Array(Math.min(
          map.get("memberAvailableArr").length,
          map.get("memberLevelArr").length
        ))].map((_, i) => ({
          available: map.get("memberAvailableArr")[i],
          skillLevel: map.get("memberLevelArr")[i],
        })),
        [...new Array(Math.min(
          map.get("itemAvailableArr").length,
          map.get("itemLevelArr").length
        ))].map((_, i) => ({
          available: map.get("itemAvailableArr")[i],
          level: map.get("itemLevelArr")[i],
        })),
        {
          type: map.get("eventType"),
          characters: map.get("eventCharacterArr"),
          parameter: map.get("eventPara") < 3 ? map.get("eventPara") : 0,
        }
      ];
    }
    if (version === 2) return decode02(code);
    if (version === 3) return decode03(code);
  };
}