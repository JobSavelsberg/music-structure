<template>
    <div>
        <div class="d-flex pa-2">
            <v-row>
                <v-layout class="ml-10">
                    <v-switch
                        v-model="canvasVis.rawPitch.draw"
                        label="Raw Pitch Data"
                        class="mx-5"
                        hide-details
                    ></v-switch>
                    <v-switch
                        v-model="canvasVis.rawTimbre.draw"
                        label="Raw Timbre Data"
                        class="mx-5"
                        hide-details
                    ></v-switch>
                    <v-switch
                        v-model="canvasVis.rawRhythm.draw"
                        label="Rhythm Data"
                        class="mx-5"
                        hide-details
                    ></v-switch>
                    <v-switch v-model="canvasVis.tonality.draw" label="Tonality" class="mx-5" hide-details></v-switch>
                    <v-switch
                        v-model="canvasVis.ssm.draw"
                        label="Similarity Matrix"
                        class="mx-5"
                        hide-details
                    ></v-switch>
                </v-layout>
                <v-spacer />
                <v-btn color="primary" fab dark small class="mr-10" @click="zoom">
                    <v-icon>mdi-magnify-plus-outline</v-icon>
                </v-btn>
            </v-row>
        </div>
        <div class="vis" @click="clickedVis">
            <svg v-if="!loadingTrack" class="visSeeker">
                <rect
                    :x="
                        this.zoomed ? this.padding + this.canvasWidth / 2 : padding + (this.seeker / 1000.0) * scale - 1
                    "
                    :y="0"
                    :width="2"
                    :height="canvasHeight"
                    fill="#ffffff"
                    :opacity="0.5"
                />
            </svg>
            <canvas v-show="!loadingTrack" id="visCanvas" ref="visCanvas" class="visCanvas pa-0 ma-0"></canvas>
            <!--<svg v-if="!loadingTrack" class="svgContainer">
        <g v-if="drawClusters">
          <rect
            v-for="(segment, index) in segments"
            :key="index"
            :x="padding+segment.start*scale"
            :y="segment.cluster*10"
            :width="segment.duration*scale"
            :height="10"
            :fill="clusterColor(segment.cluster)"
            @click="clickedCluster(segment.cluster, segment)"
          />
        </g>
      </svg>
      <svg
        v-if="!loadingTrack && $store.state.tsneReady"
        class="tsneContainer"
        @click="clickedTSNE"
        :style="`height: ${tsneSize+padding}px; left: ${padding}`"
      >
        <circle
          v-for="(segment, index) in segments"
          :key="index"
          :class="playingSegment(segment) ? 'segmentCirclePlaying' : 'segmentCircle'"
          :r="(2+Math.min(2,segment.duration)*5) * (playingSegment(segment) ? 3: 1)"
          :cx="(segment.tsneCoord[0]+1)*tsneSize/2"
          :cy="(segment.tsneCoord[1]+1)*tsneSize/2"
          :fill="playingSegment(segment)? 'white': clusterColor(segment.cluster)"
          @click="clickedSegment(segment)"
        />
      </svg>-->
            <canvas id="gl-canvas" class="visCanvas pa-0 ma-0"></canvas>
        </div>
    </div>
</template>

<script>
import * as d3 from "d3";
import * as audioUtil from "../app/audioUtil";

import * as player from "../app/player";
import * as app from "../app/app";
import * as vis from "../app/vis";
import Segment from "../app/Segment";
import * as webGL from "../app/webGL";

const d3ClusterColor = d3.scaleOrdinal(d3.schemeCategory10);
export default {
    props: ["padding"],
    data() {
        return {
            canvas: null,
            ctx: null,
            hover: 0,
            windowWidth: window.innerWidth,
            spotifyVisualizer: null,
            power: 1,
            zoomed: false,
            scaleX: 4,
            visSpaceBetween: 5,
            drawClusters: true,
            canvasVis: {
                rawPitch: { draw: true, height: 150, function: vis.renderRawPitch },
                percussionPitch: {
                    draw: false,
                    height: 30,
                    function: vis.renderPercussionPitch,
                },
                rawTimbre: { draw: true, height: 150, function: vis.renderRawTimbre },
                ssm: {
                    draw: false,
                    height: window.innerWidth - this.padding * 2,
                    function: vis.renderSSM,
                },
                tonality: { draw: true, height: 25, function: vis.renderTonality },
                rawRhythm: { draw: true, height: 30, function: vis.renderRawRhythm },
            },
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        analysis() {
            return this.track.getAnalysis();
        },
        segments() {
            return this.track.getSegments();
        },
        scale() {
            return this.width / this.analysis.track.duration;
        },
        width() {
            return this.windowWidth * (this.zoomed ? this.scaleX : 1) - this.padding * 2;
        },
        canvasWidth() {
            return this.windowWidth - this.padding * 2;
        },
        tsneSize() {
            return this.canvasWidth / 2;
        },
        canvasHeight() {
            let height = 0;
            for (const [key, vis] of Object.entries(this.canvasVis)) {
                height += vis.draw ? this.visSpaceBetween + vis.height : 0;
            }
            return height;
        },
        loadingTrack() {
            return this.$store.state.loadingTrack;
        },
        duration() {
            return Math.round(this.track.getAnalysis().track.duration * 1000);
        },
        seeker() {
            return this.$store.state.seeker;
        },
    },
    watch: {
        loadingTrack: "loadingTrackChanged",
        seeker: "seekerChanged",
        canvasHeight: "canvasHeightChanged",
        canvasVis: {
            deep: true,
            handler(newVis, oldVis) {
                this.canvasVisChanged(newVis, oldVis);
            },
        },
    },
    mounted() {
        window.addEventListener("resize", () => {
            this.windowWidth = window.innerWidth;
            //this.setupCanvas(document.getElementById("visCanvas"));
            //this.draw(0);
        });
        this.webGLSetup();
        //this.setupCanvas(document.getElementById("visCanvas"));
        //this.draw(0);
    },
    methods: {
        webGLSetup() {
            const glCanvas = document.getElementById("gl-canvas");
            glCanvas.width = this.windowWidth;
            glCanvas.height = this.windowWidth;
            webGL.init(glCanvas);
        },
        drawSSM() {
            console.log("Drawing SSM");
            webGL.clear();
            webGL.setSSMDataArray(this.track);
            webGL.drawSSM();
        },
        clickedVis(event) {
            console.log(event);
            if (event.srcElement.id === "visCanvas" && event.offsetY <= this.canvasHeight) {
                const posX = Math.min(Math.max(0, event.clientX - this.padding) / this.width, 1);
                const ms = posX * this.duration;
                this.$store.commit("setSeeker", ms);
                player.seek(ms);
            }
        },
        loudness(db) {
            return audioUtil.loudness(db);
        },
        pitchColorRange(value) {
            return vis.pitchColor(value);
        },
        timbreColorRange(value) {
            return vis.timbreColor(value);
        },
        rainbowColorRange(value) {
            return vis.rainbowColor(value);
        },
        clusterColor(cluster) {
            return d3ClusterColor(cluster);
        },
        loadingTrackChanged(newVal, oldVal) {
            if (this.loadingTrack) {
                this.canvasVis.ssm.draw = false;
            } else {
                //this.draw(0);
            }
        },
        setupCanvas(canvas) {
            if (!canvas) {
                console.log("canvas not ready");
                return;
            }
            console.log("canvas ready: draw()");
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d");

            // get current size of the canvas
            let rect = canvas.getBoundingClientRect();

            // increase the actual size of our canvas
            this.canvas.width = this.windowWidth * devicePixelRatio;
            this.canvas.height = this.canvasHeight * devicePixelRatio;

            // ensure all drawing operations are scaled
            this.ctx.scale(devicePixelRatio, devicePixelRatio);

            // scale everything down using CSS
            this.canvas.style.width = this.windowWidth + "px";
            this.canvas.style.height = this.canvasHeight + "px";

            this.ctx.webkitImageSmoothingEnabled = false;
            this.ctx.mozImageSmoothingEnabled = false;
            this.ctx.imageSmoothingEnabled = false;

            //this.draw();
        },
        draw(xOffset) {
            console.log("draw", xOffset);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            let y = 0;

            for (const [key, vis] of Object.entries(this.canvasVis)) {
                if (vis.draw) {
                    vis.function(this.track, this.padding - xOffset, this.width, y, vis.height, this.ctx);
                    y += this.visSpaceBetween + vis.height;
                }
            }
        },
        zoom() {
            console.log("zooming");
            //this.transform();
            this.zoomed = !this.zoomed;
            this.redraw();
        },
        redraw() {
            const xOffset = ((this.seeker / 1000.0) * this.width) / this.analysis.track.duration;
            const offsetToMiddle = this.canvasWidth / 2;
            this.draw(this.zoomed ? xOffset - offsetToMiddle : 0);
        },
        seekerChanged(newSeek, oldSeek) {
            if (this.zoomed) {
                this.redraw();
            }
        },
        transform() {
            this.ctx.save();
            this.ctx.translate(this.width * 0.5, this.canvasHeight * 0.5);
            this.ctx.scale(2, 2);
            this.ctx.drawImage(this.canvas, -this.width * 0.5, -this.canvasHeight * 0.5);
            this.ctx.restore();
        },
        clickedCluster(clusterIndex, segment) {
            console.log("playing cluster", clusterIndex);
            let totalDuration = 0;
            const clusterSize = this.track.clusters[clusterIndex].length;
            const randomSegmentIndex = Math.floor(Math.random() * clusterSize);
            const randomSegment = segment; //this.track.clusters[clusterIndex][randomSegmentIndex];
            player.playSegment(randomSegment);
            this.$store.commit("setSeeker", randomSegment.start * 1000);
        },
        clickedSegment(segment) {
            player.playSegment(segment);
            this.$store.commit("setSeeker", segment.start * 1000);
        },
        clickedTSNE(event) {
            const x = (event.offsetX / this.tsneSize) * 2 - 1;
            const y = (event.offsetY / this.tsneSize) * 2 - 1;
            const segment = this.track.getClosestSegment([x, y]);
            this.clickedSegment(segment);
        },
        playingSegment(segment) {
            return (
                this.$store.getters.playing &&
                this.seeker / 1000 >= segment.start &&
                this.seeker / 1000 < segment.start + segment.duration - 0.01
            );
        },
        canvasHeightChanged(newHeight, oldHeight) {
            console.log("CanvasHeight change");
            //this.setupCanvas(this.canvas);
            //this.draw(0);
        },
        canvasVisChanged() {
            //this.setupCanvas(this.canvas);
            //this.draw(0);
            if (this.canvasVis.ssm.draw) {
                this.drawSSM();
            }
        },
    },
};
</script>
<style>
.vis {
    padding-top: 10px;
    position: relative;
}
.visCanvas {
    image-rendering: optimizeSpeed;
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: -o-crisp-edges;
    image-rendering: crisp-edges;
    -ms-interpolation-mode: nearest-neighbor;
}
.visSeeker {
    position: absolute;
    z-index: 3;
    width: 100%;
    overflow: visible;
}
.svgContainer {
    position: relative;
    padding-top: 10px;
    background-color: "white";
    top: 0px;
    left: 0px;
    z-index: 2;
    height: 100%;
    width: 100%;
    overflow: visible;
}
.tsneContainer {
    display: block;
    position: relative;
    background-color: "white";
    top: 0px;
    left: 0px;
    bottom: 0;
    z-index: 2;
    margin: 0;
    padding: 0;
    width: 100%;
    overflow: visible;
}

.segmentCircle {
    transition: r 1.5s ease-out, fill 1.5s ease-out; /*, cx 1s ease, cy 1s ease;*/
}
.segmentCirclePlaying {
    transition: r 0.1s ease-in, fill 0.1s ease-in;
}
</style>
