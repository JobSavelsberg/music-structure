<template>
    <div class="callback"></div>
</template>

<script>
import { requestFirstToken } from "../app/authentication";

export default {
    name: "Callback",
    components: {},
    beforeCreate() {
        let params = new URLSearchParams(window.location.search);
        let code = params.get("code");
        requestFirstToken(code).then(() => {
            const trackId = window.localStorage.getItem("trackId");
            console.log("loading", trackId);
            this.$router.push(`/track/${trackId}`);
        });
    },
};
</script>

<style>
.callback {
    height: 100%;
}
</style>
