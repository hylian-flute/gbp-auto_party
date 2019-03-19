function newItemEnclosure(){
    let id = 0;
    return ((name, area, band, type, paraUpRateArr) => {
        let item = {};

        item.id = id++;
        item.name = name;
        item.area = area;

        if(band !== null){
            item.characters = [];
            for(let i = 5*band; i < 5*(band + 1); i++)
                item.characters.push(i);
        }else
            item.characters = null;

        item.type = type;
        item.paraUpRateArr = paraUpRateArr.map(rate => rate/100);

        return item;
    });
}

function makeItemsJson(jsonPath){
    const newItem = newItemEnclosure();
    let items = [];
    const instList = [
        "スタジオマイク", "ロックマイク",
        "アイドルマイク", "青薔薇のマイク", "マーチングマイク",
        "たえのギター", "モカのギター",
        "日菜のギター", "紗夜のギター", "薫のギター",
        "りみのベース", "ひまりのベース",
        "千聖のベース", "リサのベース", "はぐみのベース",
        "沙綾のドラム", "巴のドラム",
        "麻弥のドラム", "あこのドラム", "花音のドラム",
        "有咲のキーボード", "つぐみのキーボード",
        "イヴのキーボード", "燐子のキーボード", "美咲のDJセット"
    ];
    for(let areaIdx = 0; areaIdx < 5; ++areaIdx){
        for(let bandIdx = 0; bandIdx < 5; ++bandIdx){
            items.push(newItem(instList[5*areaIdx + bandIdx],
                areaIdx, bandIdx, null, [2, 2.5, 3, 3.5, 4, 4.5]));
        }
    }

    const bandList =
        ["ポピパ", "Afterglow", "パスパレ", "Roselia", "ハロハピ"];
    bandList.forEach((bandName, bandIdx) => items.push(newItem(
        `${bandName}のポスター`, 5, bandIdx, null, [6, 7, 8, 9, 10, 11])));
    bandList.forEach((bandName, bandIdx) => items.push(newItem(
        `${bandName}のフライヤー`, 9, bandIdx, null, [6, 7, 8, 9, 10, 11])));

    // パワフル, クール, ピュア, ハッピーの順に統一するためゲーム内と順序が違う
    ["ヤシの木", "足湯", "噴水", "ミッシェルの銅像"].forEach((name, typeIdx) =>
        items.push(newItem(name, 11, null, typeIdx, [1, 3, 5, 7, 10])));
    items.push(newItem("盆栽セット", 11, null, null, [0.5, 1, 1.5, 2, 2.5]));

    ["ミートソースパスタ", "アサイーボウル",
        "フルーツタルト", "マカロンタワー"].forEach((name, typeIdx) =>
        items.push(newItem(name, 13, null, typeIdx, [1, 3, 5, 7, 10])));
    items.push(newItem("チョココロネ", 13, null, null, [0.5, 1, 1.5, 2, 2.5]));
    items.push(newItem("極上コーヒー", 13, null, null, [0.5, 1, 1.5, 2, 2.5]));

    require("fs").writeFileSync(jsonPath, JSON.stringify(items));
}

makeItemsJson("./items.json");
