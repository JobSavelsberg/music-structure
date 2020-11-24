<template>
    <div>
        <div class="d-flex">
            <v-tabs v-if="trackVisready" v-model="selectedTab" dark>
                <v-tab v-for="matrix in this.track.matrixes" :key="matrix.name">{{ matrix.name }}</v-tab>
            </v-tabs>
        </div>
        <Seeker :width="width" :height="width" />
        <Seeker :width="width" :height="width" :vertical="true" />
        <svg v-if="trackVisready" class="annotations" :height="width" :width="width">
            <rect v-for="(section,index) in track.structureSections" :key="index" 
            :x="section.start*secondsToXPosition-1"
            :y="0"
            :width="2"
            :height="width"
            :fill="getCategoryColor(index)"
            :opacity="0.5"></rect>
        </svg>
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
        secondsToXPosition(){
            return this.width/(this.track.getAnalysisDuration());
        },
        xCenterPositionNormalized() {
            if (this.zoomed) {
                return this.seekerNormalized;
            } else {
                return 0.5;
            }
        },
                trackVisready(){
            return this.track && this.track.matrixes.length > 0;
        }
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
            this.webGLMatrixPool.draw(0.5, 1, 1);
            // no zoom pls  this.zoomed ? this.zoomScale : 1
        },
        applyRenderMode() {
            clearInterval(this.drawLoop);
            if (this.zoomed) {
                this.drawLoop = setInterval(this.draw, this.$store.getters.seekerUpdateSpeed);
            } else {
                this.draw();
            }
        },
        getCategoryColor(index){
           return vis.categoryColor(index)
        }
    },
};
</script>

<style>
.SPcanvas {
    background-color: "white";
    width: 100%;
    height: 100%;
}
.annotations{
    position: absolute;
    z-index: 5;
}
</style>
