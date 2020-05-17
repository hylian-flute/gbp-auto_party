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
    const boolToBin = arr => arr.map(v => v ? "1" : "0").join("");
    let code = "02";

    // 4桁の5進数は2桁の62進数に変換できる
    code += to62(`${model.tab}${model.sort}${event.type}${event.parameter}`, 5, 2);

    // 18桁の2進数は4桁の62進数に変換できる
    code += to62(
      boolToBin([
        ...model.filterTypes,
        ...model.filterBands,
        ...model.filterSkills,
        ...model.filterRarities,
      ]),
      2,
      4
    );

    // 35桁の2進数は6桁の62進数に変換できる
    code += to62(boolToBin(event.characters), 2, 6)

    return code;
  };

  AutoParty.decode = function(code) {
    let p = 2;

    const slice = (n, callback) => {
      const result = callback(code.slice(p, p + n));
      p += n;
      return result;
    }

    const binToArr = bin => {
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
      ].map(binToArr);
    });

    slice(6, part => {
      event.characters = binToArr(from62(part, 2, 35));
    });

    return [model, event];
  }
}