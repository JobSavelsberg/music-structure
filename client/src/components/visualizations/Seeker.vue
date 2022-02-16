<template>
    <svg
        v-if="!loadingTrack"
        :height="height"
        :width="width"
        class="seekerSVG"
        :style="`transform: translate(${0}px, 0px);`"
        @click="clickedSVG"
        @click.right="rightClick"
        @contextmenu.prevent
    >
        <rect
            class="seekerRect"
            :x="!isVertical * ((useZoom && isZoomed ? 0.5 : seekerNormalized) * width - 1.25)"
            :y="
                isVertical * ((useZoom && isZoomed ? 0.5 : seekerNormalized) * height - 1.25) + showMarkerLabel ? 15 : 0
            "
            :width="isVertical ? width * 2 : 2.5"
            :height="(isVertical ? 2.5 : height * 2) - (showMarkerLabel ? 15 : 0)"
            :fill="seekerColor"
        ></rect>
        <Markers
            :ref="'markers'"
            :v-if="drawMarkers"
            :width="width"
            :height="height"
            :opacity="markerOpacity || 0.3"
            :showMarkerLabel="showMarkerLabel"
        ></Markers>
    </svg>
</template>

<script>
import * as d3 from "d3";
import * as log from "../../dev/log";
import * as player from "../../app/player";
import Markers from "./Markers";

export default {
    props: ["width", "height", "useZoom", "vertical", "color", "drawMarkers", "markerOpacity", "showMarkerLabel"],
    components: {
        Markers,
    },
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
        isVertical() {
            if (this.vertical) {
                return 1;
            } else {
                return 0;
            }
        },
        seekerColor() {
            if (this.color) return this.color;
            return this.isVertical ? "#1D4924" : "#1DB954";
        },
    },
    mounted() {},
    methods: {
        clicked(event) {
            this.clickedSVG(event);
        },
        clickedSVG(event) {
            log.debug("CLickedseeker");

            this.$store.commit("setInputFocus", false);
            let xNormalized = 0;
            let yNormalized = 0;
            if (this.$store.state.browser === "Firefox") {
                xNormalized = event.layerX / this.width;
                yNormalized = event.layerY / this.height;
            } else {
                xNormalized = event.offsetX / this.width;
                yNormalized = event.layerY / this.height;
            }

            if (this.useZoom && this.isZoomed) {
                const xFromMiddle = xNormalized * 2 - 1;
                const seekerPos = Math.min(1, Math.max(0, this.seekerNormalized + xFromMiddle / (2 * this.zoomScale)));
                player.seekS(seekerPos * this.track.getAnalysisDuration());
            } else {
                player.seekS(xNormalized * this.track.getAnalysisDuration());
            }
        },
        rightClick(event) {
            this.$store.commit("setInputFocus", false);
            log.debug(this.$refs);
            this.$refs.markers.rightClick(event);
        },
    },
};
</script>

<style>
.seekerSVG {
    position: absolute;
    z-index: 50;
}
</style>
