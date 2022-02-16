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
html {
    position: relative;
    overflow: hidden;
}
body {
    overflow: hidden;
}
::-webkit-scrollbar {
    display: none;
}
:not(input):not(textarea),
:not(input):not(textarea)::after,
:not(input):not(textarea)::before {
    -webkit-user-select: none;
    user-select: none;
}
input,
button,
textarea,
:focus {
    outline: none;
}

button {
    cursor: pointer;
}
</style>
