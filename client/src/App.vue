<template>
    <v-app id="app" :dark="true">
        <router-view />
    </v-app>
</template>

<script>
export default {
    name: "App",

    components: {},
    beforeCreate() {
        window.onSpotifyWebPlaybackSDKReady = () => {
            console.log("The Web Playback SDK is ready. We have access to Spotify.Player");
            console.log(window.Spotify.Player);
        };
    },
    data: () => ({
        //
    }),
    mounted: function() {
        let elHtml = document.getElementsByTagName("html")[0];
        elHtml.style.overflowY = "auto";
    },
    destroyed: function() {
        let elHtml = document.getElementsByTagName("html")[0];
        elHtml.style.overflowY = null;
    },
};
</script>

<style>
:not(input):not(textarea),
:not(input):not(textarea)::after,
:not(input):not(textarea)::before {
    -webkit-user-select: none;
    user-select: none;
    cursor: default;
}
input,
button,
textarea,
:focus {
    outline: none;
}
</style>
