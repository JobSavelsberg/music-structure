import Vue from "vue";
import VueRouter from "vue-router";
import Track from "../views/Track.vue";
import Callback from "../views/Callback.vue";
import Login from "../views/Login.vue";
import Landing from "../views/Landing.vue";
import * as app from "../app/app";
import * as auth from "../app/authentication";

Vue.use(VueRouter);

const routes = [
    {
        path: "/",
        name: "Landing",
        component: Login,
        beforeEnter(to, from, next) {
            if (auth.isAuthorized()) {
                next("/track/-1");
            } else {
                next("/login");
            }
        },
    },
    {
        path: "/login",
        name: "Login",
        component: Login,
    },
    {
        path: "/track/:trackId",
        name: "Track",
        component: Track,
        beforeEnter(to, from, next) {
            console.log("Prev stored trackid: ", window.localStorage.getItem("trackId"));
            if (to.params.trackId !== -1) {
                window.localStorage.setItem("trackId", to.params.trackId);
            }
            console.log("New stored trackid: ", window.localStorage.getItem("trackId"));

            if (auth.isAuthorized()) {
                next();
            } else {
                next("/login");
            }
        },
    },
    {
        path: "/callback",
        name: "Callback",
        component: Callback,
        beforeEnter(to, from, next) {
            console.log("After callback trackid: ", window.localStorage.getItem("trackId"));
            next();
        },
    },
];

const router = new VueRouter({
    mode: "history",
    base: process.env.BASE_URL,
    routes,
});

export default router;
