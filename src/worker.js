"use strict";

importScripts("./share.js");
const MUSIC_LEN = 101;
const ItemSet = class extends Array {
  constructor(band, type, parameter) {
    super();
    this.band = band;
    this.type = type;
    this.parameter = parameter;
    this.bandRate = undefined;
    this.typeRate = undefined;
    this.parameterRate = undefined;
    this.anyRate = undefined;
  }

  // AND条件のエリアアイテムが実装された場合は変更が必要
  calcSumRate() {
    [this.bandRate, this.typeRate, this.parameterRate, this.anyRate]
      = this.reduce((rates, item) => {
      if (item.band !== null) rates[0] += item.paraUpRate;
      else if (item.type !== null) rates[1] += item.paraUpRate;
      else if (item.parameter !== null) rates[2] += item.paraUpRate;
      else rates[3] += item.paraUpRate;
      return rates;
    }, [0, 0, 0, 0]);
  }
};

const Event = class {
  constructor({type, characters, parameter}) {
    this.type = type;
    this.parameter = parameter;

    // typeは 4: なし が存在するので5未満
    if (!(
      this.type >= 0 && this.type < 5
      && this.parameter >= 0 && this.parameter < 3
      && Array.isArray(characters) && characters.length === AutoParty.CHARACTER_NUM
      && characters.every(v => typeof v === "boolean")
    )) throw new Error("Event.constructor: 不正なプロパティ");

    this.characters = new Set();
    characters.forEach((v, i) => {
      if (v) this.characters.add(i);
    });
  }
}

addEventListener("message", message => {
  const members = message.data.members.map(
    member => AutoParty.Member.create(member)
  );
  const items = message.data.items.map(item => 
    AutoParty.Item.create(item)
  );
  const event = new Event(message.data.event);

  const areas = [...new Array(14)].map(v => []);
  items.forEach(item => areas[item.area].push(item));

  const createItemSet = (band, type, parameter) => {
    const itemSet = new ItemSet(band, type, parameter);
    areas.forEach(area => {
      // 現状同エリアで性質の違うアイテムは存在しないが
      // バンドorタイプ系の倍率とパラメータ系の倍率を比較することは本来意味がない
      const item = area.reduce((maxItem, item) => {
        if (item.isApplicable(band, type, parameter)
          && (maxItem === null || item.paraUpRate > maxItem.paraUpRate)) {
          return item;
        }
        return maxItem;
      }, null);
      if (item !== null) itemSet.push(item);
    });
    itemSet.calcSumRate();
    return itemSet;
  };

  //TODO: 「みんなの」系アイテムが最適解になるパターンがある
  const itemSets = [];
  for (let band = 0; band < AutoParty.BAND_NUM; ++band) {
    for (let type = 0; type < 4; ++type) {
      for (let parameter = 0; parameter < 3; ++parameter) {
        itemSets.push(createItemSet(band, type, parameter));
      }
    }
  }

  const calcBuffedParameter = (member, itemSet) => {
    const isEventCharacter = event.characters.has(member.character);
    const isEventType = (event.type === member.type);
    const isEventBoth = isEventCharacter && isEventType;

    const itemBonus = member.totalParameter * (
      (member.band === itemSet.band ? itemSet.bandRate : 0)
      + (member.type === itemSet.type ? itemSet.typeRate : 0)
      + itemSet.anyRate
    ) + member.parameters[itemSet.parameter] * itemSet.parameterRate;

    const eventBonus = member.totalParameter * (
      (isEventCharacter ? 0.2 : 0)
      + (isEventType ? 0.1 : 0)
      + (isEventBoth ? 0.2 : 0)
    ) + (isEventBoth ? 0.5 * member.parameters[event.parameter] : 0);

    return {
      parameter: member.totalParameter + itemBonus + eventBonus,
      itemBonus: itemBonus,
      eventBonus: eventBonus,
    };
  };

  const filters = [
    () => true,
    (member, itemSet) => member.band === itemSet.band,
    (member, itemSet) => member.type === itemSet.type,
    (member, itemSet) =>
      member.band === itemSet.band && member.type === itemSet.type
  ];
  const calcSkills = [
    member => member.scoreUpRate * member.scoreUpTime,
    member => (member.highCondition === 1
      ? member.scoreUpRateHigh : member.scoreUpRate) * member.scoreUpTime,
    member => (member.highCondition === 2
      ? member.scoreUpRateHigh : member.scoreUpRate) * member.scoreUpTime,
    member => (member.highCondition === 1 || member.highCondition === 2
      ? member.scoreUpRateHigh : member.scoreUpRate) * member.scoreUpTime,
  ];
  const enumerateCombination = arr => {
    const N = 5;
    const result = [];

    // stack[i] = [選択された要素の配列, 次に見る要素のインデックス]
    const stack = [[[], 0]];

    while (stack.length > 0) {
      const pair = stack.pop();
      if (pair[0].length === N) result.push(pair[0]);
      else if (arr.length - pair[1] < N - pair[0].length) continue;
      else {
        stack.push([pair[0], pair[1] + 1]);
        stack.push([[...pair[0], arr[pair[1]]], pair[1] + 1]);
      }
    }

    return result;
  };

  const result = itemSets.reduce((result, itemSet) => {
    const memberPowers = members.map(member => ({
      member: member,
      ...calcBuffedParameter(member, itemSet),
    })).sort((a, b) => b.parameter - a.parameter);

    let resultOfItemSet = {total: 0};
    // filterIdx === 0: 条件なし, 1: バンド統一, 2: タイプ統一, 3: 両方統一
    for (let filterIdx = 0; filterIdx < 4; ++filterIdx) {
      const memberBenefits = memberPowers.reduce((memberBenefits, memberPower) => {
        if (filters[filterIdx](memberPower.member, itemSet)) {
          return [
            ...memberBenefits,
            {...memberPower, skill: calcSkills[filterIdx](memberPower.member)}
          ];
        } else return memberBenefits;
      }, [])

      const reducedMemberBenefits
        = memberBenefits.filter((memberBenefit, memberIdx) => {
        const characterSet = new Set();
        for (const comparison of memberBenefits.slice(0, memberIdx)) {
          if (comparison.skill >= memberBenefit.skill) {
            if (comparison.member.character === memberBenefit.member.character) {
              return false;
            } else {
              characterSet.add(comparison.member.character);
              if (characterSet.size >= 5) return false;
            }
          }
        }
        return true;
      });

      const resultOfFilterIdx
        = enumerateCombination(reducedMemberBenefits).reduce((result, party) => {

        if ((new Set(
          party.map(memberBenefit => memberBenefit.member.character)
        )).size < 5) {
          return result;
        }

        party.sort((a, b) => b.skill - a.skill);

        const [totalParameter, totalSkill] = party.reduce(
          (pair, memberBenefit) => [pair[0] + memberBenefit.parameter, pair[1] + memberBenefit.skill],
          [0, party[0].skill]
        );
        const skillPower = totalParameter * totalSkill / MUSIC_LEN;
        const total = totalParameter + skillPower;

        if (total > result.total) {
          const displayParameters = party.reduce((parameters, memberBenefit) => {
            parameters.bandParameter += memberBenefit.member.totalParameter;
            parameters.itemBonus += memberBenefit.itemBonus;
            parameters.eventBonus += memberBenefit.eventBonus;
            return parameters;
          }, {bandParameter: 0, itemBonus: 0, eventBonus: 0});
          return {
            total: total,
            skillPower: skillPower,
            members: party.map(memberBenefit => memberBenefit.member),
            items: itemSet,
            ...displayParameters,
          };
        }
        return result;
      }, {total: 0});

      if (resultOfFilterIdx.total > resultOfItemSet.total) {
        resultOfItemSet = resultOfFilterIdx;
      }
    }

    postMessage(1 / itemSets.length);

    if (resultOfItemSet.total > result.total) return resultOfItemSet;
    return result;
  }, {total: 0});

  postMessage(result);
});