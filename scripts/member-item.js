Vue.component("member-item", {
  props: ["member"],
  data : function(){
    return {
      skillLevel: (() => {
        if(GBP.DATA.membersLevels[this.member.id] !== null)
          return GBP.DATA.membersLevels[this.member.id] + 1
        else
          return 5
      })(),
      available: GBP.DATA.membersLevels[this.member.id] !== null,
      lightTypeColors: GBP.DATA.typeColorsLight,
    };
  },
  template: `
    <li
      v-on:click="clicked"
      v-bind:style="calcColor"
    >
      <div>{{member.name}}</div>
      <div>
        {{rarityToStr}} {{charaToStr}}
      </div>
      <div>
        総合力: {{member.parameters.reduce((s, m) => s + m, 0)}}
        <small>({{member.parameters.join("-")}})</small>
      </div>
      <div>
        スキルLv.
        <input
          type="number" min="1" max="5"
          v-model="skillLevel"
          v-bind:disabled="!available"
          v-on:click="e => e.stopPropagation()"
          v-on:change="skillLevelChanged"
        >
      </div>
      <div>
        {{member.scoreUpTimeArr[skillLevel - 1].toFixed(1)}}秒間、
        スコアが{{Math.round(member.scoreUpRate*100)}}%UPする
      </div>
    </li>
  `.replace(/  /g, ""),
  methods: {
    clicked: function(){
      this.available = !this.available;
      GBP.DATA.membersLevels[this.member.id] =
        this.available ? this.skillLevel - 1 : null;
    },
    skillLevelChanged: function(){
      if(this.available)
        GBP.DATA.membersLevels[this.member.id] = this.skillLevel - 1;
    },
  },
  computed: {
    calcColor: function(){
      return {
        backgroundColor: this.lightTypeColors[this.member.type],
        borderStyle: "solid",
        borderColor:
          (this.available ? GBP.DATA.typeColors[this.member.type] :
          this.lightTypeColors[this.member.type]),
        borderWidth: "4px",
      };
    },
    charaToStr: function(){
      return GBP.DATA.characterNames[this.member.character];
    },
    rarityToStr: function(){
      const star = "★";
      let str = star;
      for(let i = 0; i < this.member.rarity; ++i){
        str += star;
      }
      return str;
    },
  }
});

