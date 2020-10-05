import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";
import store from "./store";
/*import("./app/wasm/pkg").then((lib) => {
    console.log(`707 + 707 = ${lib.add(707, 707)}`);
});*/

/*let tries = 0;
worker.onmessage = (event) => {
    tries++;
    console.log("Got back from worker", JSON.stringify(event.data));
    if (tries < 2) {
        worker.postMessage({ message: "Second try", now: new Date() });
    }
};

console.log("Sending message to worker");
worker.postMessage({ message: "Are u awake?", now: new Date() });
*/
Vue.config.productionTip = false;

new Vue({
    router,
    vuetify,
    store,
    render: (h) => h(App),
}).$mount("#app");
