import Vue from 'vue/dist/vue';
import Buefy from 'buefy';

import App from './App';
import router from './router';

Vue.use(Buefy);

new Vue({
  components: { App },
  router,
  template: '<App/>'
}).$mount('#app');
