function lineToObject(line){
    const arr = line.split(",");

    let obj = {};
    const processList = [
        id => obj.id = parseInt(id, 10),
        name => obj.name = name,
        character => obj.character = parseInt(character, 10),
        rarity => obj.rarity = parseInt(rarity, 10) - 1,
        type => obj.type = parseInt(type, 10),
        perf => {
            obj.parameters = [];
            obj.parameters.push(parseInt(perf, 10));
        },
        tech => obj.parameters.push(parseInt(tech, 10)),
        vis => obj.parameters.push(parseInt(vis, 10)),
        scoreUpRate => obj.scoreUpRate = parseFloat(scoreUpRate),
        scoreUpTime => {
            if(scoreUpTime == "5")
                obj.scoreUpTimeArr = [3, 3.5, 4, 4.5, 5]
            else if(scoreUpTime == "7")
                obj.scoreUpTimeArr = [5, 5.5, 6, 6.5, 7]
            else if(scoreUpTime == "7.5")
                obj.scoreUpTimeArr = [5, 5.6, 6.2, 6.8, 7.5]
            else if(scoreUpTime == "8")
                obj.scoreUpTimeArr = [5, 5.7, 6.4, 7.2, 8]
            else
                throw `不正なスコアアップ時間です（id: ${obj.id}）`;
        }
    ];

    processList.forEach((process, i) => process(arr[i]));
    return obj;
}

function csvToJson(csvPath, jsonPath){
    const fs = require("fs");
    const memberArr =
        fs.readFileSync(csvPath, "utf-8").split("\n").map(lineToObject);
    fs.writeFileSync(jsonPath, JSON.stringify(memberArr));
}

csvToJson("./members.csv", "./members.json");
