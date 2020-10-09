import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";
import store from "./store";

Vue.config.productionTip = false;

window.eventBus = new Vue();

new Vue({
    router,
    vuetify,
    store,
    render: (h) => h(App),
}).$mount("#app");

store.state.browser = () => {
    // Opera 8.0+
    // eslint-disable-next-line no-undef
    var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(" OPR/") >= 0;

    // Firefox 1.0+
    var isFirefox = typeof InstallTrigger !== "undefined";

    // Safari 3.0+ "[object HTMLElementConstructor]"
    var isSafari =
        /constructor/i.test(window.HTMLElement) ||
        (function(p) {
            return p.toString() === "[object SafariRemoteNotification]";
            // eslint-disable-next-line no-undef
        })(!window["safari"] || (typeof safari !== "undefined" && safari.pushNotification));

    // Internet Explorer 6-11
    var isIE = /*@cc_on!@*/ false || !!document.documentMode;

    // Edge 20+
    var isEdge = !isIE && !!window.StyleMedia;

    // Chrome 1 - 79
    var isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);

    if (isChrome) return "Chrome";
    if (isFirefox) return "Firefox";
    if (isSafari) return "Safari";
    if (isIE) return "IE";
    if (isEdge) return "Edge";
    if (isOpera) return "Opera";
};
