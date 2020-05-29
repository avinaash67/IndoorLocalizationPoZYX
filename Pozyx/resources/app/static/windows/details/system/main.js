import Vue from 'vue/dist/vue';
import Buefy from 'buefy';

import App from './App';

Vue.use(Buefy);

new Vue({
  components: { App },
  template: '<App/>'
}).$mount('#app');
