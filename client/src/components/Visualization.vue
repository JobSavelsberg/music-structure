<template>
    <div class="visualization">
        <div class="d-flex">
            <v-tabs v-if="this.track && this.track.matrixes.length > 0" v-model="selectedTab" dark>
                <v-tab v-for="ssm in this.track.matrixes" :key="ssm.name">{{ ssm.name }}</v-tab>
                <v-spacer />
                <v-btn color="primary" fab dark small class="mr-2" @click="zoomed = !zoomed">
                    <v-icon>mdi-magnify-plus-outline</v-icon>
                </v-btn></v-tabs
            >
        </div>
        <canvas id="gl-canvas" :height="width" :width="width" class="glCanvas pa-0 ma-0"></canvas>
        <svg
            v-if="!loadingTrack"
            :height="height * 2"
            :width="width"
            class="seekerSVG"
            :style="`transform: translate(${-width}px, 0px);`"
            @click="clickedSVG"
        >
            <rect
                :x="(zoomed ? 0.5 : seekerNormalized) * width - 1.25"
                :y="0"
                :width="2.5"
                :height="height * 2"
                fill="#1DB954"
            ></rect>
        </svg>
        <canvas
            v-show="!loadingTrack"
            id="scapePlotCanvas"
            ref="scapePlotCanvas"
            class="scapePlotCanvas pa-0 ma-0"
            :height="width"
            :width="width"
        ></canvas>
    </div>
</template>

<script>
import * as log from "../dev/log";
import * as webGL from "../app/webGL";
import * as player from "../app/player";
import * as vis from "../app/vis";

const RAWSSM = 0;
const ENHANCEDSSM = 1;

export default {
    props: ["width"],
    data() {
        return {
            glCanvas: null,
            drawLoop: null,
            zoomed: false,
            selectedTab: 0,
            ssmReady: false,

            ssmBuffers: null,
        };
    },
    computed: {
        loadingTrack() {
            return this.$store.state.loadingTrack;
        },
        track() {
            return this.$store.getters.selectedTrack;
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
                this.ssmBuffers = null;
            }
        },
        zoomed() {
            this.applyRenderMode();
        },
        selectedTab() {
            if (this.ssmReady) {
                this.setSSM();
                this.drawSSM();
            }
        },
    },
    mounted() {
        this.webGLSetup();
        log.debug("SET UP WEBGL");
        window.eventBus.$on("ssmDone", () => {
            if (!this.track) log.error("SSM done but track does not exist");

            this.ssmBuffers = new Array(this.track.matrixes.length + 1);

            this.track.matrixes.forEach((ssm, index) => {
                if (index === this.selectedTab) {
                    this.ssmBuffers[index] = webGL.createSSMDataArray(this.track, ssm.ssm);
                } else {
                    setTimeout(() => {
                        this.ssmBuffers[index] = webGL.createSSMDataArray(this.track, ssm.ssm);
                    }, 0);
                }
            });

            this.ssmReady = true;

            this.setSSM();
            this.applyRenderMode();

            this.makeScapePlot();
        });
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
        visChanged(newVis, oldVis) {},

        setSSM() {
            if (this.glCanvas) {
                webGL.setSSMDataArray(this.ssmBuffers[this.selectedTab]);
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
            let yNormalized = 0;
            if (this.$store.state.browser === "Firefox") {
                xNormalized = event.layerX / this.width;
                yNormalized = event.layerY / this.height;
            } else {
                xNormalized = event.offsetX / this.width;
                yNormalized = event.layerY / this.height;
            }
            if (yNormalized > 1) {
                const size = Math.floor(Math.min(Math.max(0, 2 - yNormalized), 1) * this.track.features.sampleAmount);
                const start = Math.round(xNormalized * this.track.features.sampleAmount - size / 2);

                this.track.updateScoreMatrix(size, start);
            }
            log.debug(xNormalized, yNormalized);

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
        makeScapePlot() {
            const canvas = document.getElementById("scapePlotCanvas");

            if (!canvas) {
                log.debug("scapePlotCanvas not ready");
                return;
            }
            log.debug("scapePlotCanvas ready: draw()");
            const ctx = canvas.getContext("2d");

            vis.drawScapePlot(this.track, ctx, this.width);
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
.scapePlotCanvas {
    background-color: "white";
    width: 100%;
    height: 100%;
}
</style>
