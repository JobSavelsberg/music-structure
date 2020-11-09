<template>
    <svg
        v-if="!loadingTrack"
        :height="height"
        :width="width"
        class="seekerSVG"
        :style="`transform: translate(${0}px, 0px);`"
        @click="clickedSVG"
    >
        <rect
            :x="(useZoom && isZoomed ? 0.5 : seekerNormalized) * width - 1.25"
            :y="0"
            :width="2.5"
            :height="height * 2"
            fill="#1DB954"
        ></rect>
    </svg>
</template>

<script>
import * as d3 from "d3";
import * as log from "../../dev/log";
import * as player from "../../app/player";

export default {
    props: ["width", "height", "useZoom"],
    data() {
        return {};
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        loadingTrack() {
            return this.$store.state.loadingTrack;
        },
        seekerNormalized() {
            return this.$store.getters.seeker / (this.track.getAnalysisDuration() * 1000);
        },
        isZoomed() {
            return this.$store.state.isZoomed;
        },
        zoomScale() {
            return this.$store.getters.zoomScale;
        },
    },
    mounted() {},
    methods: {
        clickedSVG(event) {
            let xNormalized = 0;
            let yNormalized = 0;
            if (this.$store.state.browser === "Firefox") {
                xNormalized = event.layerX / this.width;
                yNormalized = event.layerY / this.height;
            } else {
                xNormalized = event.offsetX / this.width;
                yNormalized = event.layerY / this.height;
            }

            /* Code for scapeplot
            if (yNormalized > 1) {
                const size = Math.floor(Math.min(Math.max(0, 2 - yNormalized), 1) * this.track.features.sampleAmount);
                const start = Math.round(xNormalized * this.track.features.sampleAmount - size / 2);

                this.track.updateScoreMatrix(size, start);
            }*/
            //log.debug(xNormalized, yNormalized);
            if (this.useZoom && this.isZoomed) {
                const xFromMiddle = xNormalized * 2 - 1;
                const seekerPos = Math.min(1, Math.max(0, this.seekerNormalized + xFromMiddle / (2 * this.zoomScale)));
                player.seekS(seekerPos * this.track.getAnalysisDuration());
            } else {
                player.seekS(xNormalized * this.track.getAnalysisDuration());
            }
        },
    },
};
</script>

<style>
.seekerSVGWrapper {
    position: relative;
}
.seekerSVG {
    position: absolute;
    z-index: 10;
}
</style>
