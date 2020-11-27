<template>
    <div>
        <div class="d-flex">
            <v-tabs v-if="trackVisready" v-model="selectedTab" dark>
                <v-tab v-for="matrix in this.track.matrixes" :key="matrix.name">{{ matrix.name }}</v-tab>
            </v-tabs>
        </div>
        <Seeker :width="width" :height="width" />
        <Seeker :width="width" :height="width" :vertical="true" />
        <svg v-if="hasStructures" class="annotations" :height="width" :width="width">
            <g v-for="(section,index) in selectedStructure.data" :key="index" >
                <rect 
                v-if="showPathStart"
                :x="section.start*secondsToXPosition -1"
                :y="0"
                :width="2"
                :height="width"
                :fill="getCategoryColor(section.label)"
                :opacity=" 0.8"></rect>
                <rect 
                v-if="fillSections"
                :x="section.start*secondsToXPosition"
                :y="0"
                :width=" section.duration*secondsToXPosition"
                :height="width"
                :fill="getCategoryColor(section.label)"
                :opacity="0.3"></rect>
                <g v-if="section.pathFamily && showPaths">
                    <g v-for="(path, pathIndex) in section.pathFamily" :key="pathIndex" >
                        <path fill="none" stroke="white" stroke-width="4" :d="generateLine(path)" class="path" stroke-linejoin="round" />
                        <path fill="none" :stroke="getCategoryColor(section.label)" stroke-width="2" :d="generateLine(path)" class="path" stroke-linejoin="round"/>
                    </g>
                </g>
            </g>
        </svg>
        <canvas id="gl-canvas" :height="width" :width="width" class="glCanvas pa-0 ma-0"></canvas>
        <v-row class="options-row" v-if="hasStructures" :style="`width: ${width}px`">
            <v-select
            v-model="selectedStructure"
            :items="track.structures"
            item-text="name"
            return-object
            label="Structure"
            solo
          ></v-select>
          <v-spacer></v-spacer>
        <v-switch v-model="showPathStart" label="Show Path Start" hide-details></v-switch>
        <v-switch v-model="fillSections" label="Fill Sections" hide-details></v-switch>
            <v-switch v-model="showPaths" label="Show Paths" hide-details></v-switch>
        </v-row>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import WebGLMatrixPool from "../../app/webgl/WebGLMatrixPool";
import * as d3 from "d3";

import Seeker from "./Seeker";

export default {
    props: ["width"],
    components: {
        Seeker,
    },
    data() {
        return {
            selectedStructure: {name: "undefined", data: []},
            fillSections: false,
            showPathStart: true,
            showPaths: true,
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
        hasStructures(){
            return this.track && this.track.structures && this.track.structures.length > 0;
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
        },
        lineGenerator() {
            return d3
                .line()
                .x((v) => {
                    return (this.width / this.track.features.sampleAmount) * v[0];
                })
                .y((v) => {
                    return (this.width / this.track.features.sampleAmount) * v[1];
                });
        },
    },
    mounted() {
        this.webGLMatrixPool = new WebGLMatrixPool(document.getElementById("gl-canvas"));
        window.eventBus.$on("readyForVis", () => {
            if (!this.track) log.error("SSM done but track does not exist");

            this.selectedStructure = this.track.structures[this.track.structures.length-1];

            this.webGLMatrixPool.fillMatrixBufferPool(this.track, this.selectedTab);

            this.setSelected();
            this.applyRenderMode();
        });
        this._keyListener = function(e) {
            if (e.key === "p" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault(); // present "Save Page" from getting triggered.
                this.showPaths = !this.showPaths;
            }
        };
        document.addEventListener("keydown", this._keyListener.bind(this));
    },
    beforeDestroy() {
        document.removeEventListener("keydown", this._keyListener);
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
        },
        generateLine(path) {
            return this.lineGenerator(path);
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
.annotations{
    position: absolute;
    z-index: 5;
}
.options-row{
    z-index: 20;
}
</style>
