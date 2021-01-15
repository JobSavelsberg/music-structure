<template>
    <div class="py-5">
        <Seeker class="seeker" :ref="'holisticSeeker'" :width="width" :height="height" :color="'white'" />
        <svg class="timbreSVG" :width="width" :height="height"></svg>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import Section from "./Section";

import * as testing from "../../app/testing";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";
import * as player from "../../app/player";
import Vue from "vue";

export default {
    props: ["width"],
    components: {
        Seeker,
    },
    data() {
        return {};
    },
    computed: {
        height() {
            return 300;
        },
        track() {
            return this.$store.getters.selectedTrack;
        },
        scale() {
            return this.width / this.track.getAnalysisDuration();
        },
    },
    watch: {},
    mounted() {},
    methods: {},
};
</script>

<style scoped>
.timbreSVG {
    background: grey;
}
.seeker {
    pointer-events: none;
}
</style>
