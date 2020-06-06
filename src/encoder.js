"use strict";

{
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
    let code = "02";

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
      6,
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
    let p = 0;
    const slice = (n, callback) => {
      const result = callback(code.slice(p, p + n));
      p += n;
      return result;
    };

    const model = {};
    const event = {};

    const radiosLen = slice(1, bigNumFrom62).toNumber();
    const radios = slice(radiosLen, generateArrFrom62(5, false, 4));
    [model.tab, model.sort, event.type, event.parameter] = radios;

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

  AutoParty.decode = code => {
    if (code.slice(0, 2) === "02") return decode02(code.slice(2));
  };
}

/*
{
  const chars62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const to62 = (str, radix, digit) => {
    let n = parseInt(str, radix);
    const result = [];
    while (n > 0) {
      result.push(chars62[n % 62]);
      n = Math.floor(n / 62);
    }
    return `${"0".repeat(digit)}${result.reverse().join("")}`.slice(-digit);
  }

  const from62 = (str, radix, digit) => {
    const charToNum = new Map();
    for (let i = 0; i < 62; ++i) charToNum.set(chars62[i], i);

    let n = 0;
    for (let i = 0; i < str.length; ++i) {
      n = 62 * n + charToNum.get(str[i]);
    }
    return `${"0".repeat(digit)}${n.toString(radix)}`.slice(-digit);
  }

  AutoParty.encode = function(model, members, items, event) {
    const boolsToBin = arr => arr.map(v => v ? "1" : "0").join("");
    let code = "02";

    // 4桁の5進数は2桁の62進数に変換できる
    code += to62(`${model.tab}${model.sort}${event.type}${event.parameter}`, 5, 2);

    // 18桁の2進数は4桁の62進数に変換できる
    code += to62(
      boolsToBin([
        ...model.filterTypes,
        ...model.filterBands,
        ...model.filterSkills,
        ...model.filterRarities,
      ]),
      2,
      4
    );

    // 35桁の2進数は6桁の62進数に変換できる
    code += to62(boolsToBin(event.characters), 2, 6);

    // メンバー数を2桁で記録する（最大3844）
    code += to62(members.length.toString(), 10, 2);
    const memberAvailables = members.map(member => member.available);
    // メンバー数を47の倍数で揃える
    if (members.length % 47 > 0) {
      memberAvailables.push(...(new Array(47 - members.length % 47)).fill(false));
    }
    // 47桁の2進数を8桁で記録すると効率が良い
    for (let i = 0; i < memberAvailables.length; i += 47) {
      code += to62(boolsToBin(memberAvailables.slice(i, i + 47)), 2, 8);
    }

    const skillLevels = members.map(member => parseInt(member.skillLevel, 10) - 1);
    // メンバー数を20の倍数で揃える
    if (members.length % 20 > 0) {
      skillLevels.push(...(new Array(20 - members.length % 20)).fill(0));
    }
    // 20桁の5進数を8桁で記録すると効率が良い
    for (let i = 0; i < skillLevels.length; i += 20) {
      code += to62(
        skillLevels.slice(i, i + 20).map(level => level.toString(5)).join(""),
        5,
        8
      );
    }

    code += to62(items.length.toString(), 10, 2);
    const itemAvailables = items.map(item => item.available);
    if (items.length % 47 > 0) {
      itemAvailables.push(...(new Array(47 - items.length % 47)).fill(false));
    }
    for (let i = 0; i < itemAvailables.length; i += 47) {
      code += to62(boolsToBin(itemAvailables.slice(i, i + 47)), 2, 8);
    }

    const itemLevels = items.map(item => parseInt(item.level, 10) - 1);
    if (items.length % 16 > 0) {
      itemLevels.push(...(new Array(16 - items.length % 16)).fill(0));
    }
    // 16桁の6進数を7桁で記録すると効率が良い
    for (let i = 0; i < itemLevels.length; i += 16) {
      code += to62(
        itemLevels.slice(i, i + 16).map(level => level.toString(6)).join(""),
        6,
        7
      );
    }

    return code;
  };

  const decode02 = code => {
    let p = 0;

    const slice = (n, callback) => {
      const result = callback(code.slice(p, p + n));
      p += n;
      return result;
    }

    const binToBools = bin => {
      return bin.split("").map(v => v === "1");
    }

    const model = {};
    const event = {};

    slice(2, part => {
      const radio = from62(part, 5, 4);
      [model.tab, model.sort, event.type, event.parameter] = radio.split("");
    });

    slice(4, part => {
      const bin = from62(part, 2, 18);
      [
        model.filterTypes,
        model.filterBands,
        model.filterSkills,
        model.filterRarities
      ] = [
        bin.slice(0, 4),
        bin.slice(4, 11),
        bin.slice(11, 14),
        bin.slice(14, 18),
      ].map(binToBools);
    });

    slice(6, part => {
      event.characters = binToBools(from62(part, 2, 35));
    });

    const memberNum = slice(2, part => parseInt(from62(part, 10, 4), 10));
    const memberAvailables = [];
    for (let i = 0; i < Math.ceil(memberNum / 47); ++i) {
      slice(8, part => {
        memberAvailables.push(...binToBools(from62(part, 2, 47)));
      });
    }
    memberAvailables.splice(memberNum);

    const skillLevels = [];
    for (let i = 0; i < Math.ceil(memberNum / 20); ++i) {
      slice(8, part => {
        skillLevels.push(
          ...from62(part, 5, 20)
            .split("")
            .map(level => (parseInt(level, 5) + 1).toString())
        );
      });
    }
    skillLevels.splice(memberNum);

    //TODO: アイテムのデコードの実装（エンコードは実装済み）

    return [model, event];
  }

  AutoParty.decode = function(code) {
    if (code.slice(0, 2) === "02") return decode02(code.slice(2));
  };
}
*/