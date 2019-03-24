Vue.component("checkbox-label",{
  props: ["visible", "name", "idx", "kind"],
  data: function(){
    return {
      value: this.visible
    };
  },
  template: `
    <label>
      <input
        type="checkbox"
        v-model="value"
        v-on:change="onchange(idx, kind)"
      >
      <span>{{name}}</span>
    </label>
  `.replace(/  /g, ""),
  methods: {
    onchange: function(idx, kind){
      this.$emit("checkbox-changed", {
        idx: idx,
        kind: kind,
        value: this.value,
      });
    }
  }
});

