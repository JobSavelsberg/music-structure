<template>
    <div class="visualization">
        <canvas id="gl-canvas" :height="width" :width="width" class="glCanvas pa-0 ma-0"></canvas>
        <svg
            v-if="!loadingTrack"
            :height="height"
            :width="width"
            class="seekerSVG"
            :style="`transform: translate(${-width}px, 0px);`"
            @click="clickedSVG"
        >
            <rect :x="seekerNormalized * width - 1.25" :y="0" :width="2.5" :height="height" fill="#1DB954"></rect>
        </svg>
    </div>
</template>

<script>
import * as log from "../dev/log";
import * as webGL from "../app/webGL";
import * as player from "../app/player";

export default {
    props: ["width"],
    data() {
        return { glCanvas: null };
    },
    computed: {
        loadingTrack() {
            return this.$store.state.loadingTrack;
        },
        track() {
            return this.$store.getters.selectedTrack;
        },
        ssmReady() {
            return this.$store.state.ssmReady;
        },
        seekerNormalized() {
            return this.$store.getters.seeker / (this.track.getAnalysisDuration() * 1000);
        },
        height() {
            return this.width;
        },
    },
    watch: {
        loadingTrack() {
            if (!this.loadingTrack) {
                webGL.clear();
            }
        },
        ssmReady() {
            if (this.ssmReady) {
                this.drawSSM();
            }
        },
    },
    mounted() {
        this.webGLSetup();
        log.debug("SET UP WEBGL");
    },
    methods: {
        webGLSetup() {
            this.glCanvas = document.getElementById("gl-canvas");
            if (!this.glCanvas) {
                log.warn("canvas not ready: ");
                return;
            }
            this.glCanvas.width = this.width;
            this.glCanvas.height = this.width;
            webGL.init(this.glCanvas);
        },
        drawSSM() {
            log.debug("drawSSM()");
            if (this.glCanvas) {
                log.info("Drawing SSM");
                webGL.clear();
                webGL.setSSMDataArray(this.track);
                webGL.drawSSM();
            } else {
                log.warn("Trying to draw when canvas is not created");
            }
        },
        clickedSVG(event) {
            let xNormalized = 0;
            if (this.$store.state.browser === "Firefox") {
                xNormalized = event.layerX / this.width;
            } else {
                xNormalized = event.offsetX / this.width;
            }
            player.seekS(xNormalized * this.track.getAnalysisDuration());
        },
    },
};
</script>

<style>
.visualization {
}
.glCanvas {
}
.seekerSVGWrapper {
    position: relative;
    color: white;
}
.seekerSVG {
    position: absolute;
    z-index: 10;
}
</style>
