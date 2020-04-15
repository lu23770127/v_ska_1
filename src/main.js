import Vue from 'vue'
import App from './App.vue'
import router from "./starterRouter";

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
