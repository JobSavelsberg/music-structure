<template>
    <div>
        <div class="d-flex">
            <v-tabs v-if="this.track && this.track.matrixes.length > 0" v-model="selectedTab" dark>
                <v-tab v-for="matrix in this.track.matrixes" :key="matrix.name">{{ matrix.name }}</v-tab>
            </v-tabs>
        </div>
        <Seeker :width="width" :height="width" :useZoom="true" />
        <canvas id="gl-canvas" :height="width" :width="width" class="glCanvas pa-0 ma-0"></canvas>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import WebGLMatrixPool from "../../app/webgl/WebGLMatrixPool";

import Seeker from "./Seeker";

export default {
    props: ["width"],
    components: {
        Seeker,
    },
    data() {
        return {
            selectedTab: 0,
            drawLoop: null,
            webGLMatrixPool: null,
        };
    },
    watch: {
        zoomed() {
            this.applyRenderMode();
        },
        selectedTab() {
            this.setSelected();
            this.draw();
        },
        track() {
            this.webGLMatrixPool.clear();
        },
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        zoomed() {
            return this.$store.getters.isZoomed;
        },
        zoomScale() {
            return this.$store.getters.zoomScale;
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
        this.webGLMatrixPool = new WebGLMatrixPool(document.getElementById("gl-canvas"));
        window.eventBus.$on("readyForVis", () => {
            if (!this.track) log.error("SSM done but track does not exist");

            this.webGLMatrixPool.fillMatrixBufferPool(this.track, this.selectedTab);

            this.setSelected();
            this.applyRenderMode();
        });
    },
    methods: {
        setSelected() {
            this.webGLMatrixPool.select(this.selectedTab);
        },
        draw() {
            this.webGLMatrixPool.clear();
            this.webGLMatrixPool.draw(this.xCenterPositionNormalized, this.zoomed ? this.zoomScale : 1, 1);
        },
        applyRenderMode() {
            clearInterval(this.drawLoop);
            if (this.zoomed) {
                this.drawLoop = setInterval(this.draw, this.$store.getters.seekerUpdateSpeed);
            } else {
                this.draw();
            }
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
