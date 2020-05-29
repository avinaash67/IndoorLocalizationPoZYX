import Vue from 'vue/dist/vue';
import Router from 'vue-router/dist/vue-router';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'login',
      component: require('./components/Login'),
    },
    {
      path: '/register',
      name: 'register',
      component: require('./components/Register'),
    },
    {
      path: '/setup-select',
      name: 'setup-select',
      component: require('./components/SetupSelect'),
    },
    {
      path: '*',
      redirect: '/'
    }
  ],
});
