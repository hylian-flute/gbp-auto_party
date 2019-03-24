Vue.component("area-item", {
  props: {
    item: {
      type: Object,
      required: true
    }
  },
  data: function(){
    return {
      available: GBP.DATA.itemsLevels[this.item.id] !== null,
      value: (() => {
        let level = GBP.DATA.itemsLevels[this.item.id];
        if(level === null)
          return this.item.paraUpRateArr.length;
        else
          return level + 1;
      })()
    }
  },
  template: `
    <li v-bind:style="liStyle" v-on:click="onclick">
      <div>{{item.name}}</div>
      <div>
        レベル
        <input
          type="number" min="1" v-bind:max="maxLevel" v-bind:value="value"
          v-bind:disabled="!available"
          v-on:click="e => e.stopPropagation()" v-on:change="onchange"
        >
      </div>
      <div>
        <div v-for="line in explain">{{line}}</div>
      </div>
    </li>
  `.replace(/  /g, ""),
  computed: {
    liStyle: function(){
      let color, lightColor;
      if(this.item.characters !== null){
        // バンド以外のキャラ括りのアイテムが実装された場合変える
        const band = Math.floor(this.item.characters[0]/5);
        color = GBP.DATA.bandColors[band];
        lightColor = GBP.DATA.bandColorsLight[band];
      }else if(this.item.type !== null){
        color = GBP.DATA.typeColors[this.item.type];
        lightColor = GBP.DATA.typeColorsLight[this.item.type];
      }else{
        color = "#a8a3a4";
        lightColor = "#e9e8e8";
      }
      return {
        border: "solid 4px",
        borderColor: (this.available ? color : lightColor),
        backgroundColor: lightColor
      }
    },
    maxLevel: function(){
      return this.item.paraUpRateArr.length;
    },
    explain: function(){
      let arr = [];
      let str = "";
      if(this.item.characters !== null){
        // バンド以外のキャラ括りのアイテムが実装された場合変える
        str += GBP.DATA.bandNames[Math.floor(this.item.characters[0]/5)];
        str += "のメンバーの";
        arr.push(str);
        str = "";
      }else if(this.item.type !== null){
        str += GBP.DATA.typeNames[this.item.type] + "タイプ";
        str += "のメンバーの";
        arr.push(str);
        str = "";
      }

      str += "全てのパラメータが";
      str += Math.round(this.item.paraUpRateArr[this.value - 1]*1000)/10;
      str += "%UP";
      arr.push(str)

      return arr;
    }
  },
  methods: {
    onclick: function(){
      this.available = !this.available;
      if(this.available)
        GBP.DATA.itemsLevels[this.item.id] = this.value - 1;
      else
        GBP.DATA.itemsLevels[this.item.id] = null;
      console.log([this.available, this.value]);
    },
    onchange: function(e){
      this.value = parseInt(e.target.value, 10);
      if(this.available)
        GBP.DATA.itemsLevels[this.item.id] = this.value - 1;
      console.log([this.available, this.value]);
    }
  }
});
