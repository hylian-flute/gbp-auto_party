"use strict";

const GBP = {DATA: {}, MODEL: {}, VIEW: {}};

// 曲の長さ
GBP.DATA.musicTime = 101;

// アイテムの全探索は困難なためヒューリスティックなパターンから選択する
// バンド特化*タイプ特化, 盆栽セット等はタイプ特化のレベルが低いときのみ
GBP.MODEL.generateItemsPatterns = function(items){
    // patterns = [ポピパ*パワフル, ポピパ*クール, ..., ハロハピ*ハッピー]
    let patterns = [];
    for(let i = 0; i < 20; i++)
        patterns.push([]);

    // 各属性アイテムを使うか全属性アイテムを使うか記録する
    let area11 = [null, null, null, null];
    let area13 = [null, null, null, null];

    // 楽器をパターンに入れ、各タイプの有効なアイテムを選定する
    items.forEach(item => {
        // 楽器
        if(item.id < 35){
            for(let typeIdx = 0; typeIdx < 4; ++typeIdx){
                patterns[4*(item.id%5) + typeIdx].push(item);
            }
        // ヤシの木〜ミッシェルの銅像
        }else if(item.id < 39){
            area11[item.id - 35] = item;
        // 盆栽セット
        }else if(item.id == 39){
            for(let typeIdx = 0; typeIdx < 4; ++typeIdx){
                if(area11[typeIdx] === null ||
                    area11[typeIdx].paraUpRate < item.paraUpRate){
                    area11[typeIdx] = item;
                }
            }
        // ミートソース〜マカロンタワー
        }else if(item.id < 44){
            area13[item.id - 40] = item;
        // チョココロネ, コーヒー
        }else{
            for(let typeIdx = 0; typeIdx < 4; ++typeIdx){
                if(area13[typeIdx] === null ||
                    area13[typeIdx].paraUpRate < item.paraUpRate){
                    area13[typeIdx] = item;
                }
            }
        }
    });

    // 各タイプのアイテムをパターンに入れる
    area11.forEach((item, i) => {
        if(item == null)
            return;
        for(let patternIdx = i; patternIdx < 20; patternIdx += 4){
            patterns[patternIdx].push(item);
        }
    });
    area13.forEach((item, i) => {
        if(item == null)
            return;
        for(let patternIdx = i; patternIdx < 20; patternIdx += 4){
            patterns[patternIdx].push(item);
        }
    });

    return patterns;
}

// アイテムとイベント情報からメンバーのパラメータボーナスを計算する
GBP.MODEL.calcBonus = function(member, items, eventBonus){
    member.itemBonus = items.reduce((bonus, item) => {
        // 条件を満たさなければ終了
        // アイテムのnullの項目は無条件にボーナスが適用される
        if(item.characters !== null &&
            item.characters.indexOf(member.character) == -1){
            return bonus;
        }
        if(item.type !== null && item.type != member.type)
            return bonus;

        return bonus + member.paraSum*item.paraUpRate;
    }, 0);
    
    // イベントボーナスの倍率は固定値
    member.eventBonus = 0;
    let applyCount = 0;
    if(eventBonus.members !== null &&
        eventBonus.members.indexOf(member.character) >= 0){
        member.eventBonus += member.paraSum*0.2;
        ++applyCount;
    }
    if(eventBonus.type !== null && eventBonus.type == member.type){
        member.eventBonus += member.paraSum*0.1;
        ++applyCount;
    }
    if(eventBonus.parameter !== null && applyCount >= 2)
        member.eventBonus += member.parameters[eventBonus.parameter]*0.5;

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

    let result =  partyArr.reduce((result, member) => ({
        base: result.base + member.paraSum,
        itemBonus: result.itemBonus + member.itemBonus,
        eventBonus: result.eventBonus + member.eventBonus,
        paraInclBonus: result.paraInclBonus + member.paraInclBonus,
        skill: result.skill + member.mulScoreUp,
    }), {
        base: 0,
        itemBonus: 0,
        eventBonus: 0,
        paraInclBonus: 0,
        skill: partyArr[0].mulScoreUp
    });

    result.skill *= result.paraInclBonus/GBP.DATA.musicTime;
    result.total = result.paraInclBonus + result.skill;

    return result
};

// アイテムを固定してメンバーを最適化する
// membersはスキル時間*スキル倍率で降順ソート済み
// itemsは所持アイテムではなく固定された使用アイテム
GBP.MODEL.optimizeMembers = function(members, items, eventBonus){
    // メンバーにボーナス値を追加する
    members = members.map(
        member => GBP.MODEL.calcBonus(member, items, eventBonus));

    // 上位互換の同キャラが1枚もしくは5キャラがいるメンバーを除外
    members = members.filter((targetMember, targetIdx) => {
        let charaMask = [];
        for(let i = 0; i < 25; i++)
            charaMask.push(false);

        for(let superiorIdx = 0; superiorIdx < targetIdx; ++superiorIdx){
            if(members[superiorIdx].paraInclBonus >=
                targetMember.paraInclBonus)

                charaMask[members[superiorIdx].character] = true;
        }
        return (!charaMask[targetMember.character] &&
            charaMask.reduce((n, b) => n + (b ? 1 : 0), 0) < 5)
    });

    let maxResult = {total: 0};
    let maxPartyArr = null;
    GBP.MODEL.combination(members, 5, partyArr => {
        const result = GBP.MODEL.calcTotalPara(partyArr);
        if(result !== null){
            if(result.total > maxResult.total){
                maxResult = result;
                maxPartyArr = partyArr;
            }
        }
    });
    return {parameters: maxResult, partyArr: maxPartyArr}
};

// メンバーとアイテムを最適化する
// ボタンを押して実行
GBP.MODEL.optimizeMembersAndItems =
    function(membersLevels, itemsLevels, eventBonus){

    // 所持メンバーリスト
    let members = GBP.DATA.members.filter(
        (m, i) => membersLevels[i] !== null).map(member => ({

        id: member.id,
        character: member.character,
        type: member.type,
        parameters: member.parameters,
        paraSum: member.parameters.reduce((acc, p) => acc + p, 0),
        scoreUpRate: member.scoreUpRate,
        scoreUpTime: member.scoreUpTimeArr[membersLevels[member.id]],
        mulScoreUp: member.scoreUpRate*
            member.scoreUpTimeArr[membersLevels[member.id]]
    })).sort((a, b) => b.mulScoreUp - a.mulScoreUp);

    // 所持アイテムリスト
    let items = GBP.DATA.items.filter(
        (it, i) => itemsLevels[i] !== null).map(item => {

        let obj = {};
        obj.id = item.id;
        obj.area = item.area;
        obj.characters = item.characters;
        obj.type = item.type;
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
            result.items = ip;
            maxResult = result;
        }
    }));
    console.log(`calculation time = ${Date.now() - st}ms`);
    console.log("Parameters:");
    console.log(maxResult.parameters);
    console.log("Party:");
    console.log(maxResult.partyArr.map(m => GBP.DATA.members[m.id]));
    console.log("Items:");
    console.log(maxResult.items.map(i => GBP.DATA.items[i.id]));
    console.log("Event:");
    console.log(eventBonus);
}

// members.jsonとitems.jsonを読み込む
GBP.MODEL.readData = function(){
    const xhrMembers = new XMLHttpRequest();
    xhrMembers.addEventListener("load",
        () => GBP.DATA.members = JSON.parse(xhrMembers.responseText));
    xhrMembers.open("GET", "./members.json");
    xhrMembers.send();

    const xhrItems = new XMLHttpRequest();
    xhrItems.addEventListener("load",
        () => GBP.DATA.items = JSON.parse(xhrItems.responseText));
    xhrItems.open("GET", "./items.json");
    xhrItems.send();
}

let membersLevels = [];
for(let i = 0; i < 503; ++i){
    let r = Math.floor(Math.random()*6);
    membersLevels.push(r < 5 ? r : null);
}
let itemsLevels = [];
for(let i = 0; i < 46; ++i){
    let r = Math.floor(Math.random()*6);
    itemsLevels.push(r < 5 ? r : null);
}
let eventBonus = {};
eventBonus.members = [];
{
    let selectedMembers = [];
    for(let i = 0; i < 25; ++i)
        selectedMembers.push(false);
    for(let i = 0; i < 5; ++i){
        let r = Math.floor(Math.random()*25);
        while(selectedMembers[r]){
            r = (r + 1)%25
        }
        eventBonus.members.push(r);
        selectedMembers[r] = true;
    }
}

window.onload = function(){
    eventBonus.type = Math.floor(Math.random()*4);
    eventBonus.parameter = Math.floor(Math.random()*3);

    GBP.MODEL.readData();

    document.getElementById("test-button").onclick =
        GBP.MODEL.optimizeMembersAndItems.bind(
        GBP.MODEL, membersLevels, itemsLevels, eventBonus);
};
