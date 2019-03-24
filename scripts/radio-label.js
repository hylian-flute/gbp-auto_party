Vue.component("radio-label", {
  props: ["option", "init"],
  template: `
    <label>
      <input
        type="radio"
        name="option.name"
        v-bind:checked="init"
        v-on:change="onchange($event)"
      >
      <span>{{option.text}}</span>
    </label>
  `.replace(/  /g, ""),
  methods: {
    onchange: function(){
      this.$emit("radio-changed", {
        name: this.option.name,
        idx: this.option.idx,
      });
    }
  }
});

