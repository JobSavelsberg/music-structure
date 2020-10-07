<template>
    <div class="visualization">
        <div class="d-flex pa-2">
            <v-row>
                <v-btn color="primary" fab dark small class="mr-10" @click="zoomed = !zoomed">
                    <v-icon>mdi-magnify-plus-outline</v-icon>
                </v-btn>
            </v-row>
        </div>
        <canvas id="gl-canvas" :height="width" :width="width" class="glCanvas pa-0 ma-0"></canvas>
        <svg
            v-if="!loadingTrack"
            :height="height"
            :width="width"
            class="seekerSVG"
            :style="`transform: translate(${-width}px, 0px);`"
            @click="clickedSVG"
        >
            <rect
                :x="(zoomed ? 0.5 : seekerNormalized) * width - 1.25"
                :y="0"
                :width="2.5"
                :height="height"
                fill="#1DB954"
            ></rect>
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
        return { glCanvas: null, drawLoop: null, zoomed: false };
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
        xCenterPositionNormalized() {
            if (this.zoomed) {
                return this.seekerNormalized;
            } else {
                return 0.5;
            }
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
                this.setSSM();
                this.applyRenderMode();
            }
        },
        zoomed() {
            this.applyRenderMode();
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
        setSSM() {
            if (this.glCanvas) {
                webGL.setSSMDataArray(this.track);
            } else {
                log.warn("No canvas");
            }
        },
        drawSSM() {
            webGL.clear();
            webGL.drawSSM(this.xCenterPositionNormalized, this.zoomed ? 2 : 1);
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
        applyRenderMode() {
            clearInterval(this.drawLoop);
            if (this.zoomed) {
                this.drawLoop = setInterval(this.drawSSM, 33);
            } else {
                this.drawSSM();
            }
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
}
.seekerSVG {
    position: absolute;
    z-index: 10;
}
</style>
