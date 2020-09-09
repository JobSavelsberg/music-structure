import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Callback from '../views/Callback.vue'
import Login from '../views/Login.vue'
import * as app from '../app/app'
import * as auth from '../app/authentication'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/home',
    name: 'Home',
    component: Home,
    beforeEnter(to, from, next) {
      if (auth.isAuthorized()) {
        next();
      }else{
        next('/');
      }
    }
  },
  {
    path: '/callback',
    name: 'Callback',
    component: Callback
  },

]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
