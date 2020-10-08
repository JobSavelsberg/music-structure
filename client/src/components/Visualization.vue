<template>
    <div class="visualization">
        <div class="d-flex">
            <v-tabs v-model="selectedTab" dark>
                <v-tab>Raw SSM</v-tab>
                <v-tab>Enhanced SSM</v-tab>
                <v-spacer />
                <v-btn color="primary" fab dark small class="mr-2" @click="zoomed = !zoomed">
                    <v-icon>mdi-magnify-plus-outline</v-icon>
                </v-btn></v-tabs
            >
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

const RAWSSM = 0;
const ENHANCEDSSM = 1;

export default {
    props: ["width"],
    data() {
        return {
            glCanvas: null,
            drawLoop: null,
            zoomed: false,
            selectedTab: null,
            rawSSMBuffer: null,
            enhancedSSMBuffer: null,
        };
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
                this.rawSSMBuffer = null;
                this.enhancedSSMBuffer = null;
            }
        },
        ssmReady() {
            log.debug("Ssm ready?", this.ssmReady);

            if (this.ssmReady) {
                if (this.selectedTab === RAWSSM) {
                    log.debug("Setting raw ssm");
                    this.rawSSMBuffer = webGL.createSSMDataArray(this.track, this.track.rawSSM);
                } else if (this.selectedTab === ENHANCEDSSM) {
                    log.debug("Setting enhanced ssm");
                    this.enhancedSSMBuffer = webGL.createSSMDataArray(this.track, this.track.enhancedSSM);
                }
                this.setSSM();
                this.applyRenderMode();
                setTimeout(() => {
                    if (!this.rawSSMBuffer) {
                        log.debug("Setting raw ssm");
                        this.rawSSMBuffer = webGL.createSSMDataArray(this.track, this.track.rawSSM);
                    }
                    if (!this.enhancedSSMBuffer) {
                        log.debug("Setting enhanced ssm");
                        this.enhancedSSMBuffer = webGL.createSSMDataArray(this.track, this.track.enhancedSSM);
                    }
                }, 0);
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
                if (this.selectedTab === RAWSSM) {
                    webGL.setSSMDataArray(this.rawSSMBuffer);
                } else if (this.selectedTab === ENHANCEDSSM) {
                    webGL.setSSMDataArray(this.enhancedSSMBuffer);
                }
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
