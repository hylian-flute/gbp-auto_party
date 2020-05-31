"use strict";

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
    // 20桁の2進数を8桁で記録すると効率が良い
    for (let i = 0; i < skillLevels.length; i += 20) {
      code += to62(
        skillLevels.slice(i, i + 20).map(level => level.toString(5)).join(""),
        5,
        8
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
    console.log(skillLevels);

    return [model, event];
  }

  AutoParty.decode = function(code) {
    if (code.slice(0, 2) === "02") return decode02(code.slice(2));
  };
}