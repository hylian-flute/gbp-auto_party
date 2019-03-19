"use strict";

const GBP = {DATA: {}, MODEL: {}, VIEW: {}};

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
    const paraSum = member.parameters.reduce((acc, p) => acc + p, 0);
    member.itemBonus = items.reduce((bonus, item) => {
        // 条件を満たさなければ終了
        // アイテムのnullの項目は無条件にボーナスが適用される
        if(item.characters !== null &&
            item.characters.indexOf(member.character) == -1){
            return bonus;
        }
        if(item.type !== null && item.type != member.type)
            return bonus;

        return bonus + paraSum*item.paraUpRate;
    }, 0);
    
    // イベントボーナスの倍率は固定値
    member.eventBonus = 0;
    let applyCount = 0;
    if(eventBonus.members !== null &&
        eventBonus.members.indexOf(member.character) >= 0){
        member.eventBonus += paraSum*0.2;
        ++applyCount;
    }
    if(eventBonus.type !== null && eventBonus.type == member.type){
        member.eventBonus += paraSum*0.1;
        ++applyCount;
    }
    if(eventBonus.parameter !== null && applyCount >= 2)
        member.eventBonus += member.parameters[eventBonus.parameter]*0.5;

    return member;
};

// アイテムを固定してメンバーを最適化する
// charactersの各要素はスキル時間*スキル倍率で降順ソート済み
// itemsは所持アイテムではなく固定された使用アイテム
GBP.MODEL.optimizeMembers = function(characters, items, eventBonus){
    // メンバーにボーナス値を追加する
    characters = characters.map(members => members.map(
        member => GBP.MODEL.calcBonus(member, items, eventBonus)));

    // 同キャラで総合力もスキルも劣っているメンバーを除外する
    characters = characters.map(members => {
        let maxParaSum = -1;
        return members.filter(member => {
            const paraSum = member.parameters.reduce((acc, p) => acc + p, 0) +
                member.itemBonus + member.eventBonus;
            if(paraSum > maxParaSum){
                maxParaSum = paraSum;
                return true;
            }else
                return false;
        });
    });

    console.log(characters);
    console.log(items);
    console.log(eventBonus);

    let stack = [{comb: [], charaPt: 0, memberPt: 0}];
    let startTime = Date.now();
    while(stack.length > 0){
        if(Date.now() - startTime >= 2000){
            window.alert("計算時間オーバー");
            break;
        }
        const data = stack.pop();
        // 5人揃ったときの処理
        if(data.comb.length == 5){
            try{
                console.log(data.comb.map(member => member.id).join(", "));
            }catch{
                console.log(data.comb);
            }
            continue;
        }
        // TODO: 同キャラ被りあり
        for(let charaIdx = data.charaPt; charaIdx < 25; ++charaIdx){
            for(let memberIdx = (charaIdx == data.charaPt ? data.memberPt : 0);
                memberIdx < characters[charaIdx].length; ++memberIdx){
                stack.push({
                    comb: data.comb.concat(characters[charaIdx][memberIdx]),
                    charaPt: charaIdx,
                    memberPt: memberIdx + 1
                });
            }
        }
    }
};

// メンバーとアイテムを最適化する
// ボタンを押して実行
GBP.MODEL.optimizeMembersAndItems =
    function(membersLevels, itemsLevels, eventBonus){

    // 所持メンバーリスト
    let characters = [];
    for(let i = 0; i < 25; i++)
        characters.push([]);
    GBP.DATA.members.filter(
        (m, i) => membersLevels[i] !== null).forEach(member => {

        characters[member.character].push({
            id: member.id,
            character: member.character,
            type: member.type,
            parameters: member.parameters,
            scoreUpRate: member.scoreUpRate,
            scoreUpTime: member.scoreUpTimeArr[membersLevels[member.id]]
        });
    });
    const mulScoreUp = member => member.scoreUpRate*member.scoreUpTime;
    characters = characters.map(
        members => members.sort((a, b) => mulScoreUp(b) - mulScoreUp(a)));

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

    const v1 = GBP.MODEL.optimizeMembers(characters, itemsPatterns[0], eventBonus);
    console.log(v1);

    /*
    console.log(items.map(item => `${
        GBP.DATA.items[item.id].name}(${itemsLevels[item.id]})`).join("\n"));

    const patterns = GBP.MODEL.generateItemsPatterns(items);
    console.log(patterns.map(pattern => pattern.map(
        item => GBP.DATA.items[item.id].name).join(", ")).join("\n"));
    */
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
