<template>
    <div>
        <div class="d-flex">
            <v-tabs v-if="this.track && this.track.matrixes.length > 0" v-model="selectedTab" dark>
                <v-tab v-for="matrix in this.track.matrixes" :key="matrix.name">{{ matrix.name }}</v-tab>
            </v-tabs>
        </div>
        <Seeker :width="width" :height="width" />
        <canvas id="gl-canvas" :height="width" :width="width" class="glCanvas pa-0 ma-0"></canvas>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import * as webGL from "../../app/webGL";
import Seeker from "./Seeker";

export default {
    props: ["width"],
    components: {
        Seeker,
    },
    data() {
        return {
            glCanvas: null,
            matrixBuffers: null,
            selectedTab: 0,
            drawLoop: null,
        };
    },
    watch: {
        zoomed() {
            this.applyRenderMode();
        },
        selectedTab() {
            if (this.readyForVis) {
                this.setSSM();
                this.drawSSM();
            }
        },
        track() {
            this.clearMatrixes();
        },
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        zoomed() {
            return this.$store.getters.isZoomed;
        },
        seekerNormalized() {
            return this.$store.getters.seeker / (this.track.getAnalysisDuration() * 1000);
        },
        xCenterPositionNormalized() {
            if (this.zoomed) {
                return this.seekerNormalized;
            } else {
                return 0.5;
            }
        },
    },
    mounted() {
        this.webGLSetup();
        log.debug("SET UP WEBGL");
        window.eventBus.$on("readyForVis", () => {
            log.debug("Visualization Vue got readyForVis");
            if (!this.track) log.error("SSM done but track does not exist");

            this.matrixBuffers = new Array(this.track.matrixes.length + 1);

            this.track.matrixes.forEach((matrix, index) => {
                if (index === this.selectedTab) {
                    this.matrixBuffers[index] = webGL.createSSMDataArray(this.track, matrix.matrix);
                } else {
                    setTimeout(() => {
                        this.matrixBuffers[index] = webGL.createSSMDataArray(this.track, matrix.matrix);
                    }, 0);
                }
            });

            this.readyForVis = true;

            this.setSSM();
            this.applyRenderMode();
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
                webGL.setSSMDataArray(this.matrixBuffers[this.selectedTab]);
            } else {
                log.warn("No canvas");
            }
        },

        drawSSM() {
            webGL.clear();
            webGL.drawSSM(this.xCenterPositionNormalized, this.zoomed ? 2 : 1);
        },
        applyRenderMode() {
            clearInterval(this.drawLoop);
            if (this.zoomed) {
                this.drawLoop = setInterval(this.drawSSM, 33);
            } else {
                this.drawSSM();
            }
        },
        clearMatrixes() {
            webGL.clear();
            this.matrixBuffers = null;
        },
    },
};
</script>

<style>
.SPcanvas {
    background-color: "white";
    width: 100%;
    height: 100%;
}
</style>
